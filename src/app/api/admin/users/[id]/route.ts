import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() { const user = await getCurrentUser(); return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null; }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findFirst({ where: { id, role: "USER" }, select: { id: true, email: true, createdAt: true, profile: { select: { firstName: true, age: true, currentWeight: true, targetWeight: true, heightCm: true, experience: true, trainingDays: true, sessionMinutes: true } }, onboarding: { select: { primaryGoal: true, completedAt: true } }, plans: { where: { isActive: true }, orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, name: true, updatedAt: true, templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true, estimatedMins: true, exercises: { orderBy: { orderIndex: "asc" }, select: { id: true, orderIndex: true, sets: true, repMin: true, repMax: true, exercise: { select: { name: true } } } } } } } }, sessionsLog: { orderBy: { startedAt: "desc" }, take: 10, select: { id: true, startedAt: true, completedAt: true, plan: { select: { name: true } } } }, weightLogs: { orderBy: { recordedAt: "desc" }, take: 12, select: { id: true, weightKg: true, recordedAt: true } } } });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  return NextResponse.json({ user });
}
