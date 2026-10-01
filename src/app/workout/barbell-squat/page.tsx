import ExercisePlayer from "@/components/workout/ExercisePlayer";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exercise: string }>;
}) {
  const { exercise } = await params;

  return <ExercisePlayer exerciseSlug={exercise} />;
}
