import type { Request } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { stripeClient } from "./stripe.client.js";

export function constructStripeEvent(req: Request): Stripe.Event {
  const signature = req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    throw new Error("Missing Stripe signature header");
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    throw new Error("Webhook body must be a raw buffer");
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
