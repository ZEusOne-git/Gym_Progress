"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock3, Loader2, Play, SkipForward, Trophy } from "lucide-react";
import { getExerciseHowTo } from "@/lib/program-generator/exercise-how-to";

type ExerciseMedia = { url: string; type: string; thumbnailUrl?: string | null; sourceName?: string | null; sourceUrl?: string | null; attribution?: string | null };
type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; rirTarget?: number | null; targetWeight?: number | null; exercise: { id: string; name: string; slug: string; category: string; media: ExerciseMedia[] } };
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = { last: { completedAt: string | null; sets: { setNumber: number; weight: number; reps: number; rir: number | null }[] } | null; recommendation: { weight: number; reps: number; reason: string } };
type Phase = "ready" | "working" | "rest";
type Summary = { elapsedSeconds: number; completedSets: number; totalSets: number; completedExercises: number; totalExercises: number; volume: number; endedEarly: boolean };

function buildLogs(exercise: Exercise, progression?: Progression): SetLog[] {
  const weight = progression?.recommendation.weight ?? exercise.targetWeight ?? 0;
  const reps = progression?.recommendation.reps ?? exercise.repMin;
  return Array.from({ length: exercise.sets }, (_, index) => ({ exerciseId: exercise.id, setNumber: index + 1, weight, reps, rir: exercise.rirTarget ?? null, completed: false }));
}

export default function ActiveWorkoutPage() {
  const [data, setData] = useState<Data | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, SetLog[]>>({});
  const [progressions, setProgressions] = useState<Record<string, Progression>>({});
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [timer, setTimer] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [storedElapsed, setStoredElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const pauseInFlightRef = useRef(false);

  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const templateId = query?.get("template");
  const scheduledDate = query?.get("date");

  const formatTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!templateId) { setError("Workout non selezionato."); setLoading(false); return; }
    Promise.all([
      fetch(`/api/workouts/template/${templateId}`).then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error || "Impossibile caricare il workout."); return json as Data; }),
      fetch(`/api/workouts/session?template=${templateId}${scheduledDate ? `&date=${encodeURIComponent(scheduledDate)}` : ""}`).then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error || "Impossibile recuperare la sessione."); return json; }),
    ]).then(([workout, active]) => {
      setData(workout);
      if (!active.session) return;
      setSessionId(active.session.id);
      setStartedAt(active.session.startedAt);
      setStoredElapsed(active.session.elapsedSeconds ?? 0);
      setElapsed(active.session.elapsedSeconds ?? 0);
      setIsPaused(Boolean(active.session.pausedAt));
      const grouped: Record<string, SetLog[]> = {};
      for (const item of active.session.sets) {
        const workoutExercise = workout.template.exercises.find(exercise => exercise.exercise.id === item.exerciseId);
        if (!workoutExercise) continue;
        (grouped[workoutExercise.id] ??= []).push({ ...item, exerciseId: workoutExercise.id });
      }
      Object.values(grouped).forEach(items => items.sort((a, b) => a.setNumber - b.setNumber));
      setLogs(grouped);
      const restored = Object.fromEntries(workout.template.exercises.map(exercise => {
        const sets = buildLogs(exercise);
        for (const saved of grouped[exercise.id] ?? []) {
          const index = saved.setNumber - 1;
          if (index >= 0 && index < sets.length) sets[index] = { ...sets[index], ...saved };
        }
        return [exercise.id, sets];
      })) as Record<string, SetLog[]>;
      const firstIncomplete = workout.template.exercises.findIndex(exercise => restored[exercise.id].some(item => !item.completed));
      if (firstIncomplete >= 0) {
        setExerciseIndex(firstIncomplete);
        const nextSet = restored[workout.template.exercises[firstIncomplete].id].findIndex(item => !item.completed);
        setSetIndex(nextSet >= 0 ? nextSet : 0);
      } else {
        setExerciseIndex(Math.max(0, workout.template.exercises.length - 1));
        setSetIndex(Math.max(0, (workout.template.exercises.at(-1)?.sets ?? 1) - 1));
      }
    }).catch(value => setError(value instanceof Error ? value.message : "Errore")).finally(() => setLoading(false));
  }, [templateId, scheduledDate]);

  const pauseWorkout = useCallback(async (silent = false) => {
    if (!sessionId || isPaused || finished || pauseInFlightRef.current) return false;
    pauseInFlightRef.current = true;
    try {
      const response = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, action: "pause" }), keepalive: true });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Impossibile mettere in pausa l'allenamento.");
      if (json?.session) { setStoredElapsed(json.session.elapsedSeconds ?? storedElapsed); setElapsed(json.session.elapsedSeconds ?? storedElapsed); }
      setIsPaused(true); setPhase("ready"); setTimer(0); if (!silent) setError(""); return true;
    } catch (value) { if (!silent) setError(value instanceof Error ? value.message : "Impossibile mettere in pausa l'allenamento."); return false; } finally { pauseInFlightRef.current = false; }
  }, [sessionId, isPaused, finished, storedElapsed]);

  useEffect(() => {
    if (!sessionId) return;
    if (isPaused) { setElapsed(storedElapsed); return; }
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(storedElapsed + Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [sessionId, startedAt, storedElapsed, isPaused]);

  useEffect(() => {
    if (!sessionId || isPaused || finished) return;
    const pauseWhenHidden = () => { if (document.visibilityState === "hidden") void pauseWorkout(true); };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [sessionId, isPaused, finished, pauseWorkout]);

  useEffect(() => {
    if (phase !== "working" && phase !== "rest") return;
    const interval = window.setInterval(() => setTimer(value => phase === "rest" ? Math.max(0, value - 1) : value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [phase]);
  useEffect(() => { if (phase === "rest" && timer <= 0) setPhase("ready"); }, [phase, timer]);

  useEffect(() => {
    if (!data || !templateId) return;
    let cancelled = false;
    data.template.exercises.forEach(exercise => {
      fetch(`/api/workouts/progression?exerciseId=${encodeURIComponent(exercise.id)}&templateId=${encodeURIComponent(templateId)}`)
        .then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error || "Progressione non disponibile"); return json as Progression; })
        .then(result => { if (cancelled) return; setProgressions(previous => ({ ...previous, [exercise.id]: result })); setLogs(previous => previous[exercise.id] ? previous : { ...previous, [exercise.id]: buildLogs(exercise, result) }); })
        .catch(() => { if (!cancelled) setLogs(previous => previous[exercise.id] ? previous : { ...previous, [exercise.id]: buildLogs(exercise) }); });
    });
    return () => { cancelled = true; };
  }, [data, templateId]);

  const exercise = data?.template.exercises[exerciseIndex] ?? null;
  const exerciseLogs = useMemo(() => {
    if (!exercise) return [];
    const restored = buildLogs(exercise, progressions[exercise.id]);
    for (const saved of logs[exercise.id] ?? []) { const index = saved.setNumber - 1; if (index >= 0 && index < restored.length) restored[index] = { ...restored[index], ...saved }; }
    return restored;
  }, [exercise, logs, progressions]);
  const currentSet = exerciseLogs[setIndex] ?? null;
  const totalSets = data?.template.exercises.reduce((sum, item) => sum + item.sets, 0) ?? 0;
  const completedCount = data?.template.exercises.reduce((sum, item) => sum + (logs[item.id] ?? []).filter(set => set.completed).length, 0) ?? 0;
  const completedExercises = data?.template.exercises.reduce((sum, item) => sum + ((logs[item.id] ?? []).some(set => set.completed) ? 1 : 0), 0) ?? 0;
  const totalExercises = data?.template.exercises.length ?? 0;
  const isLastExercise = !!data && exerciseIndex === data.template.exercises.length - 1;
  const isLastSet = !!exercise && setIndex === exercise.sets - 1;
  const progress = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const progression = exercise ? progressions[exercise.id] : undefined;
  const lastBestSet = progression?.last?.sets?.length ? progression.last.sets.reduce((best, set) => set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best, progression.last.sets[0]) : null;
  const completedVolume = Object.values(logs).flat().filter(set => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0);
  const howTo = exercise ? getExerciseHowTo(exercise.exercise.slug) : null;
  const animationUrl = exercise ? `/animations/${exercise.exercise.slug}.webp` : null;
  const mediaFallback = exercise?.exercise.media?.find(item => item.type === "IMAGE" || item.type === "GIF") ?? exercise?.exercise.media?.[0] ?? null;
  const demonstrationUrl = animationUrl ? animationUrl : mediaFallback?.url ?? null;
  const demonstrationIsLegacy = Boolean(mediaFallback && !exercise?.exercise.slug);

  function updateCurrent(field: "weight" | "reps" | "rir", value: string) {
    if (!exercise || !currentSet || currentSet.completed || phase !== "ready") return;
    setLogs(previous => ({ ...previous, [exercise.id]: (previous[exercise.id] ?? exerciseLogs).map(item => item.setNumber === currentSet.setNumber ? { ...item, [field]: field === "rir" ? (value === "" ? null : Number(value)) : Number(value) } : item) }));
  }

  async function startWorkout() {
    if (!templateId || saving || (sessionId && !isPaused)) return;
    const resuming = Boolean(sessionId && isPaused);
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: scheduledDate }) });
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 409 && json?.error?.includes("allenamento in corso")) {
          const active = await fetch(`/api/workouts/session?template=${templateId}${scheduledDate ? `&date=${encodeURIComponent(scheduledDate)}` : ""}`).then(result => result.json());
          if (active.session) { setSessionId(active.session.id); setStartedAt(active.session.startedAt); setStoredElapsed(active.session.elapsedSeconds ?? 0); setElapsed(active.session.elapsedSeconds ?? 0); setIsPaused(Boolean(active.session.pausedAt)); setError(""); return; }
        }
        throw new Error(json.error || "Impossibile avviare l'allenamento.");
      }
      setSessionId(json.session.id); setStartedAt(json.session.startedAt); setStoredElapsed(json.session.elapsedSeconds ?? 0); setIsPaused(false); setElapsed(json.session.elapsedSeconds ?? 0);
      if (!resuming) { setExerciseIndex(0); setSetIndex(0); }
      setPhase("ready");
    } catch (value) { setError(value instanceof Error ? value.message : "Errore"); } finally { setSaving(false); }
  }

  async function finishEarly() {
    if (!sessionId || saving || finished) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, action: "finish" }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Impossibile terminare l'allenamento.");
      setShowExitPrompt(false); setSummary({ elapsedSeconds: json.session?.elapsedSeconds ?? elapsed, completedSets: completedCount, totalSets, completedExercises, totalExercises, volume: completedVolume, endedEarly: true }); setFinished(true);
    } catch (value) { setError(value instanceof Error ? value.message : "Errore"); } finally { setSaving(false); }
  }

  async function completeSet() {
    if (!sessionId || !exercise || !currentSet || saving || currentSet.completed || phase !== "working") return;
    setSaving(true); setError("");
    try {
      const completed = { ...currentSet, completed: true };
      const response = await fetch("/api/workouts/session/sets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, exerciseId: exercise.id, setNumber: completed.setNumber, weight: completed.weight, reps: completed.reps, rir: completed.rir, completed: true }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Impossibile salvare la serie.");
      setLogs(previous => ({ ...previous, [exercise.id]: (previous[exercise.id] ?? exerciseLogs).map(item => item.setNumber === completed.setNumber ? { ...completed, id: json.set?.id ?? item.id } : item) }));
      const rest = exercise.restSeconds;
      if (!isLastSet) { setSetIndex(value => value + 1); setTimer(rest); setPhase(rest > 0 ? "rest" : "ready"); return; }
      if (!isLastExercise) { setExerciseIndex(value => value + 1); setSetIndex(0); setTimer(rest); setPhase(rest > 0 ? "rest" : "ready"); return; }
      const finishResponse = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const finishJson = await finishResponse.json();
      if (!finishResponse.ok) throw new Error(finishJson.error || "Impossibile completare l'allenamento.");
      setSummary({ elapsedSeconds: finishJson.session?.elapsedSeconds ?? elapsed, completedSets: totalSets, totalSets, completedExercises: totalExercises, totalExercises, volume: completedVolume + completed.weight * completed.reps, endedEarly: false });
      setFinished(true);
    } catch (value) { setPhase("ready"); setError(value instanceof Error ? value.message : "Errore nel salvataggio."); } finally { setSaving(false); }
  }

  if (loading) return <main className="min-h-[100dvh] grid place-items-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]" /></main>;
  if (error && !data) return <main className="min-h-[100dvh] bg-[var(--background)] p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !exercise) return null;

  if (finished && summary) return <main className="min-h-[100dvh] bg-[var(--background)] px-5 py-8"><div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center"><section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Trophy size={30}/></div><p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">{summary.endedEarly ? "ALLENAMENTO TERMINATO PRIMA" : "ALLENAMENTO COMPLETATO"}</p><h1 className="mt-2 text-center text-3xl font-black tracking-[-0.05em]">{summary.endedEarly ? "Sessione salvata." : "Ottimo lavoro."}</h1><p className="mt-2 text-center text-sm leading-6 text-[var(--muted)]">{summary.endedEarly ? "Le serie registrate sono al sicuro." : "Allenamento concluso. I tuoi progressi sono stati aggiornati."}</p><div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-[var(--background)] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Durata</p><p className="mt-1 text-2xl font-black">{formatTime(summary.elapsedSeconds)}</p></div><div className="rounded-2xl bg-[var(--background)] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Serie</p><p className="mt-1 text-2xl font-black">{summary.completedSets}/{summary.totalSets}</p></div><div className="rounded-2xl bg-[var(--background)] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Esercizi</p><p className="mt-1 text-2xl font-black">{summary.completedExercises}/{summary.totalExercises}</p></div><div className="rounded-2xl bg-[var(--background)] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Volume</p><p className="mt-1 text-2xl font-black">{Math.round(summary.volume).toLocaleString("it-IT")} kg</p></div></div><Link href={`/calendar${scheduledDate ? `?date=${encodeURIComponent(scheduledDate)}` : ""}`} className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-black text-[var(--accent-foreground)]">TORNA AL CALENDARIO<ChevronRight size={18} className="ml-2"/></Link></section></div></main>;

  const phaseLabel = phase === "rest" ? "RECUPERO" : phase === "working" ? "SERIE IN CORSO" : `SERIE ${setIndex + 1} DI ${exercise.sets}`;
  return <main className="relative h-[100dvh] min-h-[620px] overflow-hidden bg-black text-white">
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex items-center justify-center bg-[#09110f]">
        {demonstrationUrl ? <img src={demonstrationUrl} alt={`Dimostrazione di ${exercise.exercise.name}`} className="h-full w-full object-contain" /> : <div className="flex h-full w-full items-center justify-center text-center text-white/50"><div><div className="text-4xl">▶</div><p className="mt-3 text-xs font-semibold">Nessuna dimostrazione disponibile</p></div></div>}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/95" />
    </div>

    <div className="relative z-10 flex h-full flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] sm:px-7">
      <header className="flex shrink-0 items-center justify-between gap-3"><button type="button" onClick={() => { if (sessionId) setShowExitPrompt(true); else window.location.href = "/calendar"; }} disabled={saving} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl" aria-label="Esci dal workout"><ArrowLeft size={19}/></button><div className="min-w-0 flex-1 text-center"><p className="truncate text-[9px] font-black uppercase tracking-[0.24em] text-white/60">{data.plan.name}</p><p className="mt-1 text-xs font-black">{exerciseIndex + 1} / {totalExercises} · GIORNO {data.template.dayNumber}</p></div><div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-xs font-black tabular-nums backdrop-blur-xl"><Clock3 size={13} className="text-[var(--accent)]"/>{formatTime(elapsed)}</div></header>
      <div className="mt-3 flex shrink-0 items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[var(--accent)]" style={{width:`${progress}%`}}/></div><span className="text-[10px] font-black text-white/65">{completedCount}/{totalSets}</span></div>

      <div className="mt-auto min-h-0 pb-2 pt-5 sm:pb-5">
        <div className="rounded-[2rem] border border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">{phaseLabel}</p>
          <h1 className="mt-1 text-[clamp(2.4rem,10vw,4.8rem)] font-black leading-[.9] tracking-[-0.06em]">{exercise.exercise.name}</h1>
          <p className="mt-2 text-xs font-semibold text-white/60">{exercise.repMin}–{exercise.repMax} reps · {exercise.restSeconds}s recupero · {exercise.exercise.category}</p>

          {howTo && <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">COME SI FA</p><span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-[var(--accent)]">GUIDA</span></div><div className="mt-3 space-y-2.5 text-[11px] leading-5 text-white/75"><p><strong className="text-white">Posizione:</strong> {howTo.setup}</p><p><strong className="text-white">Esecuzione:</strong> {howTo.execution}</p><p><strong className="text-white">Respirazione:</strong> {howTo.breathing}</p><p><strong className="text-white">Focus:</strong> {howTo.cue}</p></div></section>}

          {phase === "rest" ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">RECUPERO</p><p className="mt-1 text-xs font-semibold text-white/55">Preparati alla prossima serie</p></div><p className="text-4xl font-black tabular-nums">{formatTime(timer)}</p></div><button type="button" onClick={() => { setTimer(0); setPhase("ready"); }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-[10px] font-black">SALTA RECUPERO <SkipForward size={14}/></button></div> : <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="grid grid-cols-2 gap-3"><label className="rounded-xl bg-black/25 p-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Carico<input type="number" min="0" step="0.5" value={currentSet?.weight ?? 0} disabled={!currentSet || currentSet.completed || phase !== "ready"} onChange={event => updateCurrent("weight", event.target.value)} className="mt-1 w-full bg-transparent text-3xl font-black text-white outline-none"/><span className="text-[10px] normal-case tracking-normal text-white/40">kg</span></label><label className="rounded-xl bg-black/25 p-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Ripetizioni<input type="number" min="0" value={currentSet?.reps ?? exercise.repMin} disabled={!currentSet || currentSet.completed || phase !== "ready"} onChange={event => updateCurrent("reps", event.target.value)} className="mt-1 w-full bg-transparent text-3xl font-black text-white outline-none"/><span className="text-[10px] normal-case tracking-normal text-white/40">reps</span></label></div>{progression && <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/40">ULTIMA VOLTA</p><p className="mt-1 text-sm font-black">{lastBestSet ? `${lastBestSet.weight} kg × ${lastBestSet.reps}` : "Prima sessione"}</p><p className="mt-1 text-[10px] text-white/50">Oggi: {progression.recommendation.weight} kg × {progression.recommendation.reps}</p></div>}<div className="mt-4 flex gap-1.5">{exerciseLogs.map((item, index) => <span key={item.setNumber} className={`h-1.5 flex-1 rounded-full ${item.completed ? "bg-[var(--accent)]" : index === setIndex ? "bg-white" : "bg-white/15"}`}/>)}</div></div>}

          {error && <p className="mt-3 rounded-xl border border-red-300/20 bg-red-500/15 px-3 py-2 text-center text-xs font-bold">{error}</p>}
          <button type="button" onClick={phase === "working" ? completeSet : () => { if (currentSet && !currentSet.completed) { setPhase("working"); setTimer(0); } }} disabled={saving || !currentSet} className={`mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black transition active:scale-[.985] disabled:opacity-60 ${phase === "working" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-white text-black"}`}>{phase === "working" ? <><Check size={18} strokeWidth={3}/>{saving ? "SALVATAGGIO..." : isLastSet && isLastExercise ? "COMPLETA ALLENAMENTO" : "COMPLETA SERIE"}</> : <><Play size={18} fill="currentColor"/> INIZIA SERIE</>}</button>
        </div>
      </div>
    </div>

    {showExitPrompt && <div className="absolute inset-0 z-40 grid place-items-center bg-black/75 p-5 backdrop-blur-md"><div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#0b0f0e] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--accent)]">USCITA</p><h2 className="mt-2 text-3xl font-black">Mettere in pausa?</h2><p className="mt-2 text-sm leading-6 text-white/55">Puoi riprendere dal punto esatto in cui sei arrivato.</p></div><button type="button" onClick={() => setShowExitPrompt(false)} className="h-9 w-9 rounded-full border border-white/10 text-white/70">×</button></div><div className="mt-6 grid gap-3"><button type="button" disabled={saving} onClick={async () => { setSaving(true); const paused = await pauseWorkout(); if (paused) window.location.href = "/calendar"; else setSaving(false); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"><p className="text-sm font-black">Metti in pausa e torna al calendario</p><p className="mt-1 text-xs text-white/50">La sessione rimane salvata.</p></button><button type="button" disabled={saving} onClick={finishEarly} className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-left text-[var(--accent-foreground)]"><p className="text-sm font-black">Termina allenamento</p><p className="mt-1 text-xs opacity-70">Chiudi ora mantenendo le serie registrate.</p></button></div></div></div>}
    {isPaused && <div className="absolute inset-0 z-40 grid place-items-center bg-black/80 p-6 backdrop-blur-md"><div className="w-full max-w-sm text-center"><Clock3 className="mx-auto text-[var(--accent)]" size={38}/><p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-[var(--accent)]">ALLENAMENTO IN PAUSA</p><h2 className="mt-2 text-4xl font-black">Tempo fermato.</h2><button type="button" onClick={startWorkout} disabled={saving} className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-black text-[var(--accent-foreground)]">{saving ? "RIPRESA..." : "RIPRENDI ALLENAMENTO"}<ChevronRight size={18} className="ml-2"/></button></div></div>}
  </main>;
}
