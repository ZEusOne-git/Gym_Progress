import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

function defaultWeekdays(templateCount: number, trainingDays: number | null) {
  const count = Math.max(1, Math.min(templateCount, 7));
  const presets: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  const preferred = trainingDays && trainingDays >= 1 && trainingDays <= 7 ? trainingDays : count;
  return (presets[preferred] ?? presets[count]).slice(0, count).length === count
    ? (presets[preferred] ?? presets[count]).slice(0, count)
    : presets[count];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, role: true, createdAt: true,
      profile: { select: { firstName: true, age: true, currentWeight: true, targetWeight: true, heightCm: true, experience: true, trainingDays: true, sessionMinutes: true } },
      onboarding: { select: { primaryGoal: true, completedAt: true } },
      plans: { where: { isActive: true }, orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, name: true, updatedAt: true, templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, orderIndex: true, sets: true, repMin: true, repMax: true, exercise: { select: { name: true } } } } } } } },
      sessionsLog: { orderBy: { startedAt: "desc" }, take: 10, select: { id: true, startedAt: true, completedAt: true, plan: { select: { name: true } } },
      weightLogs: { orderBy: { recordedAt: "desc" }, take: 12, select: { id: true, weightKg: true, recordedAt: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const templates = await prisma.workoutPlan.findMany({
    where: { isTemplate: true, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true, estimatedMins: true, _count: { select: { exercises: true } } } } },
  });

  return NextResponse.json({ user, templates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const templatePlanId = typeof body.templatePlanId === "string" ? body.templatePlanId : "";
  if (!templatePlanId) return NextResponse.json({ error: "Seleziona un programma." }, { status: 400 });

  const [user, source] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, profile: { select: { trainingDays: true } } } }),
    prisma.workoutPlan.findFirst({ where: { id: templatePlanId, isTemplate: true, isActive: true }, include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" } } } } } }),
  ]);
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  if (!source) return NextResponse.json({ error: "Programma non disponibile." }, { status: 404 });

  const weekdays = defaultWeekdays(source.templates.length, user.profile?.trainingDays ?? null);
  const weekdayLabels = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const scheduleStart = new Date();
  scheduleStart.setHours(12, 0, 0, 0);
  const monday = new Date(scheduleStart);
  const currentDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - currentDay + 1);

  const plan = await prisma.$transaction(async tx => {
    await tx.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: { gte: scheduleStart }, session: { is: null } } });
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
            exercises: { create: day.exercises.map(ex => ({ exerciseId: ex.exerciseId, orderIndex: ex.orderIndex, sets: ex.sets, repMin: ex.repMin, repMax: ex.repMax, rirTarget: ex.rirTarget, restSeconds: ex.restSeconds, setType: ex.setType, progressionType: ex.progressionType, loadIncrement: ex.loadIncrement, tempo: ex.tempo, targetWeight: ex.targetWeight, notes: ex.notes })) },
          })),
        },
      },
      include: { templates: { orderBy: { dayNumber: "asc" } } },
    });

    const dates: { userId: string; workoutPlanId: string; templateId: string; scheduledDate: Date }[] = [];
    for (let week = 0; week < 12; week++) {
      for (let index = 0; index < created.templates.length; index++) {
        const weekday = weekdays[index];
        const scheduledDate = new Date(monday);
        scheduledDate.setDate(monday.getDate() + week * 7 + (weekday - 1));
        scheduledDate.setHours(12, 0, 0, 0);
        if (scheduledDate < scheduleStart) continue;
        dates.push({ userId: user.id, workoutPlanId: created.id, templateId: created.templates[index].id, scheduledDate });
      }
    }
    if (dates.length) await tx.workoutSchedule.createMany({ data: dates });
    return created;
  });

  return NextResponse.json({
    plan,
    recurrence: {
      weeks: 12,
      weekdays,
      labels: weekdays.map(day => weekdayLabels[day]),
    },
  }, { status: 201 });
}
