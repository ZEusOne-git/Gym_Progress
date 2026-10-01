import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED: Record<string, { type: "IMAGE" | "GIF" | "VIDEO" | "WEBM"; ext: string }> = {
  "image/jpeg": { type: "IMAGE", ext: "jpg" }, "image/png": { type: "IMAGE", ext: "png" }, "image/webp": { type: "IMAGE", ext: "webp" },
  "image/gif": { type: "GIF", ext: "gif" }, "video/mp4": { type: "VIDEO", ext: "mp4" }, "video/webm": { type: "WEBM", ext: "webm" },
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: exerciseId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File mancante" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File troppo grande (max 100 MB)" }, { status: 413 });
    const meta = ALLOWED[file.type];
    if (!meta) return NextResponse.json({ error: "Formato non supportato. Usa JPG, PNG, WebP, GIF, MP4 o WebM." }, { status: 415 });
    const dir = path.join(process.cwd(), "public", "uploads", "exercises", exerciseId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${meta.ext}`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    const isPrimary = form.get("isPrimary") === "true";
    if (isPrimary) await prisma.exerciseMedia.updateMany({ where: { exerciseId }, data: { isPrimary: false } });
    const media = await prisma.exerciseMedia.create({ data: {
      exerciseId, type: meta.type, url: `/uploads/exercises/${exerciseId}/${filename}`,
      sourceName: String(form.get("sourceName") ?? "") || null, sourceUrl: String(form.get("sourceUrl") ?? "") || null,
      license: String(form.get("license") ?? "") || null, attribution: String(form.get("attribution") ?? "") || null, isPrimary,
    }});
    return NextResponse.json(media, { status: 201 });
  }

  const body = await request.json();
  const { type, url, thumbnailUrl, sourceName, sourceUrl, license, attribution, isPrimary } = body;
  if (!type || !url) return NextResponse.json({ error: "type e url sono obbligatori" }, { status: 400 });
  if (isPrimary) await prisma.exerciseMedia.updateMany({ where: { exerciseId }, data: { isPrimary: false } });
  const media = await prisma.exerciseMedia.create({ data: { exerciseId, type, url, thumbnailUrl: thumbnailUrl || null, sourceName: sourceName || null, sourceUrl: sourceUrl || null, license: license || null, attribution: attribution || null, isPrimary: Boolean(isPrimary) } });
  return NextResponse.json(media, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: exerciseId } = await params;
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId obbligatorio" }, { status: 400 });
  await prisma.exerciseMedia.delete({ where: { id: mediaId, exerciseId } });
  return NextResponse.json({ ok: true });
}
