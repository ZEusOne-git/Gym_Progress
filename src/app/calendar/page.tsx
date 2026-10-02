"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, UserRound } from "lucide-react";

type Exercise = { id: string; sets: number; repMin: number; repMax: number; exercise: { name: string } };
type Template = { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: Exercise[] };
type Schedule = { id: string; scheduledDate: string; templateId: string; template: Template; session: { id: string; startedAt: string; completedAt: string | null } | null };
type Data = { plan: { id: string; name: string; templates: Template[] } | null; schedules: Schedule[]; sessions: { id: string; startedAt: string; completedAt: string | null }[]; nextSchedule: { id: string; scheduledDate: string; template: Template } | null };

const navItems = [["Dashboard", "/dashboard", BarChart3], ["Progress", "/progress", BarChart3], ["Calendario", "/calendar", CalendarDays], ["Profilo", "/profile", UserRound]] as const;
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => keyOf(a) === keyOf(b);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function CalendarPage() {
  const [selected, setSelected] = useState(new Date());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const touchStart = useRef<number | null>(null);
  const selectedKey = keyOf(selected);
  const today = new Date();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const center = monthStart(selected);
      const months = [-1, 0, 1].map(offset => new Date(center.getFullYear(), center.getMonth() + offset, 1));
      const responses = await Promise.all(months.map(month => fetch(`/api/workouts/dashboard?year=${month.getFullYear()}&month=${month.getMonth()}`).then(r => r.json())));
      const valid = responses.filter((item): item is Data => Boolean(item && typeof item === "object"));
      const base = valid.find(item => item.plan) ?? valid[0];
      if (!base) throw new Error("Impossibile caricare il calendario.");
      const merged = new Map<string, Schedule>();
      valid.forEach(item => item.schedules?.forEach(schedule => merged.set(schedule.id, schedule)));
      setData({ ...base, schedules: [...merged.values()].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile caricare il calendario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("completed") === "1") {
      setNotice(true);
      const value = params.get("date");
      if (value) {
        const d = new Date(`${value}T12:00:00`);
        if (!Number.isNaN(d.getTime())) setSelected(d);
      }
      window.history.replaceState({}, "", "/calendar");
    }
    fetch("/api/auth/me").then(r => r.json()).then(result => {
      if (!result.user) window.location.href = "/login?next=/calendar";
      else if (result.user.role === "USER" && !result.user.onboarding?.completedAt) window.location.href = "/onboarding";
    });
  }, []);

  useEffect(() => { void load(); }, [monthStart(selected).getTime()]);

  const schedules = useMemo(() => new Map((data?.schedules ?? []).map(schedule => [keyOf(new Date(schedule.scheduledDate)), schedule])), [data?.schedules]);
  const selectedSchedule = schedules.get(selectedKey) ?? null;
  const completed = Boolean(selectedSchedule?.session?.completedAt);
  const isToday = sameDay(selected, today);
  const visibleDays = useMemo(() => Array.from({ length: 5 }, (_, index) => addDays(selected, index - 2)), [selectedKey]);

  function move(days: number) {
    setSelected(current => addDays(current, days));
  }

  function goToday() {
    setSelected(new Date());
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStart.current === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) >= 42) move(delta < 0 ? 1 : -1);
  }

  return <main className="min-h-screen bg-[var(--background)] pb-28">
    <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">TRAINING CALENDAR</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Calendario</h1>
        </div>
        <button type="button" onClick={goToday} className="hidden rounded-full px-4 py-2 text-xs font-black text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:block">Torna a oggi</button>
      </header>

      {notice && <div className="mt-6 flex items-center gap-3 border-y border-[var(--accent)]/20 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={15} strokeWidth={3}/></span><div><p className="text-sm font-black">Allenamento completato</p><p className="text-xs text-[var(--muted)]">La sessione è stata registrata.</p></div><button type="button" onClick={() => setNotice(false)} className="ml-auto text-lg text-[var(--muted)]" aria-label="Chiudi">×</button></div>}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--muted)]">{selected.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--foreground)]">{data?.plan?.name || "Il tuo programma"}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => move(-7)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label="Settimana precedente"><ChevronLeft size={18}/></button>
            <button type="button" onClick={goToday} className="rounded-full px-3 py-2 text-[10px] font-black text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]">OGGI</button>
            <button type="button" onClick={() => move(7)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label="Settimana successiva"><ChevronRight size={18}/></button>
          </div>
        </div>

        <div className="mt-8 border-y border-[var(--border)] py-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="grid grid-cols-5 items-end">
            {visibleDays.map((day, index) => {
              const schedule = schedules.get(keyOf(day));
              const active = index === 2;
              const done = Boolean(schedule?.session?.completedAt);
              const todayDay = sameDay(day, today);
              return <button key={keyOf(day)} type="button" onClick={() => setSelected(day)} className="group flex min-w-0 flex-col items-center focus:outline-none">
                <span className={`text-[9px] font-black uppercase tracking-[0.13em] transition-colors sm:text-[10px] ${active ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
                <span className={`mt-2 flex h-12 w-12 items-center justify-center rounded-full text-xl font-black leading-none transition-all duration-300 sm:h-14 sm:w-14 sm:text-2xl ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_8px_25px_rgba(190,255,38,.18)] scale-105" : "text-[var(--foreground)] group-hover:bg-[var(--surface)]"}`}>{day.getDate()}</span>
                <span className={`mt-3 h-1.5 w-1.5 rounded-full transition-all ${done ? "bg-[var(--accent)]" : schedule ? "bg-[var(--accent)]/60" : "bg-[var(--border)]"}`} />
                {todayDay && <span className={`mt-2 text-[8px] font-black uppercase tracking-[0.14em] ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>oggi</span>}
              </button>;
            })}
          </div>
          <p className="mt-5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Scorri per cambiare giorno</p>
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">{isToday ? "OGGI" : selected.toLocaleDateString("it-IT", { weekday: "long" }).toUpperCase()}</p>
            <h2 className="mt-1 text-3xl font-black tracking-[-0.045em] capitalize sm:text-4xl">{selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h2>
          </div>
          <div className="hidden items-center gap-1 sm:flex"><button type="button" onClick={() => move(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Giorno precedente"><ChevronLeft size={18}/></button><button type="button" onClick={() => move(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Giorno successivo"><ChevronRight size={18}/></button></div>
        </div>

        {loading ? <div className="mt-8 animate-pulse border-y border-[var(--border)] py-8"><div className="h-3 w-24 rounded bg-[var(--surface)]"/><div className="mt-4 h-9 w-64 rounded bg-[var(--surface)]"/><div className="mt-3 h-4 w-80 max-w-full rounded bg-[var(--surface)]"/></div> : selectedSchedule ? <div className="mt-8 border-y border-[var(--border)] py-7 sm:py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Dumbbell size={14} className="text-[var(--accent)]"/> Giorno {selectedSchedule.template.dayNumber}</span><span>{selectedSchedule.template.exercises.length} esercizi</span>{selectedSchedule.template.estimatedMins ? <span className="inline-flex items-center gap-1"><Clock3 size={13}/> {selectedSchedule.template.estimatedMins} min</span> : null}</div>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{selectedSchedule.template.name}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">La scheda è pronta. Entra nell'allenamento e segui serie, ripetizioni e carico consigliato senza dover configurare nulla.</p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">{selectedSchedule.template.exercises.map((exercise, index) => <span key={exercise.id} className="text-xs font-bold text-[var(--muted)]"><span className="mr-1 text-[var(--accent)]">{index + 1}</span>{exercise.exercise.name}</span>)}</div>
            </div>
            <Link href={`/workout?day=${selectedSchedule.template.dayNumber}&date=${selectedKey}`} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition hover:-translate-y-0.5 ${completed ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "btn-dark !text-white"}`}>{completed ? "✓ Allenamento completato" : "Inizia allenamento"}<ArrowRight size={17}/></Link>
          </div>
        </div> : data?.plan ? <div className="mt-8 border-y border-[var(--border)] py-8"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">RECUPERO</p><h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">Giorno di riposo</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Nessun allenamento previsto oggi. Il prossimo giorno di training è già programmato.</p><button type="button" onClick={() => move(1)} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">Vedi domani <ArrowRight size={16}/></button></div> : <div className="mt-8 border-y border-[var(--border)] py-8"><p className="text-sm font-bold text-[var(--muted)]">Nessun programma assegnato.</p></div>}

        {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
      </section>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">{navItems.map(([label, href, Icon]) => { const active = label === "Calendario"; return <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`}><Icon size={20}/><span>{label}</span></Link>; })}</div></nav>
  </main>;
}
