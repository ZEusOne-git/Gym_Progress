import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndAssignPlan } from "@/lib/program-generator/persist";

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

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

  return NextResponse.json({ migratedCount: migrated.length, skippedCount: skipped.length, migrated, skipped });
}
