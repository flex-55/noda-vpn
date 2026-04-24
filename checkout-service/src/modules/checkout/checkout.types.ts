import type Stripe from "stripe";

export type CreateCheckoutSessionInput = {
  idempotencyKey: string;
  email: string;
  planCode: string;
  billingCycle: "monthly" | "yearly";
};

export type CheckoutStatus = "COMPLETED" | "FAILED" | "PAYMENT_COMPLETED" | "PENDING_PAYMENT";
export type CreateCheckoutSessionResponse = {
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
