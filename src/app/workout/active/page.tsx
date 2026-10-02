"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock3, Loader2, Play, SkipForward, TimerReset, Trophy } from "lucide-react";

type Media = { url: string; type: string; thumbnailUrl: string | null };
type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; rirTarget?: number | null; targetWeight?: number | null; exercise: { name: string; category: string; media?: Media[] } };
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = { recommendation: { weight: number; reps: number; reason: string }; target: { rir: number | null } };
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
      setSessionId(active.session.id); setStartedAt(active.session.startedAt);
      const grouped: Record<string, SetLog[]> = {};
      for (const item of active.session.sets) (grouped[item.exerciseId] ??= []).push(item);
      setLogs(grouped);
      const firstIncomplete = workout.template.exercises.findIndex(exercise => { const sets = grouped[exercise.id] ?? []; return sets.length < exercise.sets || sets.slice(0, exercise.sets).some(set => !set.completed); });
      if (firstIncomplete >= 0) { setExerciseIndex(firstIncomplete); const nextSets = grouped[workout.template.exercises[firstIncomplete].id] ?? []; const nextSet = nextSets.findIndex(item => !item.completed); setSetIndex(nextSet >= 0 ? nextSet : 0); }
      else { setExerciseIndex(Math.max(0, workout.template.exercises.length - 1)); setSetIndex(Math.max(0, (workout.template.exercises.at(-1)?.sets ?? 1) - 1)); }
      setPhase("ready");
    }).catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : "Errore")).finally(() => setLoading(false));
  }, [templateId, scheduledDate]);

  useEffect(() => {
    if (!sessionId) return;
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick(); const interval = window.setInterval(tick, 1000); return () => window.clearInterval(interval);
  }, [sessionId, startedAt]);

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
  const media = exercise?.exercise.media?.[0] ?? null;
  const progressPercent = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const formatTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

  function updateCurrent(field: "weight" | "reps" | "rir", value: string) {
    if (!exercise || !currentSet || currentSet.completed || phase !== "ready") return;
    setLogs(previous => ({ ...previous, [exercise.id]: (previous[exercise.id] ?? exerciseLogs).map(item => item.setNumber === currentSet.setNumber ? { ...item, [field]: field === "rir" ? (value === "" ? null : Number(value)) : Number(value) } : item) }));
  }

  async function startWorkout() {
    if (!templateId || sessionId || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: scheduledDate }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error || "Impossibile avviare l'allenamento.");
      setSessionId(json.session.id); setStartedAt(json.session.startedAt); setExerciseIndex(0); setSetIndex(0); setPhase("ready"); setElapsed(0);
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
      window.setTimeout(() => { window.location.href = `/progress?completed=1${scheduledDate ? `&date=${scheduledDate}` : ""}`; }, 1200);
    } catch (errorValue) { setPhase("ready"); setError(errorValue instanceof Error ? errorValue.message : "Errore nel salvataggio."); } finally { setSaving(false); }
  }

  function skipRest() { if (phase !== "rest") return; setTimer(0); setPhase("ready"); }

  if (loading) return <main className="min-h-screen grid place-items-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]" /></main>;
  if (error && !data) return <main className="min-h-screen bg-[var(--background)] p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !exercise) return null;
  if (finished) return <main className="min-h-screen grid place-items-center bg-[var(--background)] p-6"><section className="w-full max-w-md rounded-[2rem] bg-[var(--accent)] p-8 text-center text-[var(--accent-foreground)]"><Trophy className="mx-auto" size={42} /><p className="mt-5 text-xs font-black tracking-[0.2em]">ALLENAMENTO COMPLETATO</p><h1 className="mt-2 text-4xl font-black">Ottimo lavoro.</h1><p className="mt-3 text-sm opacity-75">Progressi salvati. Torniamo alla tua attività.</p></section></main>;

  const phaseLabel = phase === "rest" ? "RECUPERO" : phase === "working" ? "SERIE IN CORSO" : `SERIE ${setIndex + 1} DI ${exercise.sets}`;

  return <main className="min-h-screen bg-[var(--background)] pb-6 text-[var(--foreground)]">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-7 lg:px-10">
      <header className="flex items-center justify-between gap-4 py-4 sm:py-6">
        <Link href="/calendar" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface)] hover:text-[var(--foreground)] active:scale-95" aria-label="Esci dal workout"><ArrowLeft size={19} /></Link>
        <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--muted)]">{data.plan.name}</p><p className="mt-1 text-xs font-black">GIORNO {data.template.dayNumber}</p></div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-black tabular-nums"><Clock3 size={13} className="text-[var(--accent)]" /> {formatTime(elapsed)}</div>
      </header>

      <div className="mb-4 flex items-center gap-3 sm:mb-6"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-out" style={{ width: `${progressPercent}%` }} /></div><span className="min-w-12 text-right text-[10px] font-black tabular-nums text-[var(--muted)]">{completedCount}/{totalSets}</span></div>

      {!sessionId ? <section className="flex flex-1 items-center justify-center py-8 sm:py-16"><div className="w-full max-w-2xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_40px_rgba(190,255,38,.18)]"><Play size={25} fill="currentColor" /></div><p className="mt-7 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">PRONTO A PARTIRE?</p><h1 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">{data.template.name}</h1><p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[var(--muted)]">Carichi e ripetizioni sono già preparati per te. Premi una volta e segui il flusso: serie, recupero ed esercizio successivo.</p><div className="mx-auto mt-8 grid max-w-md grid-cols-3 divide-x divide-[var(--border)] border-y border-[var(--border)] py-4"><div><p className="text-xl font-black">{data.template.exercises.length}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">esercizi</p></div><div><p className="text-xl font-black">{totalSets}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">serie</p></div><div><p className="text-xl font-black">{Math.round(data.template.exercises.reduce((sum, item) => sum + item.restSeconds * item.sets, 0) / 60)}'</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">recupero</p></div></div><button type="button" onClick={startWorkout} disabled={saving} className="mx-auto mt-9 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-7 py-4 text-sm font-black text-[var(--accent-foreground)] shadow-[0_14px_35px_rgba(190,255,38,.14)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(190,255,38,.2)] active:scale-[0.98] disabled:opacity-60">{saving ? "AVVIO..." : "INIZIA ALLENAMENTO"}<ChevronRight size={18}/></button></div></section> : <section className="flex flex-1 flex-col justify-center py-2 sm:py-6">
        <div key={`${exercise.id}-${exerciseIndex}-${phase}`} className="grid gap-6 transition-all duration-500 ease-out lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)] lg:items-stretch">
          <div className="relative min-h-[46vh] overflow-hidden rounded-[2rem] bg-black sm:min-h-[54vh] lg:min-h-[66vh]">
            {media?.url && media.type !== "IMAGE" ? <video key={media.url} autoPlay muted loop playsInline poster={media.thumbnailUrl ?? undefined} className="absolute inset-0 h-full w-full object-cover" src={media.url} /> : media?.url ? <img src={media.url} alt={exercise.exercise.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(190,255,38,.16),transparent_55%)] p-8 text-center text-white"><div><Play className="mx-auto" size={38}/><p className="mt-4 text-lg font-black">Video esercizio</p><p className="mt-1 text-sm text-white/50">Aggiungi il video dalla Exercise Library.</p></div></div>}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-5 sm:p-6"><span className="rounded-full bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">{exerciseIndex + 1} / {data.template.exercises.length}</span><span className="rounded-full bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">{exercise.exercise.category}</span></div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-5 pt-20 text-white sm:p-7 sm:pt-24"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">{phaseLabel}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">{exercise.exercise.name}</h1><p className="mt-2 text-sm font-medium text-white/65">{exercise.repMin}–{exercise.repMax} ripetizioni · {exercise.restSeconds}s recupero</p></div>
          </div>

          <div className="flex min-h-[46vh] flex-col justify-between rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:min-h-[66vh] lg:p-8">
            <div>
              <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">SERIE</p><span className="text-xs font-black text-[var(--accent)]">{setIndex + 1} / {exercise.sets}</span></div>
              {phase === "rest" ? <div className="py-12 text-center sm:py-16"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">RECUPERO</p><p className="mt-4 text-7xl font-black tracking-[-0.07em] tabular-nums sm:text-8xl">{formatTime(timer)}</p><div className="mx-auto mt-7 h-1 max-w-xs overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 linear" style={{ width: `${exercise.restSeconds ? Math.max(0, Math.min(100, ((exercise.restSeconds - timer) / exercise.restSeconds) * 100)) : 100}%` }} /></div><p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-[var(--muted)]">Respira. Quando sei pronto puoi saltare il recupero.</p><button type="button" onClick={skipRest} className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-xs font-black transition hover:bg-[var(--surface-strong)] active:scale-95">SALTA RECUPERO <SkipForward size={15}/></button></div> : <>
                <div className={`mt-8 rounded-[1.75rem] bg-[var(--background)] p-5 sm:p-6 ${phase === "working" ? "ring-1 ring-[var(--accent)]/30" : ""}`}><div className="grid grid-cols-2 gap-4"><label className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Carico<input aria-label="Peso della serie corrente" disabled={!currentSet || currentSet.completed || phase !== "ready"} type="number" min="0" step="0.5" value={currentSet?.weight ?? 0} onChange={event => updateCurrent("weight", event.target.value)} className="mt-2 w-full bg-transparent text-5xl font-black tracking-[-0.06em] outline-none disabled:opacity-60" /><span className="text-xs font-bold text-[var(--muted)]">kg</span></label><label className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Ripetizioni<input aria-label="Ripetizioni della serie corrente" disabled={!currentSet || currentSet.completed || phase !== "ready"} type="number" min="0" value={currentSet?.reps ?? exercise.repMin} onChange={event => updateCurrent("reps", event.target.value)} className="mt-2 w-full bg-transparent text-5xl font-black tracking-[-0.06em] outline-none disabled:opacity-60" /><span className="text-xs font-bold text-[var(--muted)]">reps</span></label></div>{progressions[exercise.id] && <div className="mt-6 border-t border-[var(--border)] pt-4"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">SUGGERIMENTO</p><p className="mt-1 text-sm font-bold">{progressions[exercise.id].recommendation.reason}</p></div>}</div>
                <div className="mt-6 flex items-center gap-2">{exerciseLogs.map((item, index) => <span key={item.setNumber} className={`h-2 flex-1 rounded-full transition-all duration-300 ${item.completed ? "bg-[var(--accent)]" : index === setIndex ? "bg-[var(--foreground)]" : "bg-[var(--surface-strong)]"}`} />)}</div>
                <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">{phase === "working" ? `Serie ${setIndex + 1} in corso · ${formatTime(timer)}` : "Il carico è già pronto per te"}</p>
              </>}
            </div>
            {phase !== "rest" && <button type="button" onClick={phase === "working" ? completeSet : beginSet} disabled={saving || !currentSet} className={`mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition-all duration-200 active:scale-[0.985] disabled:opacity-60 ${phase === "working" ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_32px_rgba(190,255,38,.14)]" : "bg-black !text-white dark:bg-white dark:!text-black"}`}>{phase === "working" ? <><Check size={18} strokeWidth={3}/> {saving ? "SALVATAGGIO..." : isLastSet && isLastExercise ? "COMPLETA ALLENAMENTO" : "COMPLETA SERIE"}</> : <><Play size={18} fill="currentColor"/> INIZIA SERIE</>}</button>}
          </div>
        </div>
        {error && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]"><TimerReset size={13}/> {completedCount} di {totalSets} serie completate <ChevronRight size={13}/> {exerciseIndex + 1}/{data.template.exercises.length} esercizi</div>
      </section>}
    </div>
  </main>;
}
