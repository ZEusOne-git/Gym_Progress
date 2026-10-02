import { prisma } from "@/lib/prisma";

type AuditEntry = {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "PUBLISH" | "UNPUBLISH";
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: JSON.stringify(entry.metadata ?? {}),
      },
    });
  } catch (error) {
    console.error("[audit] Unable to write audit entry", error);
  }
}
