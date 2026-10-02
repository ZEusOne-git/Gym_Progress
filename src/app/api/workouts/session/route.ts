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
  if (!templateId) return NextResponse.json({ session: null });
  const session = await prisma.workoutSession.findFirst({ where: { userId: user.id, completedAt: null, plan: { isActive: true, isTemplate: false, templates: { some: { id: templateId } } } }, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, sets: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }], select: { id: true, exerciseId: true, setNumber: true, weight: true, reps: true, rir: true, completed: true } } } });
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
    const open = await prisma.workoutSession.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, completedAt: null }, orderBy: { startedAt: "desc" } });
    if (open) return NextResponse.json({ session: open });
    const scheduledDate = parseDate(body.date);
    const schedule = scheduledDate ? await prisma.workoutSchedule.findFirst({ where: { userId: user.id, workoutPlanId: template.workoutPlanId, templateId: template.id, scheduledDate, session: { is: null } }, select: { id: true } }) : null;
    const session = await prisma.workoutSession.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId, scheduleId: schedule?.id ?? null } });
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
    if (!sessionId) return NextResponse.json({ error: "Sessione non valida." }, { status: 400 });

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: user.id, completedAt: null },
      include: {
        sets: true,
        schedule: { include: { template: { include: { exercises: { select: { exerciseId: true, sets: true } } } } } },
        plan: { select: { templates: { include: { exercises: { select: { exerciseId: true, sets: true } } } } } },
      },
    });
    if (!session) return NextResponse.json({ error: "Sessione non trovata." }, { status: 404 });

    const currentTemplate = session.schedule?.template ?? (() => {
      const sessionExerciseIds = new Set(session.sets.map(set => set.exerciseId));
      return session.plan.templates.find(template => {
        const templateExerciseIds = new Set(template.exercises.map(item => item.exerciseId));
        return templateExerciseIds.size === sessionExerciseIds.size && [...templateExerciseIds].every(id => sessionExerciseIds.has(id));
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

    const updated = await prisma.workoutSession.update({ where: { id: sessionId }, data: { completedAt: new Date() }, select: { id: true, completedAt: true } });
    return NextResponse.json({ ok: true, session: updated });
  } catch (error) {
    console.error("[workouts/session PATCH]", error);
    return NextResponse.json({ error: "Impossibile completare l'allenamento." }, { status: 500 });
  }
}
