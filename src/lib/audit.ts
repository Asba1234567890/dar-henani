import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string | null,
  action: string,
  opts?: { targetType?: string; targetId?: string; metadata?: Record<string, unknown> }
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType: opts?.targetType,
        targetId: opts?.targetId,
        metadata: opts?.metadata ? JSON.stringify(opts.metadata) : undefined,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary action it's observing.
    console.error("logAudit failed:", err);
  }
}
