import { createServer } from "node:http";
import { assertRuntimeEnv, env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";
import { createDb } from "./db/index.js";
import { createStorage } from "./lib/storage.js";
import { createSocketServer } from "./socket/index.js";
import { createGeoProvider } from "./modules/geo/provider.js";
import { createSocketNotifier } from "./modules/rides/notify.js";
import { createDispatcher } from "./modules/matching/dispatcher.js";

assertRuntimeEnv();

const db = createDb(env.DATABASE_URL!);
const storage = createStorage();
const geo = createGeoProvider();

// The socket server must exist before the app (the notifier wraps io),
// so create the bare http server first and attach the express app after.
const server = createServer();
const io = createSocketServer(server, db);
const notifier = createSocketNotifier(io);
const app = createApp({ db, storage, geo, notifier });
server.on("request", app);

const dispatcher = createDispatcher(db, notifier);
dispatcher.start();

server.listen(env.PORT, () => {
  logger.info(`RideX API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  dispatcher.stop();
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
