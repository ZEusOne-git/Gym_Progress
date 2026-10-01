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
  const y = Number.isInteger(year) && year > 2000 ? year : now.getFullYear();
  const m = Number.isInteger(month) && month >= 0 && month <= 11 ? month : now.getMonth();
  const from = new Date(y, m, 1); const to = new Date(y, m + 1, 1);
  const plan = await prisma.workoutPlan.findFirst({ where: { userId: user.id, isActive: true, isTemplate: false }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, sets: true, repMin: true, repMax: true, exercise: { select: { name: true } } } } } } } });
  const sessions = plan ? await prisma.workoutSession.findMany({ where: { userId: user.id, workoutPlanId: plan.id, startedAt: { gte: from, lt: to } }, orderBy: { startedAt: "asc" }, select: { id: true, startedAt: true, completedAt: true } }) : [];
  const completedAll = plan ? await prisma.workoutSession.count({ where: { userId: user.id, workoutPlanId: plan.id, completedAt: { not: null } } }) : 0;
  const nextTemplate = plan?.templates.length ? plan.templates[completedAll % plan.templates.length] : null;
  return NextResponse.json({ plan, sessions, nextTemplate });
}
