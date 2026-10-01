import { notFound } from "next/navigation";
import ExercisePlayer from "@/components/workout/ExercisePlayer";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ exercise: string }> };

const workoutSequence = [
  { slug: "barbell-squat", name: "Barbell squat" },
  { slug: "lat-pulldown", name: "Lat pulldown" },
  { slug: "shoulder-press", name: "Shoulder press" },
  { slug: "cable-curl", name: "Cable curl" },
  { slug: "core-finisher", name: "Core finisher" },
];

export default async function ExercisePage({ params }: PageProps) {
  const { exercise: slug } = await params;

  const exercise = await prisma.exercise.findFirst({
    where: { slug, isActive: true },
    include: {
      media: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!exercise) notFound();

  const index = workoutSequence.findIndex(item => item.slug === slug);
  const exerciseIndex = index >= 0 ? index : 0;
  const nextExercise = index >= 0 ? workoutSequence[index + 1] ?? null : null;

  return (
    <ExercisePlayer
      exerciseIndex={exerciseIndex}
      totalExercises={workoutSequence.length}
      nextExercise={nextExercise}
      exercise={{
        name: exercise.name,
        muscle: exercise.primaryMuscles,
        sets: 3,
        reps: "8–10",
        rest: 90,
        instructions: JSON.parse(exercise.instructionsJson),
        cues: JSON.parse(exercise.cuesJson),
        mediaUrl: exercise.media[0]?.url ?? null,
        mediaType: exercise.media[0]?.type ?? null,
      }}
    />
  );
}
