"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export type ExerciseMedia = {
  url: string;
  type: string;
  attribution?: string | null;
  sourceUrl?: string | null;
};

export type Exercise = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  instructions: string[];
  cues: string[];
  mediaUrl?: string | null;
  mediaType?: string | null;
  attribution?: string | null;
  sourceUrl?: string | null;
  media?: ExerciseMedia[];
};

type Props = {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises: number;
  nextExercise?: { slug: string; name: string } | null;
};

export default function ExercisePlayer({ exercise, exerciseIndex, totalExercises, nextExercise }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [completed, setCompleted] = useState(0);
  const [seconds, setSeconds] = useState(Math.max(exercise.rest || 120, 1));
  const [paused, setPaused] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  const media = exercise.media?.length ? exercise.media : exercise.mediaUrl ? [{ url: exercise.mediaUrl, type: exercise.mediaType || "IMAGE", attribution: exercise.attribution, sourceUrl: exercise.sourceUrl }] : [];
  const imageMedia = media.filter(item => item.type === "IMAGE");
  const isPoseSequence = imageMedia.length > 1 && imageMedia.every(item => item.url.includes("exercise-dataset.com"));
  const activeMedia = isPoseSequence ? imageMedia[poseIndex % imageMedia.length] : media[0];
  const currentSet = Math.min(completed + 1, exercise.sets);
  const isComplete = completed >= exercise.sets;
  const timer = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const setProgress = useMemo(() => `${currentSet}/${exercise.sets}`, [currentSet, exercise.sets]);
  const exerciseProgress = `${exerciseIndex + 1}/${totalExercises}`;

  useEffect(() => {
    if (paused || isComplete || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [paused, isComplete, seconds]);

  useEffect(() => {
    setPoseIndex(0);
  }, [exercise.mediaUrl, exercise.name]);

  useEffect(() => {
    if (!isPoseSequence || paused || isComplete) return;
    const id = window.setInterval(() => setPoseIndex(value => (value + 1) % imageMedia.length), 700);
    return () => window.clearInterval(id);
  }, [imageMedia.length, isPoseSequence, paused, isComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = true;
    video.muted = true;
    if (!paused && !isComplete) video.play().catch(() => undefined);
    else video.pause();
  }, [paused, isComplete, activeMedia?.url]);

  useEffect(() => {
    if (!showInstructions) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowInstructions(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showInstructions]);

  function completeSet() {
    if (isComplete) return;
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);
    if (nextCompleted < exercise.sets) {
      setSeconds(Math.max(exercise.rest || 120, 1));
      setPaused(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07100e] text-white">
      <section className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-black shadow-2xl">
        <div className="relative min-h-0 flex-1 bg-black">
          {activeMedia ? (
            activeMedia.type === "IMAGE" || activeMedia.type === "GIF" ? (
              <img
                src={activeMedia.url}
                alt={exercise.name}
                loading="eager"
                decoding="async"
                className="h-full w-full bg-[#0b1513] object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                src={activeMedia.url}
                playsInline
                muted
                loop
                autoPlay
                className="h-full w-full object-contain"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-[#0b1513] text-white/45">
              <div className="text-center"><div className="text-4xl">▶</div><p className="mt-3 text-xs font-semibold">Nessuna dimostrazione disponibile</p></div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/20" />
          {isPoseSequence && <div className="absolute bottom-3 left-3 z-10 rounded-full bg-black/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">Anteprima movimento</div>}
          <Link href="/workout" aria-label="Torna al workout" className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-black/35 text-xl backdrop-blur-md transition active:scale-95">←</Link>
          <div className="absolute right-3 top-3 z-10 rounded-xl bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">{exerciseProgress}</div>
        </div>

        <section className="relative z-10 shrink-0 rounded-t-[28px] bg-[#12201e] px-4 pb-5 pt-5 shadow-[0_-16px_40px_rgba(0,0,0,.28)]">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/15" />
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">{exercise.name}</p>
            <p className="mt-2 text-[46px] font-light leading-none tracking-[-0.04em] tabular-nums">{timer}</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold text-white/55">
              <span>Serie {setProgress}</span><span className="h-1 w-1 rounded-full bg-white/25" /><span>{exercise.reps} reps</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setPaused(value => !value)} className="flex h-11 min-w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-xs font-extrabold transition active:scale-[.98]">
              <span className="mr-2 text-sm">{paused ? "▶" : "Ⅱ"}</span>{paused ? "Riprendi" : "Pausa"}
            </button>
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              aria-haspopup="dialog"
              aria-expanded={showInstructions}
              className="flex h-11 items-center justify-center rounded-full border border-[#d7ff00]/30 bg-[#d7ff00]/10 px-5 text-xs font-black uppercase tracking-[0.08em] text-[#d7ff00] transition active:scale-[.98]"
            >
              Come si fa
            </button>
          </div>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#d7ff00] transition-all duration-300" style={{ width: `${(completed / exercise.sets) * 100}%` }} />
          </div>

          {isComplete ? (
            <div className="mt-4 space-y-2">
              {nextExercise ? (
                <Link href={`/workout/${nextExercise.slug}`} className="flex w-full items-center justify-between rounded-2xl bg-[#d7ff00] px-5 py-4 text-sm font-black text-black transition active:scale-[.99]">
                  <span>PROSSIMO ESERCIZIO</span><span className="text-base">→</span>
                </Link>
              ) : (
                <Link href="/workout" className="flex w-full items-center justify-center rounded-2xl bg-[#d7ff00] px-5 py-4 text-sm font-black text-black transition active:scale-[.99]">WORKOUT COMPLETATO</Link>
              )}
              {nextExercise && <p className="text-center text-[10px] font-semibold text-white/35">Ora: {nextExercise.name}</p>}
            </div>
          ) : (
            <button type="button" onClick={completeSet} className="mt-4 w-full rounded-2xl bg-[#d7ff00] py-4 text-sm font-black text-black transition active:scale-[.99]">{completed + 1 === exercise.sets ? "COMPLETA ESERCIZIO" : "NEXT SERIE"}</button>
          )}
        </section>
      </section>

      {showInstructions && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowInstructions(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-instructions-title"
            className="flex max-h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#12201e] shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#d7ff00]">Istruzioni</p>
                <h2 id="exercise-instructions-title" className="mt-1 text-xl font-bold tracking-tight">Come si fa</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Chiudi istruzioni"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 transition active:scale-95"
              >
                ×
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-5">
              <h3 className="text-base font-bold">{exercise.name}</h3>

              {exercise.instructions.length > 0 && (
                <div className="mt-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">Esecuzione</p>
                  <ol className="mt-3 space-y-3">
                    {exercise.instructions.map((instruction, index) => (
                      <li key={`${instruction}-${index}`} className="flex gap-3 text-sm leading-6 text-white/80">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d7ff00]/15 text-[10px] font-black text-[#d7ff00]">{index + 1}</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {exercise.cues.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#d7ff00]">Focus</p>
                  <ul className="mt-2 space-y-2">
                    {exercise.cues.map((cue, index) => (
                      <li key={`${cue}-${index}`} className="text-sm leading-5 text-white/70">• {cue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-white/10 p-3">
              <button type="button" onClick={() => setShowInstructions(false)} className="w-full rounded-2xl bg-white py-3.5 text-sm font-black text-black transition active:scale-[.99]">CHIUDI</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
