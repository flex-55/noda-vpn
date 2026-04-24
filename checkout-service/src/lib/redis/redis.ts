import { Redis } from "ioredis";
import { env } from "../config/env.js";

// Shared connection for general app use and BullMQ Queue (non-blocking commands only)
export const redis = new Redis(env.REDIS_URL);

// Dedicated connection for BullMQ Worker — required because BLPOP blocks the connection
export const redisWorker = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
