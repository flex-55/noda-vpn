import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger/logger.js";
import { checkoutRouter } from "./modules/checkout/index.js";
import { handleStripeWebhook } from "./modules/checkout/checkout.controller.js";

export const app = express();

app.use(
  pinoHttp({
    logger,
  }),
);

app.use(
  cors({
    origin: true,
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use("/checkout", checkoutRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  logger.error({ err: error }, "Unhandled error");
  res.status(500).json({ error: message });
});
