import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dataUrl = "https://raw.githubusercontent.com/RepDB/exercise-dataset/9ed9357f09c7566ea0256c57ebd6374ebb8b575e/exercises.json";
const imageBase = "https://exercise-dataset.com/";
const localSlugAliases = {
  squat: "barbell-squat",
  ohp: "shoulder-press",
  "db-bench-press": "dumbbell-bench-press",
};

function list(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === "string");
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function slugify(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function isJsonArray(value) {
  try { return Array.isArray(JSON.parse(value)); } catch { return false; }
}

async function main() {
  const response = await fetch(dataUrl, { headers: { "User-Agent": "GymProgress-ExerciseCatalog/1.0" } });
  if (!response.ok) throw new Error(`RepDB catalog download failed (${response.status}).`);
  const dataset = await response.json();
  if (!Array.isArray(dataset.exercises) || dataset.exercises.length < 100) {
    throw new Error("RepDB returned an unexpected catalog; no records were imported.");
  }

  let imported = 0;
  let mediaCount = 0;
  for (const item of dataset.exercises) {
    if (typeof item.id !== "string" || typeof item.name_en !== "string") continue;
    const slug = localSlugAliases[item.id] ?? item.id;
    const equipment = list(item.equipment).map(slugify);
    if (item.is_bodyweight && !equipment.includes("BODYWEIGHT")) equipment.push("BODYWEIGHT");
    const instructions = list(item.instructions_en);
    const tips = list(item.tips_en);
    const difficulty = ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(String(item.difficulty).toUpperCase())
      ? String(item.difficulty).toUpperCase()
      : "BEGINNER";
    const primaryMuscles = list(item.primary_muscles).map(slugify);
    if (!primaryMuscles.length && item.body_part) primaryMuscles.push(slugify(String(item.body_part)));
    const primaryMusclesJson = JSON.stringify(primaryMuscles);
    const secondaryMusclesJson = JSON.stringify(list(item.secondary_muscles).map(slugify));
    const equipmentJson = JSON.stringify(equipment);

    const existing = await prisma.exercise.findUnique({ where: { slug }, select: { id: true, primaryMuscles: true } });
    const exercise = await prisma.exercise.upsert({
      where: { slug },
      // Re-running the import must not overwrite exercise edits made by an admin.
      update: !existing || isJsonArray(existing.primaryMuscles) ? {} : { primaryMuscles: primaryMusclesJson, secondaryMuscles: secondaryMusclesJson, equipment: equipmentJson },
      create: {
        name: item.name_en,
        slug,
        category: String(item.category ?? "STRENGTH").toUpperCase(),
        primaryMuscles: primaryMusclesJson,
        secondaryMuscles: secondaryMusclesJson,
        equipment: equipmentJson,
        difficulty,
        instructionsJson: JSON.stringify(instructions),
        cuesJson: JSON.stringify(tips),
      },
      select: { id: true },
    });
    imported += 1;

    const poses = item.images?.flat ?? {};
    const imagePaths = [...new Set([poses.start, poses.peak, poses.main].filter(path => typeof path === "string" && path.startsWith("images/")))];
    for (const imagePath of imagePaths) {
      const url = new URL(imagePath, imageBase).toString();
      const existingMedia = await prisma.exerciseMedia.findFirst({ where: { exerciseId: exercise.id, sourceName: "RepDB", url }, select: { id: true } });
      if (existingMedia) continue;
      const hasCustomPrimary = await prisma.exerciseMedia.findFirst({ where: { exerciseId: exercise.id, isPrimary: true, sourceName: { not: "RepDB" } }, select: { id: true } });
      const hasAnyPrimary = hasCustomPrimary || await prisma.exerciseMedia.findFirst({ where: { exerciseId: exercise.id, isPrimary: true }, select: { id: true } });
      await prisma.exerciseMedia.create({
        data: {
          exerciseId: exercise.id,
          type: "IMAGE",
          url,
          sourceName: "RepDB",
          sourceUrl: `https://exercise-dataset.com/exercise/${item.id}/`,
          license: "RepDB Free Tier License v1.0; in-app use with attribution",
          attribution: "Exercise data by RepDB (repdb.co)",
          isPrimary: !hasAnyPrimary && imagePath === imagePaths[0],
        },
      });
      mediaCount += 1;
    }
  }

  console.log(`Imported ${imported} RepDB exercises and linked ${mediaCount} illustration files.`);
  console.log("The free-tier illustrations are static WebP poses, not animated GIFs.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
