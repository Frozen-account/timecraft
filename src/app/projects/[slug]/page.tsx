import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MarkdownArticle } from "@/components/markdown-article";
import { getProjectDoc, getProjectDocs } from "@/lib/data";

export function generateStaticParams() {
  return getProjectDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const doc = getProjectDoc((await params).slug);
  return { title: `${doc?.title ?? "Проект"} · TimeCraft` };
}

export default async function ProjectDocPage({ params }: PageProps<"/projects/[slug]">) {
  const doc = getProjectDoc((await params).slug);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Все проекты
      </Link>
      <MarkdownArticle body={doc.body} />
      <p className="mt-3 text-xs text-ink-muted">Источник: projects/{doc.slug}.md</p>
    </div>
  );
}
