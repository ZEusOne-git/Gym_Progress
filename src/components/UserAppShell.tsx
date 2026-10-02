"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, House, UserRound } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/progress", label: "Progressi", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Profilo", icon: UserRound },
];

function isUserArea(pathname: string) {
  return items.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
}

export default function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = isUserArea(pathname);

  return (
    <>
      <div className={showNav ? "pb-24 md:pb-8" : ""}>{children}</div>
      {showNav && (
        <nav aria-label="Navigazione principale" className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,.08)] backdrop-blur-xl md:px-4">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition ${active ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                  <span className={`flex h-9 w-12 items-center justify-center rounded-xl ${active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : ""}`}>
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
