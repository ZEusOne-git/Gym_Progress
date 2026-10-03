import { prisma } from "@/lib/prisma";
import { generatePlan } from "./generator";
import { normalizePlanPreferences } from "./plan-profile";
import type { ExerciseCandidate, MusclePriority, PlanPreferences } from "./types";

const parse = (value: string | null | undefined): string[] => {
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []; }
  catch { return []; }
};

const muscles = (values: string[]): MusclePriority[] => {
  const map: Record<string, MusclePriority> = { CHEST:"CHEST", BACK:"BACK", SHOULDERS:"SHOULDERS", BICEPS:"ARMS", TRICEPS:"ARMS", ARMS:"ARMS", ABS:"CORE", CORE:"CORE", GLUTES:"GLUTES", QUADS:"QUADS", HAMSTRINGS:"HAMSTRINGS", CALVES:"CALVES", LOWER_BACK:"BACK" };
  return Array.from(new Set(values.map(v => map[v.toUpperCase()]).filter(Boolean))) as MusclePriority[];
};

const goal = (value: string | null | undefined): PlanPreferences["goal"] => value === "MUSCLE_GAIN" ? "HYPERTROPHY" : value === "STRENGTH" ? "STRENGTH" : value === "RECOMPOSITION" ? "RECOMPOSITION" : "GENERAL_FITNESS";
const experience = (value: string | null | undefined): PlanPreferences["experience"] => value?.toUpperCase() === "ADVANCED" ? "ADVANCED" : value?.toUpperCase() === "INTERMEDIATE" ? "INTERMEDIATE" : "BEGINNER";

export async function generateAndAssignPlan(userId: string) {
  const [profile, onboarding] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.onboardingResponse.findUnique({ where: { userId } }),
  ]);
  if (!profile || !onboarding?.completedAt) throw new Error("Profilo di allenamento incompleto.");

  const days = ([2,3,4,5,6] as const).includes(profile.trainingDays as 2|3|4|5|6) ? profile.trainingDays as PlanPreferences["trainingDays"] : 3;
  const preferences = normalizePlanPreferences({ trainingDays: days, experience: experience(profile.experience), goal: goal(onboarding.primaryGoal), equipment: parse(onboarding.equipmentJson), priorities: muscles(parse(onboarding.musclePrioritiesJson)) });

  const rows = await prisma.exercise.findMany({ where: { isActive: true }, select: { id:true, primaryMuscles:true, secondaryMuscles:true, equipment:true, media:{ where:{ isActive:true }, select:{ type:true } } } });
  const candidates: ExerciseCandidate[] = rows.map(row => ({ id:row.id, muscleGroups:muscles([...parse(row.primaryMuscles), ...parse(row.secondaryMuscles)]), equipment:parse(row.equipment), hasStaticMedia:row.media.some(m => m.type === "IMAGE"), hasVideoMedia:row.media.some(m => ["VIDEO","WEBM","GIF"].includes(m.type)), isActive:true }));
  const generated = generatePlan(preferences, candidates);
  if (generated.days.some(day => day.exercises.length < 3)) throw new Error("Non ci sono abbastanza esercizi compatibili.");

  await prisma.workoutPlan.updateMany({ where:{ userId, isActive:true }, data:{ isActive:false } });
  const plan = await prisma.workoutPlan.create({ data:{ userId, name:generated.name, isActive:true, isTemplate:false, templates:{ create:generated.days.map((day,i)=>({ dayNumber:i+1, name:day.name, estimatedMins:50, exercises:{ create:day.exercises.map((exercise,orderIndex)=>({ exerciseId:exercise.exerciseId, orderIndex, sets:exercise.sets, repMin:exercise.repMin, repMax:exercise.repMax, rirTarget:exercise.rir, restSeconds:exercise.restSeconds, progressionType:"DOUBLE_PROGRESSION" })) } })) } }, include:{ templates:{ orderBy:{ dayNumber:"asc" }, select:{ id:true, dayNumber:true, name:true } } } });
  return plan;
}
