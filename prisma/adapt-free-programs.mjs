import fs from "node:fs";
import path from "node:path";
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

const weekdaysFor = (count) => ({
  1: [1], 2: [1, 5], 3: [1, 3, 5], 4: [1, 3, 5, 7], 5: [1, 2, 4, 5, 7], 6: [1, 2, 3, 4, 5, 7], 7: [1, 2, 3, 4, 5, 6, 7],
}[Math.max(1, Math.min(count, 7))] || [1, 3, 5]);

function nextMonday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const daysUntilMonday = ((8 - (today.getDay() || 7)) % 7) || 7;
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(12, 0, 0, 0);
  return { today, monday };
}

function assertAnimationFiles() {
  const missing = [...FREE_EXERCISE_SET].filter((slug) => !fs.existsSync(path.resolve(process.cwd(), "public", "animations", `${slug}.webp`)));
  if (missing.length) throw new Error(`Animazioni free mancanti in public/animations: ${missing.join(", ")}`);
}

async function adaptTemplates(freeExercises) {
  const freeById = new Map(freeExercises.map((exercise) => [exercise.id, exercise]));
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
      await tx.workoutPlan.update({ where: { id: plan.id }, data: { version: { increment: 1 }, isActive: true } });
    });
    adaptedPlans += 1;
    adaptedExercises += replacements.length;
    console.log(`Adattato template: ${plan.name} (${replacements.length} esercizi)`);
  }

  await prisma.workoutPlan.updateMany({ where: { isTemplate: true }, data: { isActive: true } });
  return { adaptedPlans, adaptedExercises };
}

async function assertTemplatesAreFree() {
  const remaining = await prisma.workoutExercise.findMany({
    where: { template: { plan: { isTemplate: true } } },
    select: { exercise: { select: { slug: true } } },
  });
  const invalid = [...new Set(remaining.map((item) => item.exercise.slug).filter((slug) => !FREE_EXERCISE_SET.has(slug)))];
  if (invalid.length) throw new Error(`Programmi template non conformi al catalogo free: ${invalid.join(", ")}`);
}

async function assignPlansToUsers() {
  const users = await prisma.user.findMany({
    where: { profile: { isNot: null }, onboarding: { isNot: null } },
    select: { id: true, email: true, profile: { select: { trainingDays: true } } },
    orderBy: { createdAt: "asc" },
  });
  const templates = await prisma.workoutPlan.findMany({
    where: { isTemplate: true, isActive: true },
    include: { templates: { orderBy: { dayNumber: "asc" }, include: { exercises: { orderBy: { orderIndex: "asc" } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const { today, monday } = nextMonday();
  let assigned = 0;
  let skipped = 0;

  for (const user of users) {
    const openSession = await prisma.workoutSession.findFirst({ where: { userId: user.id, completedAt: null }, select: { id: true } });
    if (openSession) {
      skipped += 1;
      console.log(`Saltato ${user.email}: allenamento attivo.`);
      continue;
    }

    const requestedDays = user.profile?.trainingDays ?? 3;
    const source = templates
      .slice()
      .sort((a, b) => Math.abs(a.templates.length - requestedDays) - Math.abs(b.templates.length - requestedDays) || b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    if (!source) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.workoutSchedule.deleteMany({ where: { userId: user.id, scheduledDate: { gte: today }, session: { is: null } } });
      await tx.workoutPlan.updateMany({ where: { userId: user.id, isActive: true, isTemplate: false }, data: { isActive: false } });

      const plan = await tx.workoutPlan.create({
        data: {
          userId: user.id,
          name: source.name,
          version: source.version,
          isActive: true,
          isTemplate: false,
          templates: {
            create: source.templates.map((day) => ({
              dayNumber: day.dayNumber,
              name: day.name,
              estimatedMins: day.estimatedMins,
              exercises: { create: day.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                orderIndex: exercise.orderIndex,
                sets: exercise.sets,
                repMin: exercise.repMin,
                repMax: exercise.repMax,
                rirTarget: exercise.rirTarget,
                restSeconds: exercise.restSeconds,
                setType: exercise.setType,
                progressionType: exercise.progressionType,
                loadIncrement: exercise.loadIncrement,
                tempo: exercise.tempo,
                targetWeight: exercise.targetWeight,
                notes: exercise.notes,
              })) },
            })),
          },
        },
        include: { templates: { orderBy: { dayNumber: "asc" } } },
      });

      const weekdays = weekdaysFor(plan.templates.length);
      const rows = plan.templates.map((template, index) => ({
        userId: user.id,
        workoutPlanId: plan.id,
        templateId: template.id,
        scheduledDate: new Date(monday.getTime() + (weekdays[index] - 1) * 24 * 60 * 60 * 1000),
      }));
      if (rows.length) await tx.workoutSchedule.createMany({ data: rows });
    });

    assigned += 1;
    console.log(`Assegnato a ${user.email}: ${source.name}`);
  }
  return { assigned, skipped };
}

async function main() {
  assertAnimationFiles();
  const freeExercises = await prisma.exercise.findMany({
    where: { isActive: true, slug: { in: [...FREE_EXERCISE_SET] } },
    select: { id: true, slug: true, name: true, category: true, primaryMuscles: true, equipment: true, difficulty: true },
  });
  if (freeExercises.length !== FREE_EXERCISE_SET.size) throw new Error(`Catalogo free incompleto: trovati ${freeExercises.length}/${FREE_EXERCISE_SET.size} esercizi.`);

  const adapted = await adaptTemplates(freeExercises);
  await assertTemplatesAreFree();
  const assignment = await assignPlansToUsers();
  console.log(`Completato: ${adapted.adaptedPlans} programmi adattati, ${adapted.adaptedExercises} sostituzioni, ${assignment.assigned} utenti assegnati, ${assignment.skipped} utenti saltati.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
