"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Dumbbell } from "lucide-react";

type Exercise = { id: string; sets: number; repMin: number; repMax: number; exercise: { name: string } };
type Template = { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: Exercise[] };
type Schedule = { id: string; scheduledDate: string; templateId: string; template: Template; session: { id: string; startedAt: string; completedAt: string | null } | null };
type Data = { plan: { id: string; name: string; templates: Template[] } | null; schedules: Schedule[]; sessions: { id: string; startedAt: string; completedAt: string | null }[]; nextSchedule: { id: string; scheduledDate: string; template: Template } | null };

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => keyOf(a) === keyOf(b);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const spring = "transform 420ms cubic-bezier(.16,1,.3,1)";

export default function CalendarPage() {
  const [selected, setSelected] = useState(new Date());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const wheelDelta = useRef(0);
  const wheelReset = useRef<number | null>(null);
  const loadedMonths = useRef(new Set<string>());
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const selectedKey = keyOf(selected);
  const today = new Date();

  async function loadMonths(anchor: Date, showLoading = false) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const center = monthStart(anchor);
      const months = [-2, -1, 0, 1, 2].map(offset => new Date(center.getFullYear(), center.getMonth() + offset, 1));
      const missing = months.filter(month => !loadedMonths.current.has(monthKey(month)));
      if (missing.length === 0) {
        if (showLoading) setLoading(false);
        return;
      }
      const responses = await Promise.all(missing.map(month => fetch(`/api/workouts/dashboard?year=${month.getFullYear()}&month=${month.getMonth()}`).then(r => {
        if (!r.ok) throw new Error("Impossibile caricare il calendario.");
        return r.json();
      })));
      const valid = responses.filter((item): item is Data => Boolean(item && typeof item === "object"));
      const base = data ?? valid.find(item => item.plan) ?? valid[0];
      if (!base) throw new Error("Impossibile caricare il calendario.");
      const merged = new Map<string, Schedule>((data?.schedules ?? []).map(schedule => [schedule.id, schedule]));
      valid.forEach(item => item.schedules?.forEach(schedule => merged.set(schedule.id, schedule)));
      missing.forEach(month => loadedMonths.current.add(monthKey(month)));
      setData(current => ({ ...(current ?? base), ...base, schedules: [...merged.values()].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile caricare il calendario.");
    } finally {
      if (showLoading) setLoading(false);
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
    void loadMonths(new Date(), true);
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadMonths(selected, false);
  }, [monthKey(selected)]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (animating) return;
      const horizontal = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
      if (Math.abs(horizontal) < 0.5) return;
      event.preventDefault();
      wheelDelta.current += horizontal;
      if (wheelReset.current !== null) window.clearTimeout(wheelReset.current);
      wheelReset.current = window.setTimeout(() => { wheelDelta.current = 0; }, 140);
      if (Math.abs(wheelDelta.current) >= 70) {
        const direction = wheelDelta.current > 0 ? 1 : -1;
        wheelDelta.current = 0;
        animateDay(direction);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelReset.current !== null) window.clearTimeout(wheelReset.current);
    };
  }, [animating]);

  const schedules = useMemo(() => new Map((data?.schedules ?? []).map(schedule => [keyOf(new Date(schedule.scheduledDate)), schedule])), [data?.schedules]);
  const selectedSchedule = schedules.get(selectedKey) ?? null;
  const completed = Boolean(selectedSchedule?.session?.completedAt);
  const isToday = sameDay(selected, today);
  const carouselDays = useMemo(() => [-2, -1, 0, 1, 2].map(offset => addDays(selected, offset)), [selectedKey]);

  function move(days: number) {
    if (animating) return;
    setSelected(current => addDays(current, days));
  }

  function goToday() {
    if (!isToday && !animating) setSelected(new Date());
  }

  function resetDrag() {
    dragXRef.current = 0;
    setDragX(0);
  }

  function animateDay(direction: 1 | -1) {
    if (animating) return;
    const width = carouselRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    setAnimating(true);
    dragXRef.current = direction * -(width / 5);
    setDragX(dragXRef.current);
    window.setTimeout(() => {
      setSelected(current => addDays(current, direction));
      resetDrag();
      setAnimating(false);
    }, 420);
  }

  function startPointer(clientX: number) {
    if (animating) return;
    pointerStart.current = clientX;
    dragXRef.current = 0;
    setDragging(true);
    setDragX(0);
  }

  function movePointer(clientX: number) {
    if (pointerStart.current === null || animating) return;
    const delta = clientX - pointerStart.current;
    const next = Math.max(-180, Math.min(180, delta));
    dragXRef.current = next;
    setDragX(next);
  }

  function finishSwipe() {
    if (pointerStart.current === null || animating) return;
    const delta = dragXRef.current;
    pointerStart.current = null;
    setDragging(false);
    if (Math.abs(delta) < 48) {
      resetDrag();
      return;
    }
    animateDay(delta < 0 ? 1 : -1);
  }

  function selectDay(day: Date) {
    if (dragging || animating) return;
    const diff = Math.round((day.getTime() - selected.getTime()) / 86400000);
    if (diff === 0) return;
    if (Math.abs(diff) === 1) animateDay(diff > 0 ? 1 : -1);
    else setSelected(day);
  }

  return <main className="min-h-[100dvh] bg-[var(--background)] pb-28">
    <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
      <header>
        <p className="text-[10px] font-black tracking-[0.3em] text-[var(--accent)]">TRAINING CALENDAR</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Calendario</h1>
      </header>

      {notice && <div className="mt-6 flex items-center gap-3 border-y border-[var(--accent)]/20 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={15} strokeWidth={3}/></span><div><p className="text-sm font-black">Allenamento completato</p><p className="text-xs text-[var(--muted)]">La sessione è stata registrata.</p></div><button type="button" onClick={() => setNotice(false)} className="ml-auto text-lg text-[var(--muted)]" aria-label="Chiudi">×</button></div>}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--muted)]">{selected.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p>
            <p className="mt-1 truncate text-sm font-bold">{data?.plan?.name || "Il tuo programma"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/45 p-1 backdrop-blur-xl">
            <button type="button" onClick={() => move(-7)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:scale-90 hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label="Settimana precedente"><ChevronLeft size={17}/></button>
            <button type="button" onClick={goToday} disabled={isToday} className={`rounded-full px-3 py-1.5 text-[10px] font-black transition ${isToday ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>OGGI</button>
            <button type="button" onClick={() => move(7)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:scale-90 hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label="Settimana successiva"><ChevronRight size={17}/></button>
          </div>
        </div>

        <div ref={carouselRef} className="relative mt-7 overflow-hidden border-y border-[var(--border)] py-5 select-none touch-pan-y overscroll-contain" onPointerDown={e => { if (e.pointerType === "mouse" && e.buttons !== 1) return; e.currentTarget.setPointerCapture(e.pointerId); startPointer(e.clientX); }} onPointerMove={e => movePointer(e.clientX)} onPointerUp={finishSwipe} onPointerCancel={finishSwipe}>
          <div className="pointer-events-none absolute inset-y-0 left-1/3 z-0 w-1/3 bg-[var(--surface)]/20 blur-2xl" />
          <div className="relative z-10 flex h-[112px] w-[125%] -translate-x-[10%] items-center will-change-transform" style={{ transform: `translate3d(${dragX}px,0,0)`, transition: dragging ? "none" : spring }}>
            {carouselDays.map((day, index) => {
              const schedule = schedules.get(keyOf(day));
              const active = index === 1;
              const done = Boolean(schedule?.session?.completedAt);
              const todayDay = sameDay(day, today);
              return <button key={keyOf(day)} type="button" onClick={() => selectDay(day)} className="flex h-full w-1/5 shrink-0 flex-col items-center justify-center outline-none" aria-current={active ? "date" : undefined}>
                <span className={`text-[10px] font-black uppercase tracking-[0.16em] transition-opacity duration-300 ${active ? "text-[var(--foreground)]" : "text-[var(--muted)] opacity-70"}`}>{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
                <span className={`mt-2 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black leading-none transition-all duration-300 ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_10px_35px_rgba(190,255,38,.22)]" : "text-[var(--foreground)]"}`}>{day.getDate()}</span>
                <span className={`mt-3 h-1.5 w-1.5 rounded-full transition-all duration-300 ${done ? "bg-[var(--accent)]" : schedule ? "bg-[var(--accent)]/60" : "bg-[var(--border)]"}`} />
                <span className={`mt-2 h-3 text-[8px] font-black uppercase tracking-[0.14em] transition-opacity ${todayDay ? "opacity-100" : "opacity-0"} ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>oggi</span>
              </button>;
            })}
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">{isToday ? "OGGI" : selected.toLocaleDateString("it-IT", { weekday: "long" }).toUpperCase()}</p><h2 className="mt-1 text-3xl font-black tracking-[-0.045em] capitalize sm:text-4xl">{selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</h2></div>
          <div className="hidden items-center gap-1 sm:flex"><button type="button" onClick={() => move(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Giorno precedente"><ChevronLeft size={18}/></button><button type="button" onClick={() => move(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Giorno successivo"><ChevronRight size={18}/></button></div>
        </div>

        {loading ? <div className="mt-8 animate-pulse border-y border-[var(--border)] py-8"><div className="h-3 w-24 rounded bg-[var(--surface)]"/><div className="mt-4 h-9 w-64 rounded bg-[var(--surface)]"/><div className="mt-3 h-4 w-80 max-w-full rounded bg-[var(--surface)]"/></div> : selectedSchedule ? <div className="mt-8 border-y border-[var(--border)] py-7 sm:py-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Dumbbell size={14} className="text-[var(--accent)]"/> Giorno {selectedSchedule.template.dayNumber}</span><span>{selectedSchedule.template.exercises.length} esercizi</span>{selectedSchedule.template.estimatedMins ? <span className="inline-flex items-center gap-1"><Clock3 size={13}/> {selectedSchedule.template.estimatedMins} min</span> : null}</div><h3 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{selectedSchedule.template.name}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">La scheda è pronta. Entra nell'allenamento e segui serie, ripetizioni e carico consigliato senza dover configurare nulla.</p><div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">{selectedSchedule.template.exercises.map((exercise, index) => <span key={exercise.id} className="text-xs font-bold text-[var(--muted)]"><span className="mr-1 text-[var(--accent)]">{index + 1}</span>{exercise.exercise.name}</span>)}</div></div><Link href={`/workout?day=${selectedSchedule.template.dayNumber}&date=${selectedKey}`} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition active:scale-[.98] hover:-translate-y-0.5 ${completed ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "btn-dark !text-white"}`}>{completed ? "✓ Allenamento completato" : "Inizia allenamento"}<ArrowRight size={17}/></Link></div></div> : data?.plan ? <div className="mt-8 border-y border-[var(--border)] py-8"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">RECUPERO</p><h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">Giorno di riposo</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Nessun allenamento previsto oggi. Il prossimo giorno di training è già programmato.</p><button type="button" onClick={() => move(1)} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">Vedi domani <ArrowRight size={16}/></button></div> : <div className="mt-8 border-y border-[var(--border)] py-8"><p className="text-sm font-bold text-[var(--muted)]">Nessun programma assegnato.</p></div>}
        {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
      </section>
    </div>

  </main>;
}
