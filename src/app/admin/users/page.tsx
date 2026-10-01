"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserRound, ClipboardList, Activity } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  profile: { firstName: string | null; age: number | null; currentWeight: number | null; targetWeight: number | null } | null;
  onboarding: { primaryGoal: string | null; completedAt: string | null } | null;
  plans: { id: string; name: string; updatedAt: string; templates: { id: string }[] }[];
  _count: { sessionsLog: number };
};

const goalLabels: Record<string, string> = {
  FAT_LOSS: "Perdita peso", MUSCLE_GAIN: "Massa muscolare", RECOMPOSITION: "Ricomp", STRENGTH: "Forza", GENERAL_FITNESS: "Fitness generale",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Impossibile caricare gli utenti"); return data.users; })
      .then(setUsers)
      .catch(e => setError(e instanceof Error ? e.message : "Impossibile caricare gli utenti"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => `${u.profile?.firstName ?? ""} ${u.email} ${u.plans[0]?.name ?? ""}`.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-[var(--accent)]">People</p>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Utenti</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Panoramica degli utenti dell'app, del programma assegnato e dell'attività registrata.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold"><Users size={18}/>{users.length} utenti</div>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca per nome, email o programma..." className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]" />
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}
        {loading ? <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">Caricamento utenti...</div> : filtered.length === 0 ? <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center"><UserRound className="mx-auto mb-3 text-[var(--muted)]"/><p className="font-black">Nessun utente trovato</p><p className="mt-1 text-sm text-[var(--muted)]">Prova a cambiare la ricerca.</p></div> : <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(user => {
            const name = user.profile?.firstName?.trim() || "Utente";
            const plan = user.plans[0];
            return <article key={user.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]/30">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><h2 className="truncate text-lg font-black">{name}</h2><p className="truncate text-sm text-[var(--muted)]">{user.email}</p></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${user.onboarding?.completedAt ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>{user.onboarding?.completedAt ? "Profilo completo" : "Onboarding"}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[var(--surface-strong)] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Obiettivo</p><p className="mt-1 text-xs font-bold">{user.onboarding?.primaryGoal ? goalLabels[user.onboarding.primaryGoal] ?? user.onboarding.primaryGoal : "—"}</p></div>
                <div className="rounded-2xl bg-[var(--surface-strong)] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Allenamenti</p><p className="mt-1 flex items-center gap-1 text-xs font-bold"><Activity size={13}/>{user._count.sessionsLog}</p></div>
                <div className="rounded-2xl bg-[var(--surface-strong)] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Peso</p><p className="mt-1 text-xs font-bold">{user.profile?.currentWeight ? `${user.profile.currentWeight} kg` : "—"}</p></div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <ClipboardList size={17} className="text-[var(--accent)]" />
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Programma attivo</p><p className="truncate text-sm font-black">{plan?.name ?? "Nessun programma assegnato"}</p></div>
                {plan && <span className="ml-auto shrink-0 text-xs font-bold text-[var(--muted)]">{plan.templates.length} gg</span>}
              </div>
            </article>;
          })}
        </div>}
      </div>
    </main>
  );
}
