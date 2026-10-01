import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const url = new URL(request.url);
  const exerciseId = url.searchParams.get("exerciseId");
  const templateId = url.searchParams.get("templateId");
  if (!exerciseId || !templateId) return NextResponse.json({ error: "Esercizio o template mancante." }, { status: 400 });

  const item = await prisma.workoutExercise.findFirst({ where: { exerciseId, templateId, template: { workoutPlan: { userId: user.id, isActive: true, isTemplate: false } } }, select: { sets: true, repMin: true, repMax: true, rirTarget: true, progressionType: true, loadIncrement: true, targetWeight: true, exercise: { select: { name: true } } } });
  if (!item) return NextResponse.json({ error: "Esercizio non disponibile nel tuo programma." }, { status: 404 });

  const lastSession = await prisma.workoutSession.findFirst({ where: { userId: user.id, completedAt: { not: null }, sets: { some: { exerciseId } } }, orderBy: { completedAt: "desc" }, select: { id: true, completedAt: true, sets: { where: { exerciseId, completed: true }, orderBy: { setNumber: "asc" }, select: { setNumber: true, weight: true, reps: true, rir: true } } } });
  const lastSets = lastSession?.sets ?? [];
  const lastWeight = lastSets.length ? Math.max(...lastSets.map(s => s.weight)) : item.targetWeight ?? 0;
  const increment = item.loadIncrement ?? 0;
  const allAtTop = lastSets.length >= item.sets && lastSets.every(s => s.reps >= item.repMax && (item.rirTarget == null || s.rir == null || s.rir >= item.rirTarget));
  const progression = (item.progressionType || "DOUBLE_PROGRESSION").toUpperCase();
  const suggestedWeight = progression === "DOUBLE_PROGRESSION" && allAtTop && increment > 0 ? lastWeight + increment : lastWeight;
  const suggestedReps = allAtTop ? item.repMin : Math.min(item.repMax, Math.max(item.repMin, (lastSets.length ? Math.max(...lastSets.map(s => s.reps)) + 1 : item.repMin)));

  return NextResponse.json({ last: lastSession ? { completedAt: lastSession.completedAt, sets: lastSets } : null, recommendation: { weight: suggestedWeight, reps: suggestedReps, reason: lastSession ? (allAtTop && increment > 0 ? `Hai raggiunto ${item.repMax} reps con il RIR target: aumenta di ${increment} kg.` : `Mantieni il carico e prova ad avvicinarti a ${item.repMax} reps.`) : "Prima sessione: parti dal carico target della scheda." }, target: { sets: item.sets, repMin: item.repMin, repMax: item.repMax, rir: item.rirTarget, increment, progressionType: progression, weight: item.targetWeight }, exerciseName: item.exercise.name });
}
