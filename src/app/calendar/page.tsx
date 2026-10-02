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
  const railRef = useRef<HTMLDivElement | null>(null);
  const selectedKey = keyOf(selected);
  const today = new Date();

  async function load() {
    setLoading(true); setError("");
    try {
      const center = monthStart(selected);
      const months = Array.from({ length: 6 }, (_, i) => new Date(center.getFullYear(), center.getMonth() + i - 1, 1));
      const results = await Promise.all(months.map(m => fetch(`/api/workouts/dashboard?year=${m.getFullYear()}&month=${m.getMonth()}`).then(r => r.json())));
      const valid = results.filter((x): x is Data => Boolean(x && typeof x === "object"));
      const base = valid.find(x => x.plan) ?? valid[0];
      if (!base) throw new Error("Impossibile caricare il calendario.");
      const merged = new Map<string, Schedule>();
      valid.forEach(x => x.schedules?.forEach(s => merged.set(s.id, s)));
      setData({ ...base, schedules: [...merged.values()].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) });
    } catch (e) { setError(e instanceof Error ? e.message : "Impossibile caricare il calendario."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("completed") === "1") {
      setNotice(true);
      const value = params.get("date");
      if (value) { const d = new Date(`${value}T12:00:00`); if (!Number.isNaN(d.getTime())) setSelected(d); }
      window.history.replaceState({}, "", "/calendar");
    }
    fetch("/api/auth/me").then(r => r.json()).then(x => {
      if (!x.user) window.location.href = "/login?next=/calendar";
      else if (x.user.role === "USER" && !x.user.onboarding?.completedAt) window.location.href = "/onboarding";
    });
  }, []);

  useEffect(() => { void load(); }, [monthStart(selected).getTime()]);

  const schedules = useMemo(() => new Map((data?.schedules ?? []).map(s => [keyOf(new Date(s.scheduledDate)), s])), [data?.schedules]);
  const selectedSchedule = schedules.get(selectedKey) ?? null;
  const days = useMemo(() => Array.from({ length: 61 }, (_, i) => addDays(selected, i - 30)), [selectedKey]);
  const completed = Boolean(selectedSchedule?.session?.completedAt);
  const todaySelected = sameDay(selected, today);

  useEffect(() => {
    const rail = railRef.current;
    const target = rail?.querySelector<HTMLElement>(`[data-day="${selectedKey}"]`);
    if (!rail || !target) return;
    rail.scrollTo({ left: Math.max(0, target.offsetLeft - (rail.clientWidth - target.clientWidth) / 2), behavior: "smooth" });
  }, [selectedKey]);

  function move(n: number) { setSelected(d => addDays(d, n)); }
  function todayAction() { setSelected(new Date()); }
  function onRailScroll() {
    const rail = railRef.current; if (!rail) return;
    requestAnimationFrame(() => {
      const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-day]"));
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let closest: { key: string; distance: number } | null = null;
      for (const card of cards) {
        const key = card.dataset.day;
        if (!key) continue;
        const distance = Math.abs(center - (card.offsetLeft + card.clientWidth / 2));
        if (!closest || distance < closest.distance) closest = { key, distance };
      }
      if (closest && closest.key !== selectedKey) {
        const d = new Date(`${closest.key}T12:00:00`);
        if (!Number.isNaN(d.getTime())) setSelected(d);
      }
    });
  }

  return <main className="min-h-screen bg-[var(--background)] pb-28">
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:px-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-black tracking-[0.28em] text-[var(--accent)]">TRAINING CALENDAR</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div><h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Calendario</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">Scorri i giorni come una timeline. Il programma si ripete automaticamente e ogni sessione è pronta per essere iniziata.</p></div>
          <button onClick={todayAction} className="hidden rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-black transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:block">OGGI</button>
        </div>
      </header>

      {notice && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={17} strokeWidth={3}/></span><div className="min-w-0"><p className="text-sm font-black">Allenamento completato</p><p className="truncate text-xs text-[var(--muted)]">Ottimo lavoro. La sessione è stata registrata.</p></div><button onClick={() => setNotice(false)} className="ml-auto text-lg text-[var(--muted)]" aria-label="Chiudi">×</button></div>}

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] py-5 sm:py-7">
        <div className="flex items-center justify-between px-5 sm:px-8">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">{selected.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p><p className="mt-1 truncate text-lg font-black">{data?.plan?.name || "Il tuo programma"}</p></div>
          <div className="flex items-center gap-1"><button onClick={() => move(-7)} className="btn-surface rounded-full p-2.5" aria-label="Settimana precedente"><ChevronLeft size={18}/></button><button onClick={() => move(7)} className="btn-surface rounded-full p-2.5" aria-label="Settimana successiva"><ChevronRight size={18}/></button></div>
        </div>

        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--surface)] to-transparent"/><div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--surface)] to-transparent"/>
          <div ref={railRef} onScroll={onRailScroll} className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-[calc(50%-42px)] py-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map(day => {
              const key = keyOf(day), schedule = schedules.get(key), active = key === selectedKey, done = Boolean(schedule?.session?.completedAt);
              return <button key={key} data-day={key} onClick={() => setSelected(day)} className={`snap-center shrink-0 text-center transition-all duration-300 ease-out focus:outline-none ${active ? "w-[84px] opacity-100" : "w-[58px] opacity-50 hover:opacity-80"}`}>
                <div className={`mx-auto flex h-[96px] w-full flex-col items-center justify-center rounded-[1.45rem] border transition-all duration-300 ${active ? "scale-105 border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_14px_34px_rgba(0,0,0,.22)]" : "border-[var(--border)] bg-[var(--background)]"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${active ? "opacity-65" : "text-[var(--muted)]"}`}>{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
                  <span className={`${active ? "text-[31px]" : "text-[24px]"} mt-1 font-black leading-none`}>{day.getDate()}</span>
                  <span className={`mt-3 text-[8px] font-black uppercase tracking-tight ${active ? "opacity-75" : "text-[var(--muted)]"}`}>{done ? "Fatto" : schedule ? "Allenamento" : "Riposo"}</span>
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${active ? "!bg-[var(--accent-foreground)]" : schedule ? "bg-[var(--accent)]" : "bg-[var(--muted)]"}`}/>
                </div>
                {sameDay(day, today) && <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Oggi</span>}
              </button>;
            })}
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-5 pt-6 sm:px-8">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">{todaySelected ? "OGGI" : selected.toLocaleDateString("it-IT", { weekday: "long" }).toUpperCase()}</p><h2 className="mt-1 text-3xl font-black tracking-[-0.03em] capitalize sm:text-4xl">{selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h2></div><div className="hidden gap-2 sm:flex"><button onClick={() => move(-1)} className="btn-surface rounded-full p-2.5" aria-label="Giorno precedente"><ChevronLeft size={18}/></button><button onClick={() => move(1)} className="btn-surface rounded-full p-2.5" aria-label="Giorno successivo"><ChevronRight size={18}/></button></div></div>

          {loading ? <div className="mt-7 animate-pulse rounded-3xl bg-[var(--background)] p-6"><div className="h-4 w-28 rounded bg-[var(--surface-strong)]"/><div className="mt-4 h-9 w-2/3 rounded bg-[var(--surface-strong)]"/><div className="mt-3 h-4 w-1/2 rounded bg-[var(--surface-strong)]"/></div> : selectedSchedule ? <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="rounded-[1.7rem] bg-[var(--background)] p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Dumbbell size={14} className="text-[var(--accent)]"/> Giorno {selectedSchedule.template.dayNumber}</span><span className="h-1 w-1 rounded-full bg-[var(--muted)]"/><span>{selectedSchedule.template.exercises.length} esercizi</span>{selectedSchedule.template.estimatedMins && <><span className="h-1 w-1 rounded-full bg-[var(--muted)]"/><span className="inline-flex items-center gap-1"><Clock3 size={13}/> {selectedSchedule.template.estimatedMins} min</span></>}</div><h3 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl">{selectedSchedule.template.name}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">La scheda è pronta. I carichi consigliati vengono gestiti durante l'allenamento in base alla tua performance.</p><div className="mt-5 flex flex-wrap gap-2">{selectedSchedule.template.exercises.slice(0, 4).map(e => <span key={e.id} className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{e.exercise.name}</span>)}{selectedSchedule.template.exercises.length > 4 && <span className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--muted)]">+{selectedSchedule.template.exercises.length - 4}</span>}</div></div>
            <Link href={`/workout?day=${selectedSchedule.template.dayNumber}&date=${selectedKey}`} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black transition hover:-translate-y-0.5 ${completed ? "border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "btn-dark !text-white hover:shadow-lg"}`}>{completed ? "✓ ALLENAMENTO COMPLETATO" : "INIZIA ALLENAMENTO"}<ArrowRight size={17}/></Link>
          </div> : data?.plan ? <div className="mt-7 rounded-[1.7rem] bg-[var(--background)] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">RECUPERO</p><h3 className="mt-2 text-3xl font-black tracking-[-0.03em]">Giorno di riposo.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">È previsto dal programma. Il prossimo allenamento apparirà automaticamente nel giorno stabilito.</p><button onClick={() => move(1)} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">Vedi domani <ArrowRight size={16}/></button></div> : <div className="mt-7 rounded-[1.7rem] bg-[var(--background)] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">NESSUN PROGRAMMA</p><h3 className="mt-2 text-3xl font-black">Il calendario è pronto.</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Quando viene assegnato un programma, le giornate vengono distribuite automaticamente.</p></div>}
          {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
        </div>
      </section>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">{navItems.map(([label, href, Icon]) => { const active = label === "Calendario"; return <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`}><Icon size={20}/><span>{label}</span></Link>; })}</div></nav>
  </main>;
}
