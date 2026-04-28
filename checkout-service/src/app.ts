import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger/logger.js";
import { checkoutRouter } from "./modules/checkout/index.js";
import { handleStripeWebhook } from "./modules/checkout/checkout.controller.js";

export const app = express();

app.set("etag", false);

app.use(
  pinoHttp({
    logger,
    customReceivedMessage: (req) => `request started: ${req.method} ${req.url}`,
    customSuccessMessage: (req, res) => `request completed: ${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, error) => `request failed: ${req.method} ${req.url} -> ${res.statusCode} (${error.message})`,
    customReceivedObject: (req) => ({
      method: req.method,
      url: req.url,
    }),
    customSuccessObject: (req, res) => ({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
    }),
    customErrorObject: (req, res, error) => ({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      err: error,
    }),
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
