import { prisma } from "@/lib/prisma";
import { generatePlan } from "./generator";
import { normalizePlanPreferences } from "./plan-profile";
import type { MusclePriority, PlanPreferences, TrainingGoal } from "./types";

const GOAL_MAP: Record<string, TrainingGoal> = {
  FAT_LOSS: "RECOMPOSITION",
  MUSCLE_GAIN: "HYPERTROPHY",
  RECOMPOSITION: "RECOMPOSITION",
  STRENGTH: "STRENGTH",
  GENERAL_FITNESS: "GENERAL_FITNESS",
};

const MUSCLE_MAP: Record<string, MusclePriority> = {
  CHEST: "CHEST",
  BACK: "BACK",
  SHOULDERS: "SHOULDERS",
  BICEPS: "ARMS",
  TRICEPS: "ARMS",
  ARMS: "ARMS",
  ABS: "CORE",
  CORE: "CORE",
  GLUTES: "GLUTES",
  QUADS: "QUADS",
  HAMSTRINGS: "HAMSTRINGS",
  CALVES: "CALVES",
  LOWER_BACK: "BACK",
};

const parseArray = (value: string | null | undefined): string[] => {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const normalizeEquipment = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");

function candidateEquipment(value: string): string[] {
  return parseArray(value).map(normalizeEquipment);
}

export async function generateAndAssignPlan(userId: string): Promise<{ planId: string; templateCount: number } | null> {
  const [profile, onboarding, activeSession] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.onboardingResponse.findUnique({ where: { userId } }),
    prisma.workoutSession.findFirst({ where: { userId, completedAt: null }, select: { id: true } }),
  ]);

  if (!onboarding?.completedAt || activeSession) return null;

  const equipment = parseArray(onboarding.equipmentJson);
  const priorities = parseArray(onboarding.musclePrioritiesJson)
    .map((value) => MUSCLE_MAP[value.toUpperCase()])
    .filter((value): value is MusclePriority => Boolean(value));
  const trainingDays = Number(profile?.trainingDays);
  const experience = profile?.experience?.toUpperCase();
  const goal = onboarding.primaryGoal ? GOAL_MAP[onboarding.primaryGoal] : "GENERAL_FITNESS";

  const preferences: PlanPreferences = normalizePlanPreferences({
    trainingDays: ([2, 3, 4, 5, 6] as const).includes(trainingDays as 2 | 3 | 4 | 5 | 6) ? (trainingDays as 2 | 3 | 4 | 5 | 6) : 3,
    experience: experience === "ADVANCED" || experience === "INTERMEDIATE" || experience === "BEGINNER" ? experience : "BEGINNER",
    goal,
    equipment,
    priorities,
  });

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true },
    select: {
      id: true,
      primaryMuscles: true,
      secondaryMuscles: true,
      equipment: true,
      isActive: true,
      media: { where: { isActive: true }, select: { type: true } },
    },
  });

  const candidates = exercises.map((exercise) => {
    const groups = [...parseArray(exercise.primaryMuscles), ...parseArray(exercise.secondaryMuscles)]
      .map((value) => MUSCLE_MAP[value.toUpperCase()])
      .filter((value): value is MusclePriority => Boolean(value));
    return {
      id: exercise.id,
      muscleGroups: Array.from(new Set(groups)),
      equipment: candidateEquipment(exercise.equipment),
      hasStaticMedia: exercise.media.some((media) => media.type === "IMAGE"),
      hasVideoMedia: exercise.media.some((media) => media.type === "VIDEO" || media.type === "WEBM" || media.type === "GIF"),
      isActive: exercise.isActive,
    };
  });

  const generated = generatePlan(preferences, candidates);
  const usableDays = generated.days.filter((day) => day.exercises.length >= 3);
  if (usableDays.length !== preferences.trainingDays) return null;

  const plan = await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.updateMany({ where: { userId, isTemplate: false, isActive: true }, data: { isActive: false } });

    return tx.workoutPlan.create({
      data: {
        userId,
        name: generated.name,
        version: 1,
        isActive: true,
        isTemplate: false,
        templates: {
          create: usableDays.map((day, index) => ({
            dayNumber: index + 1,
            name: day.name,
            estimatedMins: Math.min(90, Math.max(30, day.exercises.length * 10)),
            exercises: {
              create: day.exercises.map((item, orderIndex) => ({
                exerciseId: item.exerciseId,
                orderIndex,
                sets: item.sets,
                repMin: item.repMin,
                repMax: item.repMax,
                rirTarget: item.rir,
                restSeconds: item.restSeconds,
                progressionType: "DOUBLE_PROGRESSION",
              })),
            },
          })),
        },
      },
      select: { id: true, templates: { select: { id: true } } },
    });
  });

  return { planId: plan.id, templateCount: plan.templates.length };
}
