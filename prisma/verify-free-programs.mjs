import { PrismaClient } from "@prisma/client";
import { FREE_EXERCISE_SET } from "./free-exercise-catalog.mjs";

const prisma = new PrismaClient();

async function main() {
  const free = await prisma.exercise.findMany({
    where: { isActive: true, slug: { in: [...FREE_EXERCISE_SET] } },
    select: { id: true, slug: true },
  });
  if (free.length !== FREE_EXERCISE_SET.size) {
    throw new Error(`Catalogo free incompleto: ${free.length}/${FREE_EXERCISE_SET.size}`);
  }

  const templates = await prisma.workoutPlan.findMany({
    where: { isTemplate: true, isActive: true },
    select: {
      id: true,
      name: true,
      templates: {
        select: {
          exercises: { select: { exercise: { select: { slug: true } } } },
        },
      },
    },
  });
  const invalidTemplates = [];
  for (const plan of templates) {
    const invalid = new Set();
    for (const day of plan.templates) {
      for (const item of day.exercises) {
        if (!FREE_EXERCISE_SET.has(item.exercise.slug)) invalid.add(item.exercise.slug);
      }
    }
    if (invalid.size) invalidTemplates.push(`${plan.name}: ${[...invalid].join(", ")}`);
  }
  if (invalidTemplates.length) throw new Error(`Template non free:\n${invalidTemplates.join("\n")}`);

  const activeAssignments = await prisma.workoutPlan.findMany({
    where: { isTemplate: false, isActive: true, userId: { not: null } },
    select: {
      id: true,
      userId: true,
      templates: { select: { exercises: { select: { exercise: { select: { slug: true } } } } } },
    },
  });
  const invalidAssignments = [];
  for (const plan of activeAssignments) {
    for (const day of plan.templates) {
      for (const item of day.exercises) {
        if (!FREE_EXERCISE_SET.has(item.exercise.slug)) invalidAssignments.push(`${plan.id}:${item.exercise.slug}`);
      }
    }
  }
  if (invalidAssignments.length) throw new Error(`Assegnazioni attive non free: ${invalidAssignments.join(", ")}`);

  console.log(`OK: ${free.length} esercizi free, ${templates.length} template verificati, ${activeAssignments.length} piani utente verificati.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
