import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!name || !slug) return NextResponse.json({ error: "Nome e slug sono obbligatori." }, { status: 400 });
    const exercise = await prisma.exercise.create({
      data: {
        name,
        slug,
        category: typeof body.category === "string" ? body.category : "STRENGTH",
        primaryMuscles: typeof body.primaryMuscles === "string" ? body.primaryMuscles : "GENERAL",
        secondaryMuscles: JSON.stringify(Array.isArray(body.secondaryMuscles) ? body.secondaryMuscles : []),
        equipment: JSON.stringify(Array.isArray(body.equipment) ? body.equipment : []),
        difficulty: typeof body.difficulty === "string" ? body.difficulty : "BEGINNER",
        instructionsJson: JSON.stringify(Array.isArray(body.instructions) ? body.instructions : []),
        mistakesJson: JSON.stringify(Array.isArray(body.mistakes) ? body.mistakes : []),
        cuesJson: JSON.stringify(Array.isArray(body.cues) ? body.cues : []),
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });
    await recordAudit({ userId: admin.id, action: "CREATE", entity: "Exercise", entityId: exercise.id, metadata: { name: exercise.name } });
    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("[admin/exercises POST]", error);
    return NextResponse.json({ error: "Impossibile creare l'esercizio." }, { status: 400 });
  }
}
