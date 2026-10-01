import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Clock3, Dumbbell, Play, TimerReset, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const exercises = [
  { name: "Warm up", detail: "Mobility + activation", time: "05 min", type: "Prep", href: null },
  { name: "Barbell squat", detail: "3 sets × 8–10 reps", time: "12 min", type: "Legs", href: "/workout/barbell-squat" },
  { name: "Lat pulldown", detail: "3 sets × 10–12 reps", time: "10 min", type: "Back", href: "/workout/lat-pulldown" },
  { name: "Shoulder press", detail: "3 sets × 8–10 reps", time: "10 min", type: "Shoulders", href: "/workout/shoulder-press" },
  { name: "Cable curl", detail: "3 sets × 10–12 reps", time: "08 min", type: "Biceps", href: "/workout/cable-curl" },
  { name: "Core finisher", detail: "3 rounds", time: "06 min", type: "Core", href: "/workout/core-finisher" },
];

export default async function WorkoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/workout");
  if (!user.onboarding?.completedAt) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-[var(--background)] pb-16">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"><ArrowLeft size={17} /> Dashboard</Link>
        <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black tracking-[0.2em] text-[var(--accent)]">TODAY&apos;S WORKOUT</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Full Body · Foundation</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">A preview workout while your personalized plan is being generated. Your final plan will adapt to your goals, schedule and priority muscles.</p></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> Preview plan</span>
        </header>
        <section className="mt-8 overflow-hidden rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-2xl sm:p-8"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] opacity-70"><Dumbbell size={16} /> TRAINING SESSION</div><p className="mt-4 text-3xl font-black">Build the habit first.</p><p className="mt-2 max-w-lg text-sm leading-6 opacity-75">Focus on controlled reps and leave 1–3 reps in reserve. We&apos;ll replace this preview with your personalized workout.</p></div><Link href="/workout/barbell-squat" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-3.5 text-sm font-black"><Play size={16} fill="currentColor" /> START</Link></div></section>
        <div className="mt-5 grid grid-cols-3 gap-3">{[[Clock3, "51 min", "Duration"], [Dumbbell, "6", "Exercises"], [TimerReset, "60–90s", "Rest"]].map(([Icon, value, label]) => <div key={String(label)} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><Icon className="text-[var(--accent)]" size={18} /><p className="mt-4 text-xl font-black sm:text-2xl">{String(value)}</p><p className="mt-1 text-xs text-[var(--muted)]">{String(label)}</p></div>)}</div>
        <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black tracking-[0.18em] text-[var(--accent)]">SESSION PLAN</p><h2 className="mt-1 text-2xl font-black">Exercises</h2></div><span className="text-xs font-bold text-[var(--muted)]">6 movements</span></div><div className="space-y-3">
          {exercises.map((exercise, index) => {
            const content = <><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">{index === 0 ? <Check size={22} /> : <Video size={22} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{exercise.name}</p><span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-black text-[var(--muted)]">{exercise.type}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{exercise.detail}</p></div><div className="hidden items-center gap-3 sm:flex"><span className="text-xs font-bold text-[var(--muted)]">{exercise.time}</span><ChevronRight size={18} className="text-[var(--muted)] transition group-hover:text-[var(--accent)]" /></div></>;
            return exercise.href ? <Link key={exercise.name} href={exercise.href} className="group flex items-center gap-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-5">{content}</Link> : <div key={exercise.name} className="flex items-center gap-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">{content}</div>;
          })}
        </div></section>
        <div className="mt-8 rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-8"><Video className="mx-auto text-[var(--accent)]" size={24} /><h3 className="mt-3 font-black">Exercise videos are coming next</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Each exercise will have an instructional GIF or video managed from the admin panel, so you can update media without touching the code.</p></div>
      </div>
    </main>
  );
}
