import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { generatePlan } from "./generator";
import { normalizePlanPreferences } from "./plan-profile";
import { FREE_EXERCISE_SET } from "./free-exercise-catalog";
import type { ExerciseCandidate, MusclePriority, PlanPreferences } from "./types";

const parse = (value: string | null | undefined): string[] => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch { return []; }
};

const muscles = (values: string[]): MusclePriority[] => {
  const map: Record<string, MusclePriority> = { CHEST: "CHEST", BACK: "BACK", SHOULDERS: "SHOULDERS", BICEPS: "ARMS", TRICEPS: "ARMS", ARMS: "ARMS", ABS: "CORE", CORE: "CORE", GLUTES: "GLUTES", QUADS: "QUADS", HAMSTRINGS: "HAMSTRINGS", CALVES: "CALVES", LOWER_BACK: "BACK" };
  return Array.from(new Set(values.map((v) => map[v.toUpperCase()]).filter(Boolean))) as MusclePriority[];
};
const goal = (value: string | null | undefined): PlanPreferences["goal"] => value === "MUSCLE_GAIN" ? "HYPERTROPHY" : value === "STRENGTH" ? "STRENGTH" : value === "RECOMPOSITION" ? "RECOMPOSITION" : "GENERAL_FITNESS";
const experience = (value: string | null | undefined): PlanPreferences["experience"] => value?.toUpperCase() === "ADVANCED" ? "ADVANCED" : value?.toUpperCase() === "INTERMEDIATE" ? "INTERMEDIATE" : "BEGINNER";
const trainingWeekdays: Record<PlanPreferences["trainingDays"], number[]> = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const monday = (date: Date) => { const day = date.getDay() || 7; return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day + 1); };

async function createCalendar(tx: Prisma.TransactionClient, userId: string, planId: string, templateIds: string[], days: PlanPreferences["trainingDays"]) {
  const today = dayStart(new Date());
  const firstMonday = monday(today);
  const rows: { userId: string; workoutPlanId: string; templateId: string; scheduledDate: Date }[] = [];
  for (let week = 0; week < 12; week += 1) {
    const base = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + week * 7);
    trainingWeekdays[days].forEach((weekday, index) => {
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + weekday - 1);
      date.setHours(12, 0, 0, 0);
      if (date >= today) rows.push({ userId, workoutPlanId: planId, templateId: templateIds[index], scheduledDate: date });
    });
  }
  if (rows.length) await tx.workoutSchedule.createMany({ data: rows });
}

export async function generateAndAssignPlan(userId: string) {
  const [profile, onboarding] = await Promise.all([prisma.profile.findUnique({ where: { userId } }), prisma.onboardingResponse.findUnique({ where: { userId } })]);
  if (!profile || !onboarding?.completedAt) throw new Error("Profilo di allenamento incompleto.");
  const days = ([2, 3, 4, 5, 6] as const).includes(profile.trainingDays as 2 | 3 | 4 | 5 | 6) ? profile.trainingDays as PlanPreferences["trainingDays"] : 3;
  const preferences = normalizePlanPreferences({ trainingDays: days, experience: experience(profile.experience), goal: goal(onboarding.primaryGoal), equipment: parse(onboarding.equipmentJson), priorities: muscles(parse(onboarding.musclePrioritiesJson)), sessionMinutes: profile.sessionMinutes ?? undefined });

  const rows = await prisma.exercise.findMany({
    where: { isActive: true, slug: { in: [...FREE_EXERCISE_SET] } },
    select: { id: true, slug: true, primaryMuscles: true, secondaryMuscles: true, equipment: true, media: { where: { isActive: true }, select: { type: true } } },
  });
  const candidates: ExerciseCandidate[] = rows.map((row) => ({ id: row.id, slug: row.slug, muscleGroups: muscles([...parse(row.primaryMuscles), ...parse(row.secondaryMuscles)]), equipment: parse(row.equipment), hasStaticMedia: row.media.some((m) => m.type === "IMAGE"), hasVideoMedia: row.media.some((m) => ["VIDEO", "WEBM", "GIF"].includes(m.type)), isActive: true }));
  const generated = generatePlan(preferences, candidates);
  if (generated.days.some((day) => day.exercises.length < 3)) throw new Error("Non ci sono abbastanza esercizi compatibili nel catalogo free fornito.");
  const activeSession = await prisma.workoutSession.findFirst({ where: { userId, completedAt: null }, select: { id: true } });
  if (activeSession) throw new Error("Completa o termina l'allenamento attivo prima di cambiare programma.");

  return prisma.$transaction(async (tx) => {
    const today = dayStart(new Date());
    const activePlans = await tx.workoutPlan.findMany({ where: { userId, isActive: true, isTemplate: false }, select: { id: true, version: true } });
    const nextVersion = Math.max(0, ...activePlans.map((plan) => plan.version)) + 1;
    const activePlanIds = activePlans.map((plan) => plan.id);
    if (activePlanIds.length) {
      await tx.workoutPlan.updateMany({ where: { id: { in: activePlanIds } }, data: { isActive: false } });
      const futureSchedules = await tx.workoutSchedule.findMany({
        where: { userId, workoutPlanId: { in: activePlanIds }, scheduledDate: { gte: today } },
        select: { id: true },
      });
      const futureScheduleIds = futureSchedules.map((schedule) => schedule.id);
      if (futureScheduleIds.length) {
        await tx.workoutSession.updateMany({ where: { scheduleId: { in: futureScheduleIds } }, data: { scheduleId: null } });
        await tx.workoutSchedule.deleteMany({ where: { id: { in: futureScheduleIds } } });
      }
    }
    const plan = await tx.workoutPlan.create({
      data: { userId, name: generated.name, version: nextVersion, isActive: true, isTemplate: false, templates: { create: generated.days.map((day, i) => ({ dayNumber: i + 1, name: day.name, estimatedMins: preferences.sessionMinutes, exercises: { create: day.exercises.map((exercise, orderIndex) => ({ exerciseId: exercise.exerciseId, orderIndex, sets: exercise.sets, repMin: exercise.repMin, repMax: exercise.repMax, rirTarget: exercise.rir, restSeconds: exercise.restSeconds, progressionType: "DOUBLE_PROGRESSION" })) } })) } },
      include: { templates: { orderBy: { dayNumber: "asc" }, select: { id: true, dayNumber: true, name: true } } },
    });
    await createCalendar(tx, userId, plan.id, plan.templates.map((template) => template.id), days);
    return plan;
  });
}
