export type TrainingDays = 2 | 3 | 4 | 5 | 6

export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export type TrainingGoal = "HYPERTROPHY" | "STRENGTH" | "RECOMPOSITION" | "GENERAL_FITNESS"

export type MusclePriority =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "ARMS"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "CORE"

export type Equipment = string

export type PlanPreferences = {
  trainingDays: TrainingDays
  experience: ExperienceLevel
  goal: TrainingGoal
  equipment: Equipment[]
  priorities?: MusclePriority[]
}

export type SplitDay = {
  name: string
  focus: MusclePriority[]
}

export type GeneratedExercise = {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  rir: number
  restSeconds: number
}

export type GeneratedDay = SplitDay & {
  exercises: GeneratedExercise[]
}

export type GeneratedPlan = {
  name: string
  days: GeneratedDay[]
}
