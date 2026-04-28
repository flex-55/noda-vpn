import { Queue } from "bullmq";
import { redis } from "../redis/redis.js";

export const CHECKOUT_QUEUE_NAME = "checkout-workflow";
export const CHECKOUT_JOB_NAME = "resume-checkout";

export const checkoutQueue = new Queue<{
  checkoutId: string;
  stripeEventId: string;
}>(CHECKOUT_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 10,
    removeOnComplete: 1000,
    removeOnFail: 1000,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export async function enqueueCheckoutWorkflow(input: { checkoutId: string; stripeEventId: string }): Promise<void> {
  await checkoutQueue.add(CHECKOUT_JOB_NAME, input, {
    jobId: `${input.checkoutId}-${input.stripeEventId}`,
  });
}
