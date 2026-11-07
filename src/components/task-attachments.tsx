"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Paperclip, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ATTACHMENT_MIMES, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES,
  isAttachmentType, isImageAttachment, type Attachment,
} from "@/lib/types";

const BUCKET = "task-attachments";
// Long enough to read a ticket without re-signing on every render, short enough that a URL
// copied out of the page stops working the same day. The bucket is private; this is the only
// way its objects are ever read.
const SIGNED_URL_TTL = 60 * 60;

const MB = 1024 * 1024;
const formatSize = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`);

/** A missing bucket means the migration has not been applied; say so instead of "Bucket not found". */
function uploadErrorMessage(message: string, name: string): string {
  if (/bucket not found/i.test(message)) {
    return "Хранилище не настроено: примените миграцию 20261107010000_task_attachments.sql.";
  }
  if (/mime type|not allowed/i.test(message)) return `«${name}»: такой тип файла не принимается.`;
  if (/exceeded the maximum|too large|payload/i.test(message)) return `«${name}»: файл больше лимита в 10 МБ.`;
  return `«${name}»: ${message}`;
}

/**
 * Attachments for one task.
 *
 * The bytes go from the browser straight to Supabase Storage, never through the Next.js route:
 * a serverless function body is capped well below the 10 MB a scanned ticket can reach. The
 * task row then stores only metadata, which `onChange` persists.
 */
export function TaskAttachments({
  taskId,
  attachments,
  disabled,
  onChange,
}: {
  taskId: string;
  attachments: Attachment[];
  disabled?: boolean;
  /** Persists the new list. Resolves to an error message, or null once saved. */
  onChange: (next: Attachment[]) => Promise<string | null>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Signed on demand rather than stored: a URL in the row would expire and rot there.
  // Keyed on the joined paths so a parent re-render with an equal list does not re-sign.
  const pathKey = attachments.map((a) => a.path).join("|");
  useEffect(() => {
    const paths = pathKey ? pathKey.split("|") : [];
    // Nothing to sign. Entries left over from a removed file are never read — every lookup is
    // keyed by a path in the current list — so there is no state to clear here.
    if (paths.length === 0) return;
    let active = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL)
      .then(({ data }) => {
        if (!active || !data) return;
        setUrls(Object.fromEntries(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : []))));
      })
      .catch(() => {
        // Previews are a nicety; the chips still render with name, size and a delete button.
      });
    return () => {
      active = false;
    };
  }, [pathKey, supabase]);

  async function addFiles(files: File[]) {
    if (files.length === 0 || disabled) return;
    setError(null);

    // Validate everything before uploading anything, so a bad file in the middle of a multi-file
    // drop does not leave half of it uploaded.
    for (const file of files) {
      if (!isAttachmentType(file.type)) {
        setError(`«${file.name}»: поддерживаются PNG, JPG, WEBP и PDF.`);
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`«${file.name}»: ${formatSize(file.size)} — больше лимита в 10 МБ.`);
        return;
      }
    }
    if (attachments.length + files.length > 20) {
      setError("К одной задаче можно прикрепить не больше 20 файлов.");
      return;
    }

    setBusy(true);
    const uploaded: Attachment[] = [];
    try {
      for (const file of files) {
        const type = file.type as keyof typeof ATTACHMENT_TYPES;
        const path = `${taskId}/${crypto.randomUUID()}.${ATTACHMENT_TYPES[type]}`;
        const { error: upError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upError) {
          // Roll back this batch so storage does not keep files no row points at.
          if (uploaded.length > 0) await supabase.storage.from(BUCKET).remove(uploaded.map((a) => a.path));
          setError(uploadErrorMessage(upError.message, file.name));
          return;
        }
        uploaded.push({
          id: crypto.randomUUID(),
          name: file.name,
          path,
          size: file.size,
          type: file.type,
          createdAt: new Date().toISOString(),
        });
      }

      const saveError = await onChange([...attachments, ...uploaded]);
      if (saveError) {
        // The row never learned about these objects, so they are orphans: take them back out.
        await supabase.storage.from(BUCKET).remove(uploaded.map((a) => a.path));
        setError(saveError);
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = ""; // so re-picking the same file fires onChange
    }
  }

  async function remove(target: Attachment) {
    if (disabled) return;
    setError(null);
    setBusy(true);
    try {
      const saveError = await onChange(attachments.filter((a) => a.id !== target.id));
      if (saveError) {
        setError(saveError);
        return;
      }
      // Only after the row is saved. The other order risks a row pointing at a deleted object;
      // this order risks an orphaned object, which costs nothing but storage.
      await supabase.storage.from(BUCKET).remove([target.path]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Paperclip className="size-4 text-brand" aria-hidden /> Вложения
        {attachments.length > 0 && <span className="font-semibold text-ink-muted">{attachments.length}</span>}
        {busy && <Loader2 className="size-4 animate-spin text-ink-muted" aria-hidden />}
      </h3>

      {attachments.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {attachments.map((a) => {
            const url = urls[a.path];
            const image = isImageAttachment(a);
            return (
              <li
                key={a.id}
                className="group relative flex w-36 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
              >
                <a
                  href={url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  title={url ? `Открыть «${a.name}»` : "Ссылка готовится…"}
                  aria-disabled={!url || undefined}
                  className={`block ${url ? "" : "pointer-events-none opacity-60"}`}
                >
                  {image && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={a.name} className="h-20 w-full bg-muted object-cover" />
                  ) : (
                    <span className="flex h-20 w-full items-center justify-center bg-muted">
                      {image ? (
                        <ImageIcon className="size-7 text-ink-muted" aria-hidden />
                      ) : (
                        <FileText className="size-7 text-red-600" aria-hidden />
                      )}
                    </span>
                  )}
                  <span className="block truncate px-2 pt-1.5 text-[11px] font-semibold leading-tight" title={a.name}>
                    {a.name}
                  </span>
                  <span className="block px-2 pb-1.5 text-[10px] text-ink-muted tabular-nums">
                    {image ? "Изображение" : "PDF"} · {formatSize(a.size)}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => remove(a)}
                  disabled={busy || disabled}
                  title={`Удалить «${a.name}»`}
                  aria-label={`Удалить «${a.name}»`}
                  className="absolute right-1 top-1 rounded-md bg-surface/90 p-0.5 text-ink-muted opacity-0 shadow-sm transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles([...e.dataTransfer.files]);
        }}
        className={`flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors duration-150 ${
          dragging ? "border-brand bg-brand/5" : "border-line bg-canvas/60"
        }`}
      >
        <Upload className={`size-5 ${dragging ? "text-brand" : "text-ink-muted"}`} aria-hidden />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || disabled}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors hover:text-brand disabled:opacity-60"
        >
          Прикрепить файл
        </button>
        <p className="text-[11px] text-ink-muted">перетащите сюда · PNG, JPG, WEBP, PDF · до 10 МБ</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ATTACHMENT_MIMES.join(",")}
          onChange={(e) => void addFiles([...(e.target.files ?? [])])}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
