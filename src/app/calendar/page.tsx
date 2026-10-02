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
  const visibleDays = useMemo(() => [addDays(selected, -1), selected, addDays(selected, 1)], [selectedKey]);

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
    if (Math.abs(delta) < 45) return;
    move(delta < 0 ? 1 : -1);
  }

  return <main className="min-h-screen bg-[var(--background)] pb-28">
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-black tracking-[0.28em] text-[var(--accent)]">TRAINING CALENDAR</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Calendario</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">Scorri i giorni. Il tuo programma si ripete automaticamente e ogni giornata ti mostra subito cosa fare.</p>
          </div>
          <button type="button" onClick={goToday} className="hidden shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:block">OGGI</button>
        </div>
      </header>

      {notice && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={17} strokeWidth={3}/></span><div className="min-w-0"><p className="text-sm font-black">Allenamento completato</p><p className="text-xs text-[var(--muted)]">La sessione è stata registrata nel calendario.</p></div><button type="button" onClick={() => setNotice(false)} className="ml-auto text-lg text-[var(--muted)]" aria-label="Chiudi">×</button></div>}

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-7">
        <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">{selected.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p><p className="mt-1 truncate text-lg font-black">{data?.plan?.name || "Il tuo programma"}</p></div>
          <div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={() => move(-7)} className="btn-surface rounded-full p-2.5" aria-label="Settimana precedente"><ChevronLeft size={18}/></button><button type="button" onClick={goToday} className="btn-surface rounded-full px-3 py-2 text-[10px] font-black sm:hidden">OGGI</button><button type="button" onClick={() => move(7)} className="btn-surface rounded-full p-2.5" aria-label="Settimana successiva"><ChevronRight size={18}/></button></div>
        </div>

        <div className="mt-7 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="grid grid-cols-[24%_48%_24%] items-stretch justify-center gap-[2%] sm:grid-cols-[22%_48%_22%] sm:gap-[4%]">
            {visibleDays.map((day, index) => {
              const schedule = schedules.get(keyOf(day));
              const active = index === 1;
              const done = Boolean(schedule?.session?.completedAt);
              return <button key={keyOf(day)} type="button" onClick={() => setSelected(day)} className={`min-w-0 text-left transition-all duration-300 ease-out focus:outline-none ${active ? "z-10" : "opacity-55 hover:opacity-80"}`}>
                <div className={`flex h-[132px] flex-col justify-center overflow-hidden rounded-[1.5rem] border px-3 transition-all duration-300 sm:h-[160px] sm:px-5 ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_18px_45px_rgba(0,0,0,.22)]" : "border-[var(--border)] bg-[var(--background)]"}`}>
                  <span className={`text-[9px] font-black uppercase tracking-[0.16em] sm:text-[10px] ${active ? "opacity-65" : "text-[var(--muted)]"}`}>{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
                  <span className={`${active ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"} mt-1 font-black leading-none`}>{day.getDate()}</span>
                  <span className={`mt-3 truncate text-[8px] font-black uppercase tracking-[0.05em] sm:text-[9px] ${active ? "opacity-80" : "text-[var(--muted)]"}`}>{done ? "✓ FATTO" : schedule ? "• ALLENAMENTO" : "RIPOSO"}</span>
                  {active && <span className="mt-2 line-clamp-2 text-[10px] font-bold leading-tight opacity-70 sm:text-xs">{schedule?.template.name || "Giorno di recupero"}</span>}
                </div>
                {sameDay(day, today) && <span className="mt-2 block text-center text-[8px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Oggi</span>}
              </button>;
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]"><ChevronLeft size={13}/><span>Scorri per cambiare giornata</span><ChevronRight size={13}/></div>

        <div className="mt-7 border-t border-[var(--border)] pt-7">
          <div className="flex items-end justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">{isToday ? "OGGI" : selected.toLocaleDateString("it-IT", { weekday: "long" }).toUpperCase()}</p><h2 className="mt-1 text-3xl font-black tracking-[-0.035em] capitalize sm:text-4xl">{selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h2></div><div className="hidden shrink-0 gap-2 sm:flex"><button type="button" onClick={() => move(-1)} className="btn-surface rounded-full p-2.5" aria-label="Giorno precedente"><ChevronLeft size={18}/></button><button type="button" onClick={() => move(1)} className="btn-surface rounded-full p-2.5" aria-label="Giorno successivo"><ChevronRight size={18}/></button></div></div>

          {loading ? <div className="mt-7 animate-pulse rounded-[1.6rem] bg-[var(--background)] p-6"><div className="h-4 w-28 rounded bg-[var(--surface-strong)]"/><div className="mt-4 h-9 w-2/3 rounded bg-[var(--surface-strong)]"/><div className="mt-3 h-4 w-1/2 rounded bg-[var(--surface-strong)]"/></div> : selectedSchedule ? <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="rounded-[1.6rem] bg-[var(--background)] p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Dumbbell size={14} className="text-[var(--accent)]"/> Giorno {selectedSchedule.template.dayNumber}</span><span className="h-1 w-1 rounded-full bg-[var(--muted)]"/><span>{selectedSchedule.template.exercises.length} esercizi</span>{selectedSchedule.template.estimatedMins ? <><span className="h-1 w-1 rounded-full bg-[var(--muted)]"/><span className="inline-flex items-center gap-1"><Clock3 size={13}/> {selectedSchedule.template.estimatedMins} min</span></> : null}</div><h3 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{selectedSchedule.template.name}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">La scheda è pronta. Durante l'allenamento vedrai serie, ripetizioni e carico consigliato.</p><div className="mt-5 flex flex-wrap gap-2">{selectedSchedule.template.exercises.slice(0, 4).map(exercise => <span key={exercise.id} className="max-w-full truncate rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{exercise.exercise.name}</span>)}{selectedSchedule.template.exercises.length > 4 && <span className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">+{selectedSchedule.template.exercises.length - 4}</span>}</div></div>
            <Link href={`/workout?day=${selectedSchedule.template.dayNumber}&date=${selectedKey}`} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black transition hover:-translate-y-0.5 ${completed ? "border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "btn-dark !text-white hover:shadow-lg"}`}>{completed ? "✓ ALLENAMENTO COMPLETATO" : "INIZIA ALLENAMENTO"}<ArrowRight size={17}/></Link>
          </div> : data?.plan ? <div className="mt-7 rounded-[1.6rem] bg-[var(--background)] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">RECUPERO</p><h3 className="mt-2 text-3xl font-black tracking-[-0.035em]">Giorno di riposo.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">È previsto dal programma. Il prossimo allenamento apparirà automaticamente nel giorno stabilito.</p><button type="button" onClick={() => move(1)} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">Vedi domani <ArrowRight size={16}/></button></div> : <div className="mt-7 rounded-[1.6rem] bg-[var(--background)] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">NESSUN PROGRAMMA</p><h3 className="mt-2 text-3xl font-black tracking-[-0.035em]">Nessun piano assegnato.</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Quando ti verrà assegnato un programma, qui appariranno automaticamente tutte le sessioni.</p></div>}

          {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
        </div>
      </section>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">{navItems.map(([label, href, Icon]) => { const active = label === "Calendario"; return <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`}><Icon size={20}/><span>{label}</span></Link>; })}</div></nav>
  </main>;
}
