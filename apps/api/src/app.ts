import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import type { Db } from "./db/index.js";
import type { StorageProvider } from "./lib/storage.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
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
  app.use(
    cors({
      origin: [env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  });

  app.use("/api/auth", authRouter(db));
  app.use("/api/drivers", driversRouter(db, storage));
  app.use("/api/admin", adminRouter(db, storage));
  app.use("/api/geo", geoRouter(db, geo));
  app.use("/api/rides", ridesRouter(db, geo, notifier));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
