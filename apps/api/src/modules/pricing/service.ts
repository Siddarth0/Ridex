import { asc, eq } from "drizzle-orm";
import type { FareConfigUpdate, RideType } from "@ridex/shared";
import { PLATFORM_COMMISSION } from "@ridex/shared";
import type { Db, DbConn } from "../../db/index.js";
import { fareConfigs } from "../../db/schema/index.js";
import { AppError } from "../../middleware/errorHandler.js";
import { writeAudit, type AuditContext } from "../../lib/audit.js";

type FareConfig = typeof fareConfigs.$inferSelect;

export function roundMoney(x: number): number {
  return Math.round(x * 100) / 100;
}

/** estimate = clamp(base + perKm·km + perMin·min, minFare) × surge — never NaN or negative. */
export function computeFare(
  cfg: Pick<FareConfig, "baseFare" | "perKm" | "perMin" | "minFare">,
  distanceM: number,
  durationS: number,
  surgeMultiplier = 1,
): number {
  const km = Math.max(0, distanceM) / 1000;
  const min = Math.max(0, durationS) / 60;
  const raw = cfg.baseFare + cfg.perKm * km + cfg.perMin * min;
  return roundMoney(Math.max(cfg.minFare, raw) * surgeMultiplier);
}

export function splitFare(finalFare: number): { commission: number; driverPayout: number } {
  const commission = roundMoney(finalFare * PLATFORM_COMMISSION);
  return { commission, driverPayout: roundMoney(finalFare - commission) };
}

export async function getFareConfig(db: DbConn, rideType: RideType): Promise<FareConfig> {
  const [cfg] = await db
    .select()
    .from(fareConfigs)
    .where(eq(fareConfigs.rideType, rideType))
    .limit(1);
  if (!cfg || !cfg.isActive) {
    throw new AppError(503, "PRICING_UNAVAILABLE", `No active fare config for ${rideType}`);
  }
  return cfg;
}

export async function estimateAllTypes(db: DbConn, distanceM: number, durationS: number) {
  const configs = await db.select().from(fareConfigs).where(eq(fareConfigs.isActive, true));
  return configs.map((cfg) => ({
    rideType: cfg.rideType,
    estimatedFare: computeFare(cfg, distanceM, durationS, cfg.surgeMultiplier),
    surgeMultiplier: cfg.surgeMultiplier,
    currency: cfg.currency,
  }));
}

/** All fare configs (all ride types), for the admin pricing console. */
export function listFareConfigs(db: Db) {
  return db.select().from(fareConfigs).orderBy(asc(fareConfigs.rideType));
}

/** Update one ride type's pricing dials. Audited; effective on the next estimate. */
export async function updateFareConfig(
  db: Db,
  ctx: AuditContext,
  rideType: RideType,
  patch: FareConfigUpdate,
): Promise<FareConfig> {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(fareConfigs)
      .where(eq(fareConfigs.rideType, rideType))
      .limit(1);
    if (!before) throw new AppError(404, "NOT_FOUND", `No fare config for ${rideType}`);

    const [updated] = await tx
      .update(fareConfigs)
      .set(patch)
      .where(eq(fareConfigs.rideType, rideType))
      .returning();

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(patch) as (keyof FareConfigUpdate)[]) {
      if (before[key] !== updated![key]) diff[key] = { from: before[key], to: updated![key] };
    }
    await writeAudit(tx, ctx, {
      action: "pricing.update",
      entityType: "fare_config",
      entityId: before.id,
      diff: { rideType, changes: diff },
    });
    return updated!;
  });
}
