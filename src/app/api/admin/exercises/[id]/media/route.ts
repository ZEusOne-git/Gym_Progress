import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED: Record<string, { type: "IMAGE" | "GIF" | "VIDEO" | "WEBM"; ext: string }> = {
  "image/jpeg": { type: "IMAGE", ext: "jpg" }, "image/png": { type: "IMAGE", ext: "png" }, "image/webp": { type: "IMAGE", ext: "webp" },
  "image/gif": { type: "GIF", ext: "gif" }, "video/mp4": { type: "VIDEO", ext: "mp4" }, "video/webm": { type: "WEBM", ext: "webm" },
};

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
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
    await recordAudit({ userId: admin.id, action: "CREATE", entity: "ExerciseMedia", entityId: media.id, metadata: { exerciseId, type: media.type } });
    return NextResponse.json(media, { status: 201 });
  }

  try {
    const body = await request.json();
    const { type, url, thumbnailUrl, sourceName, sourceUrl, license, attribution, isPrimary } = body ?? {};
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { id: true } });
    if (!exercise) return NextResponse.json({ error: "Esercizio non trovato." }, { status: 404 });
    if (!Object.values(ALLOWED).some(meta => meta.type === type) || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Tipo e URL del media non validi." }, { status: 400 });
    }
    if (isPrimary) await prisma.exerciseMedia.updateMany({ where: { exerciseId }, data: { isPrimary: false } });
    const media = await prisma.exerciseMedia.create({ data: { exerciseId, type, url: url.trim(), thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : null, sourceName: typeof sourceName === "string" ? sourceName : null, sourceUrl: typeof sourceUrl === "string" ? sourceUrl : null, license: typeof license === "string" ? license : null, attribution: typeof attribution === "string" ? attribution : null, isPrimary: Boolean(isPrimary) } });
    await recordAudit({ userId: admin.id, action: "CREATE", entity: "ExerciseMedia", entityId: media.id, metadata: { exerciseId, type } });
    return NextResponse.json(media, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Richiesta media non valida." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const { id: exerciseId } = await params;
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId obbligatorio" }, { status: 400 });
  const media = await prisma.exerciseMedia.findUnique({ where: { id: mediaId, exerciseId }, select: { id: true, type: true } });
  if (!media) return NextResponse.json({ error: "Media non trovato." }, { status: 404 });
  await prisma.exerciseMedia.delete({ where: { id: media.id } });
  await recordAudit({ userId: admin.id, action: "DELETE", entity: "ExerciseMedia", entityId: media.id, metadata: { exerciseId, type: media.type } });
  return NextResponse.json({ ok: true });
}
