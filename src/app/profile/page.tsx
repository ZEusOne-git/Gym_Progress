import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, LogOut, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  if (!user.onboarding?.completedAt) redirect("/onboarding");

  const name = user.profile?.firstName?.trim() || "Atleta";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] pb-28">
      <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8 sm:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <header className="mt-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-[var(--accent)] text-2xl font-black text-[var(--accent-foreground)] shadow-[0_12px_32px_rgba(190,255,38,.14)] sm:h-20 sm:w-20 sm:rounded-[1.7rem] sm:text-3xl">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">PROFILO</p>
              <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.045em] sm:text-4xl">{name}</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
          <div className="px-5 py-5 sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">ACCOUNT</p>
            <div className="mt-4 divide-y divide-[var(--border)]">
              <div className="flex min-h-16 items-center justify-between gap-5 py-3">
                <span className="text-sm text-[var(--muted)]">Email</span>
                <span className="max-w-[65%] truncate text-right text-sm font-bold">{user.email}</span>
              </div>
              <div className="flex min-h-16 items-center justify-between gap-5 py-3">
                <span className="text-sm text-[var(--muted)]">Profilo iniziale</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-black text-[var(--accent-foreground)]">
                  <Check size={13} strokeWidth={3} />
                  COMPLETATO
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">PREFERENZE</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Il tuo profilo di allenamento</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Puoi rivedere le informazioni raccolte durante il setup e aggiornare le tue preferenze.
              </p>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="mt-5 flex min-h-12 items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 transition hover:border-[var(--foreground)]/20 active:scale-[.99]"
          >
            <span className="text-sm font-black">Rivedi il profilo</span>
            <ChevronRight size={17} className="text-[var(--muted)]" />
          </Link>
        </section>

        <section className="mt-5">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3.5 text-sm font-black text-red-200 transition hover:bg-red-400/10 active:scale-[.99]"
            >
              <LogOut size={17} />
              Esci dall'account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
