"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Dumbbell, Sparkles } from "lucide-react";

type Exercise = { exercise: { id: string; name: string; equipment: string }; sets: number; repMin: number | null; repMax: number | null };
type Plan = {
  id: string;
  name: string;
  templates: { id: string; dayNumber: number; name: string; estimatedMins: number | null; _count: { exercises: number }; exercises?: Exercise[] }[];
  equipmentFit?: { total: number; compatible: number; unsupported: string[]; percent: number };
  trainingDaysFit?: boolean;
};

type GeneratedPlan = Plan & { isTemplate: false };

export default function ProgramsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<{ id: string; name: string } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<GeneratedPlan | null>(null);
  const [preferredTrainingDays, setPreferredTrainingDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPrograms() {
    const r = await fetch("/api/workouts/programs", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Impossibile caricare i programmi.");
    setPlans(d.plans || []);
    setCurrent(d.current || null);
    setCurrentPlan(d.currentPlan || null);
    setPreferredTrainingDays(typeof d.preferredTrainingDays === "number" ? d.preferredTrainingDays : null);
  }

  useEffect(() => {
    loadPrograms().catch(e => setError(e instanceof Error ? e.message : "Errore")).finally(() => setLoading(false));
  }, []);

  async function choose(id: string) {
    setSaving(id); setError(""); setMessage("");
    try {
      const r = await fetch("/api/workouts/programs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templatePlanId: id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile aggiornare il programma.");
      setMessage(d.adapted?.count ? `Programma aggiornato. ${d.adapted.count} esercizi sono stati adattati all'attrezzatura disponibile.` : "Programma aggiornato. Il nuovo calendario è pronto.");
      await loadPrograms();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); }
    finally { setSaving(null); }
  }

  const activeTemplate = useMemo(() => plans.find(p => p.id === current?.id || p.name === current?.name) ?? null, [plans, current]);
  const activePlan = currentPlan ?? activeTemplate;
  const activeExerciseCount = activePlan?.templates.reduce((total, template) => total + template._count.exercises, 0) ?? 0;

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] pb-28">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"><ArrowLeft size={17} /> Dashboard</Link>
        <header className="mt-8">
          <p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">PROGRAMMI</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">Il tuo percorso.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Il programma personalizzato tiene conto dei tuoi giorni, obiettivo, esperienza, priorità e attrezzatura.</p>
          {preferredTrainingDays !== null && <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{preferredTrainingDays} giorni di allenamento a settimana nel tuo profilo.</p>}
        </header>

        {activePlan && (
          <section className="mt-8 overflow-hidden border-y border-[var(--accent)]/25 py-5 sm:py-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={18} strokeWidth={3} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">PROGRAMMA ATTIVO</p>
                  {currentPlan && <span className="rounded-full border border-[var(--accent)]/30 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">Personalizzato</span>}
                </div>
                <p className="mt-1 truncate text-xl font-black">{activePlan.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{activePlan.templates.length} giorni · {activeExerciseCount} esercizi · calendario generato per 12 settimane</p>
              </div>
            </div>

            {currentPlan && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Link href="/calendar" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-black text-[var(--accent-foreground)]"><CalendarDays size={16} /> VEDI CALENDARIO</Link>
              <Link href="/workout/active" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-black"><Dumbbell size={16} /> ALLENATI</Link>
              <Link href="/onboarding?edit=1" className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--muted)] sm:col-span-1">MODIFICA PROFILO <ArrowRight size={14} /></Link>
            </div>}

            <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {activePlan.templates.map(template => (
                <div key={template.id} className="py-4">
                  <div className="flex min-h-12 items-center justify-between gap-4">
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Giorno {template.dayNumber}</p><p className="mt-1 truncate text-sm font-black sm:text-base">{template.name}</p></div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-[var(--muted)]"><span>{template._count.exercises} esercizi</span>{template.estimatedMins ? <span>· {template.estimatedMins} min</span> : null}</div>
                  </div>
                  {template.exercises?.length ? <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">{template.exercises.map((item, index) => <div key={`${template.id}-${item.exercise.id}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl bg-[var(--surface)]/40 px-3 py-2.5"><span className="w-5 shrink-0 text-center text-[9px] font-black text-[var(--muted)]">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{item.exercise.name}</p><p className="mt-0.5 text-[9px] font-bold text-[var(--muted)]">{item.sets} serie{item.repMin ? ` · ${item.repMin}${item.repMax ? `–${item.repMax}` : ""} rip` : ""}</p></div></div>)}</div> : null}
                </div>
              ))}
            </div>
            {currentPlan && <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Questo piano è stato generato per il tuo profilo e viene usato direttamente per il calendario. Non è necessario scegliere un altro programma.</p>}
          </section>
        )}

        {message && <div className="mt-5 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-sm font-bold text-[var(--accent)]">{message}</div>}
        {error && <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">{error}</div>}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--muted)]">CATALOGO</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Altri programmi disponibili</h2></div><span className="text-[10px] font-bold text-[var(--muted)]">{plans.length}</span></div>
          <div className="mt-5 space-y-4">
            {plans.map((plan, index) => {
              const active = current?.id === plan.id || current?.name === plan.name;
              const matchesDays = plan.trainingDaysFit !== false;
              const totalExercises = plan.templates.reduce((total, t) => total + t._count.exercises, 0);
              const isRecommended = index === 0 || (matchesDays && plan.equipmentFit?.percent === 100);
              return <article key={plan.id} className={"border-y border-[var(--border)] transition-colors " + (active ? "border-y-[var(--accent)]/35" : "")}>
                <div className="py-5 sm:py-7">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">{isRecommended ? <Sparkles size={14} /> : <Dumbbell size={14} />}{active ? "Attivo" : isRecommended ? "Consigliato" : "Disponibile"}</div><h3 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{plan.name}</h3><p className="mt-2 text-sm text-[var(--muted)]">{plan.templates.length} giorni · {totalExercises} esercizi</p>{preferredTrainingDays !== null && !matchesDays && <p className="mt-2 text-xs font-bold text-amber-300">Prevede {plan.templates.length} giorni, mentre il tuo profilo ne indica {preferredTrainingDays}.</p>}{plan.equipmentFit && <p className={"mt-3 text-[10px] font-black uppercase tracking-[0.14em] " + (plan.equipmentFit.unsupported.length ? "text-amber-300" : "text-[var(--accent)]")}>{plan.equipmentFit.unsupported.length ? `${plan.equipmentFit.percent}% compatibile con i tuoi attrezzi` : "Compatibile con i tuoi attrezzi"}</p>}</div>{active && <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[9px] font-black text-[var(--accent-foreground)]">ATTIVO</span>}</div>
                  <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">{plan.templates.map(template => <div key={template.id} className="flex min-h-16 items-center justify-between gap-4 py-3.5"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Giorno {template.dayNumber}</p><p className="mt-1 truncate text-sm font-black sm:text-base">{template.name}</p></div><div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-[var(--muted)]"><span>{template._count.exercises} esercizi</span>{template.estimatedMins ? <span>· {template.estimatedMins} min</span> : null}<ChevronRight size={14} /></div></div>)}</div>
                  {!active && <button type="button" onClick={() => choose(plan.id)} disabled={saving !== null} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-black text-[var(--accent-foreground)] transition active:scale-[.985] disabled:cursor-wait disabled:opacity-60">{saving === plan.id ? "AGGIORNAMENTO..." : isRecommended ? "SCEGLI PROGRAMMA CONSIGLIATO" : "SCEGLI PROGRAMMA"}</button>}
                </div></article>;
            })}
          </div>
        </section>

        {!loading && plans.length === 0 && !activePlan && <div className="mt-8 border-y border-[var(--border)] py-6 text-sm leading-6 text-[var(--muted)]">Non ci sono ancora programmi disponibili. Completa il profilo per generare il tuo programma personalizzato.</div>}
        {loading && <div className="mt-8 animate-pulse space-y-2"><div className="h-28 border-y border-[var(--border)] bg-[var(--surface)]/30" /><div className="h-28 border-y border-[var(--border)] bg-[var(--surface)]/30" /></div>}
      </div>
    </main>
  );
}
