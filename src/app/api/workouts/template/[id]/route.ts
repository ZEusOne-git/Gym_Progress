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
        where: { exercise: { slug: { in: [...FREE_EXERCISE_SET] } } },
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

  const invalid = await prisma.workoutExercise.findFirst({
    where: { templateId: template.id, exercise: { slug: { notIn: [...FREE_EXERCISE_SET] } } },
    select: { exercise: { select: { name: true } } },
  });
  if (invalid) return NextResponse.json({ error: "Questo workout contiene ancora esercizi fuori dal catalogo free. Esegui la migrazione dei programmi prima di allenarti." }, { status: 409 });
  if (!template.exercises.length) return NextResponse.json({ error: "Questo workout non contiene esercizi free disponibili." }, { status: 409 });

  return NextResponse.json({ template, plan: template.plan });
}
