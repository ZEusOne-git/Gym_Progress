import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const exercises = await prisma.exercise.findMany({
    include: {
      media: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
      _count: { select: { workoutExercises: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}

export async function POST(request: Request) {
  const body = await request.json();
  const exercise = await prisma.exercise.create({
    data: {
      name: body.name,
      slug: body.slug,
      category: body.category ?? "STRENGTH",
      primaryMuscles: body.primaryMuscles ?? "GENERAL",
      secondaryMuscles: JSON.stringify(body.secondaryMuscles ?? []),
      equipment: JSON.stringify(body.equipment ?? []),
      difficulty: body.difficulty ?? "BEGINNER",
      instructionsJson: JSON.stringify(body.instructions ?? []),
      mistakesJson: JSON.stringify(body.mistakes ?? []),
      cuesJson: JSON.stringify(body.cues ?? []),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}
