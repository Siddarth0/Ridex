import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { sql } from "drizzle-orm";
import { env, isProd } from "./config/env.js";
import { logger } from "./lib/logger.js";
import type { Db } from "./db/index.js";
import type { StorageProvider } from "./lib/storage.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authLimiter, globalLimiter, refreshLimiter } from "./middleware/rateLimit.js";
import { authRouter } from "./modules/auth/router.js";
import { driversRouter } from "./modules/drivers/router.js";
import { adminRouter } from "./modules/admin/router.js";
import { geoRouter } from "./modules/geo/router.js";
import { ridesRouter } from "./modules/rides/router.js";
import type { GeoProvider } from "./modules/geo/provider.js";
import type { RideNotifier } from "./modules/rides/notify.js";

export interface AppDeps {
  db: Db;
  storage: StorageProvider;
  geo: GeoProvider;
  notifier: RideNotifier;
}

export function createApp({ db, storage, geo, notifier }: AppDeps) {
  const app = express();

  app.set("trust proxy", 1); // Render/Vercel sit behind a proxy

  app.use(helmet());
  // In prod, only the deployed web origin may call the API with credentials;
  // localhost origins stay allowed in dev so both apps run side by side.
  const allowedOrigins = isProd
    ? [env.FRONTEND_URL]
    : [env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"];
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // Correlate every request/log line; echo it back so clients can quote it.
  app.use((req, res, next) => {
    const id = (req.headers["x-request-id"] as string) || randomUUID();
    req.id = id;
    res.setHeader("x-request-id", id);
    next();
  });

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test",
      genReqId: (req) => (req as { id?: string }).id ?? randomUUID(),
    }),
  );

  app.use(globalLimiter);

  app.get("/health", async (_req, res) => {
    let db_ok = false;
    try {
      await db.execute(sql`select 1`);
      db_ok = true;
    } catch (err) {
      logger.error({ err }, "health db check failed");
    }
    res.status(db_ok ? 200 : 503).json({
      success: db_ok,
      data: {
        status: db_ok ? "ok" : "degraded",
        db: db_ok,
        uptimeS: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  });

  const auth = authRouter(db);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/reset-password", authLimiter);
  app.use("/api/auth/refresh", refreshLimiter);
  app.use("/api/auth", auth);
  app.use("/api/drivers", driversRouter(db, storage));
  app.use("/api/admin", adminRouter(db, storage, notifier));
  app.use("/api/geo", geoRouter(db, geo));
  app.use("/api/rides", ridesRouter(db, geo, notifier));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
