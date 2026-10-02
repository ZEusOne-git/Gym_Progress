"use client";

import { Check, Dumbbell, Scale } from "lucide-react";
import { useState } from "react";

const equipmentOptions = [
  { id: "machines", label: "Macchine" },
  { id: "barbells", label: "Bilancieri" },
  { id: "free_weights", label: "Manubri e pesi liberi" },
  { id: "cardio", label: "Cardio" },
] as const;

export default function ProfileSettings({
  initialWeight,
  initialEquipment,
}: {
  initialWeight: number | null;
  initialEquipment: string[];
}) {
  const [weight, setWeight] = useState(initialWeight?.toString() ?? "");
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const toggleEquipment = (id: string) => {
    setSaved(false);
    setEquipment(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight, equipment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile salvare le modifiche.");

      setEquipment(data.equipment ?? equipment);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile salvare le modifiche.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">IMPOSTAZIONI</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Quello che cambia nel tempo</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Qui aggiorni solo i dati che influenzano davvero i tuoi allenamenti.
        </p>
      </div>

      <div className="mt-5 border-y border-[var(--border)]">
        <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
              <Scale size={18} />
            </div>
            <div>
              <p className="text-sm font-black">Peso attuale</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Usato per seguire la tua evoluzione nel tempo.</p>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="500"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={event => {
                setWeight(event.target.value);
                setSaved(false);
              }}
              className="w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-right text-sm font-black outline-none focus:border-[var(--accent)]"
            />
            <span className="text-sm font-bold text-[var(--muted)]">kg</span>
          </label>
        </div>

        <div className="border-t border-[var(--border)] py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
              <Dumbbell size={18} />
            </div>
            <div>
              <p className="text-sm font-black">Attrezzatura disponibile</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Il piano userà questi attrezzi quando possibile.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {equipmentOptions.map(option => {
              const selected = equipment.includes(option.id);
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => toggleEquipment(option.id)}
                  className={"flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition " + (
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                  )}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={16} strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-bold text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-black text-[var(--accent-foreground)] transition active:scale-[.99] disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "SALVATAGGIO..." : saved ? "MODIFICHE SALVATE" : "SALVA MODIFICHE"}
      </button>
    </section>
  );
}
