"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Flame, Play, UserRound } from "lucide-react";

type Schedule = { id: string; scheduledDate: string; template: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string }[] } };
type Data = {
  plan: { id: string; name: string; templates: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string; sets: number; repMin: number; repMax: number; exercise: { name: string } }[] }[] } | null;
  sessions: { id: string; startedAt: string; completedAt: string | null; endedEarly: boolean }[];
  activeSession: { id: string; startedAt: string; pausedAt: string | null; elapsedSeconds: number; schedule: Schedule | null } | null;
  nextSchedule: Schedule | null;
  summary?: { completedCount: number; currentWeight: number | null };
};

export default function DashboardPage() {
  const [user, setUser] = useState<{ firstName: string; role: string } | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch("/api/auth/me").then(r => r.json()).then(d => { if (!d.user) { window.location.href = "/login?next=/dashboard"; return; } const role = d.user.role || "USER"; if (role === "USER" && !d.user.onboarding?.completedAt) { window.location.href = "/onboarding"; return; } setUser({ firstName: d.user.profile?.firstName?.trim() || "Athlete", role }); }); }, []);
  useEffect(() => { const now = new Date(); fetch(`/api/workouts/dashboard?year=${now.getFullYear()}&month=${now.getMonth()}`).then(async r => { const body = await r.text(); if (!r.ok) throw new Error(body || `HTTP ${r.status}`); return body ? JSON.parse(body) : null; }).then(d => { if (d) setData(d); }).catch(error => console.error("[DashboardPage]", error)).finally(() => setLoading(false)); }, []);

  if (!user) return <main className="min-h-screen p-8 text-sm text-[var(--muted)]">Caricamento...</main>;

  const next = data?.nextSchedule;
  const active = data?.activeSession;
  const workoutTarget = next?.template;
  const workoutHref = workoutTarget ? `/workout?day=${workoutTarget.dayNumber}&date=${next?.scheduledDate.slice(0, 10)}` : "/calendar";
  const completed = data?.summary?.completedCount ?? 0;
  const currentWeight = data?.summary?.currentWeight;
  const planDays = data?.plan?.templates.length ?? 0;
  const todayLabel = next ? new Date(next.scheduledDate).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : null;

  return <main className="min-h-screen overflow-x-hidden bg-[var(--background)] pb-28">
    <div className="mx-auto w-full max-w-6xl px-5 pb-8 pt-6 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--accent)]">IL TUO ALLENAMENTO</p><h1 className="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">Ciao, {user.firstName}.</h1><p className="mt-1 text-sm text-[var(--muted)]">{active ? (active.pausedAt ? "Hai un allenamento in pausa. Riprendi da dove avevi lasciato." : "Il tuo allenamento è ancora in corso.") : next ? "Sei pronto. Il prossimo workout è già preparato." : "Il tuo piano è pronto quando vuoi iniziare."}</p></div>
        <Link href="/profile" aria-label="Profilo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] transition-transform duration-200 active:scale-95"><UserRound size={19}/></Link>
      </header>
      <section className="relative mt-7 overflow-hidden rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-2xl sm:p-8"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" /><div className="relative"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-65"><Flame size={15}/>{active ? (active.pausedAt ? "ALLENAMENTO IN PAUSA" : "ALLENAMENTO IN CORSO") : next ? "PROSSIMO ALLENAMENTO" : "INIZIA DAL CALENDARIO"}</div><h2 className="mt-3 max-w-2xl text-[2rem] font-black leading-[1.02] tracking-tight sm:text-5xl">{workoutTarget?.name || "Scegli il tuo prossimo workout"}</h2>{workoutTarget && <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold opacity-75"><span>{todayLabel}</span><span>{workoutTarget.exercises.length} esercizi</span>{workoutTarget.estimatedMins ? <span>circa {workoutTarget.estimatedMins} min</span> : null}</div>}<Link href={active && active.schedule ? `/workout/active?template=${active.schedule.template.id}&date=${active.schedule.scheduledDate.slice(0, 10)}` : workoutTarget ? workoutHref : "/calendar"} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black text-white shadow-xl transition-transform duration-200 active:scale-[0.98] sm:w-auto"><Play size={17} fill="currentColor"/> {active ? (active.pausedAt ? "RIPRENDI ALLENAMENTO" : "CONTINUA ALLENAMENTO") : workoutTarget ? "INIZIA ALLENAMENTO" : "APRI CALENDARIO"}</Link></div></section>
      <section className="mt-7 grid grid-cols-3 border-y border-[var(--border)] py-4">
        <Link href="/progress" className="border-r border-[var(--border)] pr-3 transition active:opacity-70">
          <p className="text-xl font-black tracking-[-0.04em]">{completed}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">workout</p>
        </Link>
        <Link href="/progress" className="border-r border-[var(--border)] px-3 text-center transition active:opacity-70">
          <p className="text-xl font-black tracking-[-0.04em]">{currentWeight != null ? `${currentWeight} kg` : "—"}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">peso attuale</p>
        </Link>
        <Link href="/programs" className="pl-3 text-right transition active:opacity-70">
          <p className="truncate text-sm font-black">{data?.plan?.name || (loading ? "Caricamento..." : "Nessun programma")}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">{planDays ? `${planDays} giorni/settimana` : "programma"}</p>
        </Link>
      </section>

      <Link href="/programs" className="group mt-7 flex items-center justify-between gap-5 border-y border-[var(--border)] py-5 transition active:opacity-75">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">IL TUO PERCORSO</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Il piano si adatta al tuo lavoro.</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Carichi iniziali suggeriti e progressione automatica.</p>
        </div>
        <ArrowRight size={19} className="shrink-0 text-[var(--muted)] transition-transform duration-300 group-hover:translate-x-1 group-active:translate-x-0" />
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">IL TUO PERCORSO</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Segui il piano. L&apos;app pensa al resto.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">I carichi iniziali sono già suggeriti e la progressione si adatta alle serie che completi.</p></div><Link href="/programs" className="btn-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black">ESPLORA PROGRAMMI <ArrowRight size={16}/></Link></div></section>
      <section className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">ATTIVITÀ</p><h2 className="mt-2 text-2xl font-black">Ultimi workout</h2></div><Link href="/progress" className="text-xs font-black text-[var(--accent)]">Vedi tutto</Link></div>{data?.sessions.length ? <div className="mt-5 divide-y divide-[var(--border)]">{data.sessions.slice(-5).reverse().map(s => { const status = s.endedEarly ? "TERMINATO" : s.completedAt ? "COMPLETATO" : "IN CORSO"; return <div key={s.id} className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><CheckCircle2 size={18} className={s.completedAt ? "shrink-0 text-[var(--accent)]" : "shrink-0 text-[var(--muted)]"}/><span className="text-sm font-bold">{new Date(s.startedAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span></div><span className={`shrink-0 text-[10px] font-black tracking-[0.12em] ${s.completedAt && !s.endedEarly ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{status}</span></div>; })}</div> : <p className="mt-5 text-sm text-[var(--muted)]">Quando completi il primo workout apparirà qui.</p>}</section>
    </div>
  </main>;
}
