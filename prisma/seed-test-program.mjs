import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const programName = "TEST · 4 GIORNI · SETTIMANA COMPLETA";

const bench = await prisma.exercise.upsert({
  where: { slug: "bench-press" },
  update: { name: "Bench Press", category: "CHEST", primaryMuscles: "CHEST · TRICEPS", isActive: true },
  create: {
    name: "Bench Press",
    slug: "bench-press",
    category: "CHEST",
    primaryMuscles: "CHEST · TRICEPS",
    equipment: JSON.stringify(["BARBELL", "BENCH"]),
    difficulty: "BEGINNER",
    instructionsJson: JSON.stringify(["Set your shoulders before unracking.", "Lower the bar with control.", "Press evenly."]),
    cuesJson: JSON.stringify(["Keep shoulder blades set", "Control the descent", "Drive evenly"]),
  },
});

const run = await prisma.exercise.upsert({
  where: { slug: "treadmill-run" },
  update: { name: "Treadmill Run", category: "CARDIO", primaryMuscles: "CARDIO · LEGS", isActive: true },
  create: {
    name: "Treadmill Run",
    slug: "treadmill-run",
    category: "CARDIO",
    primaryMuscles: "CARDIO · LEGS",
    equipment: JSON.stringify(["TREADMILL"]),
    difficulty: "BEGINNER",
    instructionsJson: JSON.stringify(["Start at an easy pace.", "Keep your posture tall.", "Increase pace gradually."]),
    cuesJson: JSON.stringify(["Relax your shoulders", "Keep a steady rhythm", "Build pace progressively"]),
  },
});

const squat = await prisma.exercise.findUniqueOrThrow({ where: { slug: "barbell-squat" } });
const core = await prisma.exercise.findUniqueOrThrow({ where: { slug: "core-finisher" } });

let plan = await prisma.workoutPlan.findFirst({ where: { name: programName, isTemplate: true } });
if (plan) {
  await prisma.workoutPlan.delete({ where: { id: plan.id } });
}

plan = await prisma.workoutPlan.create({
  data: {
    name: programName,
    version: 1,
    isActive: true,
    isTemplate: true,
    templates: {
      create: [
        { dayNumber: 1, name: "Gambe", estimatedMins: 50, exercises: { create: [{ exerciseId: squat.id, orderIndex: 0, sets: 4, repMin: 6, repMax: 10, rirTarget: 2, restSeconds: 150, loadIncrement: 2.5 }] } },
        { dayNumber: 2, name: "Petto", estimatedMins: 45, exercises: { create: [{ exerciseId: bench.id, orderIndex: 0, sets: 4, repMin: 6, repMax: 10, rirTarget: 2, restSeconds: 150, loadIncrement: 2.5 }] } },
        { dayNumber: 3, name: "Addome", estimatedMins: 25, exercises: { create: [{ exerciseId: core.id, orderIndex: 0, sets: 4, repMin: 10, repMax: 15, rirTarget: 2, restSeconds: 60 }] } },
        { dayNumber: 4, name: "Corsa", estimatedMins: 35, exercises: { create: [{ exerciseId: run.id, orderIndex: 0, sets: 1, repMin: 20, repMax: 30, restSeconds: 0, notes: "Corsa continua: aumenta gradualmente durata o ritmo." }] } },
      ],
    },
  },
  include: { templates: { orderBy: { dayNumber: "asc" } } },
});

console.log(`Created test program: ${plan.name}`);
console.log(`Template days: ${plan.templates.map((day) => `${day.dayNumber}=${day.name}`).join(" | ")}`);
await prisma.$disconnect();
