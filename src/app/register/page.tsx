"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("La password deve contenere almeno 8 caratteri.");
    if (password !== confirmPassword) return setError("Le password non coincidono.");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Non è stato possibile creare l'account.");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Impossibile raggiungere il server. Controlla che npm run dev sia attivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-6 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[var(--accent)] p-10 text-[var(--accent-foreground)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-16 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-black text-white">GP</div><span className="font-black tracking-[0.16em]">GYM PROGRESS</span></div>
            <p className="mb-4 text-sm font-black tracking-[0.18em]">YOUR TRAINING. YOUR DATA.</p>
            <h1 className="max-w-md text-5xl font-black leading-[0.95] tracking-tight xl:text-6xl">Build a plan that fits you.</h1>
            <p className="mt-6 max-w-md text-base font-medium leading-7 opacity-75">Tell us how you train, what you want to improve and where you want to go. We&apos;ll take care of the structure.</p>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white/15 p-5"><p className="text-sm font-bold">Your first step</p><p className="mt-1 text-sm opacity-70">Create your account, then complete a short onboarding.</p></div>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <Link href="/" className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-white"><ArrowLeft size={17} /> Back to home</Link>
          <div className="mb-9 max-w-lg"><div className="mb-5 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs font-black tracking-[0.14em] text-[var(--accent)]">STEP 1 OF 2</div><h2 className="text-4xl font-black tracking-tight sm:text-5xl">Create your account.</h2><p className="mt-3 leading-6 text-[var(--muted)]">Your account keeps your plan, workouts and progress saved.</p></div>

          {error && <div role="alert" className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}

          <form className="max-w-lg space-y-4" onSubmit={handleSubmit}>
            <label className="block"><span className="mb-2 block text-sm font-bold">Name</span><div className="relative"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required value={name} onChange={(event) => setName(event.target.value)} type="text" autoComplete="name" placeholder="Your name" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-4 outline-none transition focus:border-[var(--accent)]"/></div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Email</span><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-4 outline-none transition focus:border-[var(--accent)]"/></div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-12 outline-none transition focus:border-[var(--accent)]"/><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Confirm password</span><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-12 outline-none transition focus:border-[var(--accent)]"/><button type="button" aria-label="Toggle confirmation visibility" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">{showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
            <button disabled={loading} type="submit" className="mt-3 w-full rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}</button>
          </form>
          <p className="mt-7 max-w-lg text-center text-sm text-[var(--muted)] sm:text-left">Already have an account? <Link href="/login" className="font-bold text-[var(--accent)]">Log in</Link></p>
        </section>
      </div>
    </main>
  );
}
