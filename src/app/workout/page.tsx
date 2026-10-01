import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, Dumbbell, Play, TimerReset } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const exercises = [
  ["Warm up", "Mobility + activation", "05 min"],
  ["Barbell squat", "3 sets × 8–10 reps", "12 min"],
  ["Lat pulldown", "3 sets × 10–12 reps", "10 min"],
  ["Shoulder press", "3 sets × 8–10 reps", "10 min"],
  ["Cable curl", "3 sets × 10–12 reps", "08 min"],
  ["Core finisher", "3 rounds", "06 min"],
];

export default async function WorkoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/workout");
  if (!user.onboarding?.completedAt) redirect("/onboarding");

  return <main className="min-h-screen bg-[var(--background)] pb-12"><div className="mx-auto max-w-4xl px-5 py-6 sm:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17}/> Dashboard</Link><header className="mt-8"><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">TODAY&apos;S WORKOUT</p><h1 className="mt-2 text-4xl font-black tracking-tight">Full Body · Foundation</h1><p className="mt-2 text-sm text-[var(--muted)]">A preview workout while your personalized plan is being generated.</p></header><div className="mt-7 grid grid-cols-3 gap-3"><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><Clock3 className="text-[var(--accent)]" size={18}/><p className="mt-4 font-black">51 min</p><p className="text-xs text-[var(--muted)]">Duration</p></div><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><Dumbbell className="text-[var(--accent)]" size={18}/><p className="mt-4 font-black">6</p><p className="text-xs text-[var(--muted)]">Exercises</p></div><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><TimerReset className="text-[var(--accent)]" size={18}/><p className="mt-4 font-black">60–90s</p><p className="text-xs text-[var(--muted)]">Rest</p></div></div><section className="mt-7 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]"><div className="border-b border-[var(--border)] p-6"><h2 className="text-xl font-black">Exercises</h2></div>{exercises.map(([name, detail, time], index) => <div key={name} className="flex items-center gap-4 border-b border-[var(--border)] p-5 last:border-0"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-sm font-black text-[var(--accent)]">{String(index + 1).padStart(2,"0")}</div><div className="min-w-0 flex-1"><p className="font-black">{name}</p><p className="mt-1 text-sm text-[var(--muted)]">{detail}</p></div><span className="text-xs font-bold text-[var(--muted)]">{time}</span></div>)}</section><button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)]"><Play size={17} fill="currentColor"/> START WORKOUT</button></div></main>;
}
