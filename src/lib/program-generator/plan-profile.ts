import type { PlanPreferences } from "./types";

export function normalizePlanPreferences(input: Partial<PlanPreferences>): PlanPreferences {
  const days = Number(input.trainingDays);
  const trainingDays = ([2, 3, 4, 5, 6] as const).includes(days as 2 | 3 | 4 | 5 | 6)
    ? (days as PlanPreferences["trainingDays"])
    : 3;

  return {
    trainingDays,
    experience: input.experience ?? "BEGINNER",
    goal: input.goal ?? "GENERAL_FITNESS",
    equipment: Array.from(new Set(input.equipment ?? [])),
    priorities: Array.from(new Set(input.priorities ?? [])),
  };
}

export function splitForPreferences(preferences: PlanPreferences): string {
  if (preferences.trainingDays === 2) return "FULL_BODY";
  if (preferences.trainingDays === 3) {
    return preferences.experience === "BEGINNER" ? "FULL_BODY" : "PUSH_PULL_LEGS";
  }
  if (preferences.trainingDays === 4) return "UPPER_LOWER";
  if (preferences.trainingDays === 5) return "UPPER_LOWER_PLUS";
  return "PUSH_PULL_LEGS_X2";
}
