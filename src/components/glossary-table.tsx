"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export interface GlossaryEntry {
  pl: string;
  en: string;
}

export function GlossaryTable({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = q ? entries.filter((e) => e.pl.toLowerCase().includes(q) || e.en.toLowerCase().includes(q)) : entries;

  return (
    <div className="rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="font-bold">Financial glossary · PL → EN</h3>
          <p className="text-xs text-ink-muted">Use these exact English terms in every client message.</p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm focus-within:border-brand focus-within:ring-1 focus-within:ring-brand sm:w-64">
          <Search className="size-4 text-ink-muted" aria-hidden />
          <span className="sr-only">Search glossary</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search term…" className="w-full bg-transparent focus:outline-none" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="w-2/5 px-5 py-3 font-bold">Polish term</th>
              <th className="px-5 py-3 font-bold">Say to the client</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.pl} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="px-5 py-3 font-semibold">{e.pl}</td>
                <td className="px-5 py-3 text-ink-subtle">{e.en}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} className="px-5 py-6 text-center text-ink-muted">No matching terms</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
