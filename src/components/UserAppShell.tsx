"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, UserRound } from "lucide-react";

const items = [
  ["Home", "/dashboard", Home],
  ["Calendario", "/calendar", CalendarDays],
  ["Progressi", "/progress", BarChart3],
  ["Profilo", "/profile", UserRound],
] as const;

function isUserArea(pathname: string) {
  return items.some(([href]) => pathname === href || pathname.startsWith(`${href}/`));
}

export default function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = isUserArea(pathname);

  return (
    <>
      <div className={showNav ? "pb-28 md:pb-8" : ""}>{children}</div>
      {showNav && (
        <nav aria-label="Navigazione principale" className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-1.5rem)] max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/90 p-2 shadow-2xl backdrop-blur-2xl">
          <div className="grid w-full grid-cols-4 gap-1">
            {items.map(([label, href, Icon]) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[20px] px-2 text-[10px] font-black transition active:scale-95 ${active ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"}`}>
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
