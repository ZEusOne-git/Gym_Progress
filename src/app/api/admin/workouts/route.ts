import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { workoutPlanInput } from "@/lib/workout-plan-input";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() { const user = await getCurrentUser(); if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null; return user; }

export async function GET() {
  const user = await requireAdmin(); if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const [exercises, plans] = await Promise.all([
    prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, primaryMuscles: true, difficulty: true } }),
    prisma.workoutPlan.findMany({ where: { isTemplate: true }, include: { user: { select: { id: true, email: true, profile: { select: { firstName: true } } } }, templates: { include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { orderIndex: "asc" } } }, orderBy: { dayNumber: "asc" } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return NextResponse.json({ exercises, plans });
}

export async function POST(request: Request) {
  const user = await requireAdmin(); if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  try {
    const parsed = workoutPlanInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Programma non valido." }, { status: 400 });
    const { name, days } = parsed.data;
    const exerciseIds = Array.from(new Set(days.flatMap(day => day.exercises.map(item => item.exerciseId))));
    const valid = await prisma.exercise.findMany({ where: { id: { in: exerciseIds }, isActive: true }, select: { id: true } }); const validIds = new Set(valid.map(e => e.id)); if (exerciseIds.some(id => !validIds.has(id))) return NextResponse.json({ error: "Uno o più esercizi selezionati non sono più disponibili nella Library." }, { status: 400 });
    const plan = await prisma.$transaction(async tx => {
      const created = await tx.workoutPlan.create({ data: { userId: null, name, isTemplate: true, isActive: false } });
      for (const [dayIndex, day] of days.entries()) {
        const template = await tx.workoutTemplate.create({ data: { workoutPlanId: created.id, dayNumber: dayIndex + 1, name: day.name, estimatedMins: day.estimatedMins ?? null } });
        await tx.workoutExercise.createMany({ data: day.exercises.map((item, orderIndex) => ({
          templateId: template.id,
          exerciseId: item.exerciseId,
          orderIndex,
          sets: item.sets,
          repMin: item.repMin,
          repMax: item.repMax,
          rirTarget: item.rirTarget,
          restSeconds: item.restSeconds,
          setType: item.setType,
          progressionType: item.progressionType,
          loadIncrement: item.loadIncrement,
          tempo: item.tempo?.trim() || null,
          targetWeight: item.targetWeight,
          notes: item.notes?.trim() || null,
        })) });
      }
      return tx.workoutPlan.findUnique({ where: { id: created.id }, include: { templates: { include: { exercises: true }, orderBy: { dayNumber: "asc" } } } });
    });
    if (plan) await recordAudit({ userId: user.id, action: "CREATE", entity: "WorkoutPlan", entityId: plan.id, metadata: { name: plan.name } });
    return NextResponse.json(plan,{status:201});
  } catch(error){console.error("[admin/workouts POST]",error);return NextResponse.json({error:`Impossibile salvare il programma: ${error instanceof Error?error.message:"Errore"}`},{status:500});}
}
