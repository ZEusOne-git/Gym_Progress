const EQUIPMENT_ALIASES: Record<string, string> = {
  MACHINE: "machines",
  MACHINES: "machines",
  CABLE: "machines",
  CABLE_MACHINE: "machines",
  SMITH: "machines",
  BARBELL: "barbells",
  BARBELLS: "barbells",
  DUMBBELL: "free_weights",
  DUMBBELLS: "free_weights",
  KETTLEBELL: "free_weights",
  KETTLEBELLS: "free_weights",
  PLATE: "free_weights",
  PLATES: "free_weights",
  TREADMILL: "cardio",
  BIKE: "cardio",
  ROWER: "cardio",
  ELLIPTICAL: "cardio",
  CARDIO: "cardio",
};

export function parseEquipment(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function isEquipmentCompatible(requirements: string[], available: string[]) {
  if (requirements.length === 0 || requirements.some(token => token.toUpperCase() === "BODYWEIGHT")) return true;
  return requirements.some(token => available.includes(EQUIPMENT_ALIASES[token.toUpperCase()] ?? token.toLowerCase()));
}

type ExerciseEquipment = { id: string; category: string; primaryMuscles: string; equipment: string; difficulty: string };

const MUSCLE_ALIASES: Record<string, string[]> = {
  BACK: ["LATISSIMUS_DORSI", "RHOMBOIDS", "TRAPEZIUS"],
  BICEPS: ["BICEPS_BRACHII", "BRACHIALIS"],
  CALVES: ["GASTROCNEMIUS", "SOLEUS"],
  CHEST: ["PECTORALIS_MAJOR", "PECTORALIS_MINOR"],
  GLUTES: ["GLUTEUS_MAXIMUS", "GLUTEUS_MEDIUS"],
  HAMSTRINGS: ["BICEPS_FEMORIS", "SEMITENDINOSUS", "SEMIMEMBRANOSUS"],
  LATS: ["LATISSIMUS_DORSI"],
  QUADS: ["QUADRICEPS"],
  SHOULDERS: ["ANTERIOR_DELTOID", "LATERAL_DELTOID", "POSTERIOR_DELTOID"],
  TRICEPS: ["TRICEPS_BRACHII"],
};

function muscleTokens(value: string) {
  return value.split(/[·,;/]+/).map(token => token.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")).filter(Boolean);
}

function sharePrimaryMuscles(source: ExerciseEquipment, candidate: ExerciseEquipment) {
  const sourceMuscles = new Set(muscleTokens(source.primaryMuscles));
  for (const token of [...sourceMuscles]) for (const alias of MUSCLE_ALIASES[token] ?? []) sourceMuscles.add(alias);
  const candidateMuscles = new Set(muscleTokens(candidate.primaryMuscles));
  for (const token of [...candidateMuscles]) for (const alias of MUSCLE_ALIASES[token] ?? []) candidateMuscles.add(alias);
  return [...candidateMuscles].some(token => sourceMuscles.has(token));
}

export function findAlternativeExercise(source: ExerciseEquipment, catalog: ExerciseEquipment[], available: string[]) {
  return catalog.find(item =>
    item.id !== source.id &&
    sharePrimaryMuscles(source, item) &&
    isEquipmentCompatible(parseEquipment(item.equipment), available),
  );
}
