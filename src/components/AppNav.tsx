"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Home, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  ["Home", "/dashboard", Home],
  ["Calendario", "/calendar", CalendarDays],
  ["Progressi", "/progress", BarChart3],
  ["Profilo", "/profile", UserRound],
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-md items-center justify-around rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-2xl backdrop-blur-xl">
      {items.map(([label, href, Icon]) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-black transition ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}><Icon size={17} />{label}</Link>;
      })}
    </nav>
  );
}
