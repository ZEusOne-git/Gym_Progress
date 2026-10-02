"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Dumbbell, Flame, Play, TrendingUp, UserRound } from "lucide-react";

type Schedule = { id: string; scheduledDate: string; template: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string }[] } };
type Data = {
  plan: { id: string; name: string; templates: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string; sets: number; repMin: number; repMax: number; exercise: { name: string } }[] }[] } | null;
  sessions: { id: string; startedAt: string; completedAt: string | null }[];
  activeSession: { id: string; startedAt: string; schedule: Schedule | null } | null;
  nextSchedule: Schedule | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<{ firstName: string; role: string } | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { window.location.href = "/login?next=/dashboard"; return; }
      const role = d.user.role || "USER";
      if (role === "USER" && !d.user.onboarding?.completedAt) { window.location.href = "/onboarding"; return; }
      setUser({ firstName: d.user.profile?.firstName?.trim() || "Athlete", role });
    });
  }, []);

  useEffect(() => {
    const now = new Date();
    fetch(`/api/workouts/dashboard?year=${now.getFullYear()}&month=${now.getMonth()}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (!user) return <main className="min-h-screen p-8 text-sm text-[var(--muted)]">Caricamento...</main>;

  const next = data?.nextSchedule;
  const active = data?.activeSession;
  const workoutTarget = next?.template;
  const workoutHref = workoutTarget ? `/workout?day=${workoutTarget.dayNumber}&date=${next?.scheduledDate.slice(0, 10)}` : "/calendar";
  const completed = data?.sessions.filter(s => s.completedAt).length ?? 0;
  const scheduledThisMonth = data?.plan ? data.plan.templates.length : 0;

  return <main className="min-h-screen bg-[var(--background)] pb-28">
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between gap-4">
        <div><p className="text-xs font-black tracking-[0.25em] text-[var(--accent)]">PER TE</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Ciao, {user.firstName}.</h1><p className="mt-1 text-sm text-[var(--muted)]">{active ? "Hai un allenamento in corso. Riparti da dove avevi lasciato." : next ? "Il tuo prossimo allenamento è già pronto." : "Il tuo piano è pronto quando vuoi iniziare."}</p></div>
        <Link href="/profile" aria-label="Profilo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"><UserRound size={19}/></Link>
      </header>

      <section className="mt-8 rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-2xl sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.2em] opacity-70"><Flame size={16}/> {active ? "ALLENAMENTO IN CORSO" : next ? "PROSSIMO ALLENAMENTO" : "INIZIA DAL CALENDARIO"}</div>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">{workoutTarget?.name || "Scegli il tuo prossimo workout"}</h2>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 opacity-75">{workoutTarget ? `${new Date(next!.scheduledDate).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} · ${workoutTarget.exercises.length} esercizi${workoutTarget.estimatedMins ? ` · circa ${workoutTarget.estimatedMins} min` : ""}` : "Apri il calendario per vedere il piano e scegliere il giorno in cui allenarti."}</p>
          </div>
          <Link href={active && active.schedule ? `/workout/active?template=${active.schedule.template.id}&date=${active.schedule.scheduledDate.slice(0, 10)}` : workoutTarget ? workoutHref : "/calendar"} className="btn-dark inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black"><Play size={16} fill="currentColor"/> {active ? "RIPRENDI ALLENAMENTO" : workoutTarget ? "VEDI WORKOUT" : "APRI CALENDARIO"}</Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/calendar" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"><CalendarDays className="text-[var(--accent)]" size={20}/><p className="mt-4 text-lg font-black">Calendario</p><p className="mt-1 text-sm text-[var(--muted)]">Vedi il piano settimana per settimana.</p></Link>
        <Link href="/progress" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"><TrendingUp className="text-[var(--accent)]" size={20}/><p className="mt-4 text-lg font-black">Progressi</p><p className="mt-1 text-sm text-[var(--muted)]">Costanza, carichi e allenamenti completati.</p></Link>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><Dumbbell className="text-[var(--accent)]" size={20}/><p className="mt-4 text-lg font-black">Il tuo piano</p><p className="mt-1 text-sm text-[var(--muted)]">{data?.plan ? data.plan.name : loading ? "Caricamento..." : "Nessun programma assegnato"}</p><p className="mt-3 text-xs font-black text-[var(--accent)]">{completed} COMPLETATI · {scheduledThisMonth} GIORNI/SETTIMANA</p></div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black tracking-[0.18em] text-[var(--accent)]">IL TUO PERCORSO</p><h2 className="mt-2 text-2xl font-black">Segui il piano. L'app pensa alla progressione.</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">I carichi iniziali sono già suggeriti e vengono aggiornati in base alle serie che completi. Se vuoi cambiare percorso, puoi sostituire il piano senza perdere lo storico.</p></div><Link href="/programs" className="btn-accent inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black">ESPLORA PROGRAMMI <ArrowRight size={17}/></Link></div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex items-end justify-between"><div><p className="text-xs font-black tracking-[0.18em] text-[var(--accent)]">ATTIVITÀ RECENTE</p><h2 className="mt-2 text-2xl font-black">I tuoi ultimi workout</h2></div><Link href="/progress" className="text-xs font-black text-[var(--accent)]">Vedi progressi</Link></div>{data?.sessions.length ? <div className="mt-5 space-y-2">{data.sessions.slice(-5).reverse().map(s => <div key={s.id} className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3"><span className="text-sm font-bold">{new Date(s.startedAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span><span className={`text-xs font-black ${s.completedAt ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{s.completedAt ? "COMPLETATO" : "IN CORSO"}</span></div>)}</div> : <p className="mt-5 text-sm text-[var(--muted)]">Quando completi il primo workout apparirà qui.</p>}</section>
    </div>
  </main>;
}
