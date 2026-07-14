import type { AuditAction } from "@ridex/shared";
import type { DbConn } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";

export interface AuditContext {
  actorUserId: string;
  ip?: string | null;
}

/**
 * Record an admin mutation. Call inside the same transaction as the change it
 * describes so the audit row and the effect commit (or roll back) together.
 */
export async function writeAudit(
  tx: DbConn,
  ctx: AuditContext,
  entry: {
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    diff?: Record<string, unknown> | null;
  },
): Promise<void> {
  await tx.insert(auditLogs).values({
    actorUserId: ctx.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    diff: entry.diff ?? null,
    ip: ctx.ip ?? null,
  });
}
