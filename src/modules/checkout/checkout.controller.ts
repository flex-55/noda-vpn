import type { Request, Response } from "express";
import { constructStripeEvent } from "../../lib/stripe/stripe.webhook.js";
import { logger } from "../../lib/logger/logger.js";
import { checkoutService } from "./checkout.service.js";
import { startCheckoutBodySchema, startCheckoutHeadersSchema } from "./checkout.validation.js";

export async function startCheckoutHandler(req: Request, res: Response): Promise<void> {
  const parsedHeaders = startCheckoutHeadersSchema.safeParse(req.headers);
  const parsedBody = startCheckoutBodySchema.safeParse(req.body);

  if (!parsedHeaders.success || !parsedBody.success) {
    res.status(400).json({
      error: "Invalid request",
      details: {
        headers: parsedHeaders.success ? undefined : parsedHeaders.error.format(),
        body: parsedBody.success ? undefined : parsedBody.error.format(),
      },
    });
    return;
  }

  const result = await checkoutService.startCheckout({
    idempotencyKey: parsedHeaders.data["idempotency-key"],
    email: parsedBody.data.email,
    planCode: parsedBody.data.planCode,
    billingCycle: parsedBody.data.billingCycle,
  });

  res.status(200).json(result);
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const event = constructStripeEvent(req);

    await checkoutService.handleStripeWebhook({
      event,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to process Stripe webhook");
    res.status(400).json({ error: "Invalid webhook" });
  }
}
