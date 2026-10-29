import type { Metadata } from "next";
import { Briefcase, Building2, Megaphone, Users } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { mockLeads } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Аналитика · TimeCraft" };

interface Row {
  key: string;
  source: string;
  medium: string;
  campaign: string;
  total: number;
  jdg: number;
  spolka: number;
  other: number;
}

function buildAttribution(): Row[] {
  const rows = new Map<string, Row>();
  for (const l of mockLeads) {
    const key = `${l.utm_source}|${l.utm_medium}|${l.utm_campaign}`;
    const row = rows.get(key) ?? { key, source: l.utm_source, medium: l.utm_medium, campaign: l.utm_campaign, total: 0, jdg: 0, spolka: 0, other: 0 };
    row.total++;
    if (l.segment === "JDG") row.jdg++;
    else if (l.segment === "Spolka") row.spolka++;
    else row.other++;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.total - a.total);
}

export default function AnalyticsPage() {
  const rows = buildAttribution();
  const total = mockLeads.length;
  const jdg = mockLeads.filter((l) => l.segment === "JDG").length;
  const spolka = mockLeads.filter((l) => l.segment === "Spolka").length;
  const paid = mockLeads.filter((l) => l.utm_medium === "paid_social" || l.utm_medium === "cpc").length;
  const max = rows[0]?.total ?? 1;

  const kpis = [
    { label: "Всего лидов", value: total, note: "октябрь 2026", icon: Users },
    { label: "JDG", value: jdg, note: `${Math.round((jdg / total) * 100)}% от всех`, icon: Briefcase },
    { label: "Sp. z o.o.", value: spolka, note: `${Math.round((spolka / total) * 100)}% от всех`, icon: Building2 },
    { label: "Платный трафик", value: `${Math.round((paid / total) * 100)}%`, note: `${paid} лидов из Meta / Google Ads`, icon: Megaphone },
  ];

  return (
    <>
      <PageHeader title="Аналитика лидов" subtitle="Счётчик заявок и атрибуция по UTM-меткам">
        <span className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand">Демо-данные</span>
      </PageHeader>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
              <Icon className="size-4" aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface shadow-sm">
        <header className="border-b border-line px-5 py-4">
          <h2 className="font-bold">Атрибуция по UTM</h2>
          <p className="text-xs text-ink-muted">source / medium / campaign, last-touch</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3 font-bold">Источник / канал</th>
                <th className="px-5 py-3 font-bold">Кампания</th>
                <th className="px-5 py-3 text-right font-bold">JDG</th>
                <th className="px-5 py-3 text-right font-bold">Sp. z o.o.</th>
                <th className="px-5 py-3 text-right font-bold">Прочее</th>
                <th className="w-48 px-5 py-3 font-bold">Лиды</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3">
                    <span className="font-semibold">{r.source}</span>
                    <span className="text-ink-muted"> / {r.medium}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{r.campaign}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.jdg || "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.spolka || "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.other || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-brand" style={{ width: `${(r.total / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right font-bold tabular-nums">{r.total}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
