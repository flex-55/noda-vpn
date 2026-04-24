import http from "http";
import { app } from "./app.js";
import { env } from "./lib/config/env.js";
import { logger } from "./lib/logger/logger.js";
import { checkoutQueue } from "./lib/queues/checkout.queue.js";
import { startCheckoutWorker } from "./lib/queues/checkout.worker.js";
import { redis } from "./lib/redis/redis.js";
import { redisWorker } from "./lib/redis/redis.js";

const server = http.createServer(app);
const worker = startCheckoutWorker();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Checkout API listening");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");

  await worker.close();
  await checkoutQueue.close();
  await redis.quit();
  await redisWorker.quit();

  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error closing HTTP server");
      process.exit(1);
    }
    logger.info("Shutdown complete");
    process.exit(0);
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
