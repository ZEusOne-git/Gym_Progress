import type { ExerciseCandidate, PlanPreferences } from "./types";

/**
 * Scores an exercise for a user's profile without making video a hard requirement.
 * Static media is the baseline; video only adds a small preference bonus.
 */
export function scoreExercise(exercise: ExerciseCandidate, preferences: PlanPreferences, focus: string[]): number {
  const equipmentOk = exercise.equipment.length === 0 || exercise.equipment.some((item) => preferences.equipment.includes(item));
  if (!equipmentOk) return Number.NEGATIVE_INFINITY;

  let score = 0;
  const groups = new Set(exercise.muscleGroups.map((group) => group.toUpperCase()));
  for (const priority of preferences.priorities) {
    if (groups.has(priority.toUpperCase())) score += 5;
  }
  for (const target of focus) {
    if (groups.has(target.toUpperCase())) score += 3;
  }
  if (exercise.hasStaticMedia) score += 1;
  if (exercise.hasVideoMedia) score += 1;
  return score;
}

export function selectExercises(
  candidates: ExerciseCandidate[],
  preferences: PlanPreferences,
  focus: string[],
  count = 6,
): ExerciseCandidate[] {
  return candidates
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, preferences, focus) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ exercise }) => exercise);
}
