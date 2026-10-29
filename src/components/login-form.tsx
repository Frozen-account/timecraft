"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

const ERRORS: Record<string, string> = {
  invalid_key: "Неверный ключ доступа.",
  not_configured: "Доступ не настроен: на сервере не задан TIMECRAFT_ACCESS_KEY.",
};

export function LoginForm() {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError("Введите ключ доступа.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, next }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; next?: string; error?: string };
      if (res.ok && data.ok) {
        window.location.assign(data.next ?? "/");
        return;
      }
      setError(ERRORS[data.error ?? ""] ?? "Не удалось войти. Попробуйте ещё раз.");
    } catch {
      setError("Нет связи с сервером.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-3">
      <label htmlFor="access-key" className="text-xs font-semibold uppercase tracking-wider text-white/60">Ключ доступа</label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          id="access-key"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(null); }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={`w-full rounded-lg border bg-white/5 py-3 pl-10 pr-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 ${
            error ? "border-red-400 focus:ring-red-400" : "border-white/15 focus:border-brand focus:ring-brand"
          }`}
          placeholder="••••••••••••"
        />
      </div>
      {error && <p id="login-error" role="alert" className="text-sm font-medium text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-bold text-white shadow-sm transition-all duration-200 hover:bg-brand-dark hover:shadow-md disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Войти
      </button>
    </form>
  );
}
