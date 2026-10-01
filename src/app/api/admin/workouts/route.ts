import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const [exercises, plans] = await Promise.all([
    prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, primaryMuscles: true, difficulty: true } }),
    prisma.workoutPlan.findMany({ where: { isTemplate: true }, include: { templates: { include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { orderIndex: "asc" } } }, orderBy: { dayNumber: "asc" } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return NextResponse.json({ exercises, plans });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const days = Array.isArray(body.days) ? body.days : [];
    if (!name || days.length === 0) return NextResponse.json({ error: "Inserisci il nome del programma e almeno un giorno." }, { status: 400 });

    const exerciseIds = Array.from(new Set(days.flatMap((day: any) => Array.isArray(day?.exercises) ? day.exercises.map((item: any) => item?.exerciseId).filter(Boolean) : []))) as string[];
    if (exerciseIds.length) {
      const valid = await prisma.exercise.findMany({ where: { id: { in: exerciseIds }, isActive: true }, select: { id: true } });
      const validIds = new Set(valid.map(e => e.id));
      const missing = exerciseIds.filter(id => !validIds.has(id));
      if (missing.length) return NextResponse.json({ error: "Uno o più esercizi selezionati non sono più disponibili nella Library." }, { status: 400 });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutPlan.create({ data: { userId: null, name, isTemplate: true } });
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex] ?? {};
        const template = await tx.workoutTemplate.create({ data: { workoutPlanId: created.id, dayNumber: dayIndex + 1, name: typeof day.name === "string" && day.name.trim() ? day.name.trim() : `Day ${dayIndex + 1}`, estimatedMins: Number(day.estimatedMins) > 0 ? Math.round(Number(day.estimatedMins)) : null } });
        const items = Array.isArray(day.exercises) ? day.exercises : [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i] ?? {};
          const repMin = Math.max(1, Number(item.repMin) || 1);
          const setType = typeof item.setType === "string" ? item.setType : "NORMAL";
          const progressionType = typeof item.progressionType === "string" ? item.progressionType : "DOUBLE_PROGRESSION";
          await tx.workoutExercise.create({ data: {
            templateId: template.id,
            exerciseId: item.exerciseId,
            orderIndex: i,
            sets: Math.max(1, Number(item.sets) || 1),
            repMin,
            repMax: Math.max(repMin, Number(item.repMax) || repMin),
            rirTarget: item.rirTarget === "" || item.rirTarget == null ? null : Number(item.rirTarget),
            restSeconds: Math.max(0, Number(item.restSeconds) || 0),
            setType,
            progressionType,
            loadIncrement: item.loadIncrement === "" || item.loadIncrement == null ? null : Number(item.loadIncrement),
            tempo: typeof item.tempo === "string" && item.tempo.trim() ? item.tempo.trim() : null,
            targetWeight: item.targetWeight === "" || item.targetWeight == null ? null : Number(item.targetWeight),
            notes: typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null,
          } });
        }
      }
      return tx.workoutPlan.findUnique({ where: { id: created.id }, include: { templates: { include: { exercises: true }, orderBy: { dayNumber: "asc" } } } });
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[admin/workouts POST]", error);
    const message = error instanceof Error ? error.message : "Errore durante il salvataggio del programma.";
    return NextResponse.json({ error: `Impossibile salvare il programma: ${message}` }, { status: 500 });
  }
}
