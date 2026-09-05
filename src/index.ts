import "dotenv/config";
import type { Server } from "node:http";

import { createApp } from "./app";
import { ENV_CONFIG } from "./shared/config/env-config";
import { logger } from "./shared/config/logger";
import {
  closePrismaClients,
  getShard1Client,
  getShard2Client,
} from "./shared/database/prisma-client";

const PORT = ENV_CONFIG.PORT;
const app = createApp();

let server: Server | undefined;

// initialize the prisma client
async function initializeDatabase(): Promise<void> {
  await getShard1Client().$connect();
  await getShard2Client().$connect();
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }

  await closePrismaClients();
  process.exit(0);
}

process.on("uncaughtException", (err) => {
  logger.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(reason);
  process.exit(1);
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

initializeDatabase()
  .then(() => {
    server = app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      logger.error(err);
      process.exit(1);
    });
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
