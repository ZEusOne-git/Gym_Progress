import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      user: { select: { email: true, profile: { select: { firstName: true } } } },
    },
  });

  return NextResponse.json({ entries: entries.map(entry => {
    let metadata: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(entry.metadata);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
    } catch { /* Ignore malformed legacy metadata and keep the audit row visible. */ }
    return { ...entry, metadata };
  }) });
}
