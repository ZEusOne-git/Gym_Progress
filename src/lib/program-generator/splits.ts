import type { MusclePriority, SplitDay, TrainingDays } from "./types"

const day = (name: string, focus: MusclePriority[]): SplitDay => ({ name, focus })

export function getSplit(trainingDays: TrainingDays): SplitDay[] {
  switch (trainingDays) {
    case 2:
      return [
        day("Full Body A", ["CHEST", "BACK", "QUADS", "CORE"]),
        day("Full Body B", ["SHOULDERS", "ARMS", "HAMSTRINGS", "GLUTES"]),
      ]
    case 3:
      return [
        day("Full Body A", ["CHEST", "BACK", "QUADS"]),
        day("Full Body B", ["SHOULDERS", "ARMS", "HAMSTRINGS"]),
        day("Full Body C", ["CHEST", "BACK", "GLUTES"]),
      ]
    case 4:
      return [
        day("Upper A", ["CHEST", "BACK", "ARMS"]),
        day("Lower A", ["QUADS", "HAMSTRINGS", "CALVES"]),
        day("Upper B", ["SHOULDERS", "BACK", "ARMS"]),
        day("Lower B", ["GLUTES", "QUADS", "HAMSTRINGS", "CORE"]),
      ]
    case 5:
      return [
        day("Upper A", ["CHEST", "BACK", "ARMS"]),
        day("Lower A", ["QUADS", "HAMSTRINGS"]),
        day("Push", ["CHEST", "SHOULDERS", "ARMS"]),
        day("Pull", ["BACK", "SHOULDERS", "ARMS"]),
        day("Lower B", ["GLUTES", "QUADS", "HAMSTRINGS", "CALVES"]),
      ]
    case 6:
      return [
        day("Push A", ["CHEST", "SHOULDERS", "ARMS"]),
        day("Pull A", ["BACK", "ARMS"]),
        day("Legs A", ["QUADS", "HAMSTRINGS", "CALVES"]),
        day("Push B", ["CHEST", "SHOULDERS", "ARMS"]),
        day("Pull B", ["BACK", "ARMS", "CORE"]),
        day("Legs B", ["GLUTES", "QUADS", "HAMSTRINGS", "CALVES"]),
      ]
  }
}
