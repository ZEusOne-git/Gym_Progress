"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Dumbbell, LibraryBig, Users } from "lucide-react";

type Plan={id:string;name:string;updatedAt:string;templates:{id:string;exercises:{id:string}[]}[];user?:{email:string;profile:{firstName:string|null}|null}|null};

export default function AdminDashboard(){
 const [plans,setPlans]=useState<Plan[]>([]); const [exerciseCount,setExerciseCount]=useState(0); const [userCount,setUserCount]=useState(0); const [loading,setLoading]=useState(true);
 useEffect(()=>{Promise.all([fetch("/api/admin/workouts",{cache:"no-store"}).then(r=>r.ok?r.json():null),fetch("/api/admin/exercises",{cache:"no-store"}).then(r=>r.ok?r.json():null),fetch("/api/admin/users",{cache:"no-store"}).then(r=>r.ok?r.json():null)]).then(([w,e,u])=>{setPlans(w?.plans??[]);setExerciseCount(Array.isArray(e)?e.length:0);setUserCount(Array.isArray(u?.users)?u.users.length:0)}).finally(()=>setLoading(false))},[]);
 const totalExercises=plans.reduce((n,p)=>n+p.templates.reduce((m,d)=>m+d.exercises.length,0),0);
 return <main className="min-h-screen px-5 py-8 md:px-10"><div className="mx-auto max-w-6xl">
  <div><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--accent)]">Administration</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1><p className="mt-2 text-sm text-[var(--muted)]">Un unico punto di controllo per programmazione, esercizi e utenti.</p></div>
  <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   {[{label:"Programmi",value:loading?"…":plans.length,icon:ClipboardList,href:"/admin/programs"},{label:"Esercizi",value:loading?"…":exerciseCount,icon:LibraryBig,href:"/admin/exercises"},{label:"Esercizi programmati",value:loading?"…":totalExercises,icon:Dumbbell,href:"/admin/programs"},{label:"Utenti",value:loading?"…":userCount,icon:Users,href:"/admin/users"}].map(({label,value,icon:Icon,href})=><Link key={label} href={href} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--background)]"><Icon size={18}/></span><ArrowRight size={16} className="text-[var(--muted)]"/></div><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">{label}</p></Link>)}
  </section>
  <section className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
   <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-black">Programmi recenti</h2><p className="mt-1 text-xs text-[var(--muted)]">Le ultime schede create o modificate.</p></div><Link href="/admin/programs" className="text-xs font-black text-[var(--accent)]">Vedi tutti →</Link></div>{plans.length===0?<p className="mt-8 text-sm text-[var(--muted)]">Nessun programma ancora.</p>:<div className="mt-5 space-y-2">{plans.slice(0,5).map(p=><Link key={p.id} href={`/admin/programs/${p.id}`} className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--background)]"><div><p className="text-sm font-black">{p.name}</p><p className="mt-1 text-[11px] font-bold text-[var(--muted)]">{p.templates.length} {p.templates.length===1?"giorno":"giorni"}</p></div><ArrowRight size={15}/></Link>)}</div>}</div>
   <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-lg font-black">Azioni rapide</h2><div className="mt-5 space-y-2"><Link href="/admin/workouts" className="btn-accent flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-black">Nuovo programma <ArrowRight size={16}/></Link><Link href="/admin/exercises" className="btn-outline flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-black">Exercise Library <ArrowRight size={16}/></Link><Link href="/admin/users" className="btn-outline flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-black">Gestisci utenti <ArrowRight size={16}/></Link></div></div>
  </section>
 </div></main>
}
