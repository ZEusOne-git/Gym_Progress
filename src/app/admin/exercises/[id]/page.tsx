"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";

const muscles = ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "ABS", "GLUTES", "QUADS", "HAMSTRINGS", "CALVES", "LOWER_BACK"];
const difficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const mediaTypes = ["VIDEO", "WEBM", "GIF", "IMAGE"];
const categories = ["STRENGTH", "MACHINE", "BODYWEIGHT", "CARDIO", "MOBILITY", "OTHER"];

type Media = { id: string; type: string; url: string; isPrimary: boolean; sourceName?: string | null; sourceUrl?: string | null };
interface Exercise { id: string; name: string; slug: string; category: string; primaryMuscles: string; difficulty: string; instructionsJson: string; mistakesJson: string; cuesJson: string; equipment: string; secondaryMuscles: string; media: Media[]; }

function parseArray(value: string | undefined) { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return value ? [value] : []; } }

export default function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [cues, setCues] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newMedia, setNewMedia] = useState({ type: "GIF", url: "", sourceName: "", sourceUrl: "", isPrimary: false });

  useEffect(() => {
    fetch(`/api/admin/exercises/${id}`).then(async r => { if (!r.ok) throw new Error("Impossibile caricare l'esercizio"); return r.json(); }).then(data => {
      setExercise(data);
      setForm({ name: data.name ?? "", slug: data.slug ?? "", category: data.category ?? "", primaryMuscles: data.primaryMuscles ?? "", difficulty: data.difficulty ?? "" });
      setInstructions(parseArray(data.instructionsJson)); setMistakes(parseArray(data.mistakesJson)); setCues(parseArray(data.cuesJson)); setSecondaryMuscles(parseArray(data.secondaryMuscles)); setEquipment(parseArray(data.equipment));
    }).catch(e => setMessage(e.message));
  }, [id]);

  const update = (key: string, value: string) => { setForm(v => ({ ...v, [key]: value })); setMessage(""); };
  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  const listEditor = (label: string, list: string[], setList: (v: string[]) => void) => <div><div className="mb-2 text-xs font-bold text-[var(--muted)]">{label}</div><div className="space-y-2">{list.map((item, i) => <div key={`${item}-${i}`} className="flex gap-2"><input value={item} onChange={e => setList(list.map((v, j) => j === i ? e.target.value : v))} className="field flex-1" /><button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-xl border border-[var(--border)] px-3 text-sm">×</button></div>)}</div><button type="button" onClick={() => setList([...list, ""])} className="mt-2 text-xs font-black text-[var(--accent)]">+ Aggiungi</button></div>;

  async function save(event: FormEvent) {
    event.preventDefault(); if (!exercise || saving) return; setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/exercises/${exercise.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, instructionsJson: instructions, mistakesJson: mistakes, cuesJson: cues, secondaryMuscles, equipment }) });
      if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.error || "Errore durante il salvataggio"); }
      const updated = await response.json(); setExercise(v => v ? { ...v, ...updated } : v); setMessage("✓ Modifiche salvate");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Errore durante il salvataggio"); } finally { setSaving(false); }
  }

  async function addMedia() {
    if (!exercise || !newMedia.url) return;
    const r = await fetch(`/api/admin/exercises/${exercise.id}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMedia) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMessage(d.error || "Errore media"); return; }
    const media = await r.json(); setExercise(v => v ? { ...v, media: newMedia.isPrimary ? [...v.media.map(m => ({ ...m, isPrimary: false })), media] : [...v.media, media] } : v); setNewMedia(v => ({ ...v, url: "", sourceName: "", sourceUrl: "", isPrimary: false })); setMessage("✓ Media aggiunto");
  }

  async function deleteMedia(mediaId: string) { if (!exercise || !confirm("Eliminare questo media?")) return; const r = await fetch(`/api/admin/exercises/${exercise.id}/media?mediaId=${mediaId}`, { method: "DELETE" }); if (r.ok) { setExercise(v => v ? { ...v, media: v.media.filter(m => m.id !== mediaId) } : v); setMessage("✓ Media eliminato"); } }

  if (!exercise) return <main className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">{message || "Caricamento…"}</main>;
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)] md:px-10"><div className="mx-auto max-w-6xl"><Link href="/admin/exercises" className="text-sm font-bold text-[var(--accent)]">← Exercise Library</Link><div className="mb-8 mt-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">Admin / Exercise</p><h1 className="mt-2 text-3xl font-black">{exercise.name}</h1></div>
    <form onSubmit={save} className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="mb-5 text-lg font-extrabold">Informazioni</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-bold text-[var(--muted)]">Nome<input value={form.name || ""} onChange={e => update("name", e.target.value)} className="field" /></label><label className="text-xs font-bold text-[var(--muted)]">Slug<input value={form.slug || ""} onChange={e => update("slug", e.target.value)} className="field" /></label><label className="text-xs font-bold text-[var(--muted)]">Categoria<select value={form.category || categories[0]} onChange={e => update("category", e.target.value)} className="field">{categories.map(v => <option key={v}>{v}</option>)}</select></label><label className="text-xs font-bold text-[var(--muted)]">Difficoltà<select value={form.difficulty || difficulties[0]} onChange={e => update("difficulty", e.target.value)} className="field">{difficulties.map(v => <option key={v}>{v}</option>)}</select></label><label className="text-xs font-bold text-[var(--muted)]">Muscolo principale<select value={form.primaryMuscles || muscles[0]} onChange={e => update("primaryMuscles", e.target.value)} className="field">{muscles.map(v => <option key={v}>{v}</option>)}</select></label></div></section>
      <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-6"><h2 className="text-lg font-extrabold">Struttura tecnica</h2>{listEditor("Istruzioni", instructions, setInstructions)}{listEditor("Cues", cues, setCues)}{listEditor("Errori comuni", mistakes, setMistakes)}</div><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-6"><h2 className="text-lg font-extrabold">Muscoli e attrezzatura</h2><div><div className="mb-2 text-xs font-bold text-[var(--muted)]">Muscoli secondari</div><div className="flex flex-wrap gap-2">{muscles.map(v => <button type="button" key={v} onClick={() => toggle(secondaryMuscles, setSecondaryMuscles, v)} className={`rounded-full border px-3 py-2 text-xs font-bold ${secondaryMuscles.includes(v) ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)]"}`}>{v}</button>)}</div></div>{listEditor("Attrezzatura", equipment, setEquipment)}</div></section>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold">Media</h2><span className="text-xs font-bold text-[var(--muted)]">{exercise.media.length} file</span></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{exercise.media.map(m => <div key={m.id} className="overflow-hidden rounded-2xl border border-[var(--border)]"><div className="flex aspect-video items-center justify-center bg-black/5">{m.type === "IMAGE" || m.type === "GIF" ? <img src={m.url} alt={exercise.name} className="h-full w-full object-contain" /> : <video src={m.url} controls className="h-full w-full" />}</div><div className="p-3"><div className="flex justify-between text-xs font-bold"><span>{m.type}{m.isPrimary ? " · ★ PRIMARY" : ""}</span><button type="button" onClick={() => deleteMedia(m.id)} className="text-red-500">Elimina</button></div><p className="mt-1 truncate text-xs text-[var(--muted)]">{m.sourceName || m.url}</p></div></div>)}</div><div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-4"><h3 className="font-extrabold">+ Aggiungi media</h3><div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><select value={newMedia.type} onChange={e => setNewMedia(v => ({ ...v, type: e.target.value }))} className="field">{mediaTypes.map(v => <option key={v}>{v}</option>)}</select><input placeholder="URL media" value={newMedia.url} onChange={e => setNewMedia(v => ({ ...v, url: e.target.value }))} className="field lg:col-span-2" /><input placeholder="Nome fonte" value={newMedia.sourceName} onChange={e => setNewMedia(v => ({ ...v, sourceName: e.target.value }))} className="field" /></div><div className="mt-3 flex flex-wrap items-center gap-4"><label className="text-xs font-bold"><input type="checkbox" checked={newMedia.isPrimary} onChange={e => setNewMedia(v => ({ ...v, isPrimary: e.target.checked }))} className="mr-2" />Media principale</label><input placeholder="Fonte / URL attribuzione" value={newMedia.sourceUrl} onChange={e => setNewMedia(v => ({ ...v, sourceUrl: e.target.value }))} className="field flex-1" /><button type="button" onClick={addMedia} disabled={!newMedia.url} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-xs font-black text-[var(--accent-foreground)] disabled:opacity-50">Aggiungi</button></div></div></section>
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-xl backdrop-blur"><span className={`text-sm font-bold ${message.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{message}</span><button type="submit" disabled={saving} className="rounded-2xl bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--accent-foreground)] disabled:opacity-50">{saving ? "Salvataggio…" : "Salva modifiche"}</button></div>
    </form></div></main>;
}
