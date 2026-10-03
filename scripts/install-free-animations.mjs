import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { FREE_EXERCISE_SLUGS } from "../prisma/free-exercise-catalog.mjs";

const sourceDir = resolve(process.argv[2] ?? "./animations");
const destinationDir = resolve("./public/animations");
const allowed = new Set(FREE_EXERCISE_SLUGS.map(slug => `${slug}.webp`));

if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
  throw new Error(`Animation source directory not found: ${sourceDir}`);
}

const files = readdirSync(sourceDir).filter(file => file.toLowerCase().endsWith(".webp"));
const unexpected = files.filter(file => !allowed.has(file));
if (unexpected.length) {
  throw new Error(`Refusing to install animations not in the supplied catalog: ${unexpected.join(", ")}`);
}

const missing = [...allowed].filter(file => !files.includes(file));
if (missing.length) {
  throw new Error(`Supplied animation pack is incomplete. Missing: ${missing.join(", ")}`);
}

mkdirSync(destinationDir, { recursive: true });
for (const file of files) {
  const source = join(sourceDir, file);
  const destination = join(destinationDir, file);
  // Keep this script dependency-free; the shell cp is deliberately avoided so it
  // behaves consistently on macOS, Linux and CI environments.
  const bytes = await import("node:fs/promises").then(fs => fs.readFile(source));
  await import("node:fs/promises").then(fs => fs.writeFile(destination, bytes));
}

console.log(`Installed ${files.length} allowlisted exercise animations into public/animations.`);
