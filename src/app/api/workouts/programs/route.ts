import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findAlternativeExercise, isEquipmentCompatible, parseEquipment } from "@/lib/equipment";
import type { Prisma } from "@prisma/client";

function weekdaysFor(count: number) {
  const presets: Record<number, number[]> = {
    1: [1], 2: [1, 5], 3: [1, 3, 5], 4: [1, 3, 5, 7], 5: [1, 2, 4, 5, 7], 6: [1, 2, 3, 4, 5, 7], 7: [1, 2, 3, 4, 5, 6, 7],
  };
  return (presets[Math.max(1, Math.min(count, 7))] ?? presets[4]).slice(0, count);
}

function nextMonday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const monday = new Date(date);
  const daysUntilMonday = ((8 - (date.getDay() || 7)) % 7) || 7;
  monday.setDate(date.getDate() + daysUntilMonday);
  monday.setHours(12, 0, 0, 0);
  return { today: date, monday };
}

function planEquipmentFit(plan: { templates: { exercises: { exercise: { equipment: string } }[] }[] }, available: string[]) {
  const requirements = plan.templates.flatMap(template => template.exercises.map(item => parseEquipment(item.exercise.equipment))).filter(items => items.length > 0);
  const compatible = requirements.filter(items => isEquipmentCompatible(items, available)).length;
  const unsupported = [...new Set(requirements.filter(items => !isEquipmentCompatible(items, available)).flatMap(items => items.map(token => token.toLowerCase())))];
  return { available, total: requirements.length, compatible, unsupported, percent: requirements.length ? Math.round((compatible / requirements.length) * 100) : 100 };
}

const generatedTemplateSelect = {
  id: true,
  dayNumber: true,
  name: true,
  estimatedMins: true,
  _count: { select: { exercises: true } },
  exercises: {
    orderBy: { orderIndex: "asc" },
    select: {
      exercise: {
        select: {
          id: true,
          name: true,
          slug: true,
          equipment: true,
          media: {
            where: { isActive: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            select: { type: true, url: true, thumbnailUrl: true, sourceName: true, sourceUrl: true, attribution: true },
          },
        },
      },
      sets: true,
      repMin: true,
      repMax: true,
      restSeconds: true,
      rirTarget: true,
      notes: true,
    },
  },
} satisfies Prisma.WorkoutTemplateSelect;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const [onboarding, profile, plans, current] = await Promise.all([
    prisma.onboardingResponse.findUnique({ where: { userId: user.id }, select: { equipmentJson: true } }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { trainingDays: true } }),
    prisma.workoutPlan.findMany({
      where: { isTemplate: true, isActive: true, OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true, estimatedMins: true, _count: { select: { exercises: true } }, exercises: { select: { exercise: { select: { equipment: true } } } } } } },
    }),
    prisma.workoutPlan.findFirst({
      where: { userId: user.id, isActive: true, isTemplate: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, templates: { orderBy: { dayNumber: "asc" }, select: generatedTemplateSelect } },
    }),
  ]);

  const available = parseEquipment(onboarding?.equipmentJson);
  const enrichedPlans = plans.map(plan => ({ id: plan.id, name: plan.name, templates: plan.templates, equipmentFit: planEquipmentFit(plan, available), trainingDaysFit: profile?.trainingDays == null || profile.trainingDays === plan.templates.length }));
  return NextResponse.json({ plans: enrichedPlans, current: current ? { id: current.id, name: current.name } : null, currentPlan: current, equipment: available, preferredTrainingDays: profile?.trainingDays ?? null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const templatePlanId = typeof body.templatePlanId === "string" ? body.templatePlanId : "";
  if (!templatePlanId) return NextResponse.json({ error: "Seleziona un programma." }, { status: 400 });

  const [onboarding, source, catalog] = await Promise.all([
    prisma.onboardingResponse.findUnique({ where: { userId: user.id }, select: { equipmentJson: true } }),
    prisma.workoutPlan.findFirst({ where: { id: templatePlanId, isTemplate: true, isActive: true, OR: [{ userId: null }, { userId: user.id }] }, include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: { select: { id: true, name: true, category: true, primaryMuscles: true, equipment: true, difficulty: true, isActive: true } } } } } } } }),
    prisma.exercise.findMany({ where: { isActive: true }, select: { id: true, category: true, primaryMuscles: true, equipment: true, difficulty: true } }),
  ]);
  if (!source) return NextResponse.json({ error: "Programma consigliato non disponibile." }, { status: 404 });

  const available = parseEquipment(onboarding?.equipmentJson);
  const adaptations: { from: string; to: string }[] = [];
  const resolvedExercises = new Map<string, string>();
  const incompatible: string[] = [];
  for (const template of source.templates) for (const item of template.exercises) {
    if (!item.exercise.isActive) { incompatible.push(item.exercise.name); continue; }
    const requirements = parseEquipment(item.exercise.equipment);
    if (isEquipmentCompatible(requirements, available)) { resolvedExercises.set(item.id, item.exercise.id); continue; }
    const alternative = findAlternativeExercise(item.exercise, catalog, available);
    if (alternative) { resolvedExercises.set(item.id, alternative.id); adaptations.push({ from: item.exercise.id, to: alternative.id }); } else incompatible.push(item.exercise.name);
  }
  if (incompatible.length) return NextResponse.json({ error: `Non è possibile assegnare questo programma con l'attrezzatura disponibile. Esercizi da correggere: ${[...new Set(incompatible)].join(", ")}.` }, { status: 409 });

  const count = Math.max(1, Math.min(source.templates.length, 7));
  const weekdays = weekdaysFor(count);
  const { today, monday } = nextMonday();
  const result = await prisma.$transaction(async tx => {
    const openSession = await tx.workoutSession.findFirst({ where: { userId: user.id, completedAt: null }, select: { id: true } });
    if (openSession) return null;

    await tx.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: { gte: today }, session: { is: null } } });
    await tx.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: { gte: monday }, session: { is: { completedAt: { not: null } } } } });
    await tx.workoutPlan.updateMany({ where: { userId: user.id, isActive: true, isTemplate: false }, data: { isActive: false } });

    const plan = await tx.workoutPlan.create({
      data: {
        userId: user.id,
        name: source.name,
        version: source.version,
        isActive: true,
        isTemplate: false,
        templates: {
          create: source.templates.map(day => ({
            dayNumber: day.dayNumber,
            name: day.name,
            estimatedMins: day.estimatedMins,
            exercises: {
              create: day.exercises.map(ex => {
                const exerciseId = resolvedExercises.get(ex.id) ?? ex.exerciseId;
                const adapted = exerciseId !== ex.exerciseId;
                return {
                  exerciseId,
                  orderIndex: ex.orderIndex,
                  sets: ex.sets,
                  repMin: ex.repMin,
                  repMax: ex.repMax,
                  rirTarget: ex.rirTarget,
                  restSeconds: ex.restSeconds,
                  setType: ex.setType,
                  progressionType: ex.progressionType,
                  loadIncrement: adapted ? null : ex.loadIncrement,
                  tempo: ex.tempo,
                  targetWeight: adapted ? null : ex.targetWeight,
                  notes: adapted ? "Esercizio adattato all'attrezzatura disponibile." : ex.notes,
                };
              }),
            },
          })),
        },
      },
      include: { templates: { orderBy: { dayNumber: "asc" } } },
    });

    const rows = plan.templates.map((template, index) => ({ userId: user.id, workoutPlanId: plan.id, templateId: template.id, scheduledDate: new Date(monday.getTime() + weekdays[index] * 24 * 60 * 60 * 1000), dayNumber: template.dayNumber }));
    if (rows.length) await tx.workoutSchedule.createMany({ data: rows });
    return plan;
  });

  if (!result) return NextResponse.json({ error: "Completa prima l'allenamento attivo." }, { status: 409 });
  return NextResponse.json({ plan: result, adaptations });
}