import type { PlanPreferences, TrainingGoal, ExperienceLevel } from "./types";

const GOALS: TrainingGoal[] = ["HYPERTROPHY", "STRENGTH", "RECOMPOSITION", "GENERAL_FITNESS"];
const EXPERIENCE: ExperienceLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export function normalizePlanPreferences(input: Partial<PlanPreferences>): PlanPreferences {
  const days = Number(input.trainingDays);
  const trainingDays = ([2, 3, 4, 5, 6] as const).includes(days as 2 | 3 | 4 | 5 | 6) ? days as PlanPreferences["trainingDays"] : 3;
  const goal = GOALS.includes(input.goal as TrainingGoal) ? input.goal as TrainingGoal : "GENERAL_FITNESS";
  const experience = EXPERIENCE.includes(input.experience as ExperienceLevel) ? input.experience as ExperienceLevel : "BEGINNER";

  return {
    trainingDays,
    experience,
    goal,
    equipment: Array.from(new Set(input.equipment ?? [])),
    priorities: Array.from(new Set(input.priorities ?? [])),
  };
}

export function splitForPreferences(preferences: PlanPreferences): string {
  if (preferences.trainingDays === 2) return "FULL_BODY";
  if (preferences.trainingDays === 3) return preferences.experience === "BEGINNER" ? "FULL_BODY" : "PUSH_PULL_LEGS";
  if (preferences.trainingDays === 4) return "UPPER_LOWER";
  if (preferences.trainingDays === 5) return "UPPER_LOWER_PLUS";
  return "PUSH_PULL_LEGS_X2";
}
