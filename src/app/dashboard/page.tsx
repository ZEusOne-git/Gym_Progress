import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?next=/dashboard");
  if (!user.onboarding?.completedAt) redirect("/onboarding");

  const firstName = user.profile?.firstName?.trim() || "Athlete";

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-7">
        <header className="flex items-center justify-between">
          <div><p className="text-xs font-bold tracking-widest text-[var(--accent)]">GYM PROGRESS</p><h1 className="mt-1 text-3xl font-black">Good to see you, {firstName}.</h1></div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] font-black text-[var(--accent-foreground)]">GP</div>
        </header>

        <section className="mt-10 rounded-3xl bg-[var(--surface)] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Sparkles size={22} /></div>
          <p className="mt-6 text-sm font-bold text-[var(--accent)]">PROFILE READY</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Your plan is next.</h2>
          <p className="mt-3 leading-6 text-[var(--muted)]">Your training profile is saved. Next we&apos;ll generate the weekly program around your goals, schedule and priorities.</p>
          <Link href="/" className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-4 font-black text-[var(--accent-foreground)]">VIEW WORKOUTS <ArrowRight size={18} /></Link>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><Dumbbell size={19} className="text-[var(--accent)]" /><p className="mt-7 text-xl font-black">Personal</p><p className="text-xs text-[var(--muted)]">training plan</p></div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><Sparkles size={19} className="text-[var(--accent)]" /><p className="mt-7 text-xl font-black">Progress</p><p className="text-xs text-[var(--muted)]">tracking ready</p></div>
        </div>
      </div>
    </main>
  );
}
