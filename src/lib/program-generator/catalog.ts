import type { ExerciseCandidate, PlanPreferences } from "./types";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
const BODYWEIGHT = new Set(["bodyweight", "body weight", "no equipment", "none"]);

function equipmentMatches(candidate: ExerciseCandidate, available: string[]) {
  const wanted = new Set(available.map(normalize));
  const candidateEquipment = candidate.equipment.map(normalize);

  // An empty equipment selection means home/bodyweight only. Never silently
  // prescribe a machine or free-weight exercise to a user who owns no equipment.
  if (!wanted.size) {
    return candidateEquipment.length === 0 || candidateEquipment.some((item) => BODYWEIGHT.has(item));
  }

  if (candidateEquipment.length === 0) return true;

  return candidateEquipment.some((value) => {
    if (BODYWEIGHT.has(value) && wanted.has("bodyweight")) return true;
    if (wanted.has(value)) return true;
    if (wanted.has("free weights") && ["dumbbells", "dumbbell", "kettlebell", "bodyweight"].includes(value)) return true;
    if (wanted.has("barbells") && ["barbell", "ez bar", "ez curl bar"].includes(value)) return true;
    if (wanted.has("machines") && ["machine", "cable", "cables", "smith machine"].includes(value)) return true;
    return false;
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
): ExerciseCandidate[] {
  return candidates
    .filter((exercise) => exercise.isActive !== false)
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, preferences, focus) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ exercise }) => exercise);
}
