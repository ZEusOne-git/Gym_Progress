import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: skipped demo workout plans.");
  await prisma.$disconnect();
  process.exit(0);
}
const programName = "TEST · 4 GIORNI · SETTIMANA COMPLETA";
const demoEmail = process.env.DEMO_EMAIL?.trim().toLowerCase();
if (!demoEmail) {
  await prisma.$disconnect();
  throw new Error("Set DEMO_EMAIL to create the optional development test plan.");
}

const exerciseData = [
  ["bench-press", "Bench Press", "CHEST", "CHEST · TRICEPS", ["BARBELL", "BENCH"]],
  ["romanian-deadlift", "Romanian Deadlift", "LEGS", "HAMSTRINGS · GLUTES", ["BARBELL"]],
  ["cable-row", "Cable Row", "BACK", "BACK · BICEPS", ["CABLE"]],
  ["treadmill-run", "Treadmill Run", "CARDIO", "CARDIO · LEGS", ["TREADMILL"]],
];

for (const [slug, name, category, muscles, equipment] of exerciseData) {
  await prisma.exercise.upsert({
    where: { slug },
    update: { name, category, primaryMuscles: muscles, isActive: true },
    create: {
      name,
      slug,
      category,
      primaryMuscles: muscles,
      equipment: JSON.stringify(equipment),
      difficulty: "BEGINNER",
      instructionsJson: JSON.stringify(["Mantieni una tecnica controllata.", "Esegui ogni ripetizione con il range completo.", "Fermati se perdi la tecnica."]),
      cuesJson: JSON.stringify(["Controlla il movimento", "Respira regolarmente", "Mantieni il controllo"]),
    },
  });
}

const exercise = async slug => prisma.exercise.findUniqueOrThrow({ where: { slug } });
const squat = await exercise("barbell-squat");
const bench = await exercise("bench-press");
const rdl = await exercise("romanian-deadlift");
const pulldown = await exercise("lat-pulldown");
const row = await exercise("cable-row");
const shoulder = await exercise("shoulder-press");
const curl = await exercise("cable-curl");
const core = await exercise("core-finisher");
const run = await exercise("treadmill-run");

const days = [
  { dayNumber: 1, name: "Gambe", estimatedMins: 55, weekday: 1, items: [[squat, 4, 6, 10, 150, 60], [rdl, 3, 8, 12, 120, 50], [core, 3, 10, 15, 60, 10]] },
  { dayNumber: 2, name: "Petto e schiena", estimatedMins: 55, weekday: 3, items: [[bench, 4, 6, 10, 150, 40], [pulldown, 3, 8, 12, 120, 35], [row, 3, 8, 12, 90, 35]] },
  { dayNumber: 3, name: "Spalle e braccia", estimatedMins: 45, weekday: 5, items: [[shoulder, 3, 8, 12, 90, 15], [curl, 3, 10, 15, 60, 15], [core, 3, 10, 15, 60, 10]] },
  { dayNumber: 4, name: "Full body + corsa", estimatedMins: 50, weekday: 7, items: [[squat, 3, 8, 12, 120, 50], [bench, 3, 8, 12, 120, 35], [run, 1, 20, 30, 0, 0]] },
];

const oldPlans = await prisma.workoutPlan.findMany({ where: { name: programName } });
for (const old of oldPlans) {
  await prisma.workoutSession.deleteMany({ where: { workoutPlanId: old.id } });
  await prisma.workoutSchedule.deleteMany({ where: { workoutPlanId: old.id } });
  await prisma.workoutPlan.delete({ where: { id: old.id } });
}

await prisma.workoutPlan.create({
  data: {
    name: programName,
    version: 1,
    isActive: true,
    isTemplate: true,
    templates: {
      create: days.map(day => ({
        dayNumber: day.dayNumber,
        name: day.name,
        estimatedMins: day.estimatedMins,
        exercises: {
          create: day.items.map(([item, sets, repMin, repMax, restSeconds, targetWeight], orderIndex) => ({
            exerciseId: item.id,
            orderIndex,
            sets,
            repMin,
            repMax,
            rirTarget: 2,
            restSeconds,
            progressionType: "DOUBLE_PROGRESSION",
            loadIncrement: targetWeight > 0 ? 2.5 : null,
            targetWeight,
          })),
        },
      })),
    },
  },
});

const user = await prisma.user.findUnique({ where: { email: demoEmail }, select: { id: true } });
if (user) {
  await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
  await prisma.workoutSchedule.deleteMany({ where: { userId: user.id } });
  await prisma.workoutPlan.updateMany({ where: { userId: user.id, isTemplate: false }, data: { isActive: false } });

  const personal = await prisma.workoutPlan.create({
    data: {
      userId: user.id,
      name: programName,
      version: 1,
      isActive: true,
      isTemplate: false,
      templates: {
        create: days.map(day => ({
          dayNumber: day.dayNumber,
          name: day.name,
          estimatedMins: day.estimatedMins,
          exercises: {
            create: day.items.map(([item, sets, repMin, repMax, restSeconds, targetWeight], orderIndex) => ({
              exerciseId: item.id,
              orderIndex,
              sets,
              repMin,
              repMax,
              rirTarget: 2,
              restSeconds,
              progressionType: "DOUBLE_PROGRESSION",
              loadIncrement: targetWeight > 0 ? 2.5 : null,
              targetWeight,
            })),
          },
        })),
      },
    },
    include: { templates: { orderBy: { dayNumber: "asc" } } },
  });

  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const monday = new Date(start);
  monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  monday.setHours(12, 0, 0, 0);
  const schedules = [];
  for (let week = 0; week < 12; week++) {
    for (let index = 0; index < personal.templates.length; index++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + week * 7 + (days[index].weekday - 1));
      if (date < start) continue;
      date.setHours(12, 0, 0, 0);
      schedules.push({ userId: user.id, workoutPlanId: personal.id, templateId: personal.templates[index].id, scheduledDate: date });
    }
  }
  await prisma.workoutSchedule.createMany({ data: schedules });
  console.log(`Assigned ${programName} to ${demoEmail}: ${schedules.length} scheduled workouts.`);
}

console.log(`Created ${programName}: 4 training days with ${days.reduce((sum, day) => sum + day.items.length, 0)} exercise slots.`);
await prisma.$disconnect();
