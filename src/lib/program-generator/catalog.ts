import type { ExerciseCandidate, PlanPreferences } from "./types";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");

function equipmentMatches(candidate: ExerciseCandidate, available: string[]) {
  if (!candidate.equipment.length || !available.length) return true;
  const wanted = new Set(available.map(normalize));
  return candidate.equipment.some((item) => {
    const value = normalize(item);
    return wanted.has(value) ||
      (wanted.has("free weights") && ["dumbbells", "dumbbell", "kettlebell", "bodyweight"].includes(value)) ||
      (wanted.has("barbells") && ["barbell", "ez bar", "ez curl bar"].includes(value)) ||
      (wanted.has("machines") && ["machine", "cable", "cables", "smith machine"].includes(value));
  });
}

/** Scores an exercise without making video a hard requirement. */
export function scoreExercise(exercise: ExerciseCandidate, preferences: PlanPreferences, focus: string[]): number {
  if (!equipmentMatches(exercise, preferences.equipment)) return Number.NEGATIVE_INFINITY;

  let score = exercise.hasStaticMedia ? 2 : 0;
  if (exercise.hasVideoMedia) score += 1;
  const groups = new Set(exercise.muscleGroups.map((group) => group.toUpperCase()));
  for (const priority of preferences.priorities ?? []) {
    if (groups.has(priority.toUpperCase())) score += 5;
  }
  for (const target of focus) {
    if (groups.has(target.toUpperCase())) score += 3;
  }
  return score;
}

export function selectExercises(
  candidates: ExerciseCandidate[],
  preferences: PlanPreferences,
  focus: string[],
  count = 6,
  excludedIds = new Set<string>(),
): ExerciseCandidate[] {
  return candidates
    .filter((exercise) => exercise.isActive !== false && !excludedIds.has(exercise.id))
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, preferences, focus) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ exercise }) => exercise);
}
