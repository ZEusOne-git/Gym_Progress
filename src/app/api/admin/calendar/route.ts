import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const sessions = await prisma.workoutSession.findMany({ orderBy: { startedAt: "desc" }, take: 200, select: { id: true, startedAt: true, completedAt: true, user: { select: { id: true, email: true, profile: { select: { firstName: true } } } }, plan: { select: { id: true, name: true } } } });
  return NextResponse.json({ sessions });
}
