import Stripe from "stripe";

export type PaymentIntentSucceededEvent = Stripe.Event & {
  type: "payment_intent.succeeded";
  data: {
    object: Stripe.PaymentIntent;
  };
};

export function isPaymentIntentSucceededEvent(event: Stripe.Event): event is PaymentIntentSucceededEvent {
  return event.type === "payment_intent.succeeded";
}
