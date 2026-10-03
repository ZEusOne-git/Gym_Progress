"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, ChevronRight, Clock3, Loader2, Play, SkipForward, Trophy } from "lucide-react";

type Media = { url: string; type: string; thumbnailUrl: string | null; sourceName: string | null };
type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; rirTarget?: number | null; targetWeight?: number | null; exercise: { id: string; name: string; category: string; media?: Media[] } };
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = {
  last: { completedAt: string | null; sets: { setNumber: number; weight: number; reps: number; rir: number | null }[] } | null;
  recommendation: { weight: number; reps: number; reason: string };
  target: { sets: number; repMin: number; repMax: number; rir: number | null; increment: number; progressionType: string; weight: number | null };
};
type Phase = "ready" | "working" | "rest";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [storedElapsed, setStoredElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const pauseInFlightRef = useRef(false);

  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const templateId = query?.get("template");
  const scheduledDate = query?.get("date");

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
      setLogs(grouped);
      const firstIncomplete = workout.template.exercises.findIndex(exercise => { const sets = grouped[exercise.id] ?? []; return sets.length < exercise.sets || sets.slice(0, exercise.sets).some(set => !set.completed); });
      if (firstIncomplete >= 0) { setExerciseIndex(firstIncomplete); const nextSets = grouped[workout.template.exercises[firstIncomplete].id] ?? []; const nextSet = nextSets.findIndex(item => !item.completed); setSetIndex(nextSet >= 0 ? nextSet : 0); }
      else { setExerciseIndex(Math.max(0, workout.template.exercises.length - 1)); setSetIndex(Math.max(0, (workout.template.exercises.at(-1)?.sets ?? 1) - 1)); }
      setPhase("ready");
    }).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : "Errore")).finally(() => setLoading(false));
  }, [templateId, scheduledDate]);

  const pauseWorkout = useCallback(async (silent = false) => {
    if (!sessionId || isPaused || finished || pauseInFlightRef.current) return false;
    pauseInFlightRef.current = true;
    try {
      const response = await fetch("/api/workouts/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, action: "pause" }),
        keepalive: true,
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Impossibile mettere in pausa l'allenamento.");
      if (json?.session) {
        setStoredElapsed(json.session.elapsedSeconds ?? storedElapsed);
        setElapsed(json.session.elapsedSeconds ?? storedElapsed);
      }
      setIsPaused(true);
      setPhase("ready");
      setTimer(0);
      if (!silent) setError("");
      return true;
    } catch (errorValue) {
      if (!silent) setError(errorValue instanceof Error ? errorValue.message : "Impossibile mettere in pausa l'allenamento.");
      return false;
    } finally {
      pauseInFlightRef.current = false;
    }
  }, [sessionId, isPaused, finished, storedElapsed]);

  useEffect(() => {
    if (!sessionId) return;
    if (isPaused) {
      setElapsed(storedElapsed);
      return;
    }
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(storedElapsed + Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [sessionId, startedAt, storedElapsed, isPaused]);

  useEffect(() => {
    if (!sessionId || isPaused || finished) return;
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") void pauseWorkout(true);
    };
    const pauseOnPageHide = () => void pauseWorkout(true);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pagehide", pauseOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("pagehide", pauseOnPageHide);
    };
  }, [sessionId, isPaused, finished, storedElapsed, pauseWorkout]);

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
  const exerciseLogs = useMemo(() => exercise ? (logs[exercise.id] ?? buildLogs(exercise, progressions[exercise.id])) : [], [exercise, logs, progressions]);
  const currentSet = exerciseLogs[setIndex] ?? null;
  const completedCount = data?.template.exercises.reduce((sum, item) => sum + (logs[item.id] ?? []).filter(set => set.completed).length, 0) ?? 0;
  const totalSets = data?.template.exercises.reduce((sum, item) => sum + item.sets, 0) ?? 0;
  const isLastExercise = !!data && exerciseIndex === data.template.exercises.length - 1;
  const isLastSet = !!exercise && setIndex === exercise.sets - 1;
  const exerciseMedia = exercise?.exercise.media ?? [];
  const repdbPoses = exerciseMedia.filter(item => item.sourceName === "RepDB" && item.type === "IMAGE");
  const media = repdbPoses[poseIndex] ?? exerciseMedia[0] ?? null;
  const progressPercent = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const formatTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
  const progression = exercise ? progressions[exercise.id] : undefined;
  const lastBestSet = progression?.last?.sets?.length ? progression.last.sets.reduce((best, set) => set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best, progression.last.sets[0]) : null;

  useEffect(() => setPoseIndex(0), [exercise?.id]);

  function updateCurrent(field: "weight" | "reps" | "rir", value: string) {
    if (!exercise || !currentSet || currentSet.completed || phase !== "ready") return;
    setLogs(previous => ({ ...previous, [exercise.id]: (previous[exercise.id] ?? exerciseLogs).map(item => item.setNumber === currentSet.setNumber ? { ...item, [field]: field === "rir" ? (value === "" ? null : Number(value)) : Number(value) } : item) }));
  }

  async function exitWorkout() {
    if (!sessionId) {
      window.location.href = "/calendar";
      return;
    }
    setShowExitPrompt(true);
  }

  async function resumeLater() {
    setShowExitPrompt(false);
    setSaving(true);
    const paused = await pauseWorkout();
    if (paused) window.location.href = "/calendar";
    else setSaving(false);
  }

  async function finishEarly() {
    if (!sessionId || saving || finished) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/workouts/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, action: "finish" }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Impossibile terminare l'allenamento.");
      setShowExitPrompt(false);
      setFinished(true);
      window.setTimeout(() => {
        window.location.href = `/calendar?ended=1${scheduledDate ? `&date=${scheduledDate}` : ""}`;
      }, 900);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Impossibile terminare l'allenamento.");
      setSaving(false);
    }
  }

  async function startWorkout() {
    if (!templateId || saving || (sessionId && !isPaused)) return;
    const resuming = Boolean(sessionId && isPaused);
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: scheduledDate }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error || "Impossibile avviare l'allenamento.");
      setSessionId(json.session.id);
      setStartedAt(json.session.startedAt);
      setStoredElapsed(json.session.elapsedSeconds ?? 0);
      setIsPaused(false);
      if (!resuming) {
        setExerciseIndex(0);
        setSetIndex(0);
      }
      setPhase("ready");
      setElapsed(json.session.elapsedSeconds ?? 0);
    } catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : "Errore"); } finally { setSaving(false); }
  }

  function beginSet() {
    if (!sessionId || !currentSet || saving || currentSet.completed || phase !== "ready") return;
    setError(""); setPhase("working"); setTimer(0);
  }

  async function completeSet() {
    if (!sessionId || !exercise || !currentSet || saving || currentSet.completed || phase !== "working") return;
    setSaving(true); setError("");
    try {
      const completed = { ...currentSet, completed: true };
      const response = await fetch("/api/workouts/session/sets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, exerciseId: exercise.id, setNumber: completed.setNumber, weight: completed.weight, reps: completed.reps, rir: completed.rir, completed: true }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error || "Impossibile salvare la serie.");
      setLogs(previous => ({ ...previous, [exercise.id]: (previous[exercise.id] ?? exerciseLogs).map(item => item.setNumber === completed.setNumber ? { ...completed, id: json.set?.id ?? item.id } : item) }));
      const rest = exercise.restSeconds;
      if (!isLastSet) { setSetIndex(value => value + 1); setTimer(rest); setPhase(rest > 0 ? "rest" : "ready"); return; }
      if (!isLastExercise) { setExerciseIndex(value => value + 1); setSetIndex(0); setTimer(rest); setPhase(rest > 0 ? "rest" : "ready"); return; }
      const finishResponse = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const finishJson = await finishResponse.json(); if (!finishResponse.ok) throw new Error(finishJson.error || "Impossibile completare l'allenamento.");
      setPhase("ready"); setFinished(true);
      window.setTimeout(() => { window.location.href = `/calendar?completed=1${scheduledDate ? `&date=${scheduledDate}` : ""}`; }, 1200);
    } catch (errorValue) { setPhase("ready"); setError(errorValue instanceof Error ? errorValue.message : "Errore nel salvataggio."); } finally { setSaving(false); }
  }

  function skipRest() { if (phase !== "rest") return; setTimer(0); setPhase("ready"); }

  if (loading) return <main className="min-h-[100dvh] grid place-items-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]" /></main>;
  if (error && !data) return <main className="min-h-[100dvh] bg-[var(--background)] p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !exercise) return null;
  if (finished) return <main className="min-h-[100dvh] grid place-items-center bg-[var(--background)] p-6"><section className="w-full max-w-md rounded-[2rem] bg-[var(--accent)] p-8 text-center text-[var(--accent-foreground)]"><Trophy className="mx-auto" size={42} /><p className="mt-5 text-xs font-black tracking-[0.2em]">ALLENAMENTO COMPLETATO</p><h1 className="mt-2 text-4xl font-black">Ottimo lavoro.</h1><p className="mt-3 text-sm opacity-75">Progressi salvati. Torniamo alla tua attività.</p></section></main>;

  const phaseLabel = phase === "rest" ? "RECUPERO" : phase === "working" ? "SERIE IN CORSO" : `SERIE ${setIndex + 1} DI ${exercise.sets}`;

  return <main className="relative h-[100dvh] min-h-[520px] overflow-hidden bg-black text-white overscroll-none">
    {sessionId && (
      <>
        <div key={`${exercise.id}-${exerciseIndex}`} className="absolute inset-0 animate-[fade-in_500ms_ease-out]">
          {media?.url && media.type !== "IMAGE" && media.type !== "GIF" ? <video key={media.url} autoPlay muted loop playsInline poster={media.thumbnailUrl ?? undefined} className="absolute inset-0 h-full w-full object-cover" src={media.url} /> : media?.url ? <Image src={media.url} alt={`${exercise.exercise.name}${repdbPoses.length > 1 ? poseIndex === 0 ? " · posizione iniziale" : " · posizione di picco" : ""}`} fill unoptimized sizes="100vw" className="bg-[#0b1513] object-contain" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(190,255,38,.2),transparent_52%)]" />}
          {repdbPoses.length > 1 && <button type="button" onClick={() => setPoseIndex(value => value === 0 ? 1 : 0)} className="absolute right-4 top-16 z-10 rounded-full border border-white/20 bg-black/45 px-3 py-2 text-[10px] font-black text-white backdrop-blur-xl">{poseIndex === 0 ? "MOSTRA POSIZIONE FINALE" : "MOSTRA POSIZIONE INIZIALE"}</button>}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90" />
          <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/35 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] sm:px-7">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <button type="button" onClick={() => void exitWorkout()} disabled={saving} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white backdrop-blur-xl transition active:scale-90 disabled:opacity-50" aria-label="Metti in pausa ed esci dal workout"><ArrowLeft size={19} /></button>
            <div className="min-w-0 flex-1 text-center"><p className="truncate text-[9px] font-black uppercase tracking-[0.24em] text-white/60">{data.plan.name}</p><p className="mt-1 text-xs font-black">{exerciseIndex + 1} / {data.template.exercises.length} · GIORNO {data.template.dayNumber}</p></div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-black tabular-nums backdrop-blur-xl"><Clock3 size={13} className="text-[var(--accent)]" /> {formatTime(elapsed)}</div>
          </header>

          <div className="mt-3 flex shrink-0 items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out" style={{ width: `${progressPercent}%` }} /></div><span className="text-[10px] font-black tabular-nums text-white/65">{completedCount}/{totalSets}</span></div>

          <div className="flex min-h-0 flex-1 flex-col justify-end pb-2 sm:pb-5">
            <div key={`${exercise.id}-${phase}-${setIndex}`} className="animate-[slide-up_350ms_ease-out]">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">{phaseLabel}</p><h1 className="mt-1 text-[clamp(2rem,9vw,4.5rem)] font-black leading-[.92] tracking-[-0.06em] text-white drop-shadow-lg">{exercise.exercise.name}</h1><p className="mt-2 text-xs font-semibold text-white/65">{exercise.repMin}–{exercise.repMax} reps · {exercise.restSeconds}s recupero · {exercise.exercise.category}</p></div><div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right backdrop-blur-xl sm:block"><p className="text-[9px] font-black uppercase tracking-widest text-white/45">Tempo</p><p className="mt-1 text-lg font-black tabular-nums">{formatTime(elapsed)}</p></div></div>

              {phase === "rest" ? <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-4 backdrop-blur-2xl sm:mt-6 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">RECUPERO</p><p className="mt-1 text-sm font-bold text-white/65">Prossima: serie {Math.min(setIndex + 1, exercise.sets)}{isLastSet && !isLastExercise ? " · prossimo esercizio" : ""}</p></div><p className="text-5xl font-black tracking-[-0.06em] tabular-nums">{formatTime(timer)}</p></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 linear" style={{ width: `${exercise.restSeconds ? Math.max(0, Math.min(100, ((exercise.restSeconds - timer) / exercise.restSeconds) * 100)) : 100}%` }} /></div><button type="button" onClick={skipRest} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[10px] font-black text-white transition active:scale-[.98]">SALTA RECUPERO <SkipForward size={14}/></button></div> : <div className={`mt-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-4 backdrop-blur-2xl sm:mt-6 sm:p-5 ${phase === "working" ? "ring-1 ring-[var(--accent)]/45" : ""}`}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-2xl bg-white/8 p-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/50">Carico<input aria-label="Peso della serie corrente" disabled={!currentSet || currentSet.completed || phase !== "ready"} type="number" min="0" step="0.5" value={currentSet?.weight ?? 0} onChange={event => updateCurrent("weight", event.target.value)} className="mt-1 w-full bg-transparent text-4xl font-black tracking-[-0.06em] text-white outline-none disabled:opacity-60" /><span className="text-[10px] font-bold normal-case tracking-normal text-white/45">kg</span></label>
                  <label className="rounded-2xl bg-white/8 p-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/50">Ripetizioni<input aria-label="Ripetizioni della serie corrente" disabled={!currentSet || currentSet.completed || phase !== "ready"} type="number" min="0" value={currentSet?.reps ?? exercise.repMin} onChange={event => updateCurrent("reps", event.target.value)} className="mt-1 w-full bg-transparent text-4xl font-black tracking-[-0.06em] text-white outline-none disabled:opacity-60" /><span className="text-[10px] font-bold normal-case tracking-normal text-white/45">reps</span></label>
                </div>
                {progression && <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/40">ULTIMA VOLTA</p>
                    <p className="mt-1 text-sm font-black text-white">{lastBestSet ? `${lastBestSet.weight} kg × ${lastBestSet.reps}` : "Prima sessione"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-2.5">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">OGGI</p>
                    <p className="mt-1 text-sm font-black text-white">{progression.recommendation.weight} kg × {progression.recommendation.reps}</p>
                  </div>
                  <p className="col-span-2 truncate text-[10px] font-bold text-white/55"><span className="font-black text-[var(--accent)]">AUTO</span> · {progression.recommendation.reason}</p>
                </div>}
                <div className="mt-4 flex items-center gap-1.5">{exerciseLogs.map((item, index) => <span key={item.setNumber} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${item.completed ? "bg-[var(--accent)]" : index === setIndex ? "bg-white" : "bg-white/15"}`} />)}</div>
              </div>}
            </div>
          </div>

          {phase !== "rest" && <div className="shrink-0 pt-2 sm:pt-4"><button type="button" onClick={phase === "working" ? completeSet : beginSet} disabled={saving || !currentSet} className={`inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[1.15rem] px-6 py-4 text-sm font-black shadow-2xl transition duration-200 active:scale-[.985] disabled:opacity-60 ${phase === "working" ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_14px_45px_rgba(190,255,38,.22)]" : "bg-white !text-black shadow-black/30"}`}>{phase === "working" ? <><Check size={18} strokeWidth={3}/> {saving ? "SALVATAGGIO..." : isLastSet && isLastExercise ? "COMPLETA ALLENAMENTO" : "COMPLETA SERIE"}</> : <><Play size={18} fill="currentColor"/> INIZIA SERIE</>}</button></div>}
          {error && <p className="mt-2 shrink-0 rounded-xl border border-red-300/20 bg-red-500/15 px-3 py-2 text-center text-xs font-bold text-white">{error}</p>}
        </div>

        {showExitPrompt && !isPaused && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-5 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-black/80 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--accent)]">USCITA ALLENAMENTO</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Cosa vuoi fare?</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">La sessione non deve restare in sospeso senza una tua scelta.</p>
                </div>
                <button type="button" onClick={() => setShowExitPrompt(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/70" aria-label="Continua allenamento">×</button>
              </div>
              <div className="mt-6 grid gap-3">
                <button type="button" onClick={() => void resumeLater()} disabled={saving} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left transition active:scale-[.99] disabled:opacity-60">
                  <p className="text-sm font-black">Riprendi in un secondo momento</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Metti in pausa e torna al Calendario. Nulla viene perso.</p>
                </button>
                <button type="button" onClick={() => void finishEarly()} disabled={saving} className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-left text-[var(--accent-foreground)] transition active:scale-[.99] disabled:opacity-60">
                  <p className="text-sm font-black">Termina completamente allenamento</p>
                  <p className="mt-1 text-xs leading-5 opacity-70">Chiudi la sessione adesso. Le serie già registrate restano salvate.</p>
                </button>
              </div>
              {saving ? <p className="mt-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/45">SALVATAGGIO...</p> : null}
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-6 backdrop-blur-md">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                <Clock3 size={25} />
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-[var(--accent)]">ALLENAMENTO IN PAUSA</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.055em]">Tempo fermato.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">Il tempo riparte solo quando riprendi il workout.</p>
              <button type="button" onClick={() => void startWorkout()} disabled={saving} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-4 text-sm font-black text-[var(--accent-foreground)] transition active:scale-[.98] disabled:opacity-60">
                {saving ? "RIPRESA..." : "RIPRENDI ALLENAMENTO"}<ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </>
    )}

    {!sessionId && <div className="relative z-10 flex min-h-[100dvh] items-center justify-center overflow-y-auto px-5 py-8 text-center"><div className="w-full max-w-2xl"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Play size={25} fill="currentColor" /></div><p className="mt-7 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">PRONTO A PARTIRE?</p><h1 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">{data.template.name}</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Carichi e ripetizioni sono già preparati per te. Premi una volta e segui il flusso: serie, recupero ed esercizio successivo.</p><div className="mx-auto mt-8 grid max-w-md grid-cols-3 divide-x divide-[var(--border)] border-y border-[var(--border)] py-4"><div><p className="text-xl font-black">{data.template.exercises.length}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">esercizi</p></div><div><p className="text-xl font-black">{totalSets}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">serie</p></div><div><p className="text-xl font-black">{Math.round(data.template.exercises.reduce((sum, item) => sum + item.restSeconds * item.sets, 0) / 60)} min</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">recupero</p></div></div><button type="button" onClick={startWorkout} disabled={saving} className="mx-auto mt-9 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-7 py-4 text-sm font-black text-[var(--accent-foreground)] shadow-[0_14px_35px_rgba(190,255,38,.14)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60">{saving ? "AVVIO..." : "INIZIA ALLENAMENTO"}<ChevronRight size={18}/></button></div></div>}
  </main>;
}
