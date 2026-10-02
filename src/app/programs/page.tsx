"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Dumbbell, Sparkles } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  templates: {
    id: string;
    dayNumber: number;
    name: string;
    estimatedMins: number | null;
    _count: { exercises: number };
  }[];
  equipmentFit?: {
    total: number;
    compatible: number;
    unsupported: string[];
    percent: number;
  };
};

export default function ProgramsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/workouts/programs")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Impossibile caricare i programmi.");
        setPlans(d.plans || []);
        setCurrent(d.current || null);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Errore"))
      .finally(() => setLoading(false));
  }, []);

  async function choose(id: string) {
    setSaving(id);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/workouts/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templatePlanId: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile aggiornare il programma.");
      setCurrent({ id: d.plan.id, name: d.plan.name });
      setMessage(
        d.adapted?.count
          ? `Programma aggiornato. ${d.adapted.count} esercizi sono stati adattati all'attrezzatura disponibile.`
          : "Programma aggiornato. Il nuovo calendario partirà dalle prossime programmazioni.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(null);
    }
  }

  const activePlan = useMemo(
    () => plans.find(p => p.name === current?.name) ?? null,
    [plans, current?.name]
  );

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] pb-28">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]">
          <ArrowLeft size={17} /> Dashboard
        </Link>

        <header className="mt-8">
          <p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">PROGRAMMI</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">Scegli il tuo percorso.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Ogni programma prepara automaticamente le tue sessioni. Tu devi solo aprire l'allenamento e seguirlo.
          </p>
        </header>

        {activePlan && (
          <section className="mt-8 border-y border-[var(--accent)]/25 py-5 sm:py-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                <Check size={18} strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">PROGRAMMA ATTIVO</p>
                <p className="mt-1 truncate text-xl font-black">{activePlan.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activePlan.templates.length} giorni · {activePlan.templates.reduce((total, t) => total + t._count.exercises, 0)} esercizi programmati
                </p>
              </div>
            </div>
          </section>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-sm font-bold text-[var(--accent)]">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <section className="mt-8 space-y-4">
          {plans.map((plan, index) => {
            const active = current?.id === plan.id || current?.name === plan.name;
            const totalExercises = plan.templates.reduce((total, t) => total + t._count.exercises, 0);
            return (
              <article
                key={plan.id}
                className={"border-y border-[var(--border)] transition-colors duration-300 " + (active ? "border-y-[var(--accent)]/35" : "")}
              >
                <div className="py-5 sm:py-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                        {index === 0 ? <Sparkles size={14} /> : <Dumbbell size={14} />}
                        {active ? "Attivo" : "Disponibile"}
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{plan.name}</h2>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {plan.templates.length} giorni di allenamento · {totalExercises} esercizi
                      </p>
                      {plan.equipmentFit ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                          <span className={plan.equipmentFit.unsupported.length ? "text-amber-300" : "text-[var(--accent)]"}>
                            {plan.equipmentFit.unsupported.length ? `${plan.equipmentFit.percent}% compatibile con i tuoi attrezzi` : "Compatibile con i tuoi attrezzi"}
                          </span>
                          {plan.equipmentFit.unsupported.length ? <span className="text-[var(--muted)]">· {plan.equipmentFit.unsupported.length} requisito non coperto</span> : null}
                        </div>
                      ) : null}
                    </div>
                    {active && (
                      <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[9px] font-black text-[var(--accent-foreground)]">
                        ATTIVO
                      </span>
                    )}
                  </div>

                  <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                    {plan.templates.map(template => (
                      <div key={template.id} className="flex min-h-16 items-center justify-between gap-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Giorno {template.dayNumber}</p>
                          <p className="mt-1 truncate text-sm font-black sm:text-base">{template.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-[var(--muted)]">
                          <span>{template._count.exercises} esercizi</span>
                          {template.estimatedMins ? <span>· {template.estimatedMins} min</span> : null}
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {!active && (
                    <button
                      type="button"
                      onClick={() => choose(plan.id)}
                      disabled={saving !== null}
                      className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-black text-[var(--accent-foreground)] transition active:scale-[.985] disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving === plan.id ? "AGGIORNAMENTO..." : "SCEGLI PROGRAMMA"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {!loading && plans.length === 0 && (
          <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm leading-6 text-[var(--muted)]">
            Non ci sono ancora programmi disponibili.
          </div>
        )}

        {loading && (
          <div className="mt-8 animate-pulse space-y-2">
            <div className="h-28 border-y border-[var(--border)] bg-[var(--surface)]/30" />
            <div className="h-28 border-y border-[var(--border)] bg-[var(--surface)]/30" />
          </div>
        )}
      </div>
    </main>
  );
}
