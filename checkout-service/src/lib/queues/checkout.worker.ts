import { Worker } from "bullmq";
import { logger } from "../logger/logger.js";
import { redisWorker } from "../redis/redis.js";
import { CHECKOUT_JOB_NAME, CHECKOUT_QUEUE_NAME } from "./checkout.queue.js";
import { checkoutService } from "../../modules/checkout/checkout.service.js";

export function startCheckoutWorker(): Worker<{ checkoutId: string; stripeEventId: string }> {
  const worker = new Worker<{ checkoutId: string; stripeEventId: string }>(
    CHECKOUT_QUEUE_NAME,
    async (job) => {
      if (job.name !== CHECKOUT_JOB_NAME) {
        return;
      }

      await checkoutService.resumeCheckoutWorkflow({
        checkoutId: job.data.checkoutId,
        stripeEventId: job.data.stripeEventId,
      });
    },
    {
      connection: redisWorker,
      concurrency: 20,
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Checkout workflow completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error }, "Checkout workflow failed");

    if (!job) {
      return;
    }

    const maxAttempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
    if (job.attemptsMade >= maxAttempts) {
      void checkoutService.compensateFailedCheckout({
        checkoutId: job.data.checkoutId,
        errorMessage: error.message,
      });
    }
  });

  logger.info("Checkout worker started");

  return worker;
}
