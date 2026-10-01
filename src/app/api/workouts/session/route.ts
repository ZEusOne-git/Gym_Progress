import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const session = await prisma.workoutSession.create({ data: { userId: user.id, workoutPlanId: template.workoutPlanId } });
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
