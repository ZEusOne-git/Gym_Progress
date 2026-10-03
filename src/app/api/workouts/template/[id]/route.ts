import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FREE_EXERCISE_SET } from "@/lib/program-generator/free-exercise-catalog";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { id } = await params;
  const template = await prisma.workoutTemplate.findFirst({
    where: { id, plan: { userId: user.id, isActive: true, isTemplate: false } },
    select: {
      id: true,
      dayNumber: true,
      name: true,
      exercises: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          sets: true,
          repMin: true,
          repMax: true,
          restSeconds: true,
          rirTarget: true,
          targetWeight: true,
          exercise: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              media: { where: { isActive: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { url: true, type: true, thumbnailUrl: true, sourceName: true, sourceUrl: true, attribution: true } },
            },
          },
        },
      },
      plan: { select: { name: true } },
    },
  });
  if (!template) return NextResponse.json({ error: "Workout non trovato." }, { status: 404 });

  const exercises = template.exercises.filter(item => FREE_EXERCISE_SET.has(item.exercise.slug));
  if (!exercises.length) return NextResponse.json({ error: "Questo workout non contiene esercizi disponibili nel catalogo free." }, { status: 409 });

  return NextResponse.json({ template: { ...template, exercises }, plan: template.plan });
}
