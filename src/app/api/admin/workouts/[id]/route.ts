import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { workoutPlanInput, type WorkoutPlanInput } from "@/lib/workout-plan-input";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() { const user = await getCurrentUser(); if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null; return user; }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(); if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const plan = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, include: { user: { select: { id: true, email: true, profile: { select: { firstName: true } } } }, templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: { select: { id: true, name: true, primaryMuscles: true, difficulty: true } } } } } } } });
  if (!plan) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 }); return NextResponse.json(plan);
}

async function savePlan(id: string, { name, days }: WorkoutPlanInput) {
  const exerciseIds = Array.from(new Set(days.flatMap(day => day.exercises.map(item => item.exerciseId))));
  const valid = await prisma.exercise.findMany({ where: { id: { in: exerciseIds }, isActive: true }, select: { id: true } });
  if (valid.length !== exerciseIds.length) throw new Error("Uno o più esercizi non sono più disponibili nella Library.");
  return prisma.$transaction(async tx => {
    const oldTemplates = await tx.workoutTemplate.findMany({ where: { workoutPlanId: id }, select: { id: true } });
    if (oldTemplates.length) await tx.workoutExercise.deleteMany({ where: { templateId: { in: oldTemplates.map(x => x.id) } } });
    await tx.workoutTemplate.deleteMany({ where: { workoutPlanId: id } });
    await tx.workoutPlan.update({ where: { id }, data: { name } });
    for (const [dayIndex, day] of days.entries()) {
      const template = await tx.workoutTemplate.create({ data: { workoutPlanId: id, dayNumber: dayIndex + 1, name: day.name, estimatedMins: day.estimatedMins ?? null } });
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
    return tx.workoutPlan.findUnique({ where: { id }, include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" } } } } } });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const exists = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  if (body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 1 && "isActive" in body && typeof body.isActive === "boolean") {
    if (body.isActive) {
      const content = await prisma.workoutPlan.findUnique({ where: { id }, select: { templates: { select: { exercises: { select: { id: true } } } } } });
      if (!content?.templates.length || content.templates.some(day => day.exercises.length === 0)) {
        return NextResponse.json({ error: "Aggiungi almeno un esercizio a ogni giorno prima di pubblicare." }, { status: 400 });
      }
    }
    const updated = await prisma.workoutPlan.update({ where: { id }, data: { isActive: body.isActive } });
    await recordAudit({ userId: user.id, action: body.isActive ? "PUBLISH" : "UNPUBLISH", entity: "WorkoutPlan", entityId: id, metadata: { name: updated.name } });
    return NextResponse.json(updated);
  }
  const parsed = workoutPlanInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Programma non valido." }, { status: 400 });
  try {
    const plan = await savePlan(id, parsed.data);
    await recordAudit({ userId: user.id, action: "UPDATE", entity: "WorkoutPlan", entityId: id, metadata: { name: parsed.data.name } });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile aggiornare il programma." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const plan = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, select: { id: true, name: true } });
  if (!plan) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  await prisma.$transaction(async tx => {
    const templates = await tx.workoutTemplate.findMany({ where: { workoutPlanId: id }, select: { id: true } });
    if (templates.length) await tx.workoutExercise.deleteMany({ where: { templateId: { in: templates.map(item => item.id) } } });
    await tx.workoutTemplate.deleteMany({ where: { workoutPlanId: id } });
    await tx.workoutPlan.delete({ where: { id } });
  });
  await recordAudit({ userId: user.id, action: "DELETE", entity: "WorkoutPlan", entityId: id, metadata: { name: plan.name } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const source = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" } } } } } });
  if (!source) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  let body: unknown = null;
  try { body = await request.json(); } catch { /* A blank body uses the default copy name. */ }
  const requestedName = body && typeof body === "object" && "name" in body && typeof body.name === "string" ? body.name.trim() : "";
  const name = requestedName || `${source.name} · Copia`;
  const copy = await prisma.$transaction(async tx => {
    const created = await tx.workoutPlan.create({ data: { userId: null, name, isTemplate: true, isActive: false } });
    for (const day of source.templates) {
      const template = await tx.workoutTemplate.create({ data: { workoutPlanId: created.id, dayNumber: day.dayNumber, name: day.name, estimatedMins: day.estimatedMins } });
      if (day.exercises.length) await tx.workoutExercise.createMany({ data: day.exercises.map(item => ({ templateId: template.id, exerciseId: item.exerciseId, orderIndex: item.orderIndex, sets: item.sets, repMin: item.repMin, repMax: item.repMax, rirTarget: item.rirTarget, restSeconds: item.restSeconds, setType: item.setType, progressionType: item.progressionType, loadIncrement: item.loadIncrement, tempo: item.tempo, targetWeight: item.targetWeight, notes: item.notes })) });
    }
    return tx.workoutPlan.findUnique({ where: { id: created.id }, select: { id: true, name: true } });
  });
  if (copy) await recordAudit({ userId: user.id, action: "CREATE", entity: "WorkoutPlan", entityId: copy.id, metadata: { name: copy.name, copiedFrom: source.id } });
  return NextResponse.json(copy, { status: 201 });
}
