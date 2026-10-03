import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { FREE_EXERCISE_SLUGS } from "./free-exercise-catalog.mjs";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const exerciseNames = {
  "ab-wheel-rollout": "Ab Wheel Rollout",
  "barbell-reverse-lunge": "Barbell Reverse Lunge",
  "bench-leg-pull-in": "Bench Leg Pull-In",
  "bent-over-db-row": "Bent Over Dumbbell Row",
  "bicep-curl": "Bicep Curl",
  "cat-cow": "Cat Cow",
  "decline-db-fly": "Decline Dumbbell Fly",
  "ez-bar-upright-row": "EZ Bar Upright Row",
  "front-squat": "Front Squat",
  "incline-db-curl": "Incline Dumbbell Curl",
  "kneeling-cable-row": "Kneeling Cable Row",
  "machine-chest-fly": "Machine Chest Fly",
  "mountain-climbers": "Mountain Climbers",
  "one-arm-kettlebell-row": "One Arm Kettlebell Row",
  "pull-up": "Pull-Up",
  "reverse-grip-lat-pulldown": "Reverse Grip Lat Pulldown",
  "rowing-machine": "Rowing Machine",
  running: "Running",
  "side-lying-lateral-raise": "Side-Lying Lateral Raise",
  "single-arm-tricep-pushdown": "Single Arm Tricep Pushdown",
  "smith-machine-front-squat": "Smith Machine Front Squat",
  thruster: "Thruster",
};

for (const slug of FREE_EXERCISE_SLUGS) {
  await prisma.exercise.upsert({
    where: { slug },
    update: { isActive: true, name: exerciseNames[slug] ?? slug },
    create: {
      name: exerciseNames[slug] ?? slug,
      slug,
      category: "STRENGTH",
      primaryMuscles: "[]",
      secondaryMuscles: "[]",
      equipment: "[]",
      instructionsJson: "[]",
      cuesJson: "[]",
      isActive: true,
    },
  });
}

await prisma.exercise.updateMany({
  where: { slug: { notIn: FREE_EXERCISE_SLUGS } },
  data: { isActive: false },
});

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (Boolean(adminEmail) !== Boolean(adminPassword)) {
  throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the admin account.");
}

if (adminEmail && adminPassword) {
  if (adminPassword.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    if (process.env.NODE_ENV === "production") {
      if (existing.role !== "ADMIN" && existing.role !== "SUPER_ADMIN") {
        throw new Error("ADMIN_EMAIL already belongs to a non-admin user; refusing to change its role in production.");
      }
      console.log(`Admin account ${adminEmail} already exists; credentials were left unchanged.`);
    } else {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN", passwordHash: hashPassword(adminPassword) } });
      console.log(`Promoted ${adminEmail} to ADMIN and reset its development password.`);
    }
  } else {
    await prisma.user.create({ data: { email: adminEmail, passwordHash: hashPassword(adminPassword), role: "ADMIN", profile: { create: { firstName: "Admin" } }, notificationPrefs: { create: {} } } });
    console.log(`Created ADMIN account: ${adminEmail}`);
  }
} else {
  console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipped admin bootstrap.");
}

if (process.env.NODE_ENV !== "production") {
  const demoEmail = process.env.DEMO_EMAIL?.trim().toLowerCase();
  const demoPassword = process.env.DEMO_PASSWORD;
  if (demoEmail && demoPassword) {
    if (demoPassword.length < 12) throw new Error("DEMO_PASSWORD must be at least 12 characters.");
    const existingDemo = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (existingDemo) {
      await prisma.user.update({ where: { id: existingDemo.id }, data: { role: "USER", passwordHash: hashPassword(demoPassword) } });
      console.log(`Ready development USER account: ${demoEmail}`);
    } else {
      await prisma.user.create({
        data: {
          email: demoEmail,
          passwordHash: hashPassword(demoPassword),
          role: "USER",
          profile: { create: { firstName: "Demo", trainingDays: 3, sessionMinutes: 60, experience: "BEGINNER" } },
          notificationPrefs: { create: {} },
        },
      });
      console.log(`Created development USER account: ${demoEmail}`);
    }
  } else if (demoEmail || demoPassword) {
    throw new Error("Set both DEMO_EMAIL and DEMO_PASSWORD to create a development demo account.");
  } else {
    console.log("DEMO_EMAIL/DEMO_PASSWORD not set; skipped demo user account.");
  }
} else {
  console.log("Production mode: skipped the demo user account.");
}

console.log(`Seeded only ${FREE_EXERCISE_SLUGS.length} supplied exercises.`);
await prisma.$disconnect();
