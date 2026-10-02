"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Check, Play, UserRound, Plus, X } from "lucide-react";

type Template = { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string; sets: number; repMin: number; repMax: number; exercise: { name: string } }[] };
type Schedule = { id: string; scheduledDate: string; templateId: string; template: Template; session: { id: string; startedAt: string; completedAt: string | null } | null };
type Data = { plan: { id: string; name: string; templates: Template[] } | null; schedules: Schedule[]; sessions: { id: string; startedAt: string; completedAt: string | null }[]; nextSchedule: { id: string; scheduledDate: string; template: { id: string; dayNumber: number; name: string; estimatedMins: number | null; exercises: { id: string }[] } } | null };

const navItems = [["Dashboard", "/dashboard", BarChart3], ["Progress", "/progress", BarChart3], ["Calendario", "/calendar", CalendarDays], ["Profilo", "/profile", UserRound]] as const;
function keyOf(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function sameDay(a: Date, b: Date) { return keyOf(a) === keyOf(b); }
function monthDays(date: Date) { const first = new Date(date.getFullYear(), date.getMonth(), 1); const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); const offset = (first.getDay() + 6) % 7; return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1))]; }
function addDays(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount); }

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completedNotice, setCompletedNotice] = useState(false);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const months = [-1, 0, 1].map(offset => new Date(date.getFullYear(), date.getMonth() + offset, 1));
      const responses = await Promise.all(months.map(month => fetch(`/api/workouts/dashboard?year=${month.getFullYear()}&month=${month.getMonth()}`).then(r => r.json())));
      const valid = responses.filter((item: Data) => item && typeof item === "object");
      const base = valid[1] ?? valid[0];
      if (!base) throw new Error("Impossibile caricare il calendario.");
      const merged = new Map<string, Schedule>();
      valid.forEach((item: Data) => item.schedules?.forEach(schedule => merged.set(schedule.id, schedule)));
      setData({ ...base, schedules: Array.from(merged.values()).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile caricare il calendario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("completed") === "1") {
      setCompletedNotice(true);
      const completedDate = params.get("date");
      if (completedDate) {
        const d = new Date(`${completedDate}T12:00:00`);
        if (!Number.isNaN(d.getTime())) {
          setSelected(d);
          setDate(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
      window.history.replaceState({}, "", "/calendar");
    }
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) window.location.href = "/login?next=/calendar";
      else if (d.user.role === "USER" && !d.user.onboarding?.completedAt) window.location.href = "/onboarding";
    });
  }, []);

  useEffect(() => { void load(); }, [date]);

  const days = useMemo(() => monthDays(date), [date]);
  // A long rolling range makes the rail feel continuous instead of like a finite row of cards.
  const mobileDays = useMemo(() => Array.from({ length: 181 }, (_, index) => addDays(selected, index - 90)), [selected]);
  const today = new Date();
  const selectedKey = keyOf(selected);
  const selectedSchedule = data?.schedules.find(s => keyOf(new Date(s.scheduledDate)) === selectedKey) ?? null;

  useEffect(() => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const selectedCard = track.querySelector<HTMLElement>(`[data-calendar-card="${selectedKey}"]`);
    if (!selectedCard) return;
    const left = selectedCard.offsetLeft - (track.clientWidth - selectedCard.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selectedKey]);

  function goMonth(amount: number) {
    const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
    setDate(next);
    setSelected(next);
  }

  function goToday() {
    const n = new Date();
    setDate(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelected(n);
  }

  function handleCarouselScroll() {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const track = mobileTrackRef.current;
      if (!track) return;
      const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-calendar-card]"));
      let closest: { key: string; distance: number } | null = null;
      const center = track.scrollLeft + track.clientWidth / 2;
      for (const card of cards) {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(center - cardCenter);
        const key = card.dataset.calendarCard;
        if (key && (!closest || distance < closest.distance)) closest = { key, distance };
      }
      if (closest && closest.key !== selectedKey) {
        const next = new Date(`${closest.key}T12:00:00`);
        if (!Number.isNaN(next.getTime())) {
          setSelected(next);
          setDate(new Date(next.getFullYear(), next.getMonth(), 1));
        }
      }
    }, 80);
  }

  async function schedule(templateId: string) {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/workouts/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, date: selectedKey }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile programmare l'allenamento.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); }
    finally { setSaving(false); }
  }

  async function removeSchedule() {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/workouts/schedule", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ date: selectedKey }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Impossibile rimuovere l'allenamento.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); }
    finally { setSaving(false); }
  }

  const scheduleFor = (day: Date) => data?.schedules.find(s => sameDay(new Date(s.scheduledDate), day)) ?? null;

  const renderDesktopDay = (day: Date) => {
    const schedule = scheduleFor(day);
    const isSelected = sameDay(day, selected);
    const isToday = sameDay(day, today);
    return <button key={day.toISOString()} title={`${day.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}${schedule ? ` · ${schedule.template.name}` : " · Riposo"}`} onClick={() => setSelected(day)} className={`relative min-w-0 overflow-hidden rounded-2xl p-2 text-left transition ${isSelected ? "ring-2 ring-[var(--accent)]" : "border border-[var(--border)]"} ${isToday ? "bg-[var(--surface-strong)]" : "bg-[var(--background)]"}`}><span className="block truncate text-[9px] font-black uppercase text-[var(--muted)] sm:text-[10px]">{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span><span className="mt-1 block text-lg font-black sm:text-xl">{day.getDate()}</span>{schedule?.session?.completedAt ? <span className="mt-2 flex items-center justify-center text-[var(--accent)]"><Check size={13} strokeWidth={3}/></span> : schedule ? <span className="mt-2 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-[var(--accent)]"/></span> : data?.plan ? <span className="mt-2 block truncate text-[8px] font-black uppercase text-[var(--muted)] sm:text-[9px]">Riposo</span> : isToday ? <span className="mt-2 block truncate text-[8px] font-black uppercase text-[var(--accent)] sm:text-[9px]">Oggi</span> : null}</button>;
  };

  const renderMobileDay = (day: Date) => {
    const schedule = scheduleFor(day);
    const isSelected = sameDay(day, selected);
    const isToday = sameDay(day, today);
    const status = schedule?.session?.completedAt ? "FATTO" : schedule ? "ALLENAMENTO" : "RIPOSO";
    return <button key={day.toISOString()} type="button" data-calendar-card={keyOf(day)} onClick={() => { setSelected(day); setDate(new Date(day.getFullYear(), day.getMonth(), 1)); }} className={`snap-center shrink-0 text-center transition-all duration-300 ease-out focus:outline-none ${isSelected ? "w-[82px]" : "w-[64px] opacity-55"}`}>
      <div className={`mx-auto flex h-[108px] w-full flex-col items-center justify-center rounded-[1.35rem] border ${isSelected ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.24)]" : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"}`}>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? "opacity-70" : "text-[var(--muted)]"}`}>{day.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "")}</span>
        <span className={`mt-1 font-black leading-none ${isSelected ? "text-[34px]" : "text-[26px]"}`}>{day.getDate()}</span>
        <span className={`mt-3 h-1.5 w-1.5 rounded-full ${schedule ? "bg-[var(--accent)]" : "bg-[var(--muted)]"} ${isSelected && schedule ? "bg-[var(--accent-foreground)]" : ""}`} />
        <span className={`mt-1 max-w-[58px] truncate text-[7px] font-black uppercase tracking-tight ${isSelected ? "opacity-70" : "text-[var(--muted)]"}`}>{status}</span>
      </div>
      {isToday && <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">Oggi</span>}
    </button>;
  };

  return <main className="min-h-screen bg-[var(--background)] pb-28"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
    <header><p className="text-xs font-black tracking-[0.22em] text-[var(--accent)]">TRAINING CALENDAR</p><h1 className="mt-2 text-4xl font-black tracking-tight">Calendario</h1><p className="mt-2 text-sm text-[var(--muted)]">Il programma viene distribuito automaticamente nella settimana e ripetuto per le prossime 12 settimane. I giorni senza allenamento sono giorni di recupero.</p></header>
    {completedNotice && <section className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"><Check size={18}/></span><div><p className="font-black">Allenamento completato!</p><p className="text-sm text-[var(--muted)]">Ottimo lavoro. Il calendario è stato aggiornato e la prossima sessione userà la tua performance per suggerire il carico.</p></div><button type="button" onClick={() => setCompletedNotice(false)} className="ml-auto text-sm font-black text-[var(--muted)]" aria-label="Chiudi">×</button></section>}

    <section className="mt-7 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{date.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p><h2 className="mt-1 max-w-full break-words text-xl font-black leading-tight sm:text-2xl">{data?.plan?.name || "Nessun programma"}</h2></div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex sm:gap-2"><button aria-label="Mese precedente" onClick={() => goMonth(-1)} className="btn-surface rounded-xl p-2"><ChevronLeft size={18}/></button><button onClick={goToday} className="btn-surface rounded-xl px-3 py-2 text-xs font-black">OGGI</button><button aria-label="Mese successivo" onClick={() => goMonth(1)} className="btn-surface rounded-xl p-2"><ChevronRight size={18}/></button></div>
        <div className="flex w-full items-center gap-2 sm:hidden"><button aria-label="Giorno precedente" onClick={() => setSelected(addDays(selected, -1))} className="btn-surface shrink-0 rounded-xl p-2.5"><ChevronLeft size={19}/></button><div className="min-w-0 flex-1 text-center"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">{selected.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</p><p className="truncate text-sm font-black">{selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p></div><button onClick={goToday} className="btn-surface shrink-0 rounded-xl px-3 py-2.5 text-[10px] font-black">OGGI</button><button aria-label="Giorno successivo" onClick={() => setSelected(addDays(selected, 1))} className="btn-surface shrink-0 rounded-xl p-2.5"><ChevronRight size={19}/></button></div>
      </div>

      <div className="relative mt-6 sm:hidden">
        <div ref={mobileTrackRef} onScroll={handleCarouselScroll} className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-[calc(50%-41px)] py-3 [scrollbar-width:none] overscroll-x-contain [&::-webkit-scrollbar]:hidden">
          {mobileDays.map(renderMobileDay)}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--surface)] to-transparent" />
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 sm:hidden"><span className="h-1 w-7 rounded-full bg-[var(--accent)]"/><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Sfiora per cambiare giorno</span></div>

      <div className="mt-6 hidden grid-cols-7 gap-1.5 text-center sm:grid sm:gap-2">{["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(d => <div key={d} className="py-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{d}</div>)}{days.map((day, i) => { if (!day) return <div key={`empty-${i}`} className="min-h-16"/>; return renderDesktopDay(day); })}</div>
    </section>

    <section className="mt-5 rounded-[2rem] bg-[var(--accent)] p-5 text-[var(--accent-foreground)] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] opacity-70">{sameDay(selected, today) ? "OGGI" : selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p>{selectedSchedule ? <><h2 className="mt-2 text-2xl font-black">{selectedSchedule.template.name}</h2><p className="mt-2 text-sm font-medium opacity-75">{selectedSchedule.template.exercises.length} esercizi{selectedSchedule.template.estimatedMins ? ` · circa ${selectedSchedule.template.estimatedMins} min` : ""}</p></> : <><h2 className="mt-2 text-2xl font-black">Giorno di recupero</h2><p className="mt-2 text-sm font-medium opacity-75">Questo giorno è libero secondo la distribuzione automatica del programma.</p></>}</div>{selectedSchedule?.session?.completedAt && <span className="shrink-0 rounded-full bg-[var(--accent-foreground)] px-3 py-1.5 text-[10px] font-black text-[var(--accent)]">✓ COMPLETATO</span>}</div>{selectedSchedule && !selectedSchedule.session?.completedAt && <div className="mt-5 flex flex-wrap gap-2"><Link href={`/workout?day=${selectedSchedule.template.dayNumber}&date=${selectedKey}`} className="btn-dark inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-foreground)] px-5 py-3.5 text-sm font-black text-[var(--accent)]"><Play size={16} fill="currentColor"/> VEDI ALLENAMENTO</Link><button type="button" onClick={removeSchedule} disabled={saving} className="btn-outline-on-accent inline-flex items-center gap-2 rounded-2xl border border-[var(--accent-foreground)] px-4 py-3.5 text-sm font-black text-[var(--accent-foreground)]"><X size={16}/> RIMUOVI</button></div>}</section>

    {!selectedSchedule && data?.plan && <section className="mt-5 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"><div className="flex items-center gap-2"><Plus size={18} className="text-[var(--accent)]"/><h2 className="text-lg font-black">Scegli allenamento per questa data</h2></div><p className="mt-1 text-sm text-[var(--muted)]">La scelta manuale sostituisce il riposo per questa singola data.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.plan.templates.map(t => <button key={t.id} type="button" onClick={() => schedule(t.id)} disabled={saving} className="btn-surface flex items-center justify-between rounded-2xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--accent)]"><div><p className="text-[10px] font-black uppercase text-[var(--muted)]">Giorno {t.dayNumber}</p><p className="mt-1 font-black">{t.name}</p></div><span className="text-xs font-bold text-[var(--muted)]">{t.exercises.length} esercizi</span></button>)}</div></section>}
    {error && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-500">{error}</p>}
    {loading && <p className="mt-4 text-sm text-[var(--muted)]">Caricamento calendario...</p>}
    <nav className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-around rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-2xl backdrop-blur-xl">{navItems.map(([label, href, Icon]) => <Link key={label} href={href} className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold ${href === "/calendar" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`}><Icon size={17}/>{label}</Link>)}</nav>
  </div></main>;
}
