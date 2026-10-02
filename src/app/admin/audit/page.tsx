"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

type Entry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { email: string; profile: { firstName: string | null } | null } | null;
};

const actionLabels: Record<string, string> = { CREATE: "Creato", UPDATE: "Modificato", DELETE: "Eliminato", ASSIGN: "Assegnato" };

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit", { cache: "no-store" })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Impossibile caricare il registro.");
        return result as { entries: Entry[] };
      })
      .then(result => setEntries(result.entries))
      .catch(value => setError(value instanceof Error ? value.message : "Errore di caricamento."))
      .finally(() => setLoading(false));
  }, []);

  return <main className="min-h-[100dvh] bg-[var(--background)] px-5 py-7 text-[var(--foreground)] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header><p className="text-[10px] font-black uppercase tracking-[.25em] text-[var(--accent)]">CONTROLLO</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Registro attività</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Ultime modifiche a esercizi, programmi e assegnazioni amministrative.</p></header>
      {error && <p role="alert" className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</p>}
      <section className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Caricamento…</p> : entries.length === 0 ? <div className="p-8 text-center"><ClipboardList size={26} className="mx-auto text-[var(--muted)]"/><h2 className="mt-3 font-black">Nessuna attività registrata</h2><p className="mt-1 text-sm text-[var(--muted)]">Le prossime modifiche amministrative appariranno qui.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[var(--border)] text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted)]"><tr><th className="px-5 py-4">Quando</th><th className="px-5 py-4">Attività</th><th className="px-5 py-4">Elemento</th><th className="px-5 py-4">Amministratore</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{entries.map(entry => <tr key={entry.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted)]">{new Date(entry.createdAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-5 py-4"><span className="font-black">{actionLabels[entry.action] ?? entry.action}</span><span className="ml-2 text-xs text-[var(--muted)]">{entry.entity}</span></td><td className="max-w-[240px] truncate px-5 py-4 font-bold">{typeof entry.metadata.name === "string" ? entry.metadata.name : entry.entityId ?? "—"}</td><td className="px-5 py-4 text-xs text-[var(--muted)]">{entry.user?.profile?.firstName || entry.user?.email || "Utente rimosso"}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </main>;
}
