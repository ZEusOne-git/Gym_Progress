import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const plan = await prisma.workoutPlan.findFirst({
    where: { id, isTemplate: true },
    include: {
      templates: {
        orderBy: { dayNumber: "asc" },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: { select: { id: true, name: true, primaryMuscles: true, difficulty: true } } },
          },
        },
      },
    },
  });
  if (!plan) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const plan = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, select: { id: true } });
  if (!plan) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  await prisma.workoutPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const source = await prisma.workoutPlan.findFirst({
    where: { id, isTemplate: true },
    include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" } } } } },
  });
  if (!source) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  let requestedName = "";
  try { const body = await request.json(); requestedName = typeof body?.name === "string" ? body.name.trim() : ""; } catch {}
  const name = requestedName || `${source.name} · Copia`;
  const copy = await prisma.$transaction(async tx => {
    const created = await tx.workoutPlan.create({ data: { userId: null, name, isTemplate: true } });
    for (const day of source.templates) {
      const template = await tx.workoutTemplate.create({ data: { workoutPlanId: created.id, dayNumber: day.dayNumber, name: day.name, estimatedMins: day.estimatedMins } });
      if (day.exercises.length) {
        await tx.workoutExercise.createMany({ data: day.exercises.map(item => ({ templateId: template.id, exerciseId: item.exerciseId, orderIndex: item.orderIndex, sets: item.sets, repMin: item.repMin, repMax: item.repMax, rirTarget: item.rirTarget, restSeconds: item.restSeconds, setType: item.setType, progressionType: item.progressionType, loadIncrement: item.loadIncrement, tempo: item.tempo, targetWeight: item.targetWeight, notes: item.notes })) });
      }
    }
    return tx.workoutPlan.findUnique({ where: { id: created.id }, include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: true } } } });
  });
  return NextResponse.json(copy, { status: 201 });
}
