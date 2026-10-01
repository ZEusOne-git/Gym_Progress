import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      profile: { select: { firstName: true, age: true, currentWeight: true, targetWeight: true } },
      onboarding: { select: { primaryGoal: true, completedAt: true } },
      plans: {
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, name: true, updatedAt: true, templates: { select: { id: true } } },
      },
      _count: { select: { sessionsLog: true } },
    },
  });

  return NextResponse.json({ users });
}
