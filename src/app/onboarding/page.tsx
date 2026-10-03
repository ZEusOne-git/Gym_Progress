"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Target, UserRound, CalendarDays, HeartPulse, Ruler, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

const steps = [
  { title: "Partiamo da te", icon: UserRound },
  { title: "Il tuo punto di partenza", icon: Ruler },
  { title: "Il tuo obiettivo", icon: Target },
  { title: "La tua esperienza", icon: Dumbbell },
  { title: "La tua settimana", icon: CalendarDays },
  { title: "Le tue priorità", icon: Sparkles },
  { title: "Le tue preferenze", icon: HeartPulse },
];

const goals = [
  { value: "RECOMP", label: "Ricomposizione", description: "Perdere grasso e costruire muscolo" },
  { value: "FAT LOSS", label: "Perdita di grasso", description: "Ridurre il grasso mantenendo la forza" },
  { value: "MUSCLE", label: "Aumento della massa", description: "Aumentare massa e muscoli" },
  { value: "STRENGTH", label: "Forza", description: "Diventare più forte negli esercizi principali" },
];

const priorities = [
  { value: "Arms", label: "Braccia" },
  { value: "Shoulders", label: "Spalle" },
  { value: "Chest", label: "Petto" },
  { value: "Back", label: "Schiena" },
  { value: "Abs", label: "Addome" },
  { value: "Glutes", label: "Glutei" },
  { value: "Quads", label: "Quadricipiti" },
  { value: "Hamstrings", label: "Femorali" },
  { value: "Calves", label: "Polpacci" },
  { value: "Lower back", label: "Zona lombare" },
];
const priorityValueByStoredValue: Record<string, string> = Object.fromEntries(
  priorities.flatMap(({ value }) => [[value.toUpperCase(), value], [value.replaceAll(" ", "_").toUpperCase(), value]])
);
priorityValueByStoredValue.LOWER_BACK = "Lower back";
const equipmentOptions = [
  { id: "machines", label: "Macchine e cavi" },
  { id: "barbells", label: "Bilancieri" },
  { id: "free_weights", label: "Manubri e pesi liberi" },
  { id: "cardio", label: "Attrezzatura cardio" },
] as const;

type FormState = {
  name: string;
  age: string;
  weight: string;
  height: string;
  goal: string;
  experience: string;
  days: string;
  priorities: string[];
  equipment: string[];
  running: string;
  notes: string;
};

const defaultEquipment = ["machines", "barbells", "free_weights", "cardio"];
const emptyForm: FormState = { name: "", age: "", weight: "", height: "", goal: "", experience: "", days: "4", priorities: [], equipment: defaultEquipment, running: "", notes: "" };

export default function OnboardingPage() {
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const StepIcon = steps[step].icon;

  useEffect(() => {
    const editingMode = new URLSearchParams(window.location.search).get("edit") === "1";
    setEditing(editingMode);
    let active = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login?next=/onboarding";
          return null;
        }
        if (!response.ok) throw new Error("Impossibile caricare il profilo.");
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.completed && !editingMode) {
          window.location.href = "/dashboard";
          return;
        }
        const profile = data.profile ?? {};
        const onboarding = data.onboarding ?? {};
        let prioritiesFromDb: string[] = [];
        try {
          const stored = JSON.parse(onboarding.musclePrioritiesJson ?? "[]");
          prioritiesFromDb = Array.isArray(stored)
            ? stored.flatMap((item: unknown) => {
                if (typeof item !== "string") return [];
                const value = priorityValueByStoredValue[item.toUpperCase()];
                return value ? [value] : [];
              })
            : [];
        } catch { prioritiesFromDb = []; }
        let preferences: { cardio?: string; trainingStyle?: string } = {};
        try { preferences = JSON.parse(onboarding.preferencesJson ?? "{}"); } catch { preferences = {}; }
        let equipment: string[] = defaultEquipment;
        try {
          const storedEquipment = JSON.parse(onboarding.equipmentJson ?? "null");
          if (Array.isArray(storedEquipment)) {
            equipment = storedEquipment.filter((item: unknown): item is string => typeof item === "string" && equipmentOptions.some(option => option.id === item));
          }
        } catch { equipment = defaultEquipment; }
        const goalReverse: Record<string, string> = { RECOMPOSITION: "RECOMP", FAT_LOSS: "FAT LOSS", MUSCLE_GAIN: "MUSCLE", STRENGTH: "STRENGTH" };
        setForm({
          name: profile.firstName ?? "",
          age: profile.age?.toString() ?? "",
          weight: profile.currentWeight?.toString() ?? "",
          height: profile.heightCm?.toString() ?? "",
          goal: goalReverse[onboarding.primaryGoal] ?? "",
          experience: profile.experience ?? "",
          days: profile.trainingDays?.toString() ?? "4",
          priorities: prioritiesFromDb.filter((item) => priorities.some((priority) => priority.value === item)),
          equipment,
          running: preferences.cardio ?? "",
          notes: preferences.trainingStyle ?? "",
        });
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Impossibile caricare il profilo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const togglePriority = (value: string) => setForm((current) => ({ ...current, priorities: current.priorities.includes(value) ? current.priorities.filter((item) => item !== value) : [...current.priorities, value] }));
  const toggleEquipment = (value: string) => setForm((current) => ({ ...current, equipment: current.equipment.includes(value) ? current.equipment.filter((item) => item !== value) : [...current.equipment, value] }));

  const save = async (completed = false) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, completed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossibile salvare i progressi.");
      if (editing && completed) window.location.href = "/profile";
      else if (completed) window.location.href = "/programs";
      else setStep((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile salvare i progressi.");
    } finally {
      setSaving(false);
    }
  };

  const next = () => save(step === steps.length - 1);

  if (loading) return <main className="flex min-h-screen items-center justify-center px-5"><p className="text-sm font-bold text-[var(--muted)]">CARICAMENTO DEL PROFILO...</p></main>;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-7 pt-6">
        <header className="mb-7 flex items-center gap-3">
          {step === 0 ? <Link href={editing ? "/profile" : "/register"} aria-label="Indietro" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></Link> : <button onClick={() => setStep((current) => current - 1)} aria-label="Indietro" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></button>}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--muted)]"><span>{editing ? "MODIFICA PROFILO" : "IL TUO PROFILO"}</span><span>{step + 1} / {steps.length}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </header>

        <section className="flex-1">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><StepIcon size={22} /></div>
          <p className="mb-2 text-sm font-bold text-[var(--accent)]">FASE {step + 1}</p>
          <h1 className="text-4xl font-black tracking-tight">{steps[step].title}</h1>
          <p className="mt-3 leading-6 text-[var(--muted)]">{step === 0 && "Ci bastano poche informazioni per iniziare a personalizzare il tuo percorso."}{step === 1 && "Questi dati descrivono il tuo punto di partenza e puoi aggiornarli in seguito."}{step === 2 && "Scegli il risultato che conta di più per te in questo momento."}{step === 3 && "Indica quanta esperienza hai con l’allenamento di forza."}{step === 4 && "La costanza conta più della settimana perfetta."}{step === 5 && "Scegli le zone che vuoi dare più attenzione. Potrai cambiarle quando vuoi."}{step === 6 && "Completa il profilo con i tuoi orari e l’attrezzatura che puoi usare."}</p>

          <div className="mt-8 space-y-4">
            {step === 0 && <><Field label="Nome" value={form.name} onChange={(value) => update("name", value)} placeholder="Il tuo nome" /><Field label="Età" value={form.age} onChange={(value) => update("age", value)} placeholder="29" type="number" /></>}
            {step === 1 && <div className="grid grid-cols-2 gap-3"><Field label="Peso (kg)" value={form.weight} onChange={(value) => update("weight", value)} placeholder="90" type="number" /><Field label="Altezza (cm)" value={form.height} onChange={(value) => update("height", value)} placeholder="180" type="number" /></div>}
            {step === 2 && <div className="space-y-3">{goals.map(({ value, label, description }) => <button key={value} onClick={() => update("goal", value)} className={`w-full rounded-2xl border p-4 text-left transition ${form.goal === value ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><span className="block font-black">{label}</span><span className={`mt-1 block text-sm ${form.goal === value ? "opacity-70" : "text-[var(--muted)]"}`}>{description}</span></button>)}</div>}
            {step === 3 && <Choice label="Esperienza con i pesi" options={["Beginner", "Intermediate", "Advanced"]} value={form.experience} onChange={(value) => update("experience", value)} />}
            {step === 4 && <><Choice label="Giorni a settimana" options={["2", "3", "4", "5", "6"]} value={form.days} onChange={(value) => update("days", value)} /><Choice label="Attività cardio" options={["None", "1–2 sessions", "3+ sessions", "I want to add running"]} value={form.running} onChange={(value) => update("running", value)} /></>}
            {step === 5 && <div className="grid grid-cols-2 gap-3">{priorities.map(({ value, label }) => <button key={value} onClick={() => togglePriority(value)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${form.priorities.includes(value) ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current">{form.priorities.includes(value) && <Check size={13} />}</span>{label}</button>)}</div>}
            {step === 6 && <>
              <div>
                <p className="mb-2 text-sm font-semibold">Attrezzatura che hai a disposizione</p>
                <div className="grid grid-cols-2 gap-2">
                  {equipmentOptions.map((option) => {
                    const selected = form.equipment.includes(option.id);
                    return <button type="button" key={option.id} aria-pressed={selected} onClick={() => toggleEquipment(option.id)} className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><span>{option.label}</span>{selected && <Check size={15} strokeWidth={3} />}</button>;
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Seleziona solo ciò che usi davvero. Se lasci tutto deselezionato, considereremo gli esercizi a corpo libero.</p>
              </div>
              <Choice label="Come preferisci allenarti?" options={["Mostly machines", "Free weights", "A mix of everything"]} value={form.notes} onChange={(value) => update("notes", value)} />
            </>}
          </div>
          {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
        </section>

        <button disabled={saving} onClick={next} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "SALVATAGGIO..." : editing && step === steps.length - 1 ? "SALVA MODIFICHE" : step === steps.length - 1 ? "SCEGLI IL MIO PROGRAMMA" : "CONTINUA"}<ArrowRight size={18} /></button>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none focus:border-[var(--accent)]" /></label>;
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  const labels: Record<string, string> = {
    Beginner: "Principiante",
    Intermediate: "Intermedio",
    Advanced: "Avanzato",
    None: "Nessuna",
    "1–2 sessions": "1–2 sessioni",
    "3+ sessions": "3 o più sessioni",
    "I want to add running": "Vorrei iniziare a correre",
    "Mostly machines": "Prevalentemente macchine",
    "Free weights": "Pesi liberi",
    "A mix of everything": "Un mix",
  };
  return <div><p className="mb-2 text-sm font-semibold">{label}</p><div className="grid gap-2">{options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${value === option ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>{labels[option] ?? option}</button>)}</div></div>;
}
