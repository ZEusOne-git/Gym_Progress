import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { findAlternativeExercise, isEquipmentCompatible, parseEquipment } from "@/lib/equipment";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

function defaultWeekdays(templateCount: number, trainingDays: number | null) {
  const count = Math.max(1, Math.min(templateCount, 7));
  const presets: Record<number, number[]> = {
    1: [1],
    2: [1, 5],
    3: [1, 3, 5],
    4: [1, 3, 5, 7],
    5: [1, 2, 4, 5, 7],
    6: [1, 2, 3, 4, 5, 7],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  const preferred = trainingDays && trainingDays === count ? trainingDays : count;
  return (presets[preferred] ?? presets[count]).slice(0, count);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      profile: {
        select: {
          firstName: true,
          age: true,
          currentWeight: true,
          targetWeight: true,
          heightCm: true,
          experience: true,
          trainingDays: true,
          sessionMinutes: true,
        },
      },
      onboarding: { select: { primaryGoal: true, completedAt: true, equipmentJson: true } },
      plans: {
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          templates: {
            orderBy: { dayNumber: "asc" },
            select: {
              id: true,
              dayNumber: true,
              name: true,
              estimatedMins: true,
              exercises: {
                orderBy: { orderIndex: "asc" },
                select: {
                  id: true,
                  orderIndex: true,
                  sets: true,
                  repMin: true,
                  repMax: true,
                  exercise: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      sessionsLog: {
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          plan: { select: { name: true } },
        },
      },
      weightLogs: {
        orderBy: { recordedAt: "desc" },
        take: 12,
        select: { id: true, weightKg: true, recordedAt: true },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const templates = await prisma.workoutPlan.findMany({
    where: { isTemplate: true, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      templates: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          dayNumber: true,
          name: true,
          estimatedMins: true,
          exercises: {
            select: {
              exercise: { select: { equipment: true } },
            },
          },
        },
      },
    },
  });

  const available = parseEquipment(user.onboarding?.equipmentJson);
  const enrichedTemplates = templates.map(plan => {
    const exerciseRequirements = plan.templates.flatMap(day => day.exercises.map(item => parseEquipment(item.exercise.equipment)));
    const relevant = exerciseRequirements.filter(requirements => requirements.length > 0);
    const compatible = relevant.filter(requirements => isEquipmentCompatible(requirements, available)).length;
    return {
      ...plan,
      templates: plan.templates.map(day => ({ id: day.id, dayNumber: day.dayNumber, name: day.name, estimatedMins: day.estimatedMins, _count: { exercises: day.exercises.length } })),
      equipmentFit: { total: relevant.length, compatible, percent: relevant.length ? Math.round(compatible / relevant.length * 100) : 100 },
    };
  });

  return NextResponse.json({ user: { ...user, onboarding: user.onboarding ? { ...user.onboarding, equipment: available } : null }, templates: enrichedTemplates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const templatePlanId = typeof body.templatePlanId === "string" ? body.templatePlanId : "";
  if (!templatePlanId) return NextResponse.json({ error: "Seleziona un programma." }, { status: 400 });

  const [user, source] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, profile: { select: { trainingDays: true } }, onboarding: { select: { equipmentJson: true } } } }),
    prisma.workoutPlan.findFirst({
      where: { id: templatePlanId, isTemplate: true, isActive: true },
      include: {
        templates: {
          orderBy: { dayNumber: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              include: { exercise: { select: { id: true, name: true, category: true, primaryMuscles: true, equipment: true, difficulty: true } } },
            },
          },
        },
      },
    }),
  ]);
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  if (!source) return NextResponse.json({ error: "Programma non disponibile." }, { status: 404 });

  const available = parseEquipment(user.onboarding?.equipmentJson);
  const catalog = await prisma.exercise.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true, primaryMuscles: true, equipment: true, difficulty: true },
  });
  const resolvedExercises = new Map<string, { exerciseId: string; adapted: boolean }>();
  const incompatible: string[] = [];
  for (const day of source.templates) {
    for (const item of day.exercises) {
      const requirements = parseEquipment(item.exercise.equipment);
      if (isEquipmentCompatible(requirements, available)) {
        resolvedExercises.set(item.id, { exerciseId: item.exerciseId, adapted: false });
        continue;
      }
      const alternative = findAlternativeExercise(item.exercise, catalog, available);
      if (!alternative) {
        incompatible.push(item.exercise.name);
        continue;
      }
      resolvedExercises.set(item.id, { exerciseId: alternative.id, adapted: true });
    }
  }
  if (incompatible.length) {
    return NextResponse.json({ error: `Attrezzatura non compatibile per: ${[...new Set(incompatible)].join(", ")}. Aggiorna il programma o il profilo attrezzatura dell'atleta prima di assegnarlo.` }, { status: 409 });
  }

  const weekdays = defaultWeekdays(source.templates.length, user.profile?.trainingDays ?? null);
  const weekdayLabels = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextMonday = new Date(today);
  const daysUntilMonday = ((8 - (today.getDay() || 7)) % 7) || 7;
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(12, 0, 0, 0);

  const plan = await prisma.$transaction(async tx => {
    await tx.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: { gte: today }, session: { is: null } } });
    await tx.workoutPlan.updateMany({ where: { userId: user.id, isActive: true }, data: { isActive: false } });
    const created = await tx.workoutPlan.create({
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
                const resolved = resolvedExercises.get(ex.id) ?? { exerciseId: ex.exerciseId, adapted: false };
                return {
                exerciseId: resolved.exerciseId,
                orderIndex: ex.orderIndex,
                sets: ex.sets,
                repMin: ex.repMin,
                repMax: ex.repMax,
                rirTarget: ex.rirTarget,
                restSeconds: ex.restSeconds,
                setType: ex.setType,
                progressionType: ex.progressionType,
                loadIncrement: resolved.adapted ? null : ex.loadIncrement,
                tempo: ex.tempo,
                targetWeight: resolved.adapted ? null : ex.targetWeight,
                notes: resolved.adapted ? "Esercizio adattato all'attrezzatura disponibile." : ex.notes,
              };}),
            },
          })),
        },
      },
      include: { templates: { orderBy: { dayNumber: "asc" } } },
    });

    const dates: { userId: string; workoutPlanId: string; templateId: string; scheduledDate: Date }[] = [];
    for (let week = 0; week < 12; week++) {
      for (let index = 0; index < created.templates.length; index++) {
        const weekday = weekdays[index];
        const scheduledDate = new Date(nextMonday);
        scheduledDate.setDate(nextMonday.getDate() + week * 7 + (weekday - 1));
        scheduledDate.setHours(12, 0, 0, 0);
        dates.push({ userId: user.id, workoutPlanId: created.id, templateId: created.templates[index].id, scheduledDate });
      }
    }
    if (dates.length) await tx.workoutSchedule.createMany({ data: dates });
    return created;
  });

  const adaptedCount = [...resolvedExercises.values()].filter(item => item.adapted).length;
  await recordAudit({ userId: admin.id, action: "ASSIGN", entity: "WorkoutPlan", entityId: plan.id, metadata: { userId: user.id, name: plan.name, adaptedExercises: adaptedCount } });

  return NextResponse.json({
    plan,
    adapted: { count: adaptedCount, applied: adaptedCount > 0 },
    recurrence: {
      weeks: 12,
      weekdays,
      labels: weekdays.map(day => weekdayLabels[day]),
      startsOn: nextMonday.toISOString(),
    },
  }, { status: 201 });
}
