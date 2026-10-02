import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const url = new URL(request.url);
  const templateId = url.searchParams.get("template");
  const scheduledDate = parseDate(url.searchParams.get("date"));
  if (!templateId) return NextResponse.json({ session: null });

  const schedule = scheduledDate ? await prisma.workoutSchedule.findFirst({ where: { userId: user.id, templateId, scheduledDate }, select: { id: true } }) : null;
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
    const template = await prisma.workoutTemplate.findFirst({ where: { id: templateId, plan: { userId: user.id, isActive: true, isTemplate: false } }, select: { id: true, workoutPlanId: true } });
    if (!template) return NextResponse.json({ error: "Workout non disponibile." }, { status: 404 });

    const scheduledDate = parseDate(body.date);
    const schedule = scheduledDate ? await prisma.workoutSchedule.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate }, select: { id: true } }) : null;

    if (schedule) {
      const existingScheduled = await prisma.workoutSession.findUnique({ where: { scheduleId: schedule.id }, select: { id: true, userId: true, startedAt: true, pausedAt: true, elapsedSeconds: true, completedAt: true, endedEarly: true } });
      if (existingScheduled?.userId === user.id && !existingScheduled.completedAt) {
        if (existingScheduled.pausedAt) {
          const resumed = await prisma.workoutSession.update({ where: { id: existingScheduled.id }, data: { startedAt: new Date(), pausedAt: null }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
          return NextResponse.json({ session: resumed, resumed: true });
        }
        return NextResponse.json({ session: existingScheduled });
      }
      if (existingScheduled?.completedAt && !existingScheduled.endedEarly) return NextResponse.json({ error: "Questo allenamento è già stato completato." }, { status: 409 });
      if (existingScheduled?.completedAt && existingScheduled.endedEarly) {
        await prisma.workoutSet.deleteMany({ where: { sessionId: existingScheduled.id } });
        const restarted = await prisma.workoutSession.update({ where: { id: existingScheduled.id }, data: { startedAt: new Date(), pausedAt: null, elapsedSeconds: 0, completedAt: null, endedEarly: false }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
        return NextResponse.json({ session: restarted, restarted: true });
      }
    } else {
      const open = await prisma.workoutSession.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, completedAt: null }, orderBy: { startedAt: "desc" } });
      if (open) {
        if (open.pausedAt) {
          const resumed = await prisma.workoutSession.update({ where: { id: open.id }, data: { startedAt: new Date(), pausedAt: null }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
          return NextResponse.json({ session: resumed, resumed: true });
        }
        return NextResponse.json({ session: open });
      }
    }

    const session = await prisma.workoutSession.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId, scheduleId: schedule?.id ?? null }, select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true } });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("[workouts/session POST]", error);
    return NextResponse.json({ error: "Impossibile avviare l'allenamento." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const action = body.action === "pause" ? "pause" : body.action === "finish" ? "finish" : "complete";
    if (!sessionId) return NextResponse.json({ error: "Sessione non valida." }, { status: 400 });
    const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: user.id, completedAt: null }, include: { sets: true, schedule: { include: { template: { include: { exercises: { select: { exerciseId: true, sets: true } } } } } }, plan: { select: { templates: { include: { exercises: { select: { exerciseId: true, sets: true } } } } } } } });
    if (!session) return NextResponse.json({ error: "Sessione non trovata." }, { status: 404 });
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
      const finished = await prisma.workoutSession.update({ where: { id: sessionId }, data: { completedAt: now, endedEarly: true, elapsedSeconds: { increment: additionalSeconds } }, select: { id: true, completedAt: true, endedEarly: true, elapsedSeconds: true } });
      return NextResponse.json({ ok: true, finishedEarly: true, session: finished });
    }
    const currentTemplate = session.schedule?.template ?? (() => { const sessionExerciseIds = new Set(session.sets.map(set => set.exerciseId)); return session.plan.templates.find(template => { const templateExerciseIds = new Set(template.exercises.map(item => item.exerciseId)); return templateExerciseIds.size === sessionExerciseIds.size && [...templateExerciseIds].every(id => sessionExerciseIds.has(id)); }) ?? null; })();
    if (currentTemplate) {
      for (const item of currentTemplate.exercises) {
        const completedSets = session.sets.filter(set => set.exerciseId === item.exerciseId && set.completed);
        if (completedSets.length < item.sets) return NextResponse.json({ error: "Completa tutte le serie previste prima di chiudere l'allenamento." }, { status: 400 });
      }
    } else if (!session.sets.length || session.sets.some(set => !set.completed)) return NextResponse.json({ error: "Completa tutte le serie prima di chiudere l'allenamento." }, { status: 400 });
    const now = new Date();
    const additionalSeconds = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
    const updated = await prisma.workoutSession.update({ where: { id: sessionId }, data: { completedAt: now, endedEarly: false, elapsedSeconds: { increment: additionalSeconds } }, select: { id: true, completedAt: true, elapsedSeconds: true } });
    return NextResponse.json({ ok: true, session: updated });
  } catch (error) {
    console.error("[workouts/session PATCH]", error);
    return NextResponse.json({ error: "Impossibile completare l'allenamento." }, { status: 500 });
  }
}
