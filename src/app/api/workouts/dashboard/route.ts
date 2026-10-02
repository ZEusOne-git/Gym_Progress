import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = Number.isInteger(year) && year > 2000 ? year : now.getFullYear();
  const m = Number.isInteger(month) && month >= 0 && month <= 11 ? month : now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 1);

  const plan = await prisma.workoutPlan.findFirst({
    where: { userId: user.id, isActive: true, isTemplate: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      templates: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          dayNumber: true,
          name: true,
          estimatedMins: true,
          exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, sets: true, repMin: true, repMax: true, exercise: { select: { name: true } } } },
        },
      },
    },
  });

  if (!plan) return NextResponse.json({ plan: null, schedules: [], sessions: [], activeSession: null, nextSchedule: null });

  const [schedules, sessions, activeSession] = await Promise.all([
    prisma.workoutSchedule.findMany({
      where: { userId: user.id, workoutPlanId: plan.id, scheduledDate: { gte: from, lt: to } },
      orderBy: { scheduledDate: "asc" },
      select: {
        id: true,
        scheduledDate: true,
        templateId: true,
        template: { select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, sets: true, repMin: true, repMax: true, exercise: { select: { name: true } } } } } },
        session: { select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true, completedAt: true } },
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, workoutPlanId: plan.id, startedAt: { gte: from, lt: to } },
      orderBy: { startedAt: "asc" },
      select: { id: true, startedAt: true, completedAt: true },
    }),
    prisma.workoutSession.findFirst({
      where: { userId: user.id, workoutPlanId: plan.id, completedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true, pausedAt: true, elapsedSeconds: true, schedule: { select: { id: true, scheduledDate: true, template: { select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { select: { id: true } } } } } } },
    }),
  ]);

  const nextSchedule = activeSession?.schedule ?? await prisma.workoutSchedule.findFirst({
    where: { userId: user.id, workoutPlanId: plan.id, scheduledDate: { gte: todayStart }, session: { is: null } },
    orderBy: { scheduledDate: "asc" },
    select: { id: true, scheduledDate: true, template: { select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { select: { id: true } } } } },
  });

  return NextResponse.json({ plan, schedules, sessions, activeSession, nextSchedule });
}
