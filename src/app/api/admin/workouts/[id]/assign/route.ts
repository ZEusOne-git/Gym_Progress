import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : null;
  const plan = await prisma.workoutPlan.findFirst({ where: { id, isTemplate: true }, select: { id: true } });
  if (!plan) return NextResponse.json({ error: "Programma non trovato" }, { status: 404 });
  if (userId) {
    const target = await prisma.user.findFirst({ where: { id: userId, role: "USER" }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  const updated = await prisma.workoutPlan.update({ where: { id }, data: { userId }, select: { id: true, userId: true, name: true } });
  await recordAudit({ userId: admin.id, action: "ASSIGN", entity: "WorkoutPlanTemplate", entityId: id, metadata: { userId, name: updated.name } });
  return NextResponse.json(updated);
}
