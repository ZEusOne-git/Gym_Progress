import { getSplit } from "./splits";
import { selectExercises } from "./catalog";
import type { GeneratedDay, GeneratedExercise, PlanPreferences, ExerciseCandidate } from "./types";

const prescriptionFor = (preferences: PlanPreferences) => {
  switch (preferences.goal) {
    case "STRENGTH":
      return { sets: preferences.experience === "BEGINNER" ? 3 : 4, repMin: 4, repMax: 8, rir: 2, restSeconds: 150 };
    case "GENERAL_FITNESS":
      return { sets: 3, repMin: 8, repMax: 12, rir: 3, restSeconds: 90 };
    case "RECOMPOSITION":
      return { sets: preferences.experience === "BEGINNER" ? 2 : 3, repMin: 8, repMax: 12, rir: 2, restSeconds: 90 };
    case "HYPERTROPHY":
    default:
      return { sets: preferences.experience === "BEGINNER" ? 2 : 3, repMin: 6, repMax: 12, rir: 2, restSeconds: 90 };
  }
};

export function generatePlan(preferences: PlanPreferences, candidates: ExerciseCandidate[]): { name: string; days: GeneratedDay[] } {
  const split = getSplit(preferences.trainingDays);
  const prescription = prescriptionFor(preferences);

  const days = split.map((splitDay) => {
    const priorities = new Set(preferences.priorities ?? []);
    const focus = [...splitDay.focus].sort((a, b) => Number(priorities.has(b)) - Number(priorities.has(a)));

    // Allow sensible exercise reuse across training days. Globally excluding every
    // exercise can leave later days too small for home/equipment-limited profiles.
    // Duplicates are still prevented within each individual training day.
    const selected = selectExercises(candidates, preferences, focus, 6);

    const byFocus: ExerciseCandidate[] = [];
    for (const muscle of focus) {
      const match = selected.find(
        (candidate) => candidate.muscleGroups.includes(muscle) && !byFocus.some((item) => item.id === candidate.id),
      );
      if (match) byFocus.push(match);
    }
    for (const candidate of selected) {
      if (byFocus.length >= 6) break;
      if (!byFocus.some((item) => item.id === candidate.id)) byFocus.push(candidate);
    }

    const exercises: GeneratedExercise[] = byFocus.map((candidate) => ({
      exerciseId: candidate.id,
      ...prescription,
    }));

    return { ...splitDay, exercises };
  });

  return { name: `${preferences.goal} · ${preferences.trainingDays} giorni`, days };
}
