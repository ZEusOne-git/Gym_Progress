import { notFound, redirect } from "next/navigation";
import ExercisePlayer from "@/components/workout/ExercisePlayer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FREE_EXERCISE_SET } from "@/lib/program-generator/free-exercise-catalog";

type PageProps = { params: Promise<{ exercise: string }> };

export default async function ExercisePage({ params }: PageProps) {
  const { exercise: slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/workout/${slug}`);
  if (!FREE_EXERCISE_SET.has(slug)) notFound();

  const [exercise, plan] = await Promise.all([
    prisma.exercise.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        primaryMuscles: true,
        instructionsJson: true,
        cuesJson: true,
      },
    }),
    prisma.workoutPlan.findFirst({
      where: { userId: user.id, isActive: true, isTemplate: false },
      orderBy: { updatedAt: "desc" },
      select: {
        templates: {
          orderBy: { dayNumber: "asc" },
          select: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              where: { exercise: { slug: { in: [...FREE_EXERCISE_SET] } } },
              select: {
                sets: true,
                repMin: true,
                repMax: true,
                restSeconds: true,
                exercise: { select: { slug: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!exercise) notFound();

  const sequence = plan?.templates.flatMap(template => template.exercises.map(item => item.exercise)) ?? [];
  const uniqueSequence = sequence.filter((item, index, items) => items.findIndex(candidate => candidate.slug === item.slug) === index);
  const index = uniqueSequence.findIndex(item => item.slug === slug);
  const nextExercise = index >= 0 ? uniqueSequence[index + 1] ?? null : null;
  const prescription = plan?.templates
    .flatMap(template => template.exercises)
    .find(item => item.exercise.slug === slug);

  let instructions: string[] = [];
  let cues: string[] = [];
  try { instructions = JSON.parse(exercise.instructionsJson); } catch { instructions = []; }
  try { cues = JSON.parse(exercise.cuesJson); } catch { cues = []; }

  return (
    <ExercisePlayer
      exerciseIndex={index >= 0 ? index : 0}
      totalExercises={Math.max(uniqueSequence.length, 1)}
      nextExercise={nextExercise}
      exercise={{
        name: exercise.name,
        muscle: exercise.primaryMuscles,
        sets: prescription?.sets ?? 3,
        reps: prescription ? `${prescription.repMin}–${prescription.repMax}` : "8–10",
        rest: prescription?.restSeconds ?? 90,
        instructions,
        cues,
        mediaUrl: `/animations/${slug}.webp`,
        mediaType: "IMAGE",
        media: [{ url: `/animations/${slug}.webp`, type: "IMAGE" }],
      }}
    />
  );
}
