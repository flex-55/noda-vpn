import Stripe from "stripe";
import { env } from "../config/env.js";

export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
});
