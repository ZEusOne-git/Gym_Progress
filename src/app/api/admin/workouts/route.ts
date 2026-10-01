import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const [exercises, plans] = await Promise.all([
    prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, primaryMuscles: true, difficulty: true } }),
    prisma.workoutPlan.findMany({ where: { userId: user.id }, include: { templates: { include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { orderIndex: "asc" } } }, orderBy: { dayNumber: "asc" } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return NextResponse.json({ exercises, plans });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const body = await request.json();
  if (!body.name?.trim() || !Array.isArray(body.days) || body.days.length === 0) return NextResponse.json({ error: "Nome e almeno un giorno sono obbligatori" }, { status: 400 });

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.workoutPlan.create({ data: { userId: user.id, name: body.name.trim() } });
    for (let dayIndex = 0; dayIndex < body.days.length; dayIndex++) {
      const day = body.days[dayIndex];
      const template = await tx.workoutTemplate.create({ data: { workoutPlanId: created.id, dayNumber: dayIndex + 1, name: day.name?.trim() || `Day ${dayIndex + 1}`, estimatedMins: Number(day.estimatedMins) || null } });
      const items = Array.isArray(day.exercises) ? day.exercises : [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await tx.workoutExercise.create({ data: { templateId: template.id, exerciseId: item.exerciseId, orderIndex: i, sets: Math.max(1, Number(item.sets) || 1), repMin: Math.max(1, Number(item.repMin) || 1), repMax: Math.max(Number(item.repMin) || 1, Number(item.repMax) || Number(item.repMin) || 1), rirTarget: item.rirTarget === "" || item.rirTarget == null ? null : Number(item.rirTarget), restSeconds: Math.max(0, Number(item.restSeconds) || 0) } });
      }
    }
    return tx.workoutPlan.findUnique({ where: { id: created.id }, include: { templates: { include: { exercises: true } } } });
  });
  return NextResponse.json(plan, { status: 201 });
}
