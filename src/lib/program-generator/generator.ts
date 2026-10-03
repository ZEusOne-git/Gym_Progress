import { getSplit } from "./splits";
import { selectExercises } from "./catalog";
import type { GeneratedDay, GeneratedExercise, PlanPreferences, ExerciseCandidate, MusclePriority } from "./types";

const prescriptionFor = (preferences: PlanPreferences) => {
  const beginner = preferences.experience === "BEGINNER";
  const advanced = preferences.experience === "ADVANCED";
  switch (preferences.goal) {
    case "STRENGTH": return { sets: beginner ? 3 : 4, repMin: 4, repMax: advanced ? 7 : 8, rir: advanced ? 1 : 2, restSeconds: 150 };
    case "GENERAL_FITNESS": return { sets: beginner ? 2 : 3, repMin: 8, repMax: 15, rir: 3, restSeconds: 90 };
    case "RECOMPOSITION": return { sets: beginner ? 2 : 3, repMin: 8, repMax: 12, rir: 2, restSeconds: 90 };
    case "HYPERTROPHY":
    default: return { sets: beginner ? 2 : advanced ? 4 : 3, repMin: 6, repMax: 12, rir: 2, restSeconds: 90 };
  }
};

const aliases: Record<string, MusclePriority> = { BICEPS: "ARMS", TRICEPS: "ARMS", ABS: "CORE" };
const normalizedMuscles = (groups: MusclePriority[]) => groups.map((group) => aliases[group] ?? group);
const goalNames: Record<PlanPreferences["goal"], string> = {
  HYPERTROPHY: "Ipertrofia", STRENGTH: "Forza", RECOMPOSITION: "Ricomp", GENERAL_FITNESS: "Fitness",
};

function coverageScore(candidate: ExerciseCandidate, focus: MusclePriority[], priorities: Set<MusclePriority>, counts: Map<MusclePriority, number>, usedThisWeek: Map<string, number>) {
  const groups = normalizedMuscles(candidate.muscleGroups);
  let score = 0;
  for (const group of groups) {
    if (focus.includes(group)) score += 8;
    if (priorities.has(group)) score += 6;
    score -= (counts.get(group) ?? 0) * 3;
  }
  // Free media is preferred when available, but media never makes an exercise mandatory.
  if (candidate.hasVideoMedia) score += 4;
  else if (candidate.hasStaticMedia) score += 1;
  // Avoid turning a six-day plan into the same small list of exercises.
  score -= (usedThisWeek.get(candidate.id) ?? 0) * 16;
  return score;
}

function addCandidate(candidate: ExerciseCandidate, selected: ExerciseCandidate[], counts: Map<MusclePriority, number>) {
  selected.push(candidate);
  for (const group of normalizedMuscles(candidate.muscleGroups)) counts.set(group, (counts.get(group) ?? 0) + 1);
}

function exercisesForSession(preferences: PlanPreferences) {
  const minutes = preferences.sessionMinutes ?? 45;
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  if (minutes <= 60) return 6;
  return 7;
}

function pickBest(pool: ExerciseCandidate[], selected: ExerciseCandidate[], focus: MusclePriority[], priorities: Set<MusclePriority>, counts: Map<MusclePriority, number>, usedThisWeek: Map<string, number>, muscle?: MusclePriority) {
  const candidates = pool
    .filter((candidate) => !selected.some((item) => item.id === candidate.id))
    .filter((candidate) => !muscle || normalizedMuscles(candidate.muscleGroups).includes(muscle));

  // Prefer exercises that have not appeared yet this week. If the catalog is too small,
  // allow a second appearance rather than producing an incomplete workout.
  const fresh = candidates.filter((candidate) => (usedThisWeek.get(candidate.id) ?? 0) === 0);
  const reusable = candidates.filter((candidate) => (usedThisWeek.get(candidate.id) ?? 0) < 2);
  const source = fresh.length ? fresh : reusable.length ? reusable : candidates;

  return source.sort((a, b) => coverageScore(b, focus, priorities, counts, usedThisWeek) - coverageScore(a, focus, priorities, counts, usedThisWeek) || (usedThisWeek.get(a.id) ?? 0) - (usedThisWeek.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0];
}

export function generatePlan(preferences: PlanPreferences, candidates: ExerciseCandidate[]): { name: string; days: GeneratedDay[] } {
  const split = getSplit(preferences.trainingDays);
  const prescription = prescriptionFor(preferences);
  const priorities = new Set(preferences.priorities ?? []);
  const usedThisWeek = new Map<string, number>();
  const exercisesPerDay = Math.min(exercisesForSession(preferences), preferences.experience === "BEGINNER" ? 6 : 7);

  const days = split.map((splitDay) => {
    const focus = [...splitDay.focus].sort((a, b) => Number(priorities.has(b)) - Number(priorities.has(a)));
    const pool = selectExercises(candidates, preferences, focus, Math.max(candidates.length, exercisesPerDay * 6));
    const selected: ExerciseCandidate[] = [];
    const counts = new Map<MusclePriority, number>();

    // First guarantee the user's selected priorities are represented whenever the
    // catalog contains a compatible exercise for that muscle.
    for (const priority of priorities) {
      if (!focus.includes(priority) || selected.length >= exercisesPerDay) continue;
      const match = pickBest(pool, selected, focus, priorities, counts, usedThisWeek, priority);
      if (match) addCandidate(match, selected, counts);
    }

    // Then fill the session according to the split, balancing muscle coverage and media.
    for (const muscle of focus) {
      if (selected.length >= exercisesPerDay) break;
      const match = pickBest(pool, selected, focus, priorities, counts, usedThisWeek, muscle);
      if (match) addCandidate(match, selected, counts);
    }

    while (selected.length < exercisesPerDay) {
      const next = pickBest(pool, selected, focus, priorities, counts, usedThisWeek);
      if (!next) break;
      addCandidate(next, selected, counts);
    }

    const exercises: GeneratedExercise[] = selected.map((candidate, orderIndex) => {
      usedThisWeek.set(candidate.id, (usedThisWeek.get(candidate.id) ?? 0) + 1);
      const isPriority = normalizedMuscles(candidate.muscleGroups).some((group) => priorities.has(group));
      const accessory = orderIndex >= Math.max(3, selected.length - 2);
      const sets = isPriority && !accessory && preferences.experience !== "BEGINNER" ? prescription.sets + 1 : prescription.sets;
      return { exerciseId: candidate.id, sets, repMin: prescription.repMin, repMax: prescription.repMax, rir: prescription.rir, restSeconds: prescription.restSeconds };
    });
    return { ...splitDay, exercises };
  });

  return { name: `${goalNames[preferences.goal]} · ${preferences.trainingDays} giorni`, days };
}
