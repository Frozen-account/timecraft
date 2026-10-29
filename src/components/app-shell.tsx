"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, Brain, CalendarDays, Clapperboard, FolderOpen, KanbanSquare, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/tasks", label: "Задачи", icon: KanbanSquare },
  { href: "/schedule", label: "Календарь", icon: CalendarDays },
  { href: "/projects", label: "Проекты", icon: FolderOpen },
  { href: "/memory", label: "Память", icon: Brain },
  { href: "/agents", label: "Агенты", icon: Bot },
  { href: "/content", label: "Контент-план", icon: Clapperboard },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return <>{children}</>;

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    // Full reload on purpose: drops the client router cache so protected pages aren't shown from memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-ink text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block md:px-6 md:py-6">
          <Link href="/" className="block">
            <Logo />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-white md:mt-6"
          >
            <LogOut className="size-4" aria-hidden />
            Выйти
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
