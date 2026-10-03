import type { ExerciseCandidate, PlanPreferences } from "./types";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
const BODYWEIGHT = new Set(["bodyweight", "body weight", "no equipment", "none"]);
const muscleAliases: Record<string, string> = {
  biceps: "ARMS",
  triceps: "ARMS",
  arms: "ARMS",
  abs: "CORE",
  abdominals: "CORE",
  core: "CORE",
};

const normalizedMuscle = (value: string) => muscleAliases[normalize(value)] ?? value.trim().toUpperCase().replace(/[\s-]+/g, "_");

function equipmentMatches(candidate: ExerciseCandidate, available: string[]) {
  const wanted = new Set(available.map(normalize));
  const candidateEquipment = candidate.equipment.map(normalize);

  // Bodyweight movements are a universal fallback: an athlete who owns any
  // gym equipment can still perform them, and they are essential when the
  // selected profile is home/minimal equipment.
  if (candidateEquipment.some((item) => BODYWEIGHT.has(item))) return true;

  if (!wanted.size) return candidateEquipment.length === 0;
  if (candidateEquipment.length === 0) return true;

  return candidateEquipment.some((value) => {
    if (wanted.has(value)) return true;
    if (wanted.has("free weights") && ["dumbbells", "dumbbell", "kettlebell"].includes(value)) return true;
    if (wanted.has("barbells") && ["barbell", "ez bar", "ez curl bar", "trap bar"].includes(value)) return true;
    if (wanted.has("machines") && ["machine", "cable", "cables", "smith machine"].includes(value)) return true;
    if (wanted.has("cardio") && ["treadmill", "bike", "stationary bike", "rowing machine", "elliptical"].includes(value)) return true;
    return false;
  });
}

/** Scores an exercise without making media a hard requirement. Video is preferred when available. */
export function scoreExercise(exercise: ExerciseCandidate, preferences: PlanPreferences, focus: string[]): number {
  if (!equipmentMatches(exercise, preferences.equipment)) return Number.NEGATIVE_INFINITY;

  // Media improves the workout experience, but never excludes an otherwise
  // suitable exercise. A video is preferred over a static illustration; a
  // static illustration is still preferred over an exercise with no media.
  let score = exercise.hasStaticMedia ? 1 : 0;
  if (exercise.hasVideoMedia) score += 3;
  const groups = new Set(exercise.muscleGroups.map(normalizedMuscle));
  for (const priority of preferences.priorities ?? []) {
    if (groups.has(priority)) score += 5;
  }
  for (const target of focus) {
    if (groups.has(normalizedMuscle(target))) score += 3;
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
