"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Clock3, Info, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

const EXERCISES: Record<string, {
  name: string;
  muscle: string;
  description: string;
  sets: number;
  reps: string;
  rest: number;
  tips: string[];
}> = {
  "barbell-squat": {
    name: "Barbell Squat",
    muscle: "Quads · Glutes · Core",
    description: "Keep your chest tall, brace your core and drive through the floor while keeping your knees tracking over your toes.",
    sets: 3,
    reps: "8–10",
    rest: 90,
    tips: ["Brace before every rep", "Keep your heels planted", "Control the descent"],
  },
  "lat-pulldown": {
    name: "Lat Pulldown",
    muscle: "Back · Biceps",
    description: "Pull the bar toward your upper chest while keeping your shoulders down and your torso stable.",
    sets: 3,
    reps: "10–12",
    rest: 75,
    tips: ["Lead with your elbows", "Avoid swinging", "Pause briefly at the bottom"],
  },
  "shoulder-press": {
    name: "Shoulder Press",
    muscle: "Shoulders · Triceps",
    description: "Press smoothly overhead while keeping your ribs down and your wrists stacked over your elbows.",
    sets: 3,
    reps: "8–10",
    rest: 90,
    tips: ["Keep your core tight", "Do not overextend your back", "Use controlled reps"],
  },
  "cable-curl": {
    name: "Cable Curl",
    muscle: "Biceps",
    description: "Keep your elbows close to your body and curl without using momentum from your shoulders or back.",
    sets: 3,
    reps: "10–12",
    rest: 60,
    tips: ["Keep elbows fixed", "Squeeze at the top", "Lower slowly"],
  },
};

export default function ExercisePlayer({ params }: { params: { exercise: string } }) {
  const exercise = EXERCISES[params.exercise] ?? EXERCISES["barbell-squat"];
  const [completed, setCompleted] = useState<boolean[]>(Array(exercise.sets).fill(false));
  const [weight, setWeight] = useState(40);
  const [seconds, setSeconds] = useState(exercise.rest);
  const [running, setRunning] = useState(false);

  const done = completed.filter(Boolean).length;
  const progress = useMemo(() => Math.round((done / exercise.sets) * 100), [done, exercise.sets]);

  function toggleSet(index: number) {
    setCompleted((current) => current.map((value, i) => (i === index ? !value : value)));
    if (!completed[index]) setSeconds(exercise.rest);
  }

  function adjustWeight(delta: number) {
    setWeight((current) => Math.max(0, current + delta));
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-10">
      <div className="mx-auto max-w-5xl px-5 py-5 sm:px-8">
        <Link href="/workout" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-white">
          <ArrowLeft size={17} /> Workout
        </Link>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface-strong)]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-[var(--border)] bg-black/30 text-[var(--accent)]">
                    <Play size={30} fill="currentColor" />
                  </div>
                  <p className="mt-4 text-xs font-black tracking-[0.2em] text-white/60">EXERCISE MEDIA</p>
                  <p className="mt-1 text-sm text-white/45">GIF / video managed from Admin</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">{exercise.muscle}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{exercise.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{exercise.description}</p>

              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-center gap-2 text-sm font-black"><Info size={16} className="text-[var(--accent)]" /> Technique cues</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {exercise.tips.map((tip) => <span key={tip} className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{tip}</span>)}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex items-end justify-between">
              <div><p className="text-xs font-black tracking-[0.2em] text-[var(--muted)]">SESSION PROGRESS</p><p className="mt-1 text-3xl font-black">{done}/{exercise.sets}</p></div>
              <span className="text-sm font-black text-[var(--accent)]">{progress}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div>

            <div className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs font-black tracking-[0.18em] text-[var(--muted)]">WEIGHT</p>
              <div className="mt-3 flex items-center justify-between">
                <button onClick={() => adjustWeight(-2.5)} className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border)]"><Minus size={18}/></button>
                <div className="text-center"><span className="text-3xl font-black">{weight}</span><span className="ml-1 text-sm font-bold text-[var(--muted)]">kg</span></div>
                <button onClick={() => adjustWeight(2.5)} className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border)]"><Plus size={18}/></button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {completed.map((isDone, index) => (
                <button key={index} onClick={() => toggleSet(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${isDone ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--surface-strong)]"}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${isDone ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-black/20 text-[var(--muted)]"}`}>{isDone ? <Check size={16}/> : index + 1}</span>
                  <span className="flex-1"><span className="block text-sm font-black">Set {index + 1}</span><span className="text-xs text-[var(--muted)]">{exercise.reps} reps</span></span>
                  {isDone && <span className="text-xs font-black text-[var(--accent)]">DONE</span>}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-black"><Clock3 size={16} className="text-[var(--accent)]"/> Rest</span><span className="text-xl font-black tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span></div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setRunning((v) => !v)} className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-black">{running ? <span className="inline-flex items-center gap-1"><Pause size={14}/> PAUSE</span> : <span className="inline-flex items-center gap-1"><Play size={14}/> START</span>}</button>
                <button onClick={() => setSeconds(exercise.rest)} className="grid w-11 place-items-center rounded-xl border border-[var(--border)]"><RotateCcw size={15}/></button>
              </div>
            </div>

            <button disabled={done !== exercise.sets} className="mt-5 w-full rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-30">{done === exercise.sets ? "COMPLETE EXERCISE" : `COMPLETE ALL ${exercise.sets} SETS`}</button>
          </aside>
        </div>
      </div>
    </main>
  );
}
