import { notFound, redirect } from "next/navigation";
import ExercisePlayer from "@/components/workout/ExercisePlayer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ exercise: string }> };

export default async function ExercisePage({ params }: PageProps) {
  const { exercise: slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/workout/${slug}`);

  const [exercise, plan] = await Promise.all([
    prisma.exercise.findFirst({
      where: { slug, isActive: true },
      include: {
        media: {
          where: { isActive: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
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

  const media = exercise.media.map(item => ({
    url: item.url,
    type: item.type,
    attribution: item.attribution,
    sourceUrl: item.sourceUrl,
  }));
  const primaryMedia = media[0] ?? null;

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
        instructions: JSON.parse(exercise.instructionsJson),
        cues: JSON.parse(exercise.cuesJson),
        mediaUrl: primaryMedia?.url ?? null,
        mediaType: primaryMedia?.type ?? null,
        attribution: primaryMedia?.attribution ?? null,
        sourceUrl: primaryMedia?.sourceUrl ?? null,
        media,
      }}
    />
  );
}
