import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { getProjectDocs } from "@/lib/data";
import type { ProjectDoc } from "@/lib/types";

export const metadata: Metadata = { title: "Проекты · TimeCraft" };

const STATUS_LABEL: Record<string, string> = { active: "Активный" };

// Pages with a custom UI under src/app/projects/<slug>/ rather than a projects/*.md file.
const CUSTOM_PAGES: Pick<ProjectDoc, "slug" | "title" | "summary" | "status" | "category">[] = [
  { slug: "english-expansion", title: "English-speaking expansion", summary: "Strategy & SOP: market pivot, Tandem team profile, hard skills, monthly SLA" },
];

export default function ProjectsPage() {
  const docs = [...CUSTOM_PAGES, ...getProjectDocs()];
  return (
    <>
      <PageHeader title="Проекты" subtitle="Документация из папки projects/ в репозитории" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <Link
            key={d.slug}
            href={`/projects/${d.slug}`}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <FileText className="size-5 text-brand" aria-hidden />
              {d.status && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden /> {STATUS_LABEL[d.status] ?? d.status}
                </span>
              )}
            </div>
            {d.category && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{d.category}</p>}
            <h2 className="font-bold">{d.title}</h2>
            {d.summary && <p className="mt-1 flex-1 text-sm text-ink-muted">{d.summary}</p>}
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle group-hover:text-brand">
              /projects/{d.slug} <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
