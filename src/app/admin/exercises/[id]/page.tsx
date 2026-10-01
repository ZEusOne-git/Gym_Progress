"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  primaryMuscles: string;
  difficulty: string;
  instructionsJson: string;
  mistakesJson: string;
  cuesJson: string;
  equipment: string;
  secondaryMuscles: string;
  media: { id: string; type: string; url: string; isPrimary: boolean }[];
}

export default function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/exercises/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossibile caricare l'esercizio");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setExercise(data);
        setForm({
          name: data.name ?? "",
          slug: data.slug ?? "",
          category: data.category ?? "",
          primaryMuscles: data.primaryMuscles ?? "",
          difficulty: data.difficulty ?? "",
          instructionsJson: data.instructionsJson ?? "[]",
          mistakesJson: data.mistakesJson ?? "[]",
          cuesJson: data.cuesJson ?? "[]",
          equipment: data.equipment ?? "[]",
          secondaryMuscles: data.secondaryMuscles ?? "[]",
        });
      })
      .catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [id]);

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exercise || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/exercises/${exercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Errore durante il salvataggio");
      }
      const updated = await response.json();
      setExercise((current) => current ? { ...current, ...updated } : current);
      setMessage("✓ Modifiche salvate");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  if (!exercise) {
    return <main className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">{message || "Caricamento…"}</main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)] md:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/exercises" className="text-sm font-bold text-[var(--accent)]">← Exercise Library</Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Admin / Exercise</p>
          <h1 className="mt-2 text-3xl font-black">{exercise.name}</h1>
        </div>

        <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-4 text-lg font-extrabold">Media</h2>
            {exercise.media.length ? exercise.media.map((media) => (
              <div key={media.id} className="mb-3 overflow-hidden rounded-2xl border border-[var(--border)] p-3">
                <div className="mb-2 text-xs font-bold uppercase text-[var(--muted)]">{media.type}{media.isPrimary ? " · PRIMARY" : ""}</div>
                {media.type === "IMAGE" || media.type === "GIF" ? <img src={media.url} alt={exercise.name} className="max-h-64 w-full rounded-xl object-contain" /> : <div className="rounded-xl bg-black/5 p-8 text-center text-sm">{media.url}</div>}
              </div>
            )) : <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Nessun media configurato</div>}
            <p className="mt-4 text-xs text-[var(--muted)]">Upload e sostituzione file verranno collegati allo storage nel prossimo step.</p>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-5 text-lg font-extrabold">Informazioni esercizio</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[["name", "Nome"], ["slug", "Slug"], ["category", "Categoria"], ["primaryMuscles", "Muscoli principali"], ["difficulty", "Difficoltà"]].map(([key, label]) => (
                <label key={key} className="text-xs font-bold text-[var(--muted)]">
                  {label}
                  <input value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4">
              {["instructionsJson", "cuesJson", "mistakesJson", "equipment", "secondaryMuscles"].map((key) => (
                <label key={key} className="text-xs font-bold text-[var(--muted)]">
                  {key}
                  <textarea rows={3} value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className={`text-sm font-semibold ${message.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{message}</span>
              <button type="submit" disabled={saving} className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--accent-foreground)] disabled:opacity-50">{saving ? "Salvataggio…" : "Salva modifiche"}</button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
