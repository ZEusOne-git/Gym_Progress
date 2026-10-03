import { getSplit } from "./splits";
import { selectExercises } from "./catalog";
import type { GeneratedDay, GeneratedExercise, PlanPreferences, ExerciseCandidate, MusclePriority } from "./types";

const prescriptionFor = (preferences: PlanPreferences) => {
  const beginner = preferences.experience === "BEGINNER";
  const advanced = preferences.experience === "ADVANCED";

  switch (preferences.goal) {
    case "STRENGTH":
      return { sets: beginner ? 3 : 4, repMin: 4, repMax: advanced ? 7 : 8, rir: advanced ? 1 : 2, restSeconds: 150 };
    case "GENERAL_FITNESS":
      return { sets: beginner ? 2 : 3, repMin: 8, repMax: 15, rir: 3, restSeconds: 90 };
    case "RECOMPOSITION":
      return { sets: beginner ? 2 : 3, repMin: 8, repMax: 12, rir: 2, restSeconds: 90 };
    case "HYPERTROPHY":
    default:
      return { sets: beginner ? 2 : advanced ? 4 : 3, repMin: 6, repMax: 12, rir: 2, restSeconds: 90 };
  }
};

const aliases: Record<string, MusclePriority> = {
  BICEPS: "ARMS",
  TRICEPS: "ARMS",
  ABS: "CORE",
};

const normalizedMuscles = (groups: MusclePriority[]) => groups.map((group) => aliases[group] ?? group);

function coverageScore(candidate: ExerciseCandidate, focus: MusclePriority[], priorities: Set<MusclePriority>, counts: Map<MusclePriority, number>) {
  const groups = normalizedMuscles(candidate.muscleGroups);
  let score = 0;
  for (const group of groups) {
    if (focus.includes(group)) score += 8;
    if (priorities.has(group)) score += 6;
    score -= (counts.get(group) ?? 0) * 2;
  }
  // A static image keeps the workout understandable even when no video exists.
  if (candidate.hasStaticMedia) score += 1;
  if (candidate.hasVideoMedia) score += 1;
  return score;
}

export function generatePlan(preferences: PlanPreferences, candidates: ExerciseCandidate[]): { name: string; days: GeneratedDay[] } {
  const split = getSplit(preferences.trainingDays);
  const prescription = prescriptionFor(preferences);
  const priorities = new Set(preferences.priorities ?? []);
  const usedThisWeek = new Map<string, number>();
  const exercisesPerDay = preferences.experience === "BEGINNER" ? 5 : preferences.trainingDays >= 5 ? 6 : 5;

  const days = split.map((splitDay, dayIndex) => {
    const focus = [...splitDay.focus].sort((a, b) => Number(priorities.has(b)) - Number(priorities.has(a)));
    const pool = selectExercises(candidates, preferences, focus, Math.min(candidates.length, 18));
    const selected: ExerciseCandidate[] = [];
    const counts = new Map<MusclePriority, number>();

    // First guarantee coverage of the day's primary muscle groups.
    for (const muscle of focus) {
      const match = pool
        .filter((candidate) => !selected.some((item) => item.id === candidate.id))
        .filter((candidate) => normalizedMuscles(candidate.muscleGroups).includes(muscle))
        .sort((a, b) => {
          const aReuse = usedThisWeek.get(a.id) ?? 0;
          const bReuse = usedThisWeek.get(b.id) ?? 0;
          return coverageScore(b, focus, priorities, counts) - coverageScore(a, focus, priorities, counts) || aReuse - bReuse;
        })[0];
      if (match) {
        selected.push(match);
        for (const group of normalizedMuscles(match.muscleGroups)) counts.set(group, (counts.get(group) ?? 0) + 1);
      }
    }

    // Fill the remaining slots while penalizing repeated muscles and repeated
    // exercises across the week. This creates materially different sessions.
    while (selected.length < exercisesPerDay) {
      const next = pool
        .filter((candidate) => !selected.some((item) => item.id === candidate.id))
        .sort((a, b) => {
          const aScore = coverageScore(a, focus, priorities, counts) - (usedThisWeek.get(a.id) ?? 0) * 5;
          const bScore = coverageScore(b, focus, priorities, counts) - (usedThisWeek.get(b.id) ?? 0) * 5;
          return bScore - aScore;
        })[0];
      if (!next) break;
      selected.push(next);
      for (const group of normalizedMuscles(next.muscleGroups)) counts.set(group, (counts.get(group) ?? 0) + 1);
    }

    const exercises: GeneratedExercise[] = selected.map((candidate, orderIndex) => {
      usedThisWeek.set(candidate.id, (usedThisWeek.get(candidate.id) ?? 0) + 1);
      const isPriority = normalizedMuscles(candidate.muscleGroups).some((group) => priorities.has(group));
      const accessory = orderIndex >= Math.max(3, selected.length - 2);
      const sets = isPriority && !accessory && preferences.experience !== "BEGINNER"
        ? prescription.sets + 1
        : prescription.sets;
      return { exerciseId: candidate.id, sets, repMin: prescription.repMin, repMax: prescription.repMax, rir: prescription.rir, restSeconds: prescription.restSeconds };
    });

    return { ...splitDay, name: `${splitDay.name}`, exercises };
  });

  return { name: `${preferences.goal} · ${preferences.trainingDays} giorni`, days };
}
