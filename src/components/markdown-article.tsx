import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Rendered Markdown card used by project docs and memory files.
export function MarkdownArticle({ body }: { body: string }) {
  return (
    <article className="prose prose-slate max-w-none rounded-xl border border-line bg-surface p-6 shadow-sm md:p-10 prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-brand prose-blockquote:border-l-brand prose-code:before:content-none prose-code:after:content-none prose-table:text-sm">
      <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
    </article>
  );
}
