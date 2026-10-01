import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: exerciseId } = await params;
  const body = await request.json();
  const { type, url, thumbnailUrl, sourceName, sourceUrl, license, attribution, isPrimary } = body;

  if (!type || !url) return NextResponse.json({ error: "type e url sono obbligatori" }, { status: 400 });

  if (isPrimary) {
    await prisma.exerciseMedia.updateMany({ where: { exerciseId }, data: { isPrimary: false } });
  }

  const media = await prisma.exerciseMedia.create({
    data: { exerciseId, type, url, thumbnailUrl: thumbnailUrl || null, sourceName: sourceName || null, sourceUrl: sourceUrl || null, license: license || null, attribution: attribution || null, isPrimary: Boolean(isPrimary) },
  });
  return NextResponse.json(media, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: exerciseId } = await params;
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId obbligatorio" }, { status: 400 });
  await prisma.exerciseMedia.delete({ where: { id: mediaId, exerciseId } });
  return NextResponse.json({ ok: true });
}
