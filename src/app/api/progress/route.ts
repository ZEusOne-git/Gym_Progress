import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const recentWindowStart = new Date();
  recentWindowStart.setDate(recentWindowStart.getDate() - 56);
  const [sessions, sets, weights, sessionCount, recentSessions, endedEarlyCount] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId: user.id, completedAt: { not: null }, endedEarly: false }, orderBy: { completedAt: "desc" }, take: 30, select: { id: true, startedAt: true, completedAt: true, endedEarly: true, plan: { select: { name: true } } } }),
    prisma.workoutSet.findMany({ where: { session: { userId: user.id, completedAt: { not: null }, endedEarly: false }, completed: true }, orderBy: { timestamp: "desc" }, take: 1000, select: { id: true, exerciseId: true, setNumber: true, weight: true, reps: true, rir: true, timestamp: true } }),
    prisma.weightLog.findMany({ where: { userId: user.id }, orderBy: { recordedAt: "asc" }, take: 60, select: { id: true, weightKg: true, recordedAt: true } }),
    prisma.workoutSession.count({ where: { userId: user.id, completedAt: { not: null }, endedEarly: false } }),
    prisma.workoutSession.findMany({ where: { userId: user.id, completedAt: { gte: recentWindowStart }, endedEarly: false }, select: { completedAt: true } }),
    prisma.workoutSession.count({ where: { userId: user.id, completedAt: { not: null }, endedEarly: true } }),
  ]);
  const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
  const exercises = exerciseIds.length ? await prisma.exercise.findMany({ where: { id: { in: exerciseIds } }, select: { id: true, name: true } }) : [];
  const exerciseNames = new Map(exercises.map(e => [e.id, e.name]));
  const hydratedSets = sets.map(s => ({ ...s, exercise: { name: exerciseNames.get(s.exerciseId) ?? "Esercizio" } }));
  const weekly = Array.from({ length: 8 }, (_, i) => { const end = new Date(); end.setHours(23,59,59,999); end.setDate(end.getDate() - i * 7); const start = new Date(end); start.setDate(start.getDate() - 6); const count = recentSessions.filter(s => s.completedAt && new Date(s.completedAt) >= start && new Date(s.completedAt) <= end).length; return { label: start.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }), count }; }).reverse();
  const bestByExercise = new Map<string, { name: string; weight: number; reps: number; volume: number }>();
  const historyMap = new Map<string, { id: string; weight: number; reps: number; rir: number | null; timestamp: string }[]>();
  for (const set of hydratedSets) {
    const volume = set.weight * set.reps; const old = bestByExercise.get(set.exerciseId);
    if (!old || volume > old.volume) bestByExercise.set(set.exerciseId, { name: set.exercise.name, weight: set.weight, reps: set.reps, volume });
    const history = historyMap.get(set.exerciseId) ?? []; history.push({ id: set.id, weight: set.weight, reps: set.reps, rir: set.rir, timestamp: set.timestamp.toISOString() }); historyMap.set(set.exerciseId, history);
  }
  const exerciseHistory = exercises.map(e => ({ id: e.id, name: e.name, sets: (historyMap.get(e.id) ?? []).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-12) })).filter(e => e.sets.length);
  return NextResponse.json({ sessionCount, endedEarlyCount, sessions, sets: hydratedSets.slice(0, 60), weights, weekly, records: Array.from(bestByExercise.values()).sort((a,b) => b.volume - a.volume).slice(0, 6), exerciseHistory });
}
