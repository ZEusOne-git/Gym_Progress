import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndAssignPlan } from "@/lib/program-generator/persist";
import { FREE_EXERCISE_SET } from "@/lib/program-generator/free-exercise-catalog";

const PLAN_REGENERATION_FLAG = "planRegenerationPending";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

async function markPlanRegenerationPending(userId: string) {
  const onboarding = await prisma.onboardingResponse.findUnique({ where: { userId }, select: { preferencesJson: true } });
  let preferences: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(onboarding?.preferencesJson ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) preferences = parsed;
  } catch { /* rebuild below */ }
  if (!preferences[PLAN_REGENERATION_FLAG]) {
    preferences[PLAN_REGENERATION_FLAG] = true;
    await prisma.onboardingResponse.update({ where: { userId }, data: { preferencesJson: JSON.stringify(preferences) } });
  }
}

async function regeneratePendingPlan(userId: string) {
  const onboarding = await prisma.onboardingResponse.findUnique({ where: { userId }, select: { preferencesJson: true } });
  let pending = false;
  try {
    const preferences = JSON.parse(onboarding?.preferencesJson ?? "{}");
    pending = Boolean(preferences?.[PLAN_REGENERATION_FLAG]);
  } catch { pending = false; }
  if (!pending) return false;
  try {
    await generateAndAssignPlan(userId);
    let preferences: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(onboarding?.preferencesJson ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) preferences = parsed;
    } catch { /* rebuild below */ }
    delete preferences[PLAN_REGENERATION_FLAG];
    await prisma.onboardingResponse.update({ where: { userId }, data: { preferencesJson: JSON.stringify(preferences) } });
    return true;
  } catch (error) {
    console.error("[workouts/session] deferred plan regeneration", error);
    return false;
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const url = new URL(request.url);
  const templateId = url.searchParams.get("template");
  const scheduledDate = parseDate(url.searchParams.get("date"));
  if (!templateId) {
    const active = await prisma.workoutSession.findFirst({
      where: { userId: user.id, completedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true, schedule: { select: { templateId: true, scheduledDate: true } } },
    });
    return NextResponse.json({ session: active });
  }
  const schedule = scheduledDate
    ? await prisma.workoutSchedule.findFirst({ where: { userId: user.id, templateId, scheduledDate: dayRange(scheduledDate) }, select: { id: true } })
    : null;
  const session = schedule
    ? await prisma.workoutSession.findFirst({ where: { userId: user.id, scheduleId: schedule.id, completedAt: null }, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true, sets: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }], select: { id: true, exerciseId: true, setNumber: true, weight: true, reps: true, rir: true, completed: true } } } })
    : await prisma.workoutSession.findFirst({ where: { userId: user.id, completedAt: null, plan: { isActive: true, isTemplate: false, templates: { some: { id: templateId } } } }, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true, sets: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }], select: { id: true, exerciseId: true, setNumber: true, weight: true, reps: true, rir: true, completed: true } } } });
  return NextResponse.json({ session });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json();
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    if (!templateId) return NextResponse.json({ error: "Workout non valido." }, { status: 400 });
    const template = await prisma.workoutTemplate.findFirst({ where: { id: templateId, plan: { userId: user.id, isActive: true, isTemplate: false } }, select: { id: true, workoutPlanId: true, exercises: { select: { exercise: { select: { slug: true } } } } } });
    if (!template) return NextResponse.json({ error: "Workout non disponibile." }, { status: 404 });
    if (template.exercises.some(item => !FREE_EXERCISE_SET.has(item.exercise.slug))) await markPlanRegenerationPending(user.id);

    const requestedDate = parseDate(body.date);
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const requestedRange = requestedDate ? dayRange(requestedDate) : null;
    let schedule = requestedRange
      ? await prisma.workoutSchedule.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate: requestedRange }, select: { id: true, scheduledDate: true } })
      : await prisma.workoutSchedule.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate: { gte: todayStart }, session: { is: null } }, orderBy: { scheduledDate: "asc" }, select: { id: true, scheduledDate: true } });
    if (!schedule && requestedDate) {
      const occupiedDate = await prisma.workoutSchedule.findFirst({ where: { userId: user.id, scheduledDate: requestedRange! }, select: { id: true } });
      if (!occupiedDate) {
        try { schedule = await prisma.workoutSchedule.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate(), 12) }, select: { id: true, scheduledDate: true } }); }
        catch { schedule = await prisma.workoutSchedule.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate: requestedRange! }, select: { id: true, scheduledDate: true } }); }
      }
    }
    if (!schedule && !requestedDate) {
      for (let offset = 0; offset < 84 && !schedule; offset += 1) {
        const candidateDate = new Date(todayStart);
        candidateDate.setDate(candidateDate.getDate() + offset);
        candidateDate.setHours(12, 0, 0, 0);
        const existing = await prisma.workoutSchedule.findFirst({ where: { userId: user.id, scheduledDate: dayRange(candidateDate) }, select: { id: true } });
        if (existing) continue;
        try { schedule = await prisma.workoutSchedule.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate: candidateDate }, select: { id: true, scheduledDate: true } }); }
        catch { /* keep looking */ }
      }
    }
    if (!schedule) return NextResponse.json({ error: "Questo workout non è programmato nel calendario." }, { status: 409 });

    const result = await prisma.$transaction(async tx => {
      const open = await tx.workoutSession.findFirst({ where: { userId: user.id, completedAt: null }, orderBy: { startedAt: "desc" }, include: { schedule: { select: { id: true, templateId: true, scheduledDate: true } } } });
      if (open) {
        const sameWorkout = open.schedule?.templateId === template.id;
        if (!sameWorkout) {
          return {
            conflict: NextResponse.json({
              error: "Hai già un allenamento in corso. Riprendilo prima di iniziarne un altro.",
              activeSessionId: open.id,
              activeTemplateId: open.schedule?.templateId ?? null,
              activeScheduledDate: open.schedule?.scheduledDate?.toISOString().slice(0, 10) ?? null,
            }, { status: 409 }),
          };
        }
        if (open.pausedAt) {
          const resumed = await tx.workoutSession.update({ where: { id: open.id }, data: { startedAt: new Date(), pausedAt: null }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
          return { session: resumed, resumed: true };
        }
        return { session: open, resumed: false };
      }
      const previous = await tx.workoutSession.findUnique({ where: { scheduleId: schedule.id }, select: { id: true, completedAt: true, endedEarly: true } });
      if (previous?.completedAt && !previous.endedEarly) return { conflict: NextResponse.json({ error: "Questo allenamento è già stato completato." }, { status: 409 }) };
      if (previous?.completedAt && previous.endedEarly) await tx.workoutSession.update({ where: { id: previous.id }, data: { scheduleId: null } });
      const session = await tx.workoutSession.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId, scheduleId: schedule.id }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
      return { session, created: true };
    });
    if ("conflict" in result) return result.conflict;
    return NextResponse.json({ session: result.session, resumed: result.resumed ?? false, scheduledDate: schedule.scheduledDate }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("[workouts/session POST]", error);
    return NextResponse.json({ error: "Impossibile avviare l'allenamento." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const action = body.action ?? "complete";
    if (action !== "pause" && action !== "finish" && action !== "complete") return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
    if (!sessionId) return NextResponse.json({ error: "Sessione non valida." }, { status: 400 });
    const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: user.id, completedAt: null }, include: { sets: true, schedule: { include: { template: { include: { exercises: { where: { exercise: { slug: { in: [...FREE_EXERCISE_SET] } } }, select: { exerciseId: true, sets: true, exercise: { select: { slug: true } } } } } } } }, plan: { select: { templates: { include: { exercises: { where: { exercise: { slug: { in: [...FREE_EXERCISE_SET] } } }, select: { exerciseId: true, sets: true, exercise: { select: { slug: true } } } } } } } } } });
    if (!session) return NextResponse.json({ error: "Sessione non trovata o già terminata." }, { status: 404 });
    if (action === "pause") {
      if (session.pausedAt) return NextResponse.json({ ok: true, paused: true, session: { id: session.id, startedAt: session.startedAt, pausedAt: session.pausedAt, elapsedSeconds: session.elapsedSeconds } });
      const now = new Date();
      const additionalSeconds = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
      const paused = await prisma.workoutSession.update({ where: { id: session.id }, data: { pausedAt: now, elapsedSeconds: { increment: additionalSeconds } }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
      return NextResponse.json({ ok: true, paused: true, session: paused });
    }
    if (session.pausedAt) return NextResponse.json({ error: "Allenamento in pausa. Riprendilo prima di completarlo." }, { status: 400 });
    if (action === "finish") {
      const now = new Date();
      const additionalSeconds = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
      const finished = await prisma.workoutSession.update({ where: { id: session.id }, data: { completedAt: now, endedEarly: true, elapsedSeconds: { increment: additionalSeconds } }, select: { id: true, completedAt: true, endedEarly: true, elapsedSeconds: true } });
      const planRegenerated = await regeneratePendingPlan(user.id);
      return NextResponse.json({ ok: true, finishedEarly: true, planRegenerated, session: finished });
    }
    const currentTemplate = session.schedule?.template ?? (() => {
      const sessionExerciseIds = new Set(session.sets.map(set => set.exerciseId));
      return session.plan.templates.find(template => {
        const templateExerciseIds = new Set(template.exercises.map(item => item.exerciseId));
        return templateExerciseIds.size === sessionExerciseIds.size && [...templateExerciseIds].every(id => sessionExerciseIds.has(id)) ? template : null;
      }) ?? null;
    })();
    if (currentTemplate) {
      for (const item of currentTemplate.exercises) {
        const completedSets = session.sets.filter(set => set.exerciseId === item.exerciseId && set.completed);
        if (completedSets.length < item.sets) return NextResponse.json({ error: "Completa tutte le serie previste prima di chiudere l'allenamento." }, { status: 400 });
      }
    } else if (!session.sets.length || session.sets.some(set => !set.completed)) {
      return NextResponse.json({ error: "Completa tutte le serie prima di chiudere l'allenamento." }, { status: 400 });
    }
    const now = new Date();
    const additionalSeconds = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
    const updated = await prisma.workoutSession.update({ where: { id: sessionId }, data: { completedAt: now, endedEarly: false, elapsedSeconds: { increment: additionalSeconds } }, select: { id: true, completedAt: true, elapsedSeconds: true } });
    const planRegenerated = await regeneratePendingPlan(user.id);
    return NextResponse.json({ ok: true, planRegenerated, session: updated });
  } catch (error) {
    console.error("[workouts/session PATCH]", error);
    return NextResponse.json({ error: "Impossibile completare l'allenamento." }, { status: 500 });
  }
}
