import type Stripe from "stripe";

export type StartCheckoutInput = {
  idempotencyKey: string;
  email: string;
  planCode: string;
  billingCycle: "monthly" | "yearly";
};

export type StartCheckoutResult = {
  checkoutId: string;
  status: string;
  paymentIntentId: string;
  clientSecret: string;
};

export type HandleWebhookInput = {
  event: Stripe.Event;
};

export type ResumeCheckoutWorkflowInput = {
  checkoutId: string;
  stripeEventId: string;
};
