// Demo lead data for /analytics until leads are stored somewhere queryable.
import type { Lead } from "./types";

const campaigns: Array<Omit<Lead, "id" | "createdAt"> & { count: number }> = [
  { segment: "JDG", utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "jdg_start_24h", utm_content: "video_hook_a", count: 18 },
  { segment: "JDG", utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "jdg_start_24h", utm_content: "static_calc", count: 9 },
  { segment: "JDG", utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "jdg_ryczalt_reels", utm_content: "reels_3_mistakes", count: 7 },
  { segment: "Spolka", utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "spolka_estonski_cit", utm_content: "carousel_cit", count: 6 },
  { segment: "Spolka", utm_source: "google", utm_medium: "cpc", utm_campaign: "spolka_ksiegowosc_search", count: 5 },
  { segment: "Консультация", utm_source: "(direct)", utm_medium: "(none)", utm_campaign: "(none)", count: 4 },
  { segment: "JDG", utm_source: "google", utm_medium: "organic", utm_campaign: "(none)", count: 3 },
];

export const mockLeads: Lead[] = campaigns.flatMap(({ count, ...c }, ci) =>
  Array.from({ length: count }, (_, i) => ({
    ...c,
    id: `l${ci}-${i}`,
    createdAt: new Date(Date.UTC(2026, 9, 1 + ((i * 3 + ci) % 26), 9 + (i % 9))).toISOString(),
  })),
);
