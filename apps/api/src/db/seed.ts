/** Idempotent seed: default fare configs per ride type. Run with `pnpm --filter api seed`. */
try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}
import { createDb } from "./index.js";
import { fareConfigs } from "./schema/index.js";
import { RIDE_TYPES } from "@ridex/shared";

const DEFAULTS: Record<(typeof RIDE_TYPES)[number], { baseFare: number; perKm: number; perMin: number; minFare: number }> = {
  bike: { baseFare: 30, perKm: 20, perMin: 2, minFare: 60 },
  car: { baseFare: 60, perKm: 40, perMin: 3, minFare: 120 },
  premium: { baseFare: 100, perKm: 60, perMin: 5, minFare: 200 },
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const db = createDb(url);

  for (const rideType of RIDE_TYPES) {
    await db
      .insert(fareConfigs)
      .values({ rideType, ...DEFAULTS[rideType] })
      .onConflictDoNothing({ target: fareConfigs.rideType });
  }
  console.log("Fare configs seeded (NPR):", DEFAULTS);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
