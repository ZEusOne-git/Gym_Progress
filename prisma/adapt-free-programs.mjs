import { PrismaClient } from "@prisma/client";
import { FREE_EXERCISE_SET } from "./free-exercise-catalog.mjs";

const prisma = new PrismaClient();

const parseJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const tokens = (value) => parseJsonArray(value).map((item) => item.toLowerCase());

function similarity(source, candidate) {
  let score = 0;
  const sourceMuscles = tokens(source.primaryMuscles);
  const candidateMuscles = tokens(candidate.primaryMuscles);
  const sourceEquipment = tokens(source.equipment);
  const candidateEquipment = tokens(candidate.equipment);
  const sourceCategory = String(source.category || "").toLowerCase();
  const candidateCategory = String(candidate.category || "").toLowerCase();

  score += candidateMuscles.filter((muscle) => sourceMuscles.includes(muscle)).length * 20;
  score += sourceMuscles.filter((muscle) => candidateMuscles.includes(muscle)).length * 8;
  score += candidateEquipment.filter((item) => sourceEquipment.includes(item)).length * 8;
  if (sourceCategory && sourceCategory === candidateCategory) score += 12;
  if (source.difficulty === candidate.difficulty) score += 5;
  return score;
}

async function main() {
  const freeExercises = await prisma.exercise.findMany({
    where: { isActive: true, slug: { in: [...FREE_EXERCISE_SET] } },
    select: { id: true, slug: true, name: true, category: true, primaryMuscles: true, equipment: true, difficulty: true },
  });
  const freeById = new Map(freeExercises.map((exercise) => [exercise.id, exercise]));
  const freeBySlug = new Map(freeExercises.map((exercise) => [exercise.slug, exercise]));

  if (freeExercises.length !== FREE_EXERCISE_SET.size) {
    throw new Error(`Catalogo free incompleto: trovati ${freeExercises.length}/${FREE_EXERCISE_SET.size} esercizi.`);
  }

  const plans = await prisma.workoutPlan.findMany({
    where: { isTemplate: true },
    include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } } } } },
  });

  let adaptedPlans = 0;
  let adaptedExercises = 0;

  for (const plan of plans) {
    const used = new Set();
    const replacements = [];

    for (const template of plan.templates) {
      for (const item of template.exercises) {
        if (FREE_EXERCISE_SET.has(item.exercise.slug) && freeById.has(item.exerciseId)) {
          used.add(item.exerciseId);
          continue;
        }

        const candidates = freeExercises
          .filter((candidate) => !used.has(candidate.id) || freeExercises.length <= template.exercises.length)
          .sort((a, b) => similarity(item.exercise, b) - similarity(item.exercise, a) || a.name.localeCompare(b.name));
        const replacement = candidates[0] || freeExercises[0];
        replacements.push({ item, replacement });
        used.add(replacement.id);
      }
    }

    if (!replacements.length) continue;

    await prisma.$transaction(async (tx) => {
      for (const { item, replacement } of replacements) {
        await tx.workoutExercise.update({
          where: { id: item.id },
          data: {
            exerciseId: replacement.id,
            loadIncrement: null,
            targetWeight: null,
            notes: `Adattato al catalogo free: ${replacement.name}.`,
          },
        });
      }
      await tx.workoutPlan.update({ where: { id: plan.id }, data: { version: { increment: 1 } } });
    });

    adaptedPlans += 1;
    adaptedExercises += replacements.length;
    console.log(`Adattato: ${plan.name} (${replacements.length} esercizi)`);
  }

  console.log(`Completato: ${adaptedPlans} programmi, ${adaptedExercises} sostituzioni.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
