"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock3, Dumbbell, Loader2, Play, SkipForward, TimerReset, TrendingUp } from "lucide-react";

type Media = { url: string; type: string; thumbnailUrl: string | null };
type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; rirTarget?: number | null; targetWeight?: number | null; exercise: { name: string; category: string; media?: Media[] } };
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = { recommendation: { weight: number; reps: number; reason: string }; target: { rir: number | null } };
type Phase = "idle" | "set" | "rest";

function buildLogs(exercise: Exercise, recommendation?: Progression) {
  const weight = recommendation?.recommendation.weight ?? exercise.targetWeight ?? 0;
  const reps = recommendation?.recommendation.reps ?? exercise.repMin;
  return Array.from({ length: exercise.sets }, (_, i) => ({ exerciseId: exercise.id, setNumber: i + 1, weight, reps, rir: exercise.rirTarget ?? null, completed: false }));
}

export default function ActiveWorkoutPage() {
  const [data, setData] = useState<Data | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, SetLog[]>>({});
  const [progressions, setProgressions] = useState<Record<string, Progression>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const templateId = query?.get("template");
  const scheduledDate = query?.get("date");

  useEffect(() => {
    if (!templateId) { setError("Workout non selezionato."); setLoading(false); return; }
    Promise.all([
      fetch(`/api/workouts/template/${templateId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile caricare il workout."); return d as Data; }),
      fetch(`/api/workouts/session?template=${templateId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile recuperare la sessione."); return d; }),
    ]).then(([workout, active]) => {
      setData(workout);
      if (active.session) {
        setSessionId(active.session.id);
        const grouped: Record<string, SetLog[]> = {};
        for (const s of active.session.sets) (grouped[s.exerciseId] ??= []).push(s);
        setLogs(grouped);
        const firstIncomplete = workout.template.exercises.findIndex(exercise => {
          const sets = grouped[exercise.id] ?? [];
          return sets.length < exercise.sets || sets.slice(0, exercise.sets).some(set => !set.completed);
        });
        const index = firstIncomplete >= 0 ? firstIncomplete : Math.max(0, workout.template.exercises.length - 1);
        setCurrentExerciseIndex(index);
        const exerciseSets = grouped[workout.template.exercises[index]?.id] ?? [];
        const nextSet = exerciseSets.findIndex(set => !set.completed);
        setCurrentSetIndex(nextSet >= 0 ? nextSet : Math.max(0, exerciseSets.length - 1));
      }
    }).catch(e => setError(e instanceof Error ? e.message : "Errore")).finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || phase === "idle") return;
    const id = window.setInterval(() => setPhaseSeconds(value => value + (phase === "rest" ? -1 : 1)), 1000);
    return () => window.clearInterval(id);
  }, [sessionId, phase]);

  useEffect(() => {
    if (phase === "rest" && phaseSeconds <= 0) setPhase("idle");
  }, [phase, phaseSeconds]);

  useEffect(() => {
    if (!data || !templateId) return;
    let cancelled = false;
    data.template.exercises.forEach(exercise => {
      fetch(`/api/workouts/progression?exerciseId=${encodeURIComponent(exercise.id)}&templateId=${encodeURIComponent(templateId)}`)
        .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Progressione non disponibile"); return d as Progression; })
        .then(result => {
          if (cancelled) return;
          setProgressions(prev => ({ ...prev, [exercise.id]: result }));
          setLogs(prev => prev[exercise.id] ? prev : ({ ...prev, [exercise.id]: buildLogs(exercise, result) }));
        }).catch(() => {
          if (!cancelled) setLogs(prev => prev[exercise.id] ? prev : ({ ...prev, [exercise.id]: buildLogs(exercise) }));
        });
    });
    return () => { cancelled = true; };
  }, [data, templateId]);

  const currentExercise = data?.template.exercises[currentExerciseIndex] ?? null;
  const currentLogs = currentExercise ? (logs[currentExercise.id] ?? buildLogs(currentExercise, progressions[currentExercise.id])) : [];
  const currentSet = currentLogs[currentSetIndex] ?? null;
  const allCompleted = useMemo(() => !!data && data.template.exercises.every(e => (logs[e.id] ?? []).length >= e.sets && (logs[e.id] ?? []).slice(0, e.sets).every(s => s.completed)), [data, logs]);
  const currentExerciseCompleted = !!currentExercise && currentLogs.length >= currentExercise.sets && currentLogs.slice(0, currentExercise.sets).every(set => set.completed);
  const isLastExercise = !!data && currentExerciseIndex === data.template.exercises.length - 1;
  const isLastSet = !!currentExercise && currentSetIndex === currentExercise.sets - 1;
  const media = currentExercise?.exercise.media?.[0] ?? null;

  function updateSet(exerciseId: string, setNumber: number, field: "weight" | "reps" | "rir", value: string) {
    setLogs(prev => ({ ...prev, [exerciseId]: (prev[exerciseId] ?? []).map(set => set.setNumber === setNumber ? { ...set, [field]: field === "rir" ? (value === "" ? null : Number(value)) : Number(value) } : set) }));
  }

  async function startWorkout() {
    if (!templateId || sessionId) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: scheduledDate }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile avviare l'allenamento.");
      setSessionId(d.session.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setSaving(false); }
  }

  function startSet() {
    if (!currentSet || saving || currentSet.completed || phase === "rest") return;
    setPhase("set");
    setPhaseSeconds(0);
  }

  async function completeCurrentSet() {
    if (!sessionId || !currentExercise || !currentSet || saving || currentSet.completed || phase !== "set") return;
    setSaving(true); setError("");
    try {
      const completed = { ...currentSet, completed: true };
      const r = await fetch("/api/workouts/session/sets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, exerciseId: currentExercise.id, setNumber: currentSet.setNumber, weight: completed.weight, reps: completed.reps, rir: completed.rir, completed: true }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile salvare la serie.");
      setLogs(prev => ({ ...prev, [currentExercise.id]: (prev[currentExercise.id] ?? currentLogs).map(item => item.setNumber === currentSet.setNumber ? { ...completed, id: d.set?.id ?? item.id } : item) }));
      if (!isLastSet) {
        setCurrentSetIndex(index => index + 1);
        if (currentExercise.restSeconds > 0) { setPhase("rest"); setPhaseSeconds(currentExercise.restSeconds); } else setPhase("idle");
      } else setPhase("idle");
    } catch (e) { setError(e instanceof Error ? e.message : "Errore nel salvataggio della serie."); }
    finally { setSaving(false); }
  }

  function continueToNextExercise() {
    if (!data || !currentExerciseCompleted || !isLastExercise) {
      if (!data || !currentExerciseCompleted) return;
      setCurrentExerciseIndex(index => index + 1);
      setCurrentSetIndex(0);
      setPhase("idle");
      setPhaseSeconds(0);
    }
  }

  async function finishWorkout() {
    if (!sessionId || !allCompleted) { setError("Completa tutte le serie prima di chiudere l'allenamento."); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile completare l'allenamento.");
      window.location.href = `/progress?completed=1${scheduledDate ? `&date=${scheduledDate}` : ""}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); setSaving(false); }
  }

  const formatTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
  if (loading) return <main className="min-h-screen grid place-items-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]"/></main>;
  if (error && !data) return <main className="min-h-screen bg-[var(--background)] p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !currentExercise) return null;

  return <main className="min-h-screen bg-[var(--background)] pb-36"><div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
    <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17}/> Esci dal workout</Link>
    <header className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">GIORNO {data.template.dayNumber} · {data.plan.name.toUpperCase()}</p><h1 className="mt-2 text-4xl font-black tracking-tight">{data.template.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">Esercizio {currentExerciseIndex + 1} di {data.template.exercises.length}</p></div><div className="flex flex-wrap gap-2">{data.template.exercises.map((exercise, index) => <span key={exercise.id} className={`rounded-full px-3 py-1.5 text-xs font-black ${index === currentExerciseIndex ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--surface)] text-[var(--muted)]"}`}>{index + 1}. {exercise.name}</span>)}</div></header>

    {!sessionId ? <section className="mt-6 rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-2xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">SESSIONE PRONTA</p><h2 className="mt-2 text-3xl font-black">Tutta la scheda è pronta.</h2><p className="mt-2 max-w-xl text-sm opacity-80">I carichi consigliati sono già impostati. Premi una volta e poi lavorerai serie per serie, passando automaticamente all'esercizio successivo.</p><button type="button" onClick={startWorkout} disabled={saving} className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-7 py-4 text-sm font-black !text-white disabled:opacity-60"><Play size={17} fill="currentColor"/> {saving ? "AVVIO..." : "INIZIA ALLENAMENTO"}</button></section> : <>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl"><div className="aspect-video bg-black">{media?.url && media.type !== "IMAGE" ? <video key={media.url} controls playsInline poster={media.thumbnailUrl ?? undefined} className="h-full w-full object-cover" src={media.url} /> : media?.url ? <img src={media.url} alt={currentExercise.exercise.name} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center p-8 text-center"><div><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white"><Play size={28}/></div><p className="mt-4 font-black text-white">Video dimostrativo</p><p className="mt-1 text-sm text-white/60">Aggiungi un video alla Exercise Library per mostrarlo qui.</p></div></div>}</div><div className="p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">ESERCIZIO {currentExerciseIndex + 1}</p><h2 className="mt-1 text-3xl font-black">{currentExercise.exercise.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{currentExercise.repMin}–{currentExercise.repMax} reps · {currentExercise.restSeconds}s recupero</p></div><span className="rounded-full bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">{currentExercise.sets} serie</span></div>
        {progressions[currentExercise.id] && <div className="mt-5 flex gap-3 rounded-2xl bg-[var(--surface-strong)] p-4"><TrendingUp size={18} className="mt-0.5 shrink-0 text-[var(--accent)]"/><div><p className="text-xs font-black text-[var(--accent)]">CARICO CONSIGLIATO</p><p className="mt-1 text-sm font-black">{progressions[currentExercise.id].recommendation.weight} kg × {progressions[currentExercise.id].recommendation.reps}</p><p className="mt-1 text-xs text-[var(--muted)]">{progressions[currentExercise.id].recommendation.reason}</p></div></div>}
        <div className="mt-5 space-y-2">{currentLogs.map((set, index) => <div key={set.setNumber} className={`grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2 rounded-2xl p-3 sm:gap-3 sm:p-4 ${set.completed ? "border border-[var(--accent)]/30 bg-[var(--accent)]/10" : index === currentSetIndex ? "border border-[var(--accent)] bg-[var(--surface-strong)]" : "bg-[var(--surface-strong)]"}`}><div className="pb-3 text-sm font-black">#{set.setNumber}</div><label className="text-xs font-bold text-[var(--muted)]">Kg<input type="number" min="0" step="0.5" value={set.weight} disabled={set.completed || saving} onChange={e => updateSet(currentExercise.id, set.setNumber, "weight", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-60"/></label><label className="text-xs font-bold text-[var(--muted)]">Reps<input type="number" min="0" value={set.reps} disabled={set.completed || saving} onChange={e => updateSet(currentExercise.id, set.setNumber, "reps", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-black text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-60"/></label><span className={`mb-0.5 inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-black ${set.completed ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : index === currentSetIndex ? "bg-[var(--surface)] text-[var(--muted)]" : "bg-[var(--background)] text-[var(--muted)]"}`}>{set.completed ? <><Check size={15}/> FATTA</> : index === currentSetIndex ? "SERIE ATTIVA" : "IN ATTESA"}</span></div>)}</div></div></section>
    </>}

    {sessionId && currentExerciseCompleted && <section className="mt-5 rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-xl"><p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">ESERCIZIO COMPLETATO</p><h2 className="mt-2 text-2xl font-black">{isLastExercise ? "Hai finito la scheda." : "Pronto per il prossimo esercizio?"}</h2><p className="mt-2 text-sm opacity-80">{isLastExercise ? "Tutte le serie sono registrate. Ora puoi chiudere l'allenamento." : `Hai completato ${currentExercise.exercise.name}. Restiamo nella stessa schermata e passiamo al prossimo.`}</p>{isLastExercise ? <button type="button" onClick={finishWorkout} disabled={saving || !allCompleted} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-4 text-sm font-black !text-white disabled:opacity-40"><Check size={18}/> {saving ? "SALVATAGGIO..." : "COMPLETA ALLENAMENTO"}</button> : <button type="button" onClick={() => { setCurrentExerciseIndex(index => index + 1); setCurrentSetIndex(0); setPhase("idle"); setPhaseSeconds(0); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-4 text-sm font-black !text-white"><ChevronRight size={18}/> PROSEGUI AL PROSSIMO ESERCIZIO</button>}</section>}

    {error && <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
  </div>

  {sessionId && currentSet && !currentExerciseCompleted && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 shadow-2xl backdrop-blur-xl"><div className="mx-auto flex max-w-4xl items-center gap-3 sm:gap-4"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">{phase === "rest" ? "RECUPERO" : phase === "set" ? `SERIE ${currentSet.setNumber} IN CORSO` : `SERIE ${currentSet.setNumber} PRONTA`}</p><div className="mt-1 flex items-center gap-2"><Clock3 size={17} className="text-[var(--accent)]"/><span className="text-2xl font-black tabular-nums">{formatTime(phase === "rest" ? phaseSeconds : phase === "set" ? phaseSeconds : 0)}</span>{phase === "rest" && <span className="hidden text-xs font-bold text-[var(--muted)] sm:inline">Riprendi quando il timer arriva a zero.</span>}</div></div>{phase === "rest" ? <button type="button" onClick={() => { setPhase("idle"); setPhaseSeconds(0); }} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-black text-[var(--foreground)]"><SkipForward size={16}/> SALTA</button> : phase === "set" ? <button type="button" onClick={completeCurrentSet} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-black !text-[var(--accent-foreground)] disabled:opacity-60"><Check size={17}/> {saving ? "SALVO..." : "TERMINA SERIE"}</button> : <button type="button" onClick={startSet} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-3.5 text-sm font-black !text-white disabled:opacity-60"><Play size={17} fill="currentColor"/> INIZIA SERIE</button>}</div></div>}
  </main>;
}
