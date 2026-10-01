import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: { slug },
    include: {
      media: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!exercise || !exercise.isActive) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: exercise.id,
    name: exercise.name,
    slug: exercise.slug,
    category: exercise.category,
    muscle: exercise.primaryMuscles,
    secondaryMuscles: JSON.parse(exercise.secondaryMuscles),
    equipment: JSON.parse(exercise.equipment),
    difficulty: exercise.difficulty,
    instructions: JSON.parse(exercise.instructionsJson),
    mistakes: JSON.parse(exercise.mistakesJson),
    cues: JSON.parse(exercise.cuesJson),
    media: exercise.media,
    mediaUrl: exercise.media[0]?.url ?? null,
    mediaType: exercise.media[0]?.type ?? null,
  });
}
