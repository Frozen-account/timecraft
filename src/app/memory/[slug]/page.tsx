import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MarkdownArticle } from "@/components/markdown-article";
import { getMemoryDoc, getMemoryDocs } from "@/lib/data";

export function generateStaticParams() {
  return getMemoryDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/memory/[slug]">): Promise<Metadata> {
  const doc = getMemoryDoc((await params).slug);
  return { title: `${doc?.title ?? "Память"} · TimeCraft` };
}

export default async function MemoryDocPage({ params }: PageProps<"/memory/[slug]">) {
  const doc = getMemoryDoc((await params).slug);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/memory" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Вся память
      </Link>
      <MarkdownArticle body={doc.body} />
      <p className="mt-3 text-xs text-ink-muted">
        Источник: memory/{doc.slug}.md · {doc.project ?? "общий контекст"}{doc.updated && ` · обновлено ${doc.updated}`}
      </p>
    </div>
  );
}
