import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndAssignPlan } from "@/lib/program-generator/persist";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  let body: { userId?: string; all?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body migrates the authenticated admin only.
  }

  if (body.all === true) {
    const users = await prisma.user.findMany({
      where: { profile: { isNot: null }, onboarding: { isNot: null } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const migrated: string[] = [];
    const skipped: { userId: string; reason: string }[] = [];

    for (const user of users) {
      try {
        await generateAndAssignPlan(user.id);
        migrated.push(user.id);
      } catch (error) {
        skipped.push({ userId: user.id, reason: error instanceof Error ? error.message : "Errore durante la rigenerazione." });
      }
    }

    return NextResponse.json({ scope: "all", migratedCount: migrated.length, skippedCount: skipped.length, migrated, skipped });
  }

  const userId = body.userId ?? currentUser.id;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profile: { select: { userId: true } }, onboarding: { select: { userId: true } } },
  });

  if (!target?.profile || !target.onboarding) {
    return NextResponse.json({ error: "L'utente non ha un profilo e un onboarding completi." }, { status: 400 });
  }

  try {
    const plan = await generateAndAssignPlan(userId);
    return NextResponse.json({ scope: "user", userId, migratedCount: 1, plan });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore durante la rigenerazione." }, { status: 409 });
  }
}
