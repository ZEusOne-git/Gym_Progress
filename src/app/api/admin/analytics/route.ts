import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(now.getDate() - 27);
  windowStart.setHours(0, 0, 0, 0);
  const [userCount, newUserCount, completedCount, endedEarlyCount, activeUserGroups, recentSessions] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: windowStart } } }),
    prisma.workoutSession.count({ where: { completedAt: { not: null }, endedEarly: false } }),
    prisma.workoutSession.count({ where: { endedEarly: true } }),
    prisma.workoutSession.groupBy({ by: ["userId"], where: { startedAt: { gte: windowStart }, user: { role: "USER" } } }),
    prisma.workoutSession.findMany({
      where: { startedAt: { gte: windowStart }, user: { role: "USER" } },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, completedAt: true, endedEarly: true },
    }),
  ]);

  const buckets = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(windowStart);
    start.setDate(windowStart.getDate() + index * 7);
    return {
      label: start.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      workouts: 0,
      completed: 0,
    };
  });
  for (const session of recentSessions) {
    const index = Math.min(3, Math.max(0, Math.floor((session.startedAt.getTime() - windowStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
    buckets[index].workouts += 1;
    if (session.completedAt && !session.endedEarly) buckets[index].completed += 1;
  }

  return NextResponse.json({
    periodDays: 28,
    metrics: {
      users: userCount,
      newUsers: newUserCount,
      activeUsers: activeUserGroups.length,
      completedWorkouts: completedCount,
      endedEarly: endedEarlyCount,
    },
    weekly: buckets,
  });
}
