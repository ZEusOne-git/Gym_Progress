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

function coverageScore(candidate: ExerciseCandidate, focus: MusclePriority[], priorities: Set<MusclePriority>, counts: Map<MusclePriority, number>, usedThisWeek: Map<string, number>) {
  const groups = normalizedMuscles(candidate.muscleGroups);
  let score = 0;
  for (const group of groups) {
    if (focus.includes(group)) score += 8;
    if (priorities.has(group)) score += 6;
    score -= (counts.get(group) ?? 0) * 3;
  }
  if (candidate.hasStaticMedia) score += 2;
  if (candidate.hasVideoMedia) score += 1;
  score -= (usedThisWeek.get(candidate.id) ?? 0) * 8;
  return score;
}

function addCandidate(candidate: ExerciseCandidate, selected: ExerciseCandidate[], counts: Map<MusclePriority, number>) {
  selected.push(candidate);
  for (const group of normalizedMuscles(candidate.muscleGroups)) {
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
}

function exercisesForSession(preferences: PlanPreferences) {
  const minutes = preferences.sessionMinutes ?? 45;
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  if (minutes <= 60) return 6;
  return 7;
}

export function generatePlan(preferences: PlanPreferences, candidates: ExerciseCandidate[]): { name: string; days: GeneratedDay[] } {
  const split = getSplit(preferences.trainingDays);
  const prescription = prescriptionFor(preferences);
  const priorities = new Set(preferences.priorities ?? []);
  const usedThisWeek = new Map<string, number>();
  const exercisesPerDay = Math.min(
    exercisesForSession(preferences),
    preferences.experience === "BEGINNER" ? 6 : 7,
  );

  const days = split.map((splitDay) => {
    const focus = [...splitDay.focus].sort((a, b) => Number(priorities.has(b)) - Number(priorities.has(a)));
    const pool = selectExercises(candidates, preferences, focus, candidates.length);
    const selected: ExerciseCandidate[] = [];
    const counts = new Map<MusclePriority, number>();

    // First guarantee the user's explicit priorities when compatible exercises exist.
    for (const priority of priorities) {
      if (!focus.includes(priority) || selected.length >= exercisesPerDay) continue;
      const match = pool
        .filter((candidate) => !selected.some((item) => item.id === candidate.id))
        .filter((candidate) => normalizedMuscles(candidate.muscleGroups).includes(priority))
        .sort((a, b) => coverageScore(b, focus, priorities, counts, usedThisWeek) - coverageScore(a, focus, priorities, counts, usedThisWeek))[0];
      if (match) addCandidate(match, selected, counts);
    }

    // Then cover the day's split focus, preferring less-used exercises and balanced muscle coverage.
    for (const muscle of focus) {
      if (selected.length >= exercisesPerDay) break;
      const match = pool
        .filter((candidate) => !selected.some((item) => item.id === candidate.id))
        .filter((candidate) => normalizedMuscles(candidate.muscleGroups).includes(muscle))
        .sort((a, b) => coverageScore(b, focus, priorities, counts, usedThisWeek) - coverageScore(a, focus, priorities, counts, usedThisWeek))[0];
      if (match) addCandidate(match, selected, counts);
    }

    while (selected.length < exercisesPerDay) {
      const next = pool
        .filter((candidate) => !selected.some((item) => item.id === candidate.id))
        .sort((a, b) => coverageScore(b, focus, priorities, counts, usedThisWeek) - coverageScore(a, focus, priorities, counts, usedThisWeek))[0];
      if (!next) break;
      addCandidate(next, selected, counts);
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
