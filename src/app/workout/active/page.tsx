"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Clock3, Loader2, Play, SkipForward, TimerReset, Trophy } from "lucide-react";

type Media = { url: string; type: string; thumbnailUrl: string | null };
type Exercise = {
  id: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  rirTarget?: number | null;
  targetWeight?: number | null;
  exercise: { name: string; category: string; media?: Media[] };
};
type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };
type SetLog = { id?: string; exerciseId: string; setNumber: number; weight: number; reps: number; rir: number | null; completed: boolean };
type Progression = { recommendation: { weight: number; reps: number; reason: string }; target: { rir: number | null } };
type Phase = "ready" | "working" | "rest" | "complete";

function buildLogs(exercise: Exercise, recommendation?: Progression): SetLog[] {
  const weight = recommendation?.recommendation.weight ?? exercise.targetWeight ?? 0;
  const reps = recommendation?.recommendation.reps ?? exercise.repMin;
  return Array.from({ length: exercise.sets }, (_, i) => ({
    exerciseId: exercise.id,
    setNumber: i + 1,
    weight,
    reps,
    rir: exercise.rirTarget ?? null,
    completed: false,
  }));
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
    if (!templateId) {
      setError("Workout non selezionato.");
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/workouts/template/${templateId}`).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Impossibile caricare il workout.");
        return d as Data;
      }),
      fetch(`/api/workouts/session?template=${templateId}`).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Impossibile recuperare la sessione.");
        return d;
      }),
    ])
      .then(([workout, active]) => {
        setData(workout);
        if (!active.session) return;
        setSessionId(active.session.id);
        setStartedAt(active.session.startedAt);
        const grouped: Record<string, SetLog[]> = {};
        for (const item of active.session.sets) (grouped[item.exerciseId] ??= []).push(item);
        setLogs(grouped);
        const firstIncomplete = workout.template.exercises.findIndex(exercise => {
          const sets = grouped[exercise.id] ?? [];
          return sets.length < exercise.sets || sets.slice(0, exercise.sets).some(item => !item.completed);
        });
        if (firstIncomplete < 0) {
          setExerciseIndex(Math.max(0, workout.template.exercises.length - 1));
          setPhase("ready");
          return;
        }
        setExerciseIndex(firstIncomplete);
        const nextSets = grouped[workout.template.exercises[firstIncomplete].id] ?? [];
        const nextSet = nextSets.findIndex(item => !item.completed);
        setSetIndex(nextSet >= 0 ? nextSet : 0);
        setPhase("ready");
      })
      .catch(e => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "working" && phase !== "rest") return;
    const id = window.setInterval(() => setTimer(value => phase === "rest" ? Math.max(0, value - 1) : value + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "rest" && timer <= 0) setPhase("ready");
  }, [phase, timer]);

  useEffect(() => {
    if (!data || !templateId) return;
    let cancelled = false;
    data.template.exercises.forEach(exercise => {
      fetch(`/api/workouts/progression?exerciseId=${encodeURIComponent(exercise.id)}&templateId=${encodeURIComponent(templateId)}`)
        .then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Progressione non disponibile");
          return d as Progression;
        })
        .then(result => {
          if (cancelled) return;
          setProgressions(prev => ({ ...prev, [exercise.id]: result }));
          setLogs(prev => prev[exercise.id] ? prev : { ...prev, [exercise.id]: buildLogs(exercise, result) });
        })
        .catch(() => {
          if (!cancelled) setLogs(prev => prev[exercise.id] ? prev : { ...prev, [exercise.id]: buildLogs(exercise) });
        });
    });
    return () => { cancelled = true; };
  }, [data, templateId]);

  const exercise = data?.template.exercises[exerciseIndex] ?? null;
  const exerciseLogs = exercise ? (logs[exercise.id] ?? buildLogs(exercise, progressions[exercise.id])) : [];
  const currentSet = exerciseLogs[setIndex] ?? null;
  const completedCount = data?.template.exercises.reduce((sum, item) => sum + (logs[item.id] ?? []).filter(set => set.completed).length, 0) ?? 0;
  const totalSets = data?.template.exercises.reduce((sum, item) => sum + item.sets, 0) ?? 0;
  const isLastExercise = !!data && exerciseIndex === data.template.exercises.length - 1;
  const isLastSet = !!exercise && setIndex === exercise.sets - 1;
  const media = exercise?.exercise.media?.[0] ?? null;

  const progressPercent = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const formatTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

  function updateCurrent(field: "weight" | "reps" | "rir", value: string) {
    if (!exercise || !currentSet) return;
    setLogs(prev => ({
      ...prev,
      [exercise.id]: (prev[exercise.id] ?? exerciseLogs).map(item => item.setNumber === currentSet.setNumber
        ? { ...item, [field]: field === "rir" ? (value === "" ? null : Number(value)) : Number(value) }
        : item),
    }));
  }

  async function startWorkout() {
    if (!templateId || sessionId) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/workouts/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, date: scheduledDate }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile avviare l'allenamento.");
      setSessionId(d.session.id);
      setStartedAt(d.session.startedAt);
      setExerciseIndex(0);
      setSetIndex(0);
      setPhase("ready");
      setElapsed(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  function beginSet() {
    if (!sessionId || !currentSet || saving || currentSet.completed || phase === "rest") return;
    setError("");
    setPhase("working");
    setTimer(0);
  }

  async function completeSet() {
    if (!sessionId || !exercise || !currentSet || saving || currentSet.completed || phase !== "working") return;
    setSaving(true);
    setError("");
    try {
      const completed = { ...currentSet, completed: true };
      const r = await fetch("/api/workouts/session/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          exerciseId: exercise.id,
          setNumber: completed.setNumber,
          weight: completed.weight,
          reps: completed.reps,
          rir: completed.rir,
          completed: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile salvare la serie.");
      setLogs(prev => ({
        ...prev,
        [exercise.id]: (prev[exercise.id] ?? exerciseLogs).map(item => item.setNumber === completed.setNumber
          ? { ...completed, id: d.set?.id ?? item.id }
          : item),
      }));

      if (!isLastSet) {
        setSetIndex(value => value + 1);
        if (exercise.restSeconds > 0) {
          setPhase("rest");
          setTimer(exercise.restSeconds);
        } else {
          setPhase("ready");
        }
        return;
      }

      if (!isLastExercise) {
        setExerciseIndex(value => value + 1);
        setSetIndex(0);
        if (exercise.restSeconds > 0) {
          setPhase("rest");
          setTimer(exercise.restSeconds);
        } else {
          setPhase("ready");
          setTimer(0);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setPhase("complete");
      setTimer(0);
      const finish = await fetch("/api/workouts/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = await finish.json();
      if (!finish.ok) throw new Error(result.error || "Impossibile completare l'allenamento.");
      setFinished(true);
      window.setTimeout(() => {
        window.location.href = `/progress?completed=1${scheduledDate ? `&date=${scheduledDate}` : ""}`;
      }, 1400);
    } catch (e) {
      setPhase("ready");
      setError(e instanceof Error ? e.message : "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  function skipRest() {
    if (phase !== "rest") return;
    setTimer(0);
    setPhase("ready");
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]"/></main>;
  if (error && !data) return <main className="min-h-screen bg-[var(--background)] p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data || !exercise) return null;

  if (finished) return <main className="min-h-screen grid place-items-center bg-[var(--background)] p-6"><section className="w-full max-w-md rounded-[2rem] bg-[var(--accent)] p-8 text-center text-[var(--accent-foreground)]"><Trophy className="mx-auto" size={42}/><p className="mt-5 text-xs font-black tracking-[0.2em]">ALLENAMENTO COMPLETATO</p><h1 className="mt-2 text-4xl font-black">Ottimo lavoro.</h1><p className="mt-3 text-sm opacity-75">Salvataggio dei progressi completato. Torniamo ai tuoi progressi.</p></section></main>;

  return <main className="min-h-screen bg-[var(--background)] pb-10">
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-7">
      <header className="flex items-center justify-between gap-3">
        <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17}/> Esci</Link>
        <div className="flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 text-xs font-black"><Clock3 size={14} className="text-[var(--accent)]"/> {formatTime(elapsed)}</div>
      </header>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">GIORNO {data.template.dayNumber}</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">{data.template.name}</h1></div><span className="text-sm font-black text-[var(--muted)]">{completedCount}/{totalSets}</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progressPercent}%` }}/></div>
      </section>

      {!sessionId ? <section className="mt-7 rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] sm:p-8"><p className="text-xs font-black tracking-[0.18em] opacity-70">PRONTO</p><h2 className="mt-2 text-3xl font-black">Tutta la scheda è pronta.</h2><p className="mt-2 text-sm leading-6 opacity-75">Il carico iniziale è già consigliato. Tu devi solo eseguire le serie: l'app penserà al resto.</p><button type="button" onClick={startWorkout} disabled={saving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black !text-white disabled:opacity-60"><Play size={17} fill="currentColor"/> {saving ? "AVVIO..." : "INIZIA ALLENAMENTO"}</button></section> : <>
        <section className="mt-5 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
          <div className="aspect-video bg-black">{media?.url && media.type !== "IMAGE" ? <video key={media.url} controls playsInline poster={media.thumbnailUrl ?? undefined} className="h-full w-full object-cover" src={media.url}/> : media?.url ? <img src={media.url} alt={exercise.exercise.name} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center p-8 text-center text-white"><div><Play className="mx-auto" size={34}/><p className="mt-3 font-black">Video esercizio</p><p className="mt-1 text-sm text-white/60">Inserisci il video nella Exercise Library.</p></div></div>}</div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-[var(--accent)]">ESERCIZIO {exerciseIndex + 1} DI {data.template.exercises.length}</p><h2 className="mt-1 text-3xl font-black">{exercise.exercise.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{exercise.repMin}–{exercise.repMax} reps · {exercise.restSeconds}s recupero</p></div><span className="rounded-full bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">{exercise.sets} serie</span></div>

            {progressions[exercise.id] && <div className="mt-5 rounded-2xl bg-[var(--surface-strong)] p-4"><p className="text-xs font-black text-[var(--accent)]">CARICO CONSIGLIATO</p><p className="mt-1 text-lg font-black">{progressions[exercise.id].recommendation.weight} kg · {progressions[exercise.id].recommendation.reps} reps</p><p className="mt-1 text-xs text-[var(--muted)]">{progressions[exercise.id].recommendation.reason}</p></div>}

            <div className="mt-6 space-y-2">
              {exerciseLogs.map((item, index) => <div key={item.setNumber} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 ${index === setIndex && !item.completed ? "border-[var(--accent)] bg-[var(--surface-strong)]" : "border-[var(--border)]"}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${item.completed ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>{item.completed ? <Check size={16}/> : item.setNumber}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><label className="text-[10px] font-black uppercase text-[var(--muted)]">Kg<input aria-label={`Peso serie ${item.setNumber}`} disabled={item.completed || index !== setIndex || phase === "working" || phase === "rest"} type="number" min="0" step="0.5" value={item.weight} onChange={e => updateCurrent("weight", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-black"/></label><label className="text-[10px] font-black uppercase text-[var(--muted)]">Reps<input aria-label={`Ripetizioni serie ${item.setNumber}`} disabled={item.completed || index !== setIndex || phase === "working" || phase === "rest"} type="number" min="0" value={item.reps} onChange={e => updateCurrent("reps", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-black"/></label><label className="hidden text-[10px] font-black uppercase text-[var(--muted)] sm:block">RIR<input aria-label={`RIR serie ${item.setNumber}`} disabled={item.completed || index !== setIndex || phase === "working" || phase === "rest"} type="number" min="0" value={item.rir ?? ""} onChange={e => updateCurrent("rir", e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-black"/></label></div>
                {index === setIndex && !item.completed && <span className="text-right text-xs font-black text-[var(--muted)]">{phase === "working" ? formatTime(timer) : phase === "rest" ? formatTime(timer) : "Pronta"}</span>}
              </div>)}
            </div>
          </div>
        </section>

        {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}

        <section className="sticky bottom-0 z-20 mt-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--background)]/95 p-3 shadow-2xl backdrop-blur">
          {phase === "rest" ? <div className="flex items-center gap-3"><div className="flex-1"><p className="text-xs font-black tracking-[0.15em] text-[var(--accent)]">RECUPERO</p><p className="text-2xl font-black">{formatTime(timer)}</p></div><button type="button" onClick={skipRest} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-black">SALTA <SkipForward size={16}/></button></div> : phase === "working" ? <button type="button" onClick={completeSet} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-4 text-sm font-black text-[var(--accent-foreground)] disabled:opacity-60"><Check size={18}/> {saving ? "SALVATAGGIO..." : `COMPLETA SERIE ${setIndex + 1}`}</button> : <button type="button" onClick={beginSet} disabled={saving || !currentSet} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-black !text-white disabled:opacity-60"><Play size={18} fill="currentColor"/> INIZIA SERIE {setIndex + 1}</button>}
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-[var(--muted)]"><TimerReset size={14}/> {startedAt ? "Allenamento in corso" : ""} <ChevronRight size={14}/><span>{exerciseIndex + 1}/{data.template.exercises.length} esercizi</span></div>
      </>}
    </div>
  </main>;
}
