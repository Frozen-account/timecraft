import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Вход · TimeCraft" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-800 p-8 shadow-2xl">
        <Logo size="lg" />
        <h1 className="mt-8 text-lg font-bold text-white">Внутренний доступ</h1>
        <p className="mt-1 text-sm text-white/60">Войдите в рабочее пространство команды.</p>
        <LoginForm />
      </div>
    </div>
  );
}
