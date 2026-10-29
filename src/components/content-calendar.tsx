"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Film, MonitorPlay } from "lucide-react";
import { CONTENT_STATUSES, type ContentFormat, type ContentItem, type ContentStatus } from "@/lib/types";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

const FORMAT: Record<ContentFormat, { icon: typeof Film; cls: string }> = {
  Reels: { icon: Film, cls: "border-l-brand" },
  "Screen recording": { icon: MonitorPlay, cls: "border-l-blue-600" },
  Blog: { icon: FileText, cls: "border-l-ink" },
};

const STATUS: Record<ContentStatus, { label: string; cls: string }> = {
  idea: { label: "Idea", cls: "bg-muted text-ink-subtle ring-line" },
  scripted: { label: "Scripted", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  recorded: { label: "Recorded", cls: "bg-blue-50 text-blue-800 ring-blue-200" },
  published: { label: "Published", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ContentCalendar({ items }: { items: ContentItem[] }) {
  // The week is resolved in the browser so prerendering never depends on the build date.
  const [monday, setMonday] = useState<Date | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date
    setMonday(mondayOf(now));
    setToday(iso(now));
  }, []);

  const shiftWeek = (weeks: number) =>
    setMonday((m) => (m ? new Date(m.getFullYear(), m.getMonth(), m.getDate() + weeks * 7) : m));

  const days = WEEKDAYS.map((name, i) => {
    const date = monday ? new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i) : null;
    return { name, i, date, key: date ? iso(date) : "" };
  });
  const fmt = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const weekCount = items.filter((c) => days.some((d) => d.key === c.date)).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-sm">
          <button onClick={() => shiftWeek(-1)} aria-label="Предыдущая неделя" className="p-2 text-ink-muted hover:text-brand"><ChevronLeft className="size-4" /></button>
          <span className="min-w-44 px-2 text-center text-sm font-semibold tabular-nums">
            {days[0].date && days[6].date ? `${fmt(days[0].date)} — ${fmt(days[6].date)}` : "…"}
          </span>
          <button onClick={() => shiftWeek(1)} aria-label="Следующая неделя" className="p-2 text-ink-muted hover:text-brand"><ChevronRight className="size-4" /></button>
        </div>
        {monday && <span className="text-sm text-ink-muted">{weekCount} публикаций на неделе</span>}
        <ol className="ml-auto flex flex-wrap items-center gap-1 text-xs" aria-label="Этапы">
          {CONTENT_STATUSES.map((s, i) => (
            <li key={s} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-ink-muted" aria-hidden>→</span>}
              <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${STATUS[s].cls}`}>{STATUS[s].label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map(({ name, i, date, key }) => {
          const dayItems = items.filter((c) => c.date === key).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
          const isToday = key !== "" && key === today;
          return (
            <section key={name} className={`flex min-h-40 flex-col rounded-xl border bg-surface p-3 shadow-sm ${isToday ? "border-brand ring-1 ring-brand" : "border-line"}`}>
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className={`text-sm font-bold ${i >= 5 ? "text-ink-muted" : ""}`}>{name}</h2>
                {date && <span className={`text-xs tabular-nums ${isToday ? "font-bold text-brand" : "text-ink-muted"}`}>{fmt(date)}</span>}
              </header>
              <div className="flex flex-col gap-2">
                {dayItems.map((c) => {
                  const Icon = FORMAT[c.format].icon;
                  return (
                    <article key={c.id} className={`rounded-lg border border-line border-l-4 bg-canvas p-2.5 transition-all duration-200 hover:shadow-md ${FORMAT[c.format].cls}`}>
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <Icon className="size-3.5" aria-hidden />
                        <span className="font-semibold">{c.format}</span>
                        {c.time && <span className="ml-auto tabular-nums">{c.time}</span>}
                      </div>
                      <h3 className="text-sm font-semibold leading-snug">{c.title}</h3>
                      <p className="mt-1 text-xs text-ink-muted">{c.channel} · {c.owner}</p>
                      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                    </article>
                  );
                })}
                {date && dayItems.length === 0 && <p className="py-4 text-center text-xs text-ink-muted">Нет публикаций</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
