"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Exercise = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  instructions: string[];
  cues: string[];
  mediaUrl?: string | null;
  mediaType?: string | null;
};

type Props = { exercise: Exercise };

export default function ExercisePlayer({ exercise }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [completed, setCompleted] = useState(0);
  const [seconds, setSeconds] = useState(Math.max(exercise.rest || 120, 1));
  const [paused, setPaused] = useState(false);

  const currentSet = Math.min(completed + 1, exercise.sets);
  const isComplete = completed >= exercise.sets;
  const timer = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const progress = useMemo(() => `${currentSet}/${exercise.sets}`, [currentSet, exercise.sets]);

  useEffect(() => {
    if (paused || isComplete || seconds <= 0) return;
    const id = window.setInterval(() => {
      setSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, isComplete, seconds]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = true;
    video.muted = true;
    if (!paused && !isComplete) video.play().catch(() => undefined);
    else video.pause();
  }, [paused, isComplete, exercise.mediaUrl]);

  function togglePause() {
    setPaused(value => !value);
  }

  function nextSet() {
    if (isComplete) return;
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);
    if (nextCompleted < exercise.sets) {
      setSeconds(Math.max(exercise.rest || 120, 1));
      setPaused(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <section className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-black">
        <div className="absolute inset-0">
          {exercise.mediaUrl ? (
            exercise.mediaType === "IMAGE" || exercise.mediaType === "GIF" ? (
              <img src={exercise.mediaUrl} alt={exercise.name} className="h-full w-full object-contain bg-black" />
            ) : (
              <video
                ref={videoRef}
                src={exercise.mediaUrl}
                playsInline
                muted
                loop
                autoPlay
                className="h-full w-full object-contain bg-black"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-[#111] text-center text-white/50">
              <div><div className="text-5xl">▶</div><p className="mt-3 text-sm">Nessun video disponibile</p></div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/75" />
        </div>

        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <Link href="/workout" aria-label="Torna alla lista workout" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md">
            ←
          </Link>
          <div className="rounded-full bg-black/40 px-3 py-2 text-xs font-bold backdrop-blur-md">{exercise.name}</div>
          <span className="w-10" />
        </header>

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-5">
          <div className="rounded-[28px] bg-[#12201e]/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <p className="text-[10px] font-medium text-white/45">TIME</p>
              <p className="mt-1 text-[42px] font-light leading-none tabular-nums tracking-tight">{timer}</p>
              <p className="mt-2 text-xs font-semibold text-white/60">{progress} · {exercise.reps} reps</p>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${(completed / exercise.sets) * 100}%` }} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button type="button" onClick={togglePause} className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold">
                {paused ? "▶ Riprendi" : "Ⅱ Pausa"}
              </button>
              <button type="button" onClick={() => setSeconds(Math.max(exercise.rest || 120, 1))} className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold">
                Reset
              </button>
            </div>

            <button
              type="button"
              onClick={nextSet}
              disabled={isComplete}
              className="mt-4 w-full rounded-xl bg-lime-300 py-4 text-sm font-black text-black transition active:scale-[.99] disabled:opacity-40"
            >
              {isComplete ? "ESERCIZIO COMPLETATO" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
