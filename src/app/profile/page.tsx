import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import ProfileSettings from "@/components/ProfileSettings";

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

        <ProfileSettings
          initialWeight={user.profile?.currentWeight ?? null}
          initialEquipment={(() => {
            try {
              const parsed = JSON.parse(user.onboarding?.equipmentJson ?? "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()}
        />

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Crediti contenuti</p>
          <a href="https://repdb.co" target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-[var(--accent)] underline-offset-4 hover:underline">
            Exercise data by RepDB (repdb.co)
          </a>
        </section>

        <section className="mt-5">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3.5 text-sm font-black text-red-200 transition hover:bg-red-400/10 active:scale-[.99]"
            >
              <LogOut size={17} />
              Esci dall&apos;account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
