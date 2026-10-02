"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Dumbbell, Loader2, Save, TrendingUp } from "lucide-react";

type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; rirTarget?: number | null; targetWeight?: number | null; exercise: { name: string; category: string } };
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = { last: { completedAt: string | null; sets: { setNumber: number; weight: number; reps: number; rir: number | null }[] } | null; recommendation: { weight: number; reps: number; reason: string }; target: { sets: number; repMin: number; repMax: number; rir: number | null; increment: number; progressionType: string; weight: number | null } };

export default function ActiveWorkoutPage() {
  const [data, setData] = useState<Data | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [logs, setLogs] = useState<Record<string, SetLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(0);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);

  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const templateId = query?.get("template");
  const scheduledDate = query?.get("date");

  useEffect(() => {
    if (!templateId) { setError("Workout non selezionato."); setLoading(false); return; }
    Promise.all([
      fetch(`/api/workouts/template/${templateId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile caricare il workout."); return d; }),
      fetch(`/api/workouts/session?template=${templateId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile recuperare la sessione."); return d; })
    ]).then(([workout, active]) => {
      setData(workout);
      if (active.session) {
        setSessionId(active.session.id);
        const grouped: Record<string, SetLog[]> = {};
        for (const s of active.session.sets) (grouped[s.exerciseId] ??= []).push(s);
        setLogs(grouped);
      }
    }).catch(e => setError(e instanceof Error ? e.message : "Errore")).finally(() => setLoading(false));
  }, [templateId]);

  const exercise = data?.template.exercises[index];
  const currentLogs = useMemo(() => exercise ? logs[exercise.id] ?? Array.from({ length: exercise.sets }, (_, i) => ({ exerciseId: exercise.id, setNumber: i + 1, weight: exercise.targetWeight ?? 0, reps: exercise.repMin, rir: exercise.rirTarget ?? null, completed: false })) : [], [exercise, logs]);

  useEffect(() => {
    if (!exercise || !templateId) return;
    setProgression(null);
    setProgressionLoading(true);
    fetch(`/api/workouts/progression?exerciseId=${encodeURIComponent(exercise.id)}&templateId=${encodeURIComponent(templateId)}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile recuperare la progressione."); return d; })
      .then((result: Progression) => {
        setProgression(result);
        if (!logs[exercise.id]) {
          setLogs(prev => ({
            ...prev,
            [exercise.id]: Array.from({ length: exercise.sets }, (_, i) => ({
              exerciseId: exercise.id,
              setNumber: i + 1,
              weight: result.recommendation.weight,
              reps: result.recommendation.reps,
              rir: exercise.rirTarget ?? null,
              completed: false,
            })),
          }));
        }
      })
      .catch(() => setProgression(null))
      .finally(() => setProgressionLoading(false));
  }, [exercise?.id, templateId]);

  function updateSet(setNumber: number, field: keyof SetLog, value: string) {
    if (!exercise) return;
    const base = currentLogs.find(s => s.setNumber === setNumber) ?? { exerciseId: exercise.id, setNumber, weight: 0, reps: exercise.repMin, rir: exercise.rirTarget ?? null, completed: false };
    const next = { ...base, [field]: field === "completed" ? value === "true" : field === "rir" ? (value === "" ? null : Number(value)) : Number(value) };
    setLogs(prev => ({ ...prev, [exercise.id]: currentLogs.map(s => s.setNumber === setNumber ? next : s).concat(currentLogs.some(s => s.setNumber === setNumber) ? [] : [next]) }));
  }

  async function start() {
    if (!templateId || sessionId) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: scheduledDate }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile avviare l'allenamento.");
      setSessionId(d.session.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setSaving(false); }
  }

  async function saveCurrentExercise() {
    if (!sessionId || !exercise) return;
    setSaving(true); setError("");
    try {
      for (const set of currentLogs) {
        const r = await fetch("/api/workouts/session/sets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, exerciseId: exercise.id, setNumber: set.setNumber, weight: set.weight, reps: set.reps, rir: set.rir, completed: set.completed }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile salvare la serie.");
      }
      setSaved(s => s + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); throw e; } finally { setSaving(false); }
  }

  async function complete() {
    if (!sessionId || !exercise || !data) return;
    setError("");
    const all = data.template.exercises.every(e => {
      const sets = e.id === exercise.id ? currentLogs : (logs[e.id] ?? []);
      return sets.length >= e.sets && sets.slice(0, e.sets).every(s => s.completed);
    });
    if (!all) {
      setError("Completa e salva tutte le serie di tutti gli esercizi prima di chiudere l'allenamento.");
      return;
    }
    setSaving(true);
    try {
      await saveCurrentExercise();
      const r = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile completare l'allenamento.");
      window.location.href = `/calendar?completed=1${scheduledDate ? `&date=${scheduledDate}` : ""}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); setSaving(false); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-[var(--accent)]"/></main>;
  if (error && !data) return <main className="min-h-screen p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !exercise) return null;

  return <main className="min-h-screen bg-[var(--background)] pb-10"><div className="mx-auto max-w-3xl px-5 py-6 sm:px-8"><Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17}/> Esci dal workout</Link><header className="mt-8"><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">GIORNO {data.template.dayNumber} · {data.plan.name.toUpperCase()}</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{data.template.name}</h1><div className="mt-2 flex items-center justify-between text-sm text-[var(--muted)]"><span>{index + 1} di {data.template.exercises.length} esercizi</span>{saved > 0 && <span className="font-bold text-[var(--accent)]">Salvataggi: {saved}</span>}</div></header>
    {progressionLoading && <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-bold text-[var(--muted)]">Sto preparando il carico consigliato per te...</div>}
    {progression && <section className="mt-6 rounded-[1.5rem] border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 sm:p-5"><div className="flex gap-3"><TrendingUp className="mt-0.5 shrink-0 text-[var(--accent)]" size={20}/><div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Progressione suggerita</p>{progression.last ? <p className="mt-1 text-sm font-bold">Ultima volta: {progression.last.sets.map(s => `${s.weight} kg × ${s.reps}`).join(" · ")}</p> : <p className="mt-1 text-sm font-bold">Prima sessione: ho impostato automaticamente il carico target della scheda.</p>}<p className="mt-2 text-sm text-[var(--muted)]">{progression.recommendation.reason}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-black">Prossimo: {progression.recommendation.weight} kg × {progression.recommendation.reps}</span>{progression.target.rir != null && <span className="rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-black">RIR target {progression.target.rir}</span>}</div></div></div></section>}
    <section className="mt-6 rounded-[2rem] bg-[var(--surface)] p-5 sm:p-7"><div className="flex h-40 items-center justify-center rounded-[1.5rem] bg-[var(--surface-strong)] text-[var(--accent)]"><Dumbbell size={52}/></div><div className="mt-5 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{exercise.exercise.category}</p><h2 className="mt-1 text-2xl font-black">{exercise.exercise.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">Target: {exercise.repMin}–{exercise.repMax} reps{exercise.rirTarget != null ? ` · RIR ${exercise.rirTarget}` : ""}</p></div><span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-black text-[var(--accent-foreground)]">{exercise.sets} serie</span></div>
      <div className="mt-6 space-y-3">{currentLogs.map(set => <div key={set.setNumber} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-end gap-2 rounded-2xl bg-[var(--surface-strong)] p-3 sm:gap-3"><div className="pb-3 text-sm font-black">#{set.setNumber}</div><label className="text-xs font-bold text-[var(--muted)]">Kg<input type="number" min="0" step="0.5" value={set.weight} onChange={e => updateSet(set.setNumber, "weight", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black text-[var(--foreground)] outline-none focus:border-[var(--accent)]" /></label><label className="text-xs font-bold text-[var(--muted)]">Reps<input type="number" min="0" value={set.reps} onChange={e => updateSet(set.setNumber, "reps", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black text-[var(--foreground)] outline-none focus:border-[var(--accent)]" /></label><label className="text-xs font-bold text-[var(--muted)]">RIR<input type="number" min="0" step="0.5" value={set.rir ?? ""} onChange={e => updateSet(set.setNumber, "rir", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black text-[var(--foreground)] outline-none focus:border-[var(--accent)]" /></label><button type="button" onClick={() => updateSet(set.setNumber, "completed", String(!set.completed))} className={`mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${set.completed ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`} aria-label={`Serie ${set.setNumber} completata`}><Check size={17}/></button></div>)}</div>
    </section>{error && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
    <div className="mt-5 flex gap-3"><button type="button" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0 || saving} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm font-black disabled:opacity-40"><ChevronLeft size={18}/></button>{!sessionId ? <button type="button" onClick={start} disabled={saving} className="flex-1 rounded-2xl bg-[var(--accent)] px-5 py-4 text-sm font-black text-[var(--accent-foreground)]">{saving ? "AVVIO..." : "INIZIA SESSIONE"}</button> : <button type="button" onClick={saveCurrentExercise} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface)] px-5 py-4 text-sm font-black border border-[var(--border)]"> <Save size={17}/> {saving ? "SALVATAGGIO..." : "SALVA SERIE"}</button>}{sessionId && index < data.template.exercises.length - 1 && <button type="button" onClick={async () => { await saveCurrentExercise(); setIndex(i => i + 1); }} disabled={saving} className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-sm font-black text-[var(--accent-foreground)]"><ChevronRight size={18}/></button>}{sessionId && index === data.template.exercises.length - 1 && <button type="button" onClick={complete} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-4 text-sm font-black text-[var(--accent-foreground)]"><Check size={18}/>{saving ? "COMPLETAMENTO..." : "COMPLETA ALLENAMENTO"}</button>}</div>
  </div></main>;
}
