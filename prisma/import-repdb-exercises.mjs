import { PrismaClient } from "@prisma/client";
import { FREE_ANIMATION_MEDIA, FREE_EXERCISE_SET, FREE_EXERCISE_SLUGS } from "./free-exercise-catalog.mjs";

const prisma = new PrismaClient();
const dataUrl = "https://raw.githubusercontent.com/RepDB/exercise-dataset/9ed9357f09c7566ea0256c57ebd6374ebb8b575e/exercises.json";
const imageBase = "https://exercise-dataset.com/";
const localAnimationSource = "Supplied free animation pack";

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

  const sourceBySlug = new Map(dataset.exercises.map(item => [item.id, item]));
  const missing = FREE_EXERCISE_SLUGS.filter(slug => !sourceBySlug.has(slug));
  if (missing.length) {
    throw new Error(`RepDB catalog is missing supplied exercises: ${missing.join(", ")}`);
  }

  // The supplied ZIP is the source of truth for the active catalog. Existing exercises
  // outside that list remain in the database for referential integrity, but are hidden
  // from plan generation and selection.
  await prisma.exercise.updateMany({
    where: { slug: { notIn: FREE_EXERCISE_SLUGS } },
    data: { isActive: false },
  });

  let imported = 0;
  let mediaCount = 0;
  for (const slug of FREE_EXERCISE_SLUGS) {
    const item = sourceBySlug.get(slug);
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
      update: {
        isActive: true,
        ...(!existing || isJsonArray(existing.primaryMuscles)
          ? {}
          : { primaryMuscles: primaryMusclesJson, secondaryMuscles: secondaryMusclesJson, equipment: equipmentJson }),
      },
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

    const localAnimationUrl = FREE_ANIMATION_MEDIA[slug];
    const existingLocal = await prisma.exerciseMedia.findFirst({
      where: { exerciseId: exercise.id, url: localAnimationUrl },
      select: { id: true },
    });
    if (!existingLocal) {
      await prisma.exerciseMedia.create({
        data: {
          exerciseId: exercise.id,
          type: "IMAGE",
          url: localAnimationUrl,
          sourceName: localAnimationSource,
          sourceUrl: "https://github.com/RepDB/exercise-dataset",
          license: "Use only the supplied free animation pack; attribution follows the pack/source terms.",
          attribution: "Exercise data by RepDB (repdb.co)",
          isPrimary: true,
        },
      });
      mediaCount += 1;
    }

    // Keep the free RepDB pose illustrations available as fallback/reference media,
    // but never import media for exercises outside the supplied allowlist.
    const poses = item.images?.flat ?? {};
    const imagePaths = [...new Set([poses.start, poses.peak, poses.main].filter(path => typeof path === "string" && path.startsWith("images/")))];
    for (const imagePath of imagePaths) {
      const url = new URL(imagePath, imageBase).toString();
      const existingMedia = await prisma.exerciseMedia.findFirst({ where: { exerciseId: exercise.id, sourceName: "RepDB", url }, select: { id: true } });
      if (existingMedia) continue;
      await prisma.exerciseMedia.create({
        data: {
          exerciseId: exercise.id,
          type: "IMAGE",
          url,
          sourceName: "RepDB",
          sourceUrl: `https://exercise-dataset.com/exercise/${item.id}/`,
          license: "RepDB Free Tier License v1.0; in-app use with attribution",
          attribution: "Exercise data by RepDB (repdb.co)",
          isPrimary: false,
        },
      });
      mediaCount += 1;
    }
  }

  console.log(`Imported ${imported} supplied exercises (${FREE_EXERCISE_SLUGS.length} allowed) and linked ${mediaCount} media records.`);
  console.log("Only the supplied exercise slugs are active for plan generation.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
