import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, BarChart3, Building2, FlaskConical, Search, Sparkles, CheckCircle2, FileUp, Globe2, Handshake, Languages,
  Landmark, Lightbulb, Megaphone, Mic, MonitorPlay, ReceiptText, Rocket, Scale, Target, TrendingUp, UserRound, UserRoundCog, Users, Waves,
} from "lucide-react";
import { GlossaryTable, type GlossaryEntry } from "@/components/glossary-table";

export const metadata: Metadata = { title: "English Expansion · TimeCraft" };

// Keep these figures identical to projects/competitor-benchmarking.md.
const PRICING = [
  { segment: "Russian-speaking market, Warsaw", price: "700 – 1,000 PLN", note: "50+ competitors, price war", highlight: false },
  { segment: "IMOSTA English-speaking offer", price: "1,200 – 2,000+ PLN", note: "Target: higher margin, premium service", highlight: true },
  { segment: "International firms (TMF, Accace, getsix, CGO Group, SDZLEGAL)", price: "2,500 – 4,500+ PLN", note: "Our undercut benchmark", highlight: false },
];

const TIERS = [
  { name: "Starter", price: "1,200 PLN", scope: "Up to 10 documents / month" },
  { name: "Growth", price: "1,600 – 1,800 PLN", scope: "IT / SaaS, VAT-UE, up to 25 documents / month" },
  { name: "Scale", price: "2,200+ PLN", scope: "Higher volume and complex cross-border structures" },
];

const GLOSSARY: GlossaryEntry[] = [
  { pl: "CIT / PIT", en: "Corporate / Personal Income Tax" },
  { pl: "KPiR / Pełna księgowość", en: "Simplified cash-basis book / Full statutory commercial accounting" },
  { pl: "ZUS", en: "Social Security Institution / Social & Health Insurance contributions" },
  { pl: "JPK_V7", en: "Standard Audit File for Tax (SAF-T) / Monthly VAT reporting" },
  { pl: "Biała lista podatników", en: "VAT White List" },
  { pl: "Mechanizm podzielonej płatności (MPP)", en: "Split payment mechanism" },
  { pl: "Estoński CIT", en: "Estonian CIT / Distributed profit taxation system" },
];

const HARD_SKILLS = [
  {
    title: "Cross-border VAT",
    icon: Globe2,
    items: ["VAT-UE registration & returns", "Reverse charge (Odwrotne obciążenie) for non-EU services", "VAT-OSS for e-commerce"],
  },
  {
    title: "Withholding Tax (WHT)",
    icon: Landmark,
    items: ["Cross-border dividends, royalties, intangible services", "Certificates of Tax Residence (CFR)", "Double Tax Treaties (DTT)"],
  },
  {
    title: "Non-resident governance",
    icon: UserRoundCog,
    items: ["Board appointments (Powołanie zarządu), 9% NFZ health contribution", "IFT-1R and IFT-2R annual reporting"],
  },
  {
    title: "Multi-currency & fintech",
    icon: Banknote,
    items: ["FX differences (Różnice kursowe) via NBP table A", "Reconciliation: Revolut Business, Wise, Stripe, PayPal, PayU"],
  },
];

// Day = IMOSTA internal SLA; statutory = legal deadline the SLA must stay ahead of.
// Each target leaves the client at least 5 days to pay before the statutory deadline.
const RHYTHM = [
  { day: "5th", title: "Documents uploaded", detail: "Client uploads all invoices, statements and receipts to the portal.", statutory: "—" },
  { day: "12th", title: "ZUS sent to client", detail: "Contribution amounts and ZUS transfer details delivered.", statutory: "ZUS payment: 20th" },
  { day: "15th", title: "PIT / CIT sent to client", detail: "Advance amounts with micro-account transfer guide.", statutory: "PIT / CIT advance: 20th" },
  { day: "20th", title: "VAT / JPK_V7 sent to client", detail: "VAT amount, JPK_V7 filed, transfer guide.", statutory: "VAT & JPK_V7: 25th" },
];

type Channel = {
  title: string;
  subtitle?: string;
  icon: typeof Target;
  badges: string[];
  items: string[];
  people?: { name: string; role: string; focus: string }[];
  note?: string;
};

const CHANNELS: Channel[] = [
  {
    title: "Meta Ads & English social boost",
    icon: Megaphone,
    badges: ["Paid", "Organic", "Facebook / Instagram"],
    items: [
      "High-signal English content: short Reels and carousels breaking down Polish tax traps for foreign founders.",
      "Paid Meta Ads targeted at expats, foreign business owners and startup employees living in Poland.",
    ],
  },
  {
    title: "LinkedIn company page",
    icon: Building2,
    badges: ["Organic", "Brand", "LinkedIn"],
    items: [
      "Position IMOSTA as the go-to English-speaking boutique accounting firm in Poland.",
      "Case studies, compliance updates (KSeF, Estoński CIT, WHT thresholds) and founder guides.",
    ],
  },
  {
    title: "Executive & team personal branding",
    icon: Mic,
    badges: ["Organic", "LinkedIn", "Ghostwritten with consent"],
    items: [],
    people: [
      { name: "Oleg", role: "CEO", focus: "Thought leadership on doing business and scaling a Spółka z o.o. in Poland as an international entrepreneur." },
      { name: "Tatsiana Bakayeva", role: "Chief Accountant", focus: "Technical authority: tax law nuances, cross-border VAT, direct answers to tricky compliance questions." },
      { name: "Alena & Irina", role: "Managers", focus: "Customer success stories, onboarding highlights, day-to-day client problem solving." },
    ],
  },
  {
    title: "Cold outreach to funded tech startups",
    icon: Rocket,
    badges: ["Outbound", "B2B", "Poland / CEE"],
    items: [
      "Automated monitoring of funding rounds in Poland / CEE: MamStartup, PR Newswire, EU-Startups, Crunchbase.",
      "Personalized founder-to-founder outreach offering a seamless transition to Polish accounting and corporate compliance after funding.",
    ],
  },
  {
    title: "Google Display on niche YouTube channels",
    icon: MonitorPlay,
    badges: ["Paid", "Google Ads", "Placements"],
    items: [
      "Banner and pre-roll ads placed only on selected expat and business YouTube channels.",
      "Channel themes: moving to Poland, setting up an IT company, taxes in Poland.",
    ],
  },
  {
    title: "OpenAI Ads & Sponsored Prompts",
    subtitle: "Платный трафик из ChatGPT",
    icon: Sparkles,
    badges: ["Paid", "Emerging Channel", "High Intent"],
    items: [
      "Sponsored placements and commercial integrations directly inside conversational AI search for high-intent B2B prompts: “best English speaking accountant in Poland”, “how to incorporate Sp. z o.o. for non-residents”, “cross-border VAT accounting Poland”.",
      "Strategic advantage: captures tech-first founders and international startup operators right at the moment they ask complex tax and corporate structure questions.",
    ],
    note: "Ads in ChatGPT started as a limited test in early 2026. Verify availability in Poland and how to buy placements before budgeting.",
  },
];

const BADGE_STYLE: Record<string, string> = {
  Paid: "bg-brand text-white ring-brand",
  Organic: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Outbound: "bg-blue-50 text-blue-800 ring-blue-200",
  "Emerging Channel": "bg-amber-50 text-amber-800 ring-amber-200",
  "High Intent": "bg-ink text-white ring-ink",
};

type Method = {
  title: string;
  icon: typeof Target;
  method: { label: string; text: string; chips?: string[] }[];
  metric: string;
};

const MARKET_SIZING: Method[] = [
  {
    title: "Polish national registries (KRS & CEIDG analytics)",
    icon: Landmark,
    method: [{ label: "Source", text: "PIE (Polski Instytut Ekonomiczny) reports on foreign entrepreneurs; KRS beneficiary databases (rejestr.io)." }],
    metric: "Active Spółka z o.o. entities with non-CIS board members / shareholders (Germany, USA, UK, India, France, Turkey). Establishes the hard TAM.",
  },
  {
    title: "Transactional Google search demand",
    icon: Search,
    method: [
      { label: "Tools", text: "Ahrefs / Google Keyword Planner." },
      { label: "Base cluster", text: "", chips: ["accounting warsaw", "english speaking accountant poland", "accounting services for foreign companies poland"] },
      { label: "High-ticket cluster", text: "", chips: ["register spolka z oo online", "estonski cit poland", "vat-ue registration poland", "withholding tax poland dividends"] },
    ],
    metric: "Monthly search volume and commercial CPC benchmark — find where competitors bid 15–30+ PLN per click.",
  },
  {
    title: "Audience sizing in Meta Ads & LinkedIn Campaign Manager",
    icon: Users,
    method: [
      { label: "Meta Ads", text: "Poland + English interface + “Expats (lived in Poland)” + Small business owners." },
      { label: "LinkedIn", text: "Poland, English language, seniority Founder / Co-founder / CEO / Managing Director, companies up to 50 employees." },
    ],
    metric: "Reachable audience size. Hypothesis: 8,000–15,000 key decision makers in Warsaw & Krakow.",
  },
  {
    title: "Startup ecosystem & VC hub monitoring",
    icon: Rocket,
    method: [
      { label: "Data", text: "Active Pre-seed / Seed rounds via Dealroom Poland and PFR Ventures quarterly reports." },
      { label: "On the ground", text: "Campus Warsaw (Google for Startups), CIC Warsaw, Mindspace, Brain Embassy." },
    ],
    metric: "Funded companies per quarter and share of international founders in hubs (hypothesis: 40–50%).",
  },
  {
    title: "Fast smoke test (paid pilot campaign)",
    icon: FlaskConical,
    method: [{ label: "Pilot", text: "3–5 day micro-budget campaign (€100–€150) on Meta / LinkedIn driving to the 1,200 PLN/mo offer." }],
    metric: "Cost per qualified lead (CPL) and discovery-call show-up rate — before committing to full English-speaking team expansion.",
  },
];

function Section({ n, title, icon: Icon, children }: { n: number; title: string; icon: typeof Target; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6" id={`s${n}`}>
      <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm text-white">{n}</span>
        {title}
        <Icon className="size-5 text-ink-muted" aria-hidden />
      </h2>
      {children}
    </section>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-line bg-surface p-5 shadow-sm ${className}`}>{children}</div>;
}

export default function EnglishExpansionPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Все проекты
      </Link>

      <header className="mb-8 rounded-xl bg-ink p-6 text-white md:p-8">
        <span className="rounded-md bg-brand px-2 py-1 text-xs font-bold uppercase tracking-wider">Strategy & SOP</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-4xl">English-speaking expansion</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
          Moving from the saturated Russian-speaking market to international founders, expats and startups in Poland — and the team standard that makes it work.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Sections">
          {["Strategy", "Team profile", "Hard skills", "Workflow & SLA", "Acquisition channels", "Market sizing"].map((s, i) => (
            <a key={s} href={`#s${i + 1}`} className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">{i + 1}. {s}</a>
          ))}
        </nav>
      </header>

      <div lang="ru" className="mb-10 rounded-xl border-2 border-amber-400 bg-amber-50 p-5 md:p-6">
        <p className="flex items-center gap-2 font-extrabold text-amber-900">
          <AlertTriangle className="size-5 shrink-0" aria-hidden /> Стратегические вопросы для проверки перед запуском
        </p>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6 text-sm leading-relaxed text-ink">
          <li>Может ли отдел саппорта тянуть английских клиентов (проверить у Ирины, как Алена и Виктория говорят и ведут деловую переписку на английском)?</li>
          <li>Подходит ли текущий софт Taxo для загрузки фактур под англоязычную аудиторию (есть ли английский UI из коробки)?</li>
        </ol>
      </div>

      <div className="flex flex-col gap-12">
        <Section n={1} title="Strategy & market opportunity" icon={Target}>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-brand">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand"><AlertTriangle className="size-4" aria-hidden /> Problem · Red Ocean</p>
              <p className="text-sm leading-relaxed">
                The Russian-speaking accounting market in Warsaw is saturated: <strong>50+ active competitors</strong> and price pressure down to <strong>700 – 1,000 PLN/mo</strong>.
              </p>
            </Card>
            <Card className="border-l-4 border-l-emerald-600">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700"><Waves className="size-4" aria-hidden /> Solution · Blue Ocean</p>
              <p className="text-sm leading-relaxed">
                Pivot into high-margin English-speaking business segments: founders from the <strong>UK, EU, US</strong>, and regional tech hubs (<strong>India, Turkey</strong>), international e-commerce, and VC-backed startups.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <p className="mb-0.5 flex items-center gap-2 font-bold">
                    <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">Tier-1 focus</span> UK / US / EU
                  </p>
                  <p className="text-ink-subtle">High willingness to pay, post-Brexit EU branch setups, complex cross-border VAT & WHT compliance.</p>
                </div>
                <div className="rounded-lg bg-canvas p-3 ring-1 ring-line">
                  <p className="mb-0.5 flex items-center gap-2 font-bold">
                    <span className="rounded bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">Emerging hubs</span> India, Turkey, Asia
                  </p>
                  <p className="text-ink-subtle">High-skilled IT contractors and tech founders with verified capital.</p>
                  <p className="mt-2 flex gap-1.5 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Keep immigration / visa-driven inquiries segmented separately to protect banking compliance and operational bandwidth.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-4 rounded-xl border-2 border-brand bg-brand-soft/50 p-5 md:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Core offer</p>
            <p className="mt-2 text-lg font-extrabold leading-snug md:text-xl">
              Full-service English-speaking accounting for Spółka z o.o. & Startups in Poland — from 1,200 PLN/mo
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Full statutory compliance", "VAT-UE", "Stripe / Revolut integrations", "English portal"].map((f) => (
                <span key={f} className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold ring-1 ring-brand/30">
                  <CheckCircle2 className="size-3.5 text-brand" aria-hidden /> {f}
                </span>
              ))}
            </div>
          </div>

          <Card className="mt-4 overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="px-5 pt-4 text-left font-bold">Target economics · monthly fee</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-bold">Segment</th>
                  <th className="px-5 py-3 font-bold">Price / mo</th>
                  <th className="px-5 py-3 font-bold">Position</th>
                </tr>
              </thead>
              <tbody>
                {PRICING.map((p) => (
                  <tr key={p.segment} className={`border-b border-line last:border-0 ${p.highlight ? "bg-brand-soft/40" : ""}`}>
                    <td className={`px-5 py-3 ${p.highlight ? "font-bold" : "font-semibold"}`}>{p.segment}</td>
                    <td className={`px-5 py-3 tabular-nums ${p.highlight ? "font-extrabold text-brand" : ""}`}>{p.price}</td>
                    <td className="px-5 py-3 text-ink-muted">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-4">
            <p className="mb-2 text-sm font-bold">IMOSTA pricing tiers · <span className="text-brand">1,200 – 2,000+ PLN</span></p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TIERS.map((t, i) => (
                <Card key={t.name} className={i === 1 ? "border-brand ring-1 ring-brand" : ""}>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t.name}</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-brand">{t.price}<span className="text-xs font-semibold text-ink-muted"> / mo</span></p>
                  <p className="mt-1 text-sm text-ink-subtle">{t.scope}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
            <Search className="size-6 shrink-0 text-brand" aria-hidden />
            <div lang="ru" className="flex-1">
              <h3 className="font-bold">Бенчмаркинг рынка (RU vs EN сегменты)</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Русскоязычные бюро (50+, 700 – 1,000 PLN, демпинг) против международных фирм (TMF, Accace, getsix, CGO Group, SDZLEGAL — 2,500 – 4,500+ PLN, жёсткий онбординг).
                Ниша IMOSTA: boutique English accounting с enterprise-уровнем compliance по цене SME — 1,200 – 2,000+ PLN. Сравнение по 8 критериям и методика сбора данных.
              </p>
            </div>
            <Link
              href="/projects/competitor-benchmarking"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md"
            >
              Открыть <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>
        </Section>

        <Section n={2} title="Accountant & account manager profile" icon={Users}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <Card>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Front office</p>
              <h3 className="mt-1 font-bold">English Client Manager</h3>
              <p className="mt-1 text-sm text-ink-muted">Onboarding, calls, explaining obligations, single point of contact.</p>
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
                <li className="flex gap-2"><UserRound className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><span><strong>Alena</strong> — primary manager assigned to incoming inquiries and discovery calls</span></li>
                <li className="flex gap-2"><FileUp className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><span><strong>Taxo</strong> — our sole paperless invoice upload portal</span></li>
              </ul>
            </Card>
            <div className="flex items-center justify-center text-brand" aria-hidden>
              <span className="flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                <Handshake className="size-4" /> Tandem
              </span>
            </div>
            <Card>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Back office</p>
              <h3 className="mt-1 font-bold">Senior Polish Accountant</h3>
              <p className="mt-1 text-sm text-ink-muted">Bookkeeping, filings and statutory compliance.</p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr]">
            <Card className="flex items-center gap-4 md:flex-col md:justify-center md:px-8 md:text-center">
              <Languages className="size-6 text-brand" aria-hidden />
              <div>
                <p className="text-3xl font-extrabold">B2+ / C1</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">English level</p>
              </div>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700"><Lightbulb className="size-4" aria-hidden /> “Explain like I’m 5” culture</p>
              <p className="text-sm">Never send dry tax notes. Every payment message includes the full breakdown, the tax form code and an exact transfer guide.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">✕ Don’t</p>
                  <p className="font-mono text-xs">Pay CIT by 20th.</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">✓ Do</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
                    <dt className="text-ink-muted">Tax</dt><dd>CIT advance, October 2026</dd>
                    <dt className="text-ink-muted">Amount</dt><dd>3,250.00 PLN</dd>
                    <dt className="text-ink-muted">Due</dt><dd>20 November 2026</dd>
                    <dt className="text-ink-muted">To</dt><dd>your tax micro-account (PL…)</dd>
                    <dt className="text-ink-muted">Form</dt><dd>CIT-8 · period 26M10</dd>
                  </dl>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-4">
            <GlossaryTable entries={GLOSSARY} />
          </div>
        </Section>

        <Section n={3} title="Tax & operational hard-skills checklist" icon={ReceiptText}>
          <div className="grid gap-4 sm:grid-cols-2">
            {HARD_SKILLS.map(({ title, icon: Icon, items }) => (
              <Card key={title}>
                <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon className="size-5 text-brand" aria-hidden /> {title}</h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {items.map((it) => (
                    <li key={it} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {it}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        <Section n={4} title="Digital workflow & SLA" icon={FileUp}>
          <Card className="mb-4 flex items-start gap-4">
            <FileUp className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
            <div>
              <h3 className="font-bold">100% paperless client portal</h3>
              <p className="mt-1 text-sm text-ink-muted">Clients drag & drop PDFs via Taxo, our sole upload portal. No paper, no email attachments.</p>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 font-bold">Monthly tax rhythm</h3>
            <ol className="relative flex flex-col gap-5 border-l-2 border-line pl-6 md:grid md:grid-cols-4 md:gap-4 md:border-l-0 md:border-t-2 md:pl-0 md:pt-6">
              {RHYTHM.map((r) => (
                <li key={r.day} className="relative">
                  <span className="absolute -left-[33px] top-0.5 size-4 rounded-full border-4 border-surface bg-brand md:-top-[33px] md:left-0" aria-hidden />
                  <p className="text-2xl font-extrabold text-brand">{r.day}</p>
                  <p className="font-bold">{r.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{r.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-subtle">Statutory: {r.statutory}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-lg bg-muted px-3 py-2 text-xs text-ink-subtle">
              Days are IMOSTA internal targets. Statutory deadlines must be confirmed by the Head of Accounting before this SOP goes to clients.
            </p>
          </Card>
        </Section>

        <Section n={5} title="Acquisition channels & growth strategy" icon={TrendingUp}>
          <p className="-mt-2 mb-4 text-sm text-ink-muted">Каналы привлечения · six channels for the English-speaking segment</p>
          <div className="grid gap-4 md:grid-cols-2">
            {CHANNELS.map(({ title, subtitle, icon: Icon, badges, items, people, note }) => (
              <Card key={title} className={`flex flex-col ${people ? "md:row-span-2" : ""}`}>
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="font-bold leading-snug">{title}</h3>
                    {subtitle && <p lang="ru" className="text-xs font-semibold text-ink-muted">{subtitle}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {badges.map((b) => (
                        <span key={b} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${BADGE_STYLE[b] ?? "bg-muted text-ink-subtle ring-line"}`}>{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {items.length > 0 && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {items.map((it) => (
                      <li key={it} className="flex gap-2"><ArrowRight className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {it}</li>
                    ))}
                  </ul>
                )}
                {people && (
                  <ul className="flex flex-col gap-3">
                    {people.map((p) => (
                      <li key={p.name} className="rounded-lg bg-canvas p-3 ring-1 ring-line">
                        <p className="text-sm font-bold">{p.name} <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">{p.role}</span></p>
                        <p className="mt-1 text-sm text-ink-subtle">{p.focus}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {note && (
                  <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {note}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="mt-4 rounded-xl border-l-4 border-l-amber-500 bg-amber-50 p-5 text-sm">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800"><Scale className="size-4" aria-hidden /> Compliance check before launching outreach</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-subtle">
              <li>Polish law (Prawo komunikacji elektronicznej) requires prior consent for unsolicited commercial e-mail, B2B included. Open with a LinkedIn connection or a request for permission, not a sales e-mail — confirm with a lawyer.</li>
              <li>Collecting founder contact data is GDPR processing: document the legitimate interest, inform on first contact, honour opt-outs.</li>
              <li>Use official APIs or data licences (e.g. Crunchbase API) instead of scraping sites whose terms forbid it.</li>
              <li>Ghostwritten posts are published only after the named person approves each one.</li>
            </ul>
          </div>
        </Section>

        <Section n={6} title="Market sizing & hypothesis validation" icon={BarChart3}>
          <p lang="ru" className="-mt-2 mb-4 text-sm text-ink-muted">Оценка объема рынка и проверка гипотезы</p>
          <ol className="grid gap-4 md:grid-cols-2">
            {MARKET_SIZING.map(({ title, icon: Icon, method, metric }, i) => (
              <li key={title} className={i === MARKET_SIZING.length - 1 ? "md:col-span-2" : ""}>
                <Card className="flex h-full flex-col">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white"><Icon className="size-5" aria-hidden /></span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Method {i + 1}</p>
                      <h3 className="font-bold leading-snug">{title}</h3>
                    </div>
                  </div>
                  <dl className="flex flex-1 flex-col gap-2 text-sm">
                    {method.map((m) => (
                      <div key={m.label}>
                        <dt className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{m.label}</dt>
                        {m.text && <dd>{m.text}</dd>}
                        {m.chips && (
                          <dd className="mt-1 flex flex-wrap gap-1">
                            {m.chips.map((c) => <code key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs ring-1 ring-line">{c}</code>)}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 rounded-lg border-l-4 border-l-brand bg-brand-soft/50 px-3 py-2 text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">Metric · </span>{metric}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}
