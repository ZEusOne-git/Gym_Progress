"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Dumbbell, Loader2 } from "lucide-react";

type Exercise = { id: string; sets: number; repMin: number; repMax: number; restSeconds: number; exercise: { name: string; category: string } };

type Data = { template: { id: string; dayNumber: number; name: string; exercises: Exercise[] }; plan: { name: string } };

export default function ActiveWorkoutPage() {
  const [data, setData] = useState<Data | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const templateId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("template") : null;

  useEffect(() => {
    if (!templateId) { setError("Workout non selezionato."); setLoading(false); return; }
    fetch(`/api/workouts/template/${templateId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile caricare il workout."); return d; }).then(setData).catch(e => setError(e instanceof Error ? e.message : "Errore")).finally(() => setLoading(false));
  }, [templateId]);

  async function start() {
    if (!templateId || sessionId) return;
    setSaving(true); setError("");
    try { const r = await fetch("/api/workouts/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile avviare l'allenamento."); setSessionId(d.session.id); } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setSaving(false); }
  }

  async function complete() {
    if (!sessionId) return;
    setSaving(true); setError("");
    try { const r = await fetch("/api/workouts/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossibile completare l'allenamento."); window.location.href = "/calendar"; } catch (e) { setError(e instanceof Error ? e.message : "Errore"); setSaving(false); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-[var(--accent)]"/></main>;
  if (error && !data) return <main className="min-h-screen p-8"><Link href="/calendar" className="text-sm font-black text-[var(--accent)]">← Calendario</Link><p className="mt-6 font-black">{error}</p></main>;
  if (!data) return null;
  const exercise = data.template.exercises[index];

  return <main className="min-h-screen bg-[var(--background)] pb-10"><div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
    <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17}/> Esci dal workout</Link>
    <header className="mt-8"><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">GIORNO {data.template.dayNumber} · {data.plan.name.toUpperCase()}</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{data.template.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">{index + 1} di {data.template.exercises.length} esercizi</p></header>
    <section className="mt-8 rounded-[2rem] bg-[var(--surface)] p-6 sm:p-8"><div className="flex h-48 items-center justify-center rounded-[1.5rem] bg-[var(--surface-strong)] text-[var(--accent)]"><Dumbbell size={56}/></div><div className="mt-6 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{exercise.exercise.category}</p><h2 className="mt-1 text-2xl font-black">{exercise.exercise.name}</h2></div><span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-black text-[var(--accent-foreground)]">{exercise.sets} serie</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--surface-strong)] p-4"><p className="text-xs text-[var(--muted)]">Ripetizioni</p><p className="mt-1 text-xl font-black">{exercise.repMin}–{exercise.repMax}</p></div><div className="rounded-2xl bg-[var(--surface-strong)] p-4"><p className="text-xs text-[var(--muted)]">Recupero</p><p className="mt-1 text-xl font-black">{exercise.restSeconds}s</p></div></div></section>
    {error && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
    <div className="mt-5 flex gap-3">{!sessionId ? <button type="button" onClick={start} disabled={saving} className="flex-1 rounded-2xl bg-[var(--accent)] px-5 py-4 text-sm font-black text-[var(--accent-foreground)]">{saving ? "AVVIO..." : "INIZIA SESSIONE"}</button> : index < data.template.exercises.length - 1 ? <button type="button" onClick={() => setIndex(i => i + 1)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 text-sm font-black text-[var(--accent-foreground)]">PROSSIMO ESERCIZIO <ChevronRight size={18}/></button> : <button type="button" onClick={complete} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 text-sm font-black text-[var(--accent-foreground)]"><Check size={18}/> {saving ? "SALVATAGGIO..." : "COMPLETA ALLENAMENTO"}</button>}</div>
  </div></main>;
}
