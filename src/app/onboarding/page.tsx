"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Target, UserRound, CalendarDays, HeartPulse, Ruler, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

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

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", age: "", sex: "", weight: "", height: "", goal: "", experience: "", days: "4", priorities: [] as string[], running: "", notes: "" });
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const StepIcon = steps[step].icon;

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const togglePriority = (value: string) => setForm((current) => ({ ...current, priorities: current.priorities.includes(value) ? current.priorities.filter((item) => item !== value) : [...current.priorities, value] }));

  const next = () => {
    if (step < steps.length - 1) setStep((current) => current + 1);
    else {
      sessionStorage.setItem("gym-progress-onboarding", JSON.stringify(form));
      window.location.href = "/dashboard";
    }
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-7 pt-6">
        <header className="mb-7 flex items-center gap-3">
          {step === 0 ? <Link href="/register" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></Link> : <button onClick={() => setStep((current) => current - 1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)]"><ArrowLeft size={18} /></button>}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--muted)]"><span>PERSONAL SETUP</span><span>{step + 1} / {steps.length}</span></div>
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
        </section>

        <button onClick={next} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)]">{step === steps.length - 1 ? "BUILD MY PLAN" : "CONTINUE"}<ArrowRight size={18} /></button>
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
