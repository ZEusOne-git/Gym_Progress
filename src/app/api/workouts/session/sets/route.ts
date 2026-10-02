import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId : "";
    const setNumber = Number(body.setNumber);
    const weight = Number(body.weight);
    const reps = Number(body.reps);
    const rir = body.rir === "" || body.rir == null ? null : Number(body.rir);
    const completed = body.completed !== false;
    if (!sessionId || !exerciseId || !Number.isInteger(setNumber) || setNumber < 1 || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 0) {
      return NextResponse.json({ error: "Inserisci peso e ripetizioni validi." }, { status: 400 });
    }

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: user.id, completedAt: null },
      select: { id: true, workoutPlanId: true },
    });
    if (!session) return NextResponse.json({ error: "Sessione non disponibile." }, { status: 404 });

    // The workout UI works with WorkoutExercise ids, while WorkoutSet.exerciseId
    // stores the underlying Exercise id. Accept both and normalize here.
    const exercise = await prisma.workoutExercise.findFirst({
      where: {
        template: { workoutPlanId: session.workoutPlanId },
        OR: [{ id: exerciseId }, { exerciseId }],
      },
      select: { exerciseId: true },
    });
    if (!exercise) return NextResponse.json({ error: "Esercizio non presente nella sessione." }, { status: 400 });

    const normalizedExerciseId = exercise.exerciseId;
    const existing = await prisma.workoutSet.findFirst({ where: { sessionId, exerciseId: normalizedExerciseId, setNumber } });
    const data = { weight, reps, rir, completed };
    const set = existing
      ? await prisma.workoutSet.update({ where: { id: existing.id }, data })
      : await prisma.workoutSet.create({ data: { sessionId, exerciseId: normalizedExerciseId, setNumber, ...data } });
    return NextResponse.json({ set });
  } catch (error) {
    console.error("[workouts/session/sets POST]", error);
    return NextResponse.json({ error: "Impossibile salvare la serie." }, { status: 500 });
  }
}
