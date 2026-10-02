"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Scale, Trophy, Dumbbell, ChevronRight } from "lucide-react";

type HistoryPoint = { id: string; weight: number; reps: number; rir: number | null; timestamp: string };
type Data = { sessionCount: number; sessions: { id: string; startedAt: string; completedAt: string | null; plan: { name: string } }[]; sets: { id: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; timestamp: string; exercise: { name: string } }[]; weights: { id: string; weightKg: number; recordedAt: string }[]; weekly: { label: string; count: number }[]; records: { name: string; weight: number; reps: number; volume: number }[]; exerciseHistory: { id: string; name: string; sets: HistoryPoint[] }[] };

export default function ProgressPage() {
  const [data, setData] = useState<Data | null>(null); const [loading, setLoading] = useState(true); const [selectedExercise, setSelectedExercise] = useState("");
  useEffect(() => { fetch("/api/progress").then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Errore"); return d; }).then(d => { setData(d); setSelectedExercise(d.exerciseHistory?.[0]?.id || ""); }).catch(() => setData({ sessionCount: 0, sessions: [], sets: [], weights: [], weekly: [], records: [], exerciseHistory: [] })).finally(() => setLoading(false)); }, []);
  const sessions = data?.sessionCount ?? data?.sessions.length ?? 0;
  const current = data?.weights.at(-1)?.weightKg;
  const previous = data?.weights.length && data.weights.length > 1 ? data.weights[data.weights.length - 2].weightKg : undefined;
  const change = current != null && previous != null ? current - previous : null;
  const history = data?.exerciseHistory.find(e => e.id === selectedExercise) ?? data?.exerciseHistory[0];
  const chartPoints = useMemo(() => history?.sets.slice(-8) ?? [], [history]);
  const weightPoints = useMemo(() => data?.weights.slice(-8) ?? [], [data?.weights]);
  const maxWeight = Math.max(1, ...(history?.sets.map(s => s.weight) || [1]));
  const maxBodyWeight = Math.max(1, ...(weightPoints.map(w => w.weightKg) || [1]));
  const minBodyWeight = weightPoints.length ? Math.min(...weightPoints.map(w => w.weightKg)) : 0;
  const maxWeekly = Math.max(1, ...(data?.weekly.map(w => w.count) || [1]));
  return <main className="min-h-[100dvh] bg-[var(--background)] pb-28"><div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10"><header><p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">YOUR PROGRESS</p><div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">Il lavoro diventa progresso.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">La tua evoluzione, senza rumore. Allenamenti, carichi e costanza in un unico posto.</p></div><Link href="/dashboard" className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-xs font-black transition hover:bg-[var(--surface)] sm:inline-flex">Dashboard <ArrowUpRight size={14}/></Link></div></header>
    <section className="mt-9 border-y border-[var(--border)] py-6 sm:py-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">IL TUO MOMENTO</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em]">{sessions} allenamenti</h2><p className="mt-1 text-sm text-[var(--muted)]">completati nel tuo percorso</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Dumbbell size={19}/></div></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric icon={<Scale size={17}/>} value={current != null ? `${current} kg` : "—"} label={change == null ? "Peso attuale" : `${change > 0 ? "+" : ""}${change.toFixed(1)} kg dall'ultima misura`}/><Metric icon={<Trophy size={17}/>} value={String(data?.records.length ?? 0)} label="Record esercizi"/><Metric icon={<BarChart3 size={17}/>} value={String(data?.sets.length ?? 0)} label="Serie registrate"/></div></section>
    <section className="mt-6 border-y border-[var(--border)] py-6 sm:py-7"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">COSTANZA</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Il ritmo delle ultime 8 settimane</h2></div><span className="text-xs font-black text-[var(--muted)]">{sessions} workout</span></div><div className="mt-8 grid h-44 grid-cols-8 items-end gap-2 sm:gap-3">{(data?.weekly || []).map((w, i) => <div key={i} className="flex h-full min-w-0 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end"><div className="w-full rounded-t-xl bg-[var(--accent)] transition-[height] duration-500" style={{ height: `${Math.max(7, (w.count / maxWeekly) * 100)}%` }} /></div><span className="text-[9px] font-bold text-[var(--muted)]">{w.label}</span></div>)}</div></section>
    <section className="mt-6 border-y border-[var(--border)] py-6 sm:py-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">PESO</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">La tua evoluzione nel tempo</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{weightPoints.length ? `Ultime ${weightPoints.length} misurazioni` : "Aggiungi una misura dal Profilo per iniziare a seguirlo."}</p>
        </div>
        {current != null ? <span className="text-2xl font-black">{current} kg</span> : null}
      </div>
      {weightPoints.length ? <>
        <div className="mt-8 grid h-40 grid-cols-8 items-end gap-2 sm:gap-3">
          {weightPoints.map(point => {
            const range = Math.max(1, maxBodyWeight - minBodyWeight);
            const height = range === 1 ? 65 : 16 + ((point.weightKg - minBodyWeight) / range) * 84;
            return <div key={point.id} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end">
                <div className="w-full rounded-t-xl bg-[var(--accent)] transition-[height] duration-500" style={{ height: `${height}%` }} title={`${point.weightKg} kg`} />
              </div>
              <span className="text-[9px] font-bold text-[var(--muted)]">{new Date(point.recordedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</span>
            </div>;
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>{minBodyWeight} kg min</span>
          <span>{maxBodyWeight} kg max</span>
        </div>
      </> : <p className="mt-8 border-y border-[var(--border)] py-8 text-sm leading-6 text-[var(--muted)]">Lo storico del peso apparirà qui quando registrerai più misurazioni.</p>}
    </section>
    <section className="mt-6 border-y border-[var(--border)] py-6 sm:py-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">PROGRESSIONE</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Il carico che cresce</h2><p className="mt-1 text-sm text-[var(--muted)]">Scegli un esercizio per vedere le ultime serie.</p></div>{data?.exerciseHistory.length ? <select value={history?.id || ""} onChange={e => setSelectedExercise(e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none sm:w-auto"><option value="" disabled>Seleziona esercizio</option>{data.exerciseHistory.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select> : null}</div>{history ? <><div className="mt-9 grid h-48 grid-cols-8 items-end gap-2 sm:gap-3">{chartPoints.map(s => <div key={s.id} className="flex h-full min-w-0 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end"><div className="w-full rounded-t-xl bg-[var(--accent)] transition-[height] duration-500" style={{ height: `${Math.max(10, (s.weight / maxWeight) * 100)}%` }} title={`${s.weight} kg × ${s.reps}`} /></div><span className="truncate text-[9px] font-bold text-[var(--muted)]">{s.weight}</span></div>)}</div><div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]"><span>Ultime {chartPoints.length} serie</span><span>{maxWeight} kg</span></div><div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">{chartPoints.slice().reverse().slice(0, 4).map(s => <div key={s.id} className="flex items-center justify-between gap-3 py-4"><div><p className="text-xs font-bold text-[var(--muted)]">{new Date(s.timestamp).toLocaleDateString("it-IT")}</p><p className="mt-1 text-sm font-black">{s.weight} kg × {s.reps}{s.rir != null ? ` · RIR ${s.rir}` : ""}</p></div><ChevronRight size={15} className="shrink-0 text-[var(--muted)]" /></div>)}</div></> : <p className="mt-8 border-y border-[var(--border)] py-8 text-sm leading-6 text-[var(--muted)]">Completa qualche serie per vedere la progressione dei tuoi esercizi.</p>}</section>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="border-y border-[var(--border)] py-6 sm:py-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">RECORD</p><h2 className="mt-2 text-xl font-black">Migliori performance</h2></div><Trophy size={19} className="text-[var(--accent)]" /></div>{data?.records.length ? <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">{data.records.map(r => <div key={r.name} className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-black">{r.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{r.reps} reps · {r.volume} kg volume</p></div><span className="text-sm font-black text-[var(--accent)]">{r.weight} kg</span></div>)}</div> : <p className="mt-5 border-y border-[var(--border)] py-6 text-sm text-[var(--muted)]">Completa qualche serie per vedere le tue migliori performance.</p>}</section><section className="border-y border-[var(--border)] py-6 sm:py-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">STORICO</p><h2 className="mt-2 text-xl font-black">Ultime serie</h2></div><BarChart3 size={19} className="text-[var(--accent)]" /></div>{data?.sets.length ? <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">{data.sets.slice(0, 8).map(s => <div key={s.id} className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-black">{s.exercise.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(s.timestamp).toLocaleDateString("it-IT")}</p></div><span className="text-sm font-black">{s.weight} kg × {s.reps}</span></div>)}</div> : <p className="mt-5 border-y border-[var(--border)] py-6 text-sm text-[var(--muted)]">Le serie che registrerai durante gli allenamenti appariranno qui.</p>}</section></div>
    {loading && <p className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Aggiornamento progressi...</p>}
  </div></main>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="border-r border-[var(--border)] px-4 py-1 last:border-r-0"><div className="text-[var(--accent)]">{icon}</div><p className="mt-4 text-xl font-black tracking-[-0.03em]">{value}</p><p className="mt-1 text-[10px] font-bold leading-4 text-[var(--muted)]">{label}</p></div>; }
