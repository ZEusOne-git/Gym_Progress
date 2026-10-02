"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);

  useEffect(() => {
    setAdminAccess(new URLSearchParams(window.location.search).get("next") === "/admin");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Impossibile effettuare il login.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
      router.push(destination);
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
        <section className="hidden overflow-hidden bg-[var(--accent)] p-10 text-[var(--accent-foreground)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-16 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-black text-white">GP</div><span className="font-black tracking-[0.16em]">GYM PROGRESS</span></div>
            <p className="mb-4 text-sm font-black tracking-[0.18em]">{adminAccess ? "ACCESSO AMMINISTRAZIONE" : "BENTORNATO"}</p>
            <h1 className="max-w-md text-5xl font-black leading-[0.95] tracking-tight xl:text-6xl">{adminAccess ? "Area riservata." : "Continua a crescere."}</h1>
            <p className="mt-6 max-w-md text-base font-medium leading-7 opacity-75">{adminAccess ? "Accedi con l’account admin per gestire programmi, esercizi e utenti." : "I tuoi allenamenti e i tuoi progressi ti aspettano."}</p>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white/15 p-5"><p className="text-sm font-bold">Train with purpose.</p><p className="mt-1 text-sm opacity-70">Log in to pick up exactly where you left off.</p></div>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <Link href="/" className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-white"><ArrowLeft size={17}/> Torna alla home</Link>
          <div className="mb-9 max-w-lg"><div className="mb-5 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs font-black tracking-[0.14em] text-[var(--accent)]">{adminAccess ? "ACCESSO ADMIN" : "BENTORNATO"}</div><h2 className="text-4xl font-black tracking-tight sm:text-5xl">{adminAccess ? "Area admin." : "Accedi."}</h2><p className="mt-3 leading-6 text-[var(--muted)]">{adminAccess ? "Usa le credenziali del tuo account amministratore." : "Riprendi il tuo percorso e ritrova i tuoi progressi."}</p></div>
          {error && <div role="alert" className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}
          <form className="max-w-lg space-y-4" onSubmit={handleSubmit}>
            <label className="block"><span className="mb-2 block text-sm font-bold">Email</span><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="nome@esempio.it" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-4 outline-none transition focus:border-[var(--accent)]"/></div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/><input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="La tua password" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] py-4 pl-12 pr-12 outline-none transition focus:border-[var(--accent)]"/><button type="button" aria-label={showPassword ? "Nascondi password" : "Mostra password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
            <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{loading && <Loader2 className="animate-spin" size={18}/>} {loading ? "ACCESSO..." : adminAccess ? "ACCEDI ALL’AMMINISTRAZIONE" : "ACCEDI"}</button>
          </form>
          {!adminAccess && <p className="mt-7 max-w-lg text-center text-sm text-[var(--muted)] sm:text-left">Non hai un account? <Link href="/register" className="font-bold text-[var(--accent)]">Registrati</Link></p>}
          {!adminAccess && <Link href="/login?next=%2Fadmin" className="mt-5 inline-flex w-fit text-xs font-bold text-[var(--muted)] underline-offset-4 hover:underline">Accesso per amministratori</Link>}
        </section>
      </div>
    </main>
  );
}
