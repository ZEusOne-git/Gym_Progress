import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_EQUIPMENT = ["machines", "barbells", "free_weights", "cardio"] as const;

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const form = body as Record<string, unknown>;
  const weight = Number(form.weight);
  const equipment = Array.isArray(form.equipment)
    ? form.equipment.filter((item): item is string =>
        typeof item === "string" && ALLOWED_EQUIPMENT.includes(item as (typeof ALLOWED_EQUIPMENT)[number])
      )
    : [];

  if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
    return NextResponse.json({ error: "Inserisci un peso valido." }, { status: 400 });
  }

  const previousProfile = await prisma.profile.findUnique({ where: { userId: user.id } });

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: { currentWeight: weight },
    create: { userId: user.id, currentWeight: weight },
  });

  if (previousProfile?.currentWeight !== weight) {
    await prisma.weightLog.create({
      data: { userId: user.id, weightKg: weight },
    });
  }

  const onboarding = await prisma.onboardingResponse.upsert({
    where: { userId: user.id },
    update: {
      equipmentJson: JSON.stringify(equipment),
      environment: equipment.length === ALLOWED_EQUIPMENT.length ? "COMMERCIAL_GYM" : "CUSTOM",
    },
    create: {
      userId: user.id,
      environment: equipment.length === ALLOWED_EQUIPMENT.length ? "COMMERCIAL_GYM" : "CUSTOM",
      equipmentJson: JSON.stringify(equipment),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    profile,
    equipment,
    onboarding,
  });
}
