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

// The notifier wraps io, and the app needs the notifier — so build io first
// (unattached), then the app, then make the app the http server's base request
// handler, and only then attach io. This ordering is what lets Socket.IO
// intercept /socket.io/ requests and hand everything else to Express.
const io = createSocketServer(db);
const notifier = createSocketNotifier(io);
const app = createApp({ db, storage, geo, notifier });
const server = createServer(app);
io.attach(server);

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
