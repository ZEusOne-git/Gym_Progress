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

export function findAlternativeExercise(source: ExerciseEquipment, catalog: ExerciseEquipment[], available: string[]) {
  return catalog.find(item =>
    item.id !== source.id &&
    item.category === source.category &&
    isEquipmentCompatible(parseEquipment(item.equipment), available),
  ) ?? catalog.find(item =>
    item.id !== source.id &&
    (item.primaryMuscles === source.primaryMuscles || item.category === source.category) &&
    isEquipmentCompatible(parseEquipment(item.equipment), available),
  );
}
