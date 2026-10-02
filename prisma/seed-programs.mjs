import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const entry = (slug, sets, repMin, repMax, restSeconds = 90, loadIncrement = null) => ({ slug, sets, repMin, repMax, restSeconds, loadIncrement });
const programs = [
  {
    name: "Full body essenziale · 2 giorni (base)",
    days: [
      { name: "Total body A", estimatedMins: 50, exercises: [entry("barbell-squat", 3, 6, 10, 120, 2.5), entry("bench-press", 3, 6, 10, 120, 2.5), entry("seated-cable-row", 3, 8, 12), entry("romanian-deadlift", 2, 8, 10, 120, 2.5), entry("plank", 3, 10, 15, 60)] },
      { name: "Total body B", estimatedMins: 50, exercises: [entry("leg-press", 3, 8, 12, 120), entry("dumbbell-bench-press", 3, 8, 12, 90), entry("lat-pulldown", 3, 8, 12, 90), entry("hip-thrust", 3, 8, 12, 120), entry("dumbbell-curl", 2, 10, 15, 60)] },
    ],
  },
  {
    name: "Full body · 3 giorni (base)",
    days: [
      { name: "Total body A", estimatedMins: 55, exercises: [entry("barbell-squat", 3, 6, 10, 120, 2.5), entry("bench-press", 3, 6, 10, 120, 2.5), entry("seated-cable-row", 3, 8, 12), entry("hip-thrust", 2, 8, 12), entry("cable-triceps-pushdown", 2, 10, 15, 60)] },
      { name: "Total body B", estimatedMins: 55, exercises: [entry("leg-press", 3, 8, 12, 120), entry("shoulder-press", 3, 8, 12, 90), entry("lat-pulldown", 3, 8, 12, 90), entry("romanian-deadlift", 3, 8, 10, 120), entry("plank", 3, 10, 15, 60)] },
      { name: "Total body C", estimatedMins: 55, exercises: [entry("split-squat", 3, 8, 12, 90), entry("dumbbell-bench-press", 3, 8, 12, 90), entry("chest-supported-row", 3, 8, 12, 90), entry("leg-curl", 2, 10, 15, 60), entry("lateral-raise", 2, 12, 15, 60)] },
    ],
  },
  {
    name: "Upper / Lower · 4 giorni (intermedio)",
    days: [
      { name: "Upper A", estimatedMins: 55, exercises: [entry("bench-press", 4, 6, 10, 120, 2.5), entry("lat-pulldown", 3, 8, 12, 90), entry("seated-cable-row", 3, 8, 12, 90), entry("lateral-raise", 3, 12, 15, 60), entry("dumbbell-curl", 2, 10, 15, 60), entry("cable-triceps-pushdown", 2, 10, 15, 60)] },
      { name: "Lower A", estimatedMins: 55, exercises: [entry("barbell-squat", 4, 6, 10, 150), entry("romanian-deadlift", 3, 8, 10, 120), entry("leg-press", 3, 10, 12, 120), entry("leg-curl", 3, 10, 15, 75), entry("standing-calf-raise", 3, 10, 15, 60)] },
      { name: "Upper B", estimatedMins: 55, exercises: [entry("dumbbell-bench-press", 3, 8, 12, 90), entry("chest-supported-row", 4, 8, 12, 90), entry("shoulder-press", 3, 8, 12, 90), entry("incline-dumbbell-press", 2, 8, 12, 90), entry("dumbbell-curl", 2, 10, 15, 60), entry("cable-triceps-pushdown", 2, 10, 15, 60)] },
      { name: "Lower B", estimatedMins: 55, exercises: [entry("split-squat", 3, 8, 12, 90), entry("hip-thrust", 3, 8, 12, 120), entry("leg-extension", 3, 10, 15, 75), entry("leg-curl", 3, 10, 15, 75), entry("standing-calf-raise", 3, 10, 15, 60)] },
    ],
  },
  {
    name: "Spinta / Trazione / Gambe · 3 giorni (intermedio)",
    days: [
      { name: "Spinta", estimatedMins: 55, exercises: [entry("bench-press", 4, 6, 10, 120, 2.5), entry("incline-dumbbell-press", 3, 8, 12, 90), entry("shoulder-press", 3, 8, 12, 90), entry("lateral-raise", 3, 12, 15, 60), entry("cable-triceps-pushdown", 3, 10, 15, 60)] },
      { name: "Trazione", estimatedMins: 55, exercises: [entry("lat-pulldown", 4, 8, 12, 90), entry("seated-cable-row", 3, 8, 12, 90), entry("chest-supported-row", 3, 8, 12, 90), entry("dumbbell-curl", 3, 10, 15, 60), entry("core-finisher", 3, 10, 15, 60)] },
      { name: "Gambe", estimatedMins: 60, exercises: [entry("barbell-squat", 4, 6, 10, 150), entry("romanian-deadlift", 3, 8, 10, 120), entry("leg-press", 3, 8, 12, 120), entry("leg-curl", 3, 10, 15, 75), entry("standing-calf-raise", 3, 10, 15, 60)] },
    ],
  },
];

try {
  const exercises = await prisma.exercise.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
  const exerciseIds = new Map(exercises.map(item => [item.slug, item.id]));

  for (const program of programs) {
    const existing = await prisma.workoutPlan.findFirst({ where: { name: program.name, userId: null, isTemplate: true }, select: { id: true } });
    if (existing) {
      console.log(`Kept existing program (admin edits preserved): ${program.name}`);
      continue;
    }

    const missing = program.days.flatMap(day => day.exercises.map(item => item.slug)).filter(slug => !exerciseIds.has(slug));
    if (missing.length) throw new Error(`Cannot seed ${program.name}; missing exercises: ${[...new Set(missing)].join(", ")}`);

    await prisma.workoutPlan.create({
      data: {
        name: program.name,
        isTemplate: true,
        isActive: false,
        templates: {
          create: program.days.map((day, dayIndex) => ({
            dayNumber: dayIndex + 1,
            name: day.name,
            estimatedMins: day.estimatedMins,
            exercises: {
              create: day.exercises.map((item, orderIndex) => ({
                exerciseId: exerciseIds.get(item.slug),
                orderIndex,
                sets: item.sets,
                repMin: item.repMin,
                repMax: item.repMax,
                rirTarget: 2,
                restSeconds: item.restSeconds,
                progressionType: "DOUBLE_PROGRESSION",
                loadIncrement: item.loadIncrement,
              })),
            },
          })),
        },
      },
    });
    console.log(`Created initial program: ${program.name}`);
  }
} finally {
  await prisma.$disconnect();
}
