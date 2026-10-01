"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell, LayoutDashboard, LibraryBig, LogOut, ClipboardList } from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Programmi", href: "/admin/programs", icon: ClipboardList },
  { label: "Esercizi", href: "/admin/exercises", icon: LibraryBig },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  async function logout(){ await fetch("/api/auth/logout",{method:"POST"}); router.push("/login"); router.refresh(); }
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col">
        <div className="border-b border-[var(--border)] px-6 py-6"><Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Dumbbell size={19}/></span><span><span className="block text-sm font-black tracking-tight">GYM PROGRESS</span><span className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--muted)]">Administration</span></span></Link></div>
        <nav className="flex-1 space-y-1 p-4"><p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[.2em] text-[var(--muted)]">Workspace</p>{navigation.map(({label,href,icon:Icon})=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"><Icon size={17}/>{label}</Link>)}</nav>
        <div className="border-t border-[var(--border)] p-4"><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)]"><LogOut size={17}/>Esci</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[var(--border)] bg-[var(--background)]/90 px-5 backdrop-blur md:hidden"><Link href="/admin" className="flex items-center gap-2 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Dumbbell size={15}/></span>GYM PROGRESS · ADMIN</Link></header>
        <div className="overflow-x-auto border-b border-[var(--border)] px-5 py-2 md:hidden"><nav className="flex min-w-max gap-1">{navigation.map(({label,href})=><Link key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--muted)]">{label}</Link>)}</nav></div>
        {children}
      </div>
    </div>
  );
}
