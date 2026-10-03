import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json();
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const scheduledDate = parseDate(body.date);
    if (!templateId || !scheduledDate) return NextResponse.json({ error: "Seleziona un giorno e un allenamento validi." }, { status: 400 });
    scheduledDate.setHours(12, 0, 0, 0);
    if (scheduledDate < startOfToday()) return NextResponse.json({ error: "Non puoi modificare la programmazione di un giorno già passato." }, { status: 400 });

    const plan = await prisma.workoutPlan.findFirst({
      where: { userId: user.id, isActive: true, isTemplate: false },
      select: { id: true },
    });
    if (!plan) return NextResponse.json({ error: "Non hai un programma personalizzato attivo." }, { status: 400 });

    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, workoutPlanId: plan.id },
      select: { id: true, name: true },
    });
    if (!template) return NextResponse.json({ error: "Allenamento non disponibile nel tuo programma." }, { status: 400 });

    const existing = await prisma.workoutSchedule.findUnique({
      where: { userId_scheduledDate: { userId: user.id, scheduledDate } },
      select: { id: true, workoutPlanId: true, templateId: true, session: { select: { id: true, completedAt: true, endedEarly: true } } },
    });
    if (existing?.session) return NextResponse.json({ error: "Questo allenamento ha già una sessione associata e non può essere spostato." }, { status: 409 });

    const activeSession = await prisma.workoutSession.findFirst({
      where: { userId: user.id, completedAt: null },
      select: { id: true },
    });
    if (activeSession) return NextResponse.json({ error: "Termina o metti in pausa l'allenamento in corso prima di modificare il calendario." }, { status: 409 });

    const schedule = await prisma.workoutSchedule.upsert({
      where: { userId_scheduledDate: { userId: user.id, scheduledDate } },
      update: { templateId: template.id, workoutPlanId: plan.id },
      create: { userId: user.id, workoutPlanId: plan.id, templateId: template.id, scheduledDate },
      select: { id: true, scheduledDate: true, templateId: true, workoutPlanId: true, template: { select: { id: true, name: true, dayNumber: true, estimatedMins: true } } },
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("[workouts/schedule POST]", error);
    return NextResponse.json({ error: "Impossibile programmare l'allenamento." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json();
    const date = parseDate(body.date);
    if (!date) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
    date.setHours(12, 0, 0, 0);
    if (date < startOfToday()) return NextResponse.json({ error: "Non puoi modificare la programmazione di un giorno già passato." }, { status: 400 });

    const existing = await prisma.workoutSchedule.findUnique({
      where: { userId_scheduledDate: { userId: user.id, scheduledDate: date } },
      select: { id: true, session: { select: { id: true, completedAt: true, endedEarly: true } } },
    });
    if (existing?.session) return NextResponse.json({ error: "Questo allenamento ha già una sessione associata e non può essere rimosso dal calendario." }, { status: 409 });

    await prisma.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: date, session: { is: null } } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[workouts/schedule DELETE]", error);
    return NextResponse.json({ error: "Impossibile rimuovere la programmazione." }, { status: 500 });
  }
}
