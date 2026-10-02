"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, CalendarDays, ClipboardList, Dumbbell, Scale, UserRound } from "lucide-react";

type TemplatePlan = { id: string; name: string; updatedAt: string; templates: { id: string; dayNumber: number; name: string; estimatedMins: number | null; _count: { exercises: number } }[] };
type UserDetail = {
  id: string; email: string; createdAt: string;
  profile: { firstName: string | null; age: number | null; currentWeight: number | null; targetWeight: number | null; heightCm: number | null; experience: string | null; trainingDays: number | null; sessionMinutes: number | null } | null;
  onboarding: { primaryGoal: string | null; completedAt: string | null } | null;
  plans: { id: string; name: string; updatedAt: string; templates: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string; orderIndex: number; sets: number; repMin: number; repMax: number; exercise: { name: string } }[] }[] }[];
  sessionsLog: { id: string; startedAt: string; completedAt: string | null; plan: { name: string } }[];
  weightLogs: { id: string; weightKg: number; recordedAt: string }[];
};

const goals: Record<string, string> = { FAT_LOSS: "Perdita peso", MUSCLE_GAIN: "Massa muscolare", RECOMPOSITION: "Ricomp", STRENGTH: "Forza", GENERAL_FITNESS: "Fitness generale" };

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [templates, setTemplates] = useState<TemplatePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const { id } = await params;
    const response = await fetch(`/api/admin/users/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossibile caricare l'utente");
    setUser(data.user);
    setTemplates(data.templates ?? []);
  }, [params]);

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : "Errore")).finally(() => setLoading(false)); }, [load]);
  const completed = useMemo(() => user?.sessionsLog.filter(s => s.completedAt).length ?? 0, [user]);

  const assignPlan = async () => {
    if (!selectedPlan || !user) { setError("Seleziona un programma prima di assegnarlo."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templatePlanId: selectedPlan }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile assegnare il programma.");
      const labels = Array.isArray(data.recurrence?.labels) ? data.recurrence.labels.join(" · ") : "";
      setSuccess(`Programma “${data.plan.name}” assegnato. Calendario precompilato per 12 settimane${labels ? ` · ${labels}` : ""}.`);
      setSelectedPlan("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore durante l'assegnazione."); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="p-8 text-sm text-[var(--muted)]">Caricamento profilo...</main>;
  if (error && !user) return <main className="p-8"><p className="font-black">{error}</p><Link href="/admin/users" className="mt-4 inline-block text-sm font-black text-[var(--accent)]">← Torna agli utenti</Link></main>;
  if (!user) return null;
  const name = user.profile?.firstName?.trim() || "Utente";
  const plan = user.plans[0];

  return <main className="min-h-screen px-5 py-8 md:px-10"><div className="mx-auto max-w-6xl">
    <Link href="/admin/users" className="mb-6 inline-flex items-center gap-2 text-sm font-black text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16}/> Utenti</Link>
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-[var(--accent)]">Profilo atleta</p><h1 className="text-3xl font-black md:text-4xl">{name}</h1><p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold">Iscritto {new Date(user.createdAt).toLocaleDateString("it-IT")}</div></header>
    {(error || success) && <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--foreground)]"}`}>{error || success}</div>}
    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<Activity size={17}/>} label="Allenamenti" value={`${completed}`} /><Stat icon={<ClipboardList size={17}/>} label="Programma" value={plan?.name ?? "Non assegnato"} /><Stat icon={<Scale size={17}/>} label="Peso" value={user.profile?.currentWeight ? `${user.profile.currentWeight} kg` : "—"} /><Stat icon={<CalendarDays size={17}/>} label="Obiettivo" value={user.onboarding?.primaryGoal ? goals[user.onboarding.primaryGoal] ?? user.onboarding.primaryGoal : "—"} /></section>

    <section className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-4 flex items-center gap-2"><ClipboardList size={19} className="text-[var(--accent)]"/><div><h2 className="text-lg font-black">Assegna programma</h2><p className="text-sm text-[var(--muted)]">Il programma viene copiato nell&apos;atleta e posizionato automaticamente nel calendario con una ricorrenza settimanale.</p></div></div><div className="flex flex-col gap-3 md:flex-row"><select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm font-bold text-[var(--foreground)]"><option value="">Seleziona un programma...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.templates.length} giorni</option>)}</select><button type="button" onClick={assignPlan} disabled={!selectedPlan || saving} className="btn-accent min-h-11 px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Assegnazione..." : "Assegna programma"}</button></div>{templates.length === 0 && <p className="mt-3 text-xs font-bold text-[var(--muted)]">Non ci sono template attivi. Creane uno da Programmi.</p>}</section>

    <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-5 flex items-center gap-2"><ClipboardList size={19} className="text-[var(--accent)]"/><h2 className="text-lg font-black">Programma attivo</h2></div>{!plan ? <p className="text-sm text-[var(--muted)]">Nessun programma assegnato.</p> : <div className="space-y-3">{plan.templates.map(day => <div key={day.id} className="rounded-2xl bg-[var(--surface-strong)] p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Giorno {day.dayNumber}</p><p className="font-black">{day.name}</p></div><span className="text-xs font-bold text-[var(--muted)]">{day.exercises.length} esercizi</span></div><div className="mt-3 space-y-2">{day.exercises.map(ex => <div key={ex.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm"><span className="flex items-center gap-2 font-bold"><Dumbbell size={14} className="text-[var(--accent)]"/>{ex.exercise.name}</span><span className="text-xs text-[var(--muted)]">{ex.sets} × {ex.repMin}–{ex.repMax}</span></div>)}</div></div>)}</div>}</section>
      <div className="space-y-6"><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="mb-4 flex items-center gap-2"><UserRound size={19} className="text-[var(--accent)]"/><h2 className="font-black">Profilo</h2></div><div className="grid grid-cols-2 gap-3 text-sm">{[["Età", user.profile?.age ? `${user.profile.age}` : "—"],["Altezza", user.profile?.heightCm ? `${user.profile.heightCm} cm` : "—"],["Esperienza", user.profile?.experience || "—"],["Giorni/settimana", user.profile?.trainingDays ? `${user.profile.trainingDays}` : "—"],["Durata sessione", user.profile?.sessionMinutes ? `${user.profile.sessionMinutes} min` : "—"],["Peso target", user.profile?.targetWeight ? `${user.profile.targetWeight} kg` : "—"]].map(([l,v]) => <div key={l} className="rounded-xl bg-[var(--surface-strong)] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{l}</p><p className="mt-1 font-bold">{v}</p></div>)}</div></section><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="mb-4 font-black">Attività recente</h2>{user.sessionsLog.length === 0 ? <p className="text-sm text-[var(--muted)]">Nessun allenamento registrato.</p> : <div className="space-y-2">{user.sessionsLog.slice(0, 6).map(s => <div key={s.id} className="flex items-center justify-between rounded-xl bg-[var(--surface-strong)] px-3 py-3"><div><p className="text-sm font-bold">{s.plan.name}</p><p className="text-xs text-[var(--muted)]">{new Date(s.startedAt).toLocaleDateString("it-IT")}</p></div><span className={`text-[10px] font-black uppercase ${s.completedAt ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{s.completedAt ? "Completato" : "In corso"}</span></div>)}</div>}</section></div>
    </div>
  </div></main>;
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="mb-3 text-[var(--accent)]">{icon}</div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-1 truncate text-sm font-black">{value}</p></div>; }
