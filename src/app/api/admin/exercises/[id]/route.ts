import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: { media: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] } },
  });

  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  return NextResponse.json(exercise);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const data: Record<string, unknown> = {};

  for (const key of ["name", "slug", "category", "primaryMuscles", "difficulty", "isActive"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const key of ["secondaryMuscles", "equipment", "instructionsJson", "mistakesJson", "cuesJson"]) {
    if (body[key] !== undefined) data[key] = typeof body[key] === "string" ? body[key] : JSON.stringify(body[key]);
  }

  try {
    const exercise = await prisma.exercise.update({ where: { id }, data });
    await recordAudit({ userId: admin.id, action: "UPDATE", entity: "Exercise", entityId: id, metadata: { name: exercise.name } });
    return NextResponse.json(exercise);
  } catch {
    return NextResponse.json({ error: "Impossibile aggiornare l'esercizio." }, { status: 400 });
  }
}
