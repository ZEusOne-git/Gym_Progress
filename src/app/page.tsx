import Link from "next/link";
import { ArrowRight, Check, Dumbbell, Play } from "lucide-react";

const features = ["Personalized workouts", "Exercise guidance", "Progressive overload tracking"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-7">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-black text-[var(--accent-foreground)]">GP</div>
            <span className="font-black tracking-tight">GYM PROGRESS</span>
          </div>
          <Link href="/login" className="text-sm font-semibold text-[var(--muted)]">Login</Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold tracking-wide text-[var(--accent)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> PERSONALIZED TRAINING</div>
          <h1 className="text-5xl font-black leading-[.95] tracking-[-0.045em]">Build your<br /><span className="text-[var(--accent)]">stronger</span> version.</h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-[var(--muted)]">Tell us how you train, what you want to improve, and how much time you have. Gym Progress builds the plan around you.</p>

          <div className="mt-8 space-y-3">
            {features.map((feature) => <div key={feature} className="flex items-center gap-3 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent)]"><Check size={14} strokeWidth={3} /></span>{feature}</div>)}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-[var(--surface)] p-4"><Dumbbell size={20} className="text-[var(--accent)]" /><p className="mt-8 text-2xl font-black">4–6</p><p className="text-xs text-[var(--muted)]">training days</p></div>
            <div className="rounded-3xl bg-[var(--surface)] p-4"><Play size={20} className="text-[var(--accent)]" /><p className="mt-8 text-2xl font-black">1 app</p><p className="text-xs text-[var(--muted)]">for your progress</p></div>
          </div>
        </section>

        <div className="space-y-3">
          <Link href="/register" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)] transition-transform active:scale-[.98]">CREATE YOUR PLAN <ArrowRight size={18} /></Link>
          <Link href="/login" className="flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 font-bold">I ALREADY HAVE AN ACCOUNT</Link>
        </div>
      </div>
    </main>
  );
}
