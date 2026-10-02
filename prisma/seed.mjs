import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const exercises = [
  { name: "Barbell Squat", slug: "barbell-squat", category: "LEGS", primaryMuscles: "QUADS · GLUTES", equipment: ["BARBELL", "RACK"], difficulty: "BEGINNER", instructions: ["Brace your core before descending.", "Keep your knees tracking over your toes.", "Drive through the floor and finish tall."], cues: ["Brace before every rep", "Keep your heels planted", "Control the descent"] },
  { name: "Lat Pulldown", slug: "lat-pulldown", category: "BACK", primaryMuscles: "LATS · BICEPS", equipment: ["CABLE", "MACHINE"], difficulty: "BEGINNER", instructions: ["Keep your chest lifted.", "Pull the bar toward your upper chest.", "Control the return without swinging."], cues: ["Lead with your elbows", "Avoid swinging", "Pause at the bottom"] },
  { name: "Shoulder Press", slug: "shoulder-press", category: "SHOULDERS", primaryMuscles: "SHOULDERS · TRICEPS", equipment: ["DUMBBELLS"], difficulty: "BEGINNER", instructions: ["Keep your ribs controlled.", "Press vertically without shrugging.", "Lower the weight under control."], cues: ["Keep your core tight", "Do not overextend your back", "Use controlled reps"] },
  { name: "Cable Curl", slug: "cable-curl", category: "ARMS", primaryMuscles: "BICEPS", equipment: ["CABLE"], difficulty: "BEGINNER", instructions: ["Keep your elbows close to your sides.", "Curl without moving your shoulders.", "Squeeze at the top and lower slowly."], cues: ["Keep elbows fixed", "Squeeze at the top", "Lower slowly"] },
  { name: "Core Finisher", slug: "core-finisher", category: "CORE", primaryMuscles: "ABS · CORE", equipment: ["BODYWEIGHT"], difficulty: "BEGINNER", instructions: ["Keep your lower back controlled.", "Move slowly through the full range.", "Breathe continuously throughout the set."], cues: ["Control every rep", "Keep your core braced", "Breathe continuously"] },
];

for (const item of exercises) {
  await prisma.exercise.upsert({
    where: { slug: item.slug },
    update: {
      name: item.name,
      category: item.category,
      primaryMuscles: item.primaryMuscles,
      equipment: JSON.stringify(item.equipment),
      difficulty: item.difficulty,
      instructionsJson: JSON.stringify(item.instructions),
      cuesJson: JSON.stringify(item.cues),
      isActive: true,
    },
    create: {
      name: item.name,
      slug: item.slug,
      category: item.category,
      primaryMuscles: item.primaryMuscles,
      equipment: JSON.stringify(item.equipment),
      difficulty: item.difficulty,
      instructionsJson: JSON.stringify(item.instructions),
      cuesJson: JSON.stringify(item.cues),
    },
  });
}

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  if (adminPassword.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  const passwordHash = hashPassword(adminPassword);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN", passwordHash } });
    console.log(`Promoted ${adminEmail} to ADMIN and reset its development password.`);
  } else {
    await prisma.user.create({ data: { email: adminEmail, passwordHash, role: "ADMIN", profile: { create: { firstName: "Admin" } }, notificationPrefs: { create: {} } } });
    console.log(`Created development ADMIN account: ${adminEmail}`);
  }
} else {
  console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipped admin bootstrap.");
}

const demoEmail = "atleta@test.it";
const demoPassword = "atleta123456";
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
      profile: { create: { firstName: "Alessandro", trainingDays: 3, sessionMinutes: 60, experience: "BEGINNER" } },
      notificationPrefs: { create: {} },
    },
  });
  console.log(`Created development USER account: ${demoEmail}`);
}

console.log(`Seeded ${exercises.length} exercises.`);
await prisma.$disconnect();
