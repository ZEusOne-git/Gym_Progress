import ExercisePlayer from "@/components/workout/ExercisePlayer";

const exercise = {
  name: "Barbell Squat",
  muscle: "QUADS · GLUTES · LOWER BACK",
  sets: 3,
  reps: "8–10",
  rest: 90,
  instructions: [
    "Brace your core before descending.",
    "Keep your knees tracking over your toes.",
    "Drive through the floor and finish tall.",
  ],
  cues: ["Brace core", "Knees track toes", "Drive through floor"],
  mediaUrl: null,
  mediaType: null,
};

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exercise?: string }>;
}) {
  await params;

  return <ExercisePlayer exercise={exercise} />;
}
