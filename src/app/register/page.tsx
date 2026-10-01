"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-7">
      <Link href="/" className="mb-12 inline-flex w-fit items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={18} /> Back</Link>
      <div className="mb-10">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-black text-[var(--accent-foreground)]">GP</div>
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">START YOUR JOURNEY</p>
        <h1 className="text-4xl font-black tracking-tight">Build your plan.</h1>
        <p className="mt-3 text-[var(--muted)]">Create your account, then we&apos;ll learn how you train and build your starting program.</p>
      </div>

      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Name</span><input type="text" placeholder="Your name" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none focus:border-[var(--accent)]" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input type="email" placeholder="you@example.com" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none focus:border-[var(--accent)]" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><input type="password" placeholder="At least 8 characters" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none focus:border-[var(--accent)]" /></label>
        <button type="submit" className="w-full rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)]">CONTINUE</button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-bold text-[var(--accent)]">Login</Link></p>
    </main>
  );
}
