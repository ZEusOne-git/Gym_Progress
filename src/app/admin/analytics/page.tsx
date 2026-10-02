"use client";

import { useEffect, useState } from "react";
import { Activity, CalendarCheck2, Dumbbell, UserRoundPlus, UsersRound } from "lucide-react";

type Analytics = {
  periodDays: number;
  metrics: { users: number; newUsers: number; activeUsers: number; completedWorkouts: number; endedEarly: number };
  weekly: { label: string; workouts: number; completed: number }[];
};

const cards = [
  { key: "users", label: "Atleti registrati", icon: UsersRound },
  { key: "newUsers", label: "Nuovi negli ultimi 28 giorni", icon: UserRoundPlus },
  { key: "activeUsers", label: "Attivi negli ultimi 28 giorni", icon: Activity },
  { key: "completedWorkouts", label: "Workout completati", icon: CalendarCheck2 },
] as const;

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Impossibile caricare i dati.");
        return result as Analytics;
      })
      .then(setData)
      .catch(value => setError(value instanceof Error ? value.message : "Errore di caricamento."))
      .finally(() => setLoading(false));
  }, []);

  const max = Math.max(1, ...(data?.weekly.map(week => week.workouts) ?? []));
  return <main className="min-h-[100dvh] bg-[var(--background)] px-5 py-7 text-[var(--foreground)] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header><p className="text-[10px] font-black uppercase tracking-[.25em] text-[var(--accent)]">CONTROLLO</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Analytics</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Attività della piattaforma e andamento degli allenamenti.</p></header>
      {error && <p role="alert" className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</p>}
      <section aria-label="Indicatori principali" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon }) => <article key={key} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><Icon size={17} className="shrink-0 text-[var(--accent)]"/></div><p className="mt-5 text-3xl font-black tabular-nums">{loading ? "—" : data?.metrics[key] ?? 0}</p></article>)}
      </section>
      <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent)]">ULTIME 4 SETTIMANE</p><h2 className="mt-2 text-xl font-black">Sessioni workout</h2></div><Dumbbell size={19} className="text-[var(--muted)]"/></div>
        {loading ? <p className="mt-8 text-sm text-[var(--muted)]">Caricamento…</p> : data?.weekly.length ? <div className="mt-8 grid grid-cols-4 gap-3 sm:gap-6">{data.weekly.map(week => <div key={week.label} className="flex flex-col items-center gap-2"><div className="flex h-40 w-full items-end justify-center gap-1.5 border-b border-[var(--border)] px-1 sm:gap-2"><div title={`${week.workouts} sessioni`} className="w-1/2 max-w-10 rounded-t-lg bg-[var(--surface-strong)]" style={{ height: `${Math.max(4, week.workouts / max * 100)}%` }}/><div title={`${week.completed} completati`} className="w-1/2 max-w-10 rounded-t-lg bg-[var(--accent)]" style={{ height: `${Math.max(4, week.completed / max * 100)}%` }}/></div><p className="text-[10px] font-bold text-[var(--muted)]">{week.label}</p><p className="text-xs font-black">{week.completed}/{week.workouts}</p></div>)}</div> : <p className="mt-6 text-sm text-[var(--muted)]">Non ci sono sessioni nel periodo selezionato.</p>}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-[var(--muted)]"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--surface-strong)]"/>Sessioni iniziate</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]"/>Completate</span></div>
      </section>
      {data && data.metrics.endedEarly > 0 && <p className="mt-4 text-xs text-[var(--muted)]">Sessioni terminate in anticipo: <strong className="text-[var(--foreground)]">{data.metrics.endedEarly}</strong></p>}
    </div>
  </main>;
}
