import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CalendarDays, ChevronRight, Dumbbell, Flame, Play, Sparkles, Target, TrendingUp, UserRound } from "lucide-react";
import type { ElementType } from "react";
import { getCurrentUser } from "@/lib/auth";

const stats = [
  ["4", "Days / week", CalendarDays],
  ["0", "Workouts done", Dumbbell],
  ["0 kg", "Weight change", TrendingUp],
  ["0%", "Consistency", Target],
] as const;

const navItems: Array<[string, string, ElementType]> = [
  ["Dashboard", "/dashboard", BarChart3],
  ["Workout", "/workout", Play],
  ["Progress", "/progress", TrendingUp],
  ["Profile", "/profile", UserRound],
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (!user.onboarding?.completedAt) redirect("/onboarding");

  const firstName = user.profile?.firstName?.trim() || "Athlete";

  return (
    <main className="min-h-screen bg-[var(--background)] pb-28">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-black tracking-[0.25em] text-[var(--accent)]">GYM PROGRESS</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Good morning, {firstName}.</h1><p className="mt-1 text-sm text-[var(--muted)]">Let&apos;s make today count.</p></div>
          <Link href="/profile" aria-label="Profile" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"><UserRound size={19} /></Link>
        </header>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] bg-[var(--accent)] p-6 text-[var(--accent-foreground)] shadow-2xl sm:p-8">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" /><div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-black/10 blur-3xl" />
          <div className="relative max-w-2xl"><div className="flex items-center gap-2 text-xs font-black tracking-[0.2em] opacity-70"><Flame size={16} /> YOUR NEXT STEP</div><h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Build your first workout.</h2><p className="mt-3 max-w-xl text-sm font-medium leading-6 opacity-75 sm:text-base">Your profile is ready. We&apos;ll use your goals, availability and muscle priorities to build a plan that fits you.</p><Link href="/workout" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-3.5 text-sm font-black">VIEW WORKOUT <Play size={16} fill="currentColor" /></Link></div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([value, label, Icon]) => <div key={label} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon size={18} className="text-[var(--accent)]" /><p className="mt-6 text-2xl font-black">{value}</p><p className="mt-1 text-xs font-medium text-[var(--muted)]">{label}</p></div>)}</div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-[var(--accent)]">TODAY</p><h3 className="mt-2 text-2xl font-black">Your training</h3></div><span className="rounded-full bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">Coming next</span></div><div className="mt-6 flex min-h-36 items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--background)] px-6 text-center"><div><Dumbbell className="mx-auto text-[var(--muted)]" size={25} /><p className="mt-3 font-bold">Your first workout will appear here.</p><p className="mt-1 text-sm text-[var(--muted)]">Exercises, sets, reps and rest in one place.</p></div></div><Link href="/workout" className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-bold">Explore training <ChevronRight size={18} className="text-[var(--accent)]" /></Link></div>
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]"><Sparkles size={19} /></div><p className="mt-6 text-xs font-black tracking-[0.18em] text-[var(--accent)]">YOUR PROFILE</p><h3 className="mt-2 text-2xl font-black">Ready to personalize.</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your onboarding answers are saved. The workout engine can now turn them into a weekly plan.</p><Link href="/profile" className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold">View profile <ChevronRight size={18} className="text-[var(--accent)]" /></Link></div>
        </section>

        <nav className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-around rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-2xl backdrop-blur-xl">{navItems.map(([label, href, Icon], index) => <Link key={label} href={href} className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold ${index === 0 ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`}><Icon size={17} />{label}</Link>)}</nav>
      </div>
    </main>
  );
}
