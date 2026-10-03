import { getSplit } from "./splits"
import type {
  GeneratedDay,
  GeneratedExercise,
  MusclePriority,
  PlanPreferences,
} from "./types"

export type ExerciseCandidate = {
  id: string
  muscleGroup: MusclePriority
  equipment?: string | null
  isActive?: boolean
}

const equipmentMatches = (exercise: ExerciseCandidate, available: string[]) => {
  if (!exercise.equipment) return true
  if (available.length === 0) return true
  const wanted = new Set(available.map((value) => value.toLowerCase()))
  return exercise.equipment
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .some((value) => wanted.has(value))
}

const prescriptionFor = (preferences: PlanPreferences) => {
  switch (preferences.goal) {
    case "STRENGTH":
      return { sets: preferences.experience === "BEGINNER" ? 3 : 4, repMin: 4, repMax: 8, rir: 2, restSeconds: 150 }
    case "GENERAL_FITNESS":
      return { sets: 3, repMin: 8, repMax: 12, rir: 3, restSeconds: 90 }
    case "RECOMPOSITION":
      return { sets: 3, repMin: 8, repMax: 12, rir: 2, restSeconds: 90 }
    case "HYPERTROPHY":
    default:
      return { sets: preferences.experience === "BEGINNER" ? 2 : 3, repMin: 6, repMax: 12, rir: 2, restSeconds: 90 }
  }
}

export function generatePlan(preferences: PlanPreferences, candidates: ExerciseCandidate[]): { name: string; days: GeneratedDay[] } {
  const split = getSplit(preferences.trainingDays)
  const available = candidates.filter((exercise) => exercise.isActive !== false && equipmentMatches(exercise, preferences.equipment))
  const prescription = prescriptionFor(preferences)
  const priorities = new Set(preferences.priorities ?? [])
  const used = new Set<string>()

  const days = split.map((splitDay) => {
    const selected: GeneratedExercise[] = []
    const focus = [...splitDay.focus].sort((a, b) => Number(priorities.has(b)) - Number(priorities.has(a)))

    for (const muscle of focus) {
      const exercise = available.find((candidate) => candidate.muscleGroup === muscle && !used.has(candidate.id))
      if (!exercise) continue
      used.add(exercise.id)
      selected.push({ exerciseId: exercise.id, ...prescription })
      if (selected.length >= 6) break
    }

    return { ...splitDay, exercises: selected }
  })

  return {
    name: `${preferences.goal} · ${preferences.trainingDays} giorni`,
    days,
  }
}
