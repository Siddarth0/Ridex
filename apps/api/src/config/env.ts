import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  FRONTEND_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),

  // SMTP is optional — without it, emails are logged to the console (dev mode)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Supabase Storage for driver documents; falls back to local disk when unset
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default("./uploads"),

  // OSM services (public instances by default; self-host when quota hurts)
  OSRM_URL: z.url().default("https://router.project-osrm.org"),
  PHOTON_URL: z.url().default("https://photon.komoot.io"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger isn't constructed yet at import time; console is correct here.
  console.error("❌ Invalid environment variables:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/** Hard requirements once the server actually serves traffic (not needed for drizzle-kit etc.). */
export function assertRuntimeEnv(): void {
  const missing = (["DATABASE_URL", "JWT_SECRET"] as const).filter((k) => !env[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(", ")} — see apps/api/.env.example`);
    process.exit(1);
  }
}
