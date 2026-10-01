"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-7">
      <Link href="/" className="mb-12 inline-flex w-fit items-center gap-2 text-sm text-[var(--muted)]">
        <ArrowLeft size={18} /> Back
      </Link>

      <div className="mb-10">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-black text-[var(--accent-foreground)]">GP</div>
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">WELCOME BACK</p>
        <h1 className="text-4xl font-black tracking-tight">Train smarter.</h1>
        <p className="mt-3 text-[var(--muted)]">Sign in to continue your personalized program.</p>
      </div>

      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <input type="email" placeholder="you@example.com" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none transition focus:border-[var(--accent)]" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Password</span>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 pr-12 outline-none transition focus:border-[var(--accent)]" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--muted)]">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-[var(--accent)]">Forgot password?</Link>
        </div>

        <button type="submit" className="w-full rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] transition-transform active:scale-[.98]">LOGIN</button>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--border)]" />OR<span className="h-px flex-1 bg-[var(--border)]" /></div>

      <p className="text-center text-sm text-[var(--muted)]">Don&apos;t have an account? <Link href="/register" className="font-bold text-[var(--accent)]">Create one</Link></p>
    </main>
  );
}
