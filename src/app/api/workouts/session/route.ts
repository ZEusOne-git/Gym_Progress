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
    const session = await prisma.workoutSession.updateMany({ where: { id: sessionId, userId: user.id, completedAt: null }, data: { completedAt: new Date() } });
    if (!session.count) return NextResponse.json({ error: "Sessione non trovata." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[workouts/session PATCH]", error);
    return NextResponse.json({ error: "Impossibile completare l'allenamento." }, { status: 500 });
  }
}
