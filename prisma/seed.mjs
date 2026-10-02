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
  { name: "Romanian Deadlift", slug: "romanian-deadlift", category: "LEGS", primaryMuscles: "HAMSTRINGS · GLUTES", equipment: ["BARBELL"], difficulty: "INTERMEDIATE", instructions: ["Keep the bar close to your legs.", "Push your hips back while keeping a comfortable spine position.", "Stop the descent when your hamstrings limit further motion."], cues: ["Hips back", "Bar close", "Move with control"] },
  { name: "Leg Press", slug: "leg-press", category: "LEGS", primaryMuscles: "QUADS · GLUTES", equipment: ["MACHINE"], difficulty: "BEGINNER", instructions: ["Set the seat so you can move comfortably.", "Lower the platform under control without forcing depth.", "Press through the whole foot without locking your knees."], cues: ["Comfortable range", "Whole foot on platform", "Controlled reps"] },
  { name: "Leg Curl", slug: "leg-curl", category: "LEGS", primaryMuscles: "HAMSTRINGS", equipment: ["MACHINE"], difficulty: "BEGINNER", instructions: ["Align the machine pivot with your knee.", "Curl smoothly without lifting your hips.", "Return the weight slowly."], cues: ["Keep hips supported", "Smooth curl", "Slow return"] },
  { name: "Leg Extension", slug: "leg-extension", category: "LEGS", primaryMuscles: "QUADS", equipment: ["MACHINE"], difficulty: "BEGINNER", instructions: ["Align the machine pivot with your knee.", "Extend within a comfortable range.", "Lower the pad without letting the stack drop."], cues: ["Sit tall", "Move smoothly", "Control the return"] },
  { name: "Hip Thrust", slug: "hip-thrust", category: "LEGS", primaryMuscles: "GLUTES", equipment: ["BARBELL", "MACHINE"], difficulty: "INTERMEDIATE", instructions: ["Brace before lifting.", "Drive through your feet and lift your hips without overextending your back.", "Lower under control."], cues: ["Ribs down", "Drive through feet", "Finish with control"] },
  { name: "Dumbbell Bench Press", slug: "dumbbell-bench-press", category: "CHEST", primaryMuscles: "CHEST · TRICEPS", equipment: ["DUMBBELLS", "BENCH"], difficulty: "BEGINNER", instructions: ["Set your feet and shoulders comfortably.", "Lower the dumbbells with control.", "Press up without forcing your shoulders."], cues: ["Stable feet", "Comfortable depth", "Smooth press"] },
  { name: "Incline Dumbbell Press", slug: "incline-dumbbell-press", category: "CHEST", primaryMuscles: "CHEST · SHOULDERS", equipment: ["DUMBBELLS", "BENCH"], difficulty: "INTERMEDIATE", instructions: ["Use a moderate bench angle.", "Lower the dumbbells toward your upper chest.", "Press smoothly while keeping your shoulders comfortable."], cues: ["Moderate incline", "Wrists stacked", "Controlled range"] },
  { name: "Seated Cable Row", slug: "seated-cable-row", category: "BACK", primaryMuscles: "BACK · BICEPS", equipment: ["CABLE"], difficulty: "BEGINNER", instructions: ["Sit tall with a stable torso.", "Pull toward your midsection without leaning back.", "Extend your arms slowly to return."], cues: ["Torso steady", "Elbows back", "Slow return"] },
  { name: "Chest-Supported Row", slug: "chest-supported-row", category: "BACK", primaryMuscles: "BACK · BICEPS", equipment: ["DUMBBELLS", "MACHINE"], difficulty: "BEGINNER", instructions: ["Keep your chest supported on the bench or pad.", "Row without shrugging your shoulders.", "Lower the weights under control."], cues: ["Chest supported", "Lead with elbows", "No swinging"] },
  { name: "Lateral Raise", slug: "lateral-raise", category: "SHOULDERS", primaryMuscles: "SHOULDERS", equipment: ["DUMBBELLS", "CABLE"], difficulty: "BEGINNER", instructions: ["Use a light load you can control.", "Raise your arms within a comfortable range.", "Lower slowly without swinging."], cues: ["Light and controlled", "No momentum", "Comfortable range"] },
  { name: "Cable Triceps Pushdown", slug: "cable-triceps-pushdown", category: "ARMS", primaryMuscles: "TRICEPS", equipment: ["CABLE"], difficulty: "BEGINNER", instructions: ["Keep your elbows close to your sides.", "Extend your arms smoothly.", "Return the handle without moving your shoulders."], cues: ["Elbows steady", "Smooth extension", "Slow return"] },
  { name: "Dumbbell Curl", slug: "dumbbell-curl", category: "ARMS", primaryMuscles: "BICEPS", equipment: ["DUMBBELLS"], difficulty: "BEGINNER", instructions: ["Stand with your torso steady.", "Curl without swinging your elbows forward.", "Lower the weights slowly."], cues: ["No swinging", "Keep elbows close", "Control the lowering"] },
  { name: "Plank", slug: "plank", category: "CORE", primaryMuscles: "ABS · CORE", equipment: ["BODYWEIGHT"], difficulty: "BEGINNER", instructions: ["Keep your body in a comfortable straight line.", "Brace gently and keep breathing.", "Stop when you can no longer hold position comfortably."], cues: ["Breathe", "Brace gently", "Stop before form breaks"] },
  { name: "Split Squat", slug: "split-squat", category: "LEGS", primaryMuscles: "QUADS · GLUTES", equipment: ["DUMBBELLS", "BODYWEIGHT"], difficulty: "INTERMEDIATE", instructions: ["Choose a stance that feels stable.", "Lower within a comfortable range.", "Push through the front foot to stand."], cues: ["Stable stance", "Control the descent", "Use a comfortable depth"] },
  { name: "Standing Calf Raise", slug: "standing-calf-raise", category: "LEGS", primaryMuscles: "CALVES", equipment: ["MACHINE", "BODYWEIGHT"], difficulty: "BEGINNER", instructions: ["Stand securely with a comfortable range of motion.", "Rise smoothly onto your toes.", "Lower your heels under control."], cues: ["Steady balance", "Smooth lift", "Controlled lowering"] },
];

for (const item of exercises) {
  await prisma.exercise.upsert({
    where: { slug: item.slug },
    // Keep exercise edits and activation state managed by admins on reseed.
    update: {},
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

console.log(`Seeded ${exercises.length} exercises.`);
await prisma.$disconnect();
