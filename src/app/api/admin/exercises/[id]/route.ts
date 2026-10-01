import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};

  for (const key of ["name", "slug", "category", "primaryMuscles", "difficulty", "isActive"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const key of ["secondaryMuscles", "equipment", "instructionsJson", "mistakesJson", "cuesJson"]) {
    if (body[key] !== undefined) data[key] = typeof body[key] === "string" ? body[key] : JSON.stringify(body[key]);
  }

  const exercise = await prisma.exercise.update({ where: { id }, data });
  return NextResponse.json(exercise);
}
