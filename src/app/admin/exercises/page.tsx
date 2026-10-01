"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  primaryMuscles: string;
  difficulty: string;
  isActive: boolean;
  media: { id: string; type: string; url: string; isPrimary: boolean }[];
  _count: { workoutExercises: number };
}

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/exercises")
      .then((response) => response.json())
      .then(setExercises)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)] md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Admin</p>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Exercise Library</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Gestisci esercizi e media direttamente dal database.</p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold">
            {loading ? "…" : `${exercises.length} esercizi`}
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">Caricamento esercizi…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {exercises.map((exercise) => {
              const media = exercise.media[0];
              return (
                <Link key={exercise.id} href={`/admin/exercises/${exercise.id}`} className="group block overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                  <div className="flex min-h-36 items-center justify-center bg-black/5 p-5">
                    {media?.type === "IMAGE" || media?.type === "GIF" ? (
                      <img src={media.url} alt={exercise.name} className="max-h-44 w-full rounded-2xl object-contain" />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-sm font-semibold text-[var(--muted)]">
                        {media ? media.type : "Nessun media"}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-extrabold group-hover:text-[var(--accent)]">{exercise.name}</h2>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{exercise.primaryMuscles}</p>
                      </div>
                      <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold">{exercise.difficulty}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
                      <span>{exercise.category}</span><span>{exercise._count.workoutExercises} workout</span><span>{media ? "Media ✓" : "Media —"}</span>
                    </div>
                    <div className="mt-3 text-xs font-bold text-[var(--accent)]">Modifica esercizio →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
