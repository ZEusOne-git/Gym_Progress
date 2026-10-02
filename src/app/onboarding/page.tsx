"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Target, UserRound, CalendarDays, HeartPulse, Ruler, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const steps = [
  { title: "About you", icon: UserRound },
  { title: "Your body", icon: Ruler },
  { title: "Your goal", icon: Target },
  { title: "Training", icon: Dumbbell },
  { title: "Schedule", icon: CalendarDays },
  { title: "Priorities", icon: Sparkles },
  { title: "Preferences", icon: HeartPulse },
];

const goals = [
  ["RECOMP", "Lose fat while building muscle"],
  ["FAT LOSS", "Reduce body fat and keep strength"],
  ["MUSCLE", "Build muscle and size"],
  ["STRENGTH", "Get stronger on the main lifts"],
];

const priorities = ["Arms", "Shoulders", "Chest", "Back", "Abs", "Glutes", "Quads", "Hamstrings", "Calves", "Lower back"];

type FormState = {
  name: string;
  age: string;
  sex: string;
  weight: string;
  height: string;
  goal: string;
  experience: string;
  days: string;
  priorities: string[];
  running: string;
  notes: string;
};

const emptyForm: FormState = { name: "", age: "", sex: "", weight: "", height: "", goal: "", experience: "", days: "4", priorities: [], running: "", notes: "" };

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const editing = searchParams.get("edit") === "1";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const StepIcon = steps[step].icon;

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login?next=/onboarding";
          return null;
        }
        if (!response.ok) throw new Error("Unable to load your profile.");
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.completed && !editing) {
          window.location.href = "/dashboard";
          return;
        }
        const profile = data.profile ?? {};
        const onboarding = data.onboarding ?? {};
        let prioritiesFromDb: string[] = [];
        try {
          const stored = JSON.parse(onboarding.musclePrioritiesJson ?? "[]");
          prioritiesFromDb = Array.isArray(stored) ? stored.map((item: string) => item.replace("LOWER_BACK", "Lower back").replace("SHOULDERS", "Shoulders").replace("CHEST", "Chest").replace("BACK", "Back").replace("ABS", "Abs").replace("GLUTES", "Glutes").replace("QUADS", "Quads").replace("HAMSTRINGS", "Hamstrings").replace("CALVES", "Calves")) : [];
        } catch { prioritiesFromDb = []; }
        let preferences: { cardio?: string; trainingStyle?: string } = {};
        try { preferences = JSON.parse(onboarding.preferencesJson ?? "{}"); } catch { preferences = {}; }
        const goalReverse: Record<string, string> = { RECOMPOSITION: "RECOMP", FAT_LOSS: "FAT LOSS", MUSCLE_GAIN: "MUSCLE", STRENGTH: "STRENGTH" };
        setForm({
          name: profile.firstName ?? "",
          age: profile.age?.toString() ?? "",
          sex: profile.sex ?? "",
          weight: profile.currentWeight?.toString() ?? "",
          height: profile.heightCm?.toString() ?? "",
          goal: goalReverse[onboarding.primaryGoal] ?? "",
          experience: profile.experience ?? "",
          days: profile.trainingDays?.toString() ?? "4",
          priorities: prioritiesFromDb.filter((item) => priorities.includes(item)),
          running: preferences.cardio ?? "",
          notes: preferences.trainingStyle ?? "",
        });
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load your profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const togglePriority = (value: string) => setForm((current) => ({ ...current, priorities: current.priorities.includes(value) ? current.priorities.filter((item) => item !== value) : [...current.priorities, value] }));

  const save = async (completed = false) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, completed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save your progress.");
      if (editing && completed) window.location.href = "/profile";
      else if (completed) window.location.href = "/dashboard";
      else setStep((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your progress.");
    } finally {
      setSaving(false);
    }
  };

  const next = () => save(step === steps.length - 1);

  if (loading) return <main className="flex min-h-screen items-center justify-center px-5"><p className="text-sm font-bold text-[var(--muted)]">LOADING YOUR PROFILE...</p></main>;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-7 pt-6">
        <header className="mb-7 flex items-center gap-3">
          {step === 0 ? <Link href={editing ? "/profile" : "/register"} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></Link> : <button onClick={() => setStep((current) => current - 1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></button>}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--muted)]"><span>{editing ? "MODIFICA PROFILO" : "PERSONAL SETUP"}</span><span>{step + 1} / {steps.length}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </header>

        <section className="flex-1">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><StepIcon size={22} /></div>
          <p className="mb-2 text-sm font-bold text-[var(--accent)]">STEP {step + 1}</p>
          <h1 className="text-4xl font-black tracking-tight">{steps[step].title}</h1>
          <p className="mt-3 leading-6 text-[var(--muted)]">{step === 0 && "A few basics help us personalize your starting point."}{step === 1 && "We use these numbers to understand your starting point."}{step === 2 && "Choose the result that matters most right now."}{step === 3 && "Tell us how experienced you are with strength training."}{step === 4 && "Consistency matters more than perfect workouts."}{step === 5 && "Pick the areas you want to prioritize. You can change them later."}{step === 6 && "Finish with the preferences that shape your plan."}</p>

          <div className="mt-8 space-y-4">
            {step === 0 && <><Field label="Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your name" /><Field label="Age" value={form.age} onChange={(value) => update("age", value)} placeholder="29" type="number" /><Choice label="Sex" options={["Male", "Female", "Prefer not to say"]} value={form.sex} onChange={(value) => update("sex", value)} /></>}
            {step === 1 && <div className="grid grid-cols-2 gap-3"><Field label="Weight (kg)" value={form.weight} onChange={(value) => update("weight", value)} placeholder="90" type="number" /><Field label="Height (cm)" value={form.height} onChange={(value) => update("height", value)} placeholder="180" type="number" /></div>}
            {step === 2 && <div className="space-y-3">{goals.map(([title, description]) => <button key={title} onClick={() => update("goal", title)} className={`w-full rounded-2xl border p-4 text-left transition ${form.goal === title ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><span className="block font-black">{title}</span><span className={`mt-1 block text-sm ${form.goal === title ? "opacity-70" : "text-[var(--muted)]"}`}>{description}</span></button>)}</div>}
            {step === 3 && <Choice label="Training experience" options={["Beginner", "Intermediate", "Advanced"]} value={form.experience} onChange={(value) => update("experience", value)} />}
            {step === 4 && <><Choice label="Days per week" options={["2", "3", "4", "5", "6"]} value={form.days} onChange={(value) => update("days", value)} /><Choice label="Cardio" options={["None", "1–2 sessions", "3+ sessions", "I want to add running"]} value={form.running} onChange={(value) => update("running", value)} /></>}
            {step === 5 && <div className="grid grid-cols-2 gap-3">{priorities.map((item) => <button key={item} onClick={() => togglePriority(item)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${form.priorities.includes(item) ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current">{form.priorities.includes(item) && <Check size={13} />}</span>{item}</button>)}</div>}
            {step === 6 && <><Choice label="How do you prefer to train?" options={["Mostly machines", "Free weights", "A mix of everything"]} value={form.notes} onChange={(value) => update("notes", value)} /><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-sm font-bold">Your setup</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">We&apos;ll assume access to a commercial gym, barbells, machines and a free-weight area. You can change equipment later.</p></div></>}
          </div>
          {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
        </section>

        <button disabled={saving} onClick={next} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "SALVATAGGIO..." : editing && step === steps.length - 1 ? "SALVA MODIFICHE" : step === steps.length - 1 ? "CREA IL MIO PIANO" : "CONTINUA"}<ArrowRight size={18} /></button>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 outline-none focus:border-[var(--accent)]" /></label>;
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div><p className="mb-2 text-sm font-semibold">{label}</p><div className="grid gap-2">{options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${value === option ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--surface)]"}`}>{option}</button>)}</div></div>;
}
