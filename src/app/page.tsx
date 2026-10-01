const focus = [
  { label: "Shoulders", value: 82 },
  { label: "Arms", value: 72 },
  { label: "Glutes", value: 64 },
  { label: "Abs", value: 76 },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-8">
      <header className="mb-7 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-[var(--muted)]">Good morning 👋</p>
          <h1 className="text-3xl font-bold tracking-tight">Ready to train?</h1>
        </div>
        <button aria-label="Notifications" className="rounded-full bg-[var(--surface)] p-3">🔔</button>
      </header>

      <section className="rounded-[28px] bg-[var(--surface)] p-5 shadow-2xl shadow-black/20">
        <div className="mb-5 flex items-center justify-between">
          <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-[var(--accent-foreground)]">TODAY</span>
          <span className="text-xs text-[var(--muted)]">~60 min</span>
        </div>
        <p className="text-sm text-[var(--muted)]">Day 1</p>
        <h2 className="mt-1 text-2xl font-bold">Shoulders + Arms + Abs</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">7 exercises · Personalized for you</p>
        <button className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-5 py-4 font-bold text-[var(--accent-foreground)] transition-transform active:scale-[.98]">
          START WORKOUT
        </button>
      </section>

      <section className="mt-6 rounded-[28px] bg-[var(--surface)] p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">Current weight</p>
            <p className="mt-1 text-3xl font-bold">90.0 kg</p>
          </div>
          <span className="rounded-full bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">↓ 2.5 kg</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full w-[55%] rounded-full bg-[var(--accent)]" />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
          <span>90 kg</span><span>Goal 84–85 kg</span>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your focus</h2>
          <span className="text-xs text-[var(--muted)]">Priority muscles</span>
        </div>
        <div className="space-y-3 rounded-[28px] bg-[var(--surface)] p-5">
          {focus.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>{item.label}</span><span className="text-[var(--muted)]">{item.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-2)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-[var(--border)] bg-[rgba(7,22,21,.96)] px-4 py-4 backdrop-blur-xl">
        <button className="text-sm font-semibold text-[var(--accent)]">⌂<span className="sr-only">Home</span></button>
        <button className="text-sm text-[var(--muted)]">▣<span className="sr-only">Workout</span></button>
        <button className="text-sm text-[var(--muted)]">⌁<span className="sr-only">Progress</span></button>
        <button className="text-sm text-[var(--muted)]">○<span className="sr-only">Profile</span></button>
      </nav>
    </main>
  );
}
