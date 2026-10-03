import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndAssignPlan } from "@/lib/program-generator";

const GOAL_MAP: Record<string, "FAT_LOSS" | "MUSCLE_GAIN" | "RECOMPOSITION" | "STRENGTH"> = {
  "RECOMP": "RECOMPOSITION",
  "FAT LOSS": "FAT_LOSS",
  "MUSCLE": "MUSCLE_GAIN",
  "STRENGTH": "STRENGTH",
};

const MUSCLE_MAP: Record<string, string> = {
  Arms: "ARMS",
  Shoulders: "SHOULDERS",
  Chest: "CHEST",
  Back: "BACK",
  Abs: "ABS",
  Glutes: "GLUTES",
  Quads: "QUADS",
  Hamstrings: "HAMSTRINGS",
  Calves: "CALVES",
  "Lower back": "LOWER_BACK",
};
const ALLOWED_EQUIPMENT = ["machines", "barbells", "free_weights", "cardio"] as const;

function numberOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, onboarding] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.onboardingResponse.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    profile,
    onboarding,
    completed: Boolean(onboarding?.completedAt),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const form = body as Record<string, unknown>;
  const completing = form.completed === true;
  if (completing) {
    const activeSession = await prisma.workoutSession.findFirst({ where: { userId: user.id, completedAt: null }, select: { id: true } });
    if (activeSession) {
      return NextResponse.json({ error: "Termina o interrompi l'allenamento in corso prima di modificare il programma." }, { status: 409 });
    }
  }

  const firstName = typeof form.name === "string" ? form.name.trim() : undefined;
  const age = numberOrNull(form.age);
  const heightCm = numberOrNull(form.height);
  const currentWeight = numberOrNull(form.weight);
  const trainingDays = numberOrNull(form.days);
  const goal = typeof form.goal === "string" ? GOAL_MAP[form.goal] : undefined;
  const priorities = Array.isArray(form.priorities) ? form.priorities.filter((item): item is string => typeof item === "string") : [];
  const equipment = Array.isArray(form.equipment)
    ? [...new Set(form.equipment.filter((item): item is (typeof ALLOWED_EQUIPMENT)[number] =>
        typeof item === "string" && ALLOWED_EQUIPMENT.includes(item as (typeof ALLOWED_EQUIPMENT)[number])
      ))]
    : [...ALLOWED_EQUIPMENT];
  const environment = equipment.length === ALLOWED_EQUIPMENT.length ? "COMMERCIAL_GYM" : "CUSTOM";

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(age !== null ? { age } : {}),
      ...(heightCm !== null ? { heightCm } : {}),
      ...(currentWeight !== null ? { currentWeight } : {}),
      ...(trainingDays !== null ? { trainingDays } : {}),
      ...(typeof form.experience === "string" ? { experience: form.experience } : {}),
    },
    create: {
      userId: user.id,
      firstName: firstName || null,
      age,
      heightCm,
      currentWeight,
      trainingDays,
      experience: typeof form.experience === "string" ? form.experience : null,
    },
  });

  const onboarding = await prisma.onboardingResponse.upsert({
    where: { userId: user.id },
    update: {
      ...(goal ? { primaryGoal: goal } : {}),
      environment,
      equipmentJson: JSON.stringify(equipment),
      preferencesJson: JSON.stringify({ cardio: form.running ?? null, trainingStyle: form.notes ?? null }),
      limitationsJson: JSON.stringify({}),
      musclePrioritiesJson: JSON.stringify(priorities.map((item) => MUSCLE_MAP[item] ?? item)),
      ...(completing ? { completedAt: new Date() } : {}),
    },
    create: {
      userId: user.id,
      primaryGoal: goal,
      environment,
      equipmentJson: JSON.stringify(equipment),
      preferencesJson: JSON.stringify({ cardio: form.running ?? null, trainingStyle: form.notes ?? null }),
      limitationsJson: JSON.stringify({}),
      musclePrioritiesJson: JSON.stringify(priorities.map((item) => MUSCLE_MAP[item] ?? item)),
      completedAt: completing ? new Date() : null,
    },
  });

  const plan = completing ? await generateAndAssignPlan(user.id) : null;

  return NextResponse.json({
    profile,
    onboarding,
    completed: Boolean(onboarding.completedAt),
    plan,
  });
}
