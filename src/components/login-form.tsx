"use client";

import { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";

const ERRORS: Record<string, string> = {
  invalid_credentials: "Неверный email или пароль.",
  missing_credentials: "Введите email и пароль.",
  rate_limited: "Слишком много попыток. Подождите минуту и попробуйте снова.",
  not_configured: "Доступ не настроен: на сервере не заданы NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
};

const FIELD_CLASS =
  "w-full rounded-lg border bg-white/5 py-3 pl-10 pr-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-1";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(ERRORS.missing_credentials);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, next }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; next?: string; error?: string };
      if (res.ok && data.ok) {
        // Full reload so the proxy sees the fresh session cookies on the next navigation.
        window.location.assign(data.next ?? "/");
        return;
      }
      setError(ERRORS[data.error ?? ""] ?? "Не удалось войти. Попробуйте ещё раз.");
    } catch {
      setError("Нет связи с сервером.");
    }
    setPending(false);
  }

  const invalid = error ? "border-red-400 focus:ring-red-400" : "border-white/15 focus:border-brand focus:ring-brand";

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-white/60">Email</label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={`${FIELD_CLASS} ${invalid}`}
          placeholder="you@timecraft.pro"
        />
      </div>

      <label htmlFor="password" className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">Пароль</label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={`${FIELD_CLASS} ${invalid}`}
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
