import { PrismaClient } from "@prisma/client";
import { FREE_EXERCISE_SET } from "./free-exercise-catalog.mjs";

const prisma = new PrismaClient();

const entry = (slug, sets, repMin, repMax, restSeconds = 90, loadIncrement = null) => ({ slug, sets, repMin, repMax, restSeconds, loadIncrement });

const programs = [
  {
    name: "Full body essenziale · 2 giorni (base)",
    days: [
      { name: "Total body A", estimatedMins: 50, exercises: [entry("front-squat", 3, 6, 10, 120, 2.5), entry("decline-db-fly", 3, 8, 12), entry("kneeling-cable-row", 3, 8, 12), entry("barbell-reverse-lunge", 2, 8, 12, 90, 2.5), entry("ab-wheel-rollout", 2, 6, 12, 60)] },
      { name: "Total body B", estimatedMins: 50, exercises: [entry("smith-machine-front-squat", 3, 8, 12, 120), entry("machine-chest-fly", 3, 8, 12, 90), entry("reverse-grip-lat-pulldown", 3, 8, 12, 90), entry("bent-over-db-row", 3, 8, 12, 90), entry("bicep-curl", 2, 10, 15, 60)] },
    ],
  },
  {
    name: "Full body · 3 giorni (base)",
    days: [
      { name: "Total body A", estimatedMins: 55, exercises: [entry("front-squat", 3, 6, 10, 120, 2.5), entry("decline-db-fly", 3, 8, 12), entry("kneeling-cable-row", 3, 8, 12), entry("single-arm-tricep-pushdown", 2, 10, 15, 60)] },
      { name: "Total body B", estimatedMins: 55, exercises: [entry("smith-machine-front-squat", 3, 8, 12, 120), entry("ez-bar-upright-row", 3, 8, 12, 90), entry("pull-up", 3, 5, 10, 90), entry("one-arm-kettlebell-row", 3, 8, 12, 90), entry("mountain-climbers", 3, 20, 40, 60)] },
      { name: "Total body C", estimatedMins: 55, exercises: [entry("barbell-reverse-lunge", 3, 8, 12, 90), entry("machine-chest-fly", 3, 8, 12, 90), entry("reverse-grip-lat-pulldown", 3, 8, 12, 90), entry("incline-db-curl", 2, 10, 15, 60), entry("side-lying-lateral-raise", 2, 12, 15, 60)] },
    ],
  },
  {
    name: "Upper / Lower · 4 giorni (intermedio)",
    days: [
      { name: "Upper A", estimatedMins: 55, exercises: [entry("decline-db-fly", 4, 8, 12, 90), entry("reverse-grip-lat-pulldown", 3, 8, 12), entry("kneeling-cable-row", 3, 8, 12), entry("side-lying-lateral-raise", 3, 12, 15, 60), entry("bicep-curl", 2, 10, 15, 60), entry("single-arm-tricep-pushdown", 2, 10, 15, 60)] },
      { name: "Lower A", estimatedMins: 55, exercises: [entry("front-squat", 4, 6, 10, 150), entry("barbell-reverse-lunge", 3, 8, 12, 120), entry("smith-machine-front-squat", 3, 10, 12, 120), entry("bench-leg-pull-in", 3, 10, 15, 75)] },
      { name: "Upper B", estimatedMins: 55, exercises: [entry("machine-chest-fly", 3, 8, 12, 90), entry("bent-over-db-row", 4, 8, 12, 90), entry("ez-bar-upright-row", 3, 8, 12, 90), entry("incline-db-curl", 2, 10, 15, 60), entry("single-arm-tricep-pushdown", 2, 10, 15, 60)] },
      { name: "Lower B", estimatedMins: 55, exercises: [entry("smith-machine-front-squat", 3, 8, 12, 120), entry("one-arm-kettlebell-row", 3, 8, 12, 90), entry("barbell-reverse-lunge", 3, 8, 12, 90), entry("mountain-climbers", 3, 20, 40, 60)] },
    ],
  },
  {
    name: "Spinta / Trazione / Gambe · 3 giorni (intermedio)",
    days: [
      { name: "Spinta", estimatedMins: 55, exercises: [entry("decline-db-fly", 4, 8, 12, 90), entry("machine-chest-fly", 3, 8, 12, 90), entry("ez-bar-upright-row", 3, 8, 12, 90), entry("side-lying-lateral-raise", 3, 12, 15, 60), entry("single-arm-tricep-pushdown", 3, 10, 15, 60)] },
      { name: "Trazione", estimatedMins: 55, exercises: [entry("pull-up", 4, 5, 10, 90), entry("reverse-grip-lat-pulldown", 3, 8, 12, 90), entry("kneeling-cable-row", 3, 8, 12, 90), entry("bent-over-db-row", 3, 8, 12, 90), entry("incline-db-curl", 3, 10, 15, 60)] },
      { name: "Gambe", estimatedMins: 60, exercises: [entry("front-squat", 4, 6, 10, 150), entry("barbell-reverse-lunge", 3, 8, 12, 120), entry("smith-machine-front-squat", 3, 8, 12, 120), entry("bench-leg-pull-in", 3, 10, 15, 60)] },
    ],
  },
  {
    name: "Condizionamento · 3 giorni (base)",
    days: [
      { name: "Engine A", estimatedMins: 40, exercises: [entry("rowing-machine", 4, 3, 5, 90), entry("mountain-climbers", 4, 20, 40, 45), entry("thruster", 3, 8, 12, 90), entry("cat-cow", 2, 8, 12, 30)] },
      { name: "Engine B", estimatedMins: 40, exercises: [entry("running", 1, 15, 30, 60), entry("thruster", 3, 8, 12, 90), entry("mountain-climbers", 4, 20, 40, 45), entry("ab-wheel-rollout", 2, 6, 12, 60)] },
      { name: "Engine C", estimatedMins: 40, exercises: [entry("rowing-machine", 4, 3, 5, 90), entry("running", 1, 10, 20, 60), entry("cat-cow", 2, 8, 12, 30), entry("bench-leg-pull-in", 3, 10, 15, 60)] },
    ],
  },
];

try {
  const exercises = await prisma.exercise.findMany({ where: { isActive: true, slug: { in: [...FREE_EXERCISE_SET] } }, select: { id: true, slug: true } });
  const exerciseIds = new Map(exercises.map(item => [item.slug, item.id]));

  for (const program of programs) {
    const usedSlugs = program.days.flatMap(day => day.exercises.map(item => item.slug));
    const missing = [...new Set(usedSlugs)].filter(slug => !FREE_EXERCISE_SET.has(slug) || !exerciseIds.has(slug));
    if (missing.length) throw new Error(`Cannot sync ${program.name}; unsupported/missing exercises: ${missing.join(", ")}`);

    const existing = await prisma.workoutPlan.findFirst({ where: { name: program.name, userId: null, isTemplate: true }, select: { id: true } });
    if (existing) {
      await prisma.workoutTemplate.deleteMany({ where: { workoutPlanId: existing.id } });
      await prisma.workoutPlan.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          version: { increment: 1 },
          templates: {
            create: program.days.map((day, dayIndex) => ({
              dayNumber: dayIndex + 1,
              name: day.name,
              estimatedMins: day.estimatedMins,
              exercises: { create: day.exercises.map((item, orderIndex) => ({ exerciseId: exerciseIds.get(item.slug), orderIndex, sets: item.sets, repMin: item.repMin, repMax: item.repMax, rirTarget: 2, restSeconds: item.restSeconds, progressionType: "DOUBLE_PROGRESSION", loadIncrement: item.loadIncrement })) },
            })),
          },
        },
      });
      console.log(`Synced existing program: ${program.name}`);
      continue;
    }

    await prisma.workoutPlan.create({
      data: {
        name: program.name,
        isTemplate: true,
        isActive: false,
        templates: { create: program.days.map((day, dayIndex) => ({ dayNumber: dayIndex + 1, name: day.name, estimatedMins: day.estimatedMins, exercises: { create: day.exercises.map((item, orderIndex) => ({ exerciseId: exerciseIds.get(item.slug), orderIndex, sets: item.sets, repMin: item.repMin, repMax: item.repMax, rirTarget: 2, restSeconds: item.restSeconds, progressionType: "DOUBLE_PROGRESSION", loadIncrement: item.loadIncrement })) } })) },
      },
    });
    console.log(`Created initial program: ${program.name}`);
  }
} finally {
  await prisma.$disconnect();
}
