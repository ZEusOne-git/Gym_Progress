"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Props = { exerciseSlug: string };

type Exercise = { name: string; muscle: string; sets: number; reps: string; rest: number; instructions: string[] };

const EXERCISES: Record<string, Exercise> = {
  "barbell-squat": { name: "Barbell Squat", muscle: "QUADS · GLUTES · LOWER BACK", sets: 3, reps: "8–10", rest: 90, instructions: ["Brace your core before descending.", "Keep your knees tracking over your toes.", "Drive through the floor and finish tall."] },
  "lat-pulldown": { name: "Lat Pulldown", muscle: "LATS · BICEPS", sets: 3, reps: "10–12", rest: 75, instructions: ["Keep your chest lifted.", "Pull the bar toward your upper chest.", "Control the return without swinging."] },
  "shoulder-press": { name: "Shoulder Press", muscle: "SHOULDERS · TRICEPS", sets: 3, reps: "8–10", rest: 75, instructions: ["Keep your ribs controlled.", "Press vertically without shrugging.", "Lower the weight under control."] },
  "cable-curl": { name: "Cable Curl", muscle: "BICEPS", sets: 3, reps: "10–12", rest: 60, instructions: ["Keep your elbows close to your sides.", "Curl without moving your shoulders.", "Squeeze at the top and lower slowly."] },
  "core-finisher": { name: "Core Finisher", muscle: "ABS · CORE", sets: 3, reps: "12–15", rest: 45, instructions: ["Keep your lower back controlled.", "Move slowly through the full range.", "Breathe continuously throughout the set."] },
};

export default function ExercisePlayer({ exerciseSlug }: Props) {
  const exercise = useMemo(() => EXERCISES[exerciseSlug] ?? EXERCISES["barbell-squat"], [exerciseSlug]);
  const [completed, setCompleted] = useState(0);
  const [weight, setWeight] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) {
      if (seconds === 0) setRunning(false);
      return;
    }
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  const timer = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  function completeSet() {
    setCompleted((value) => Math.min(exercise.sets, value + 1));
    setSeconds(exercise.rest);
    setRunning(true);
  }

  return (
    <main className="min-h-screen bg-[#070908] px-5 py-6 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/workout" className="text-sm text-white/60 hover:text-white">← Workout</Link>
          <span className="text-xs font-semibold tracking-[0.2em] text-lime-300">EXERCISE PLAYER</span>
        </div>
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
          <div className="flex aspect-video items-center justify-center bg-black/40 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10 text-2xl">▶</div>
              <p className="font-semibold">GIF / VIDEO</p>
              <p className="mt-1 text-sm text-white/40">Exercise media will be managed from Admin</p>
            </div>
          </div>
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_320px] md:p-8">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-lime-300">{exercise.muscle}</p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{exercise.name}</h1>
              <div className="mt-7 grid grid-cols-3 gap-3">
                <Stat label="SETS" value={`${completed}/${exercise.sets}`} />
                <Stat label="REPS" value={exercise.reps} />
                <Stat label="REST" value={`${exercise.rest}s`} />
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-semibold">Technique</h2>
                <ul className="mt-3 space-y-3 text-sm text-white/65">{exercise.instructions.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
            </div>
            <aside className="rounded-3xl bg-black/30 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-white/40">WORKING WEIGHT</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={() => setWeight((v) => Math.max(0, v - 2.5))} className="h-11 w-11 rounded-full border border-white/10">−</button>
                <div className="text-center"><strong className="text-3xl">{weight}</strong><span className="ml-1 text-white/40">kg</span></div>
                <button onClick={() => setWeight((v) => v + 2.5)} className="h-11 w-11 rounded-full border border-white/10">+</button>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 p-4 text-center">
                <p className="text-xs text-white/40">RECOVERY</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{timer}</p>
                <button onClick={() => setRunning((v) => !v)} className="mt-3 text-sm font-semibold text-lime-300">{running ? "PAUSE" : "START TIMER"}</button>
              </div>
              <button onClick={completeSet} disabled={completed >= exercise.sets} className="mt-4 w-full rounded-2xl bg-lime-300 px-5 py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{completed >= exercise.sets ? "EXERCISE COMPLETE" : `COMPLETE SET ${completed + 1}`}</button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] font-semibold tracking-[0.16em] text-white/35">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
