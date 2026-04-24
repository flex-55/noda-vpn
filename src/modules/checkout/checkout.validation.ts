import { z } from "zod";

export const startCheckoutBodySchema = z.object({
  email: z.string().email(),
  planCode: z.enum(["vpn_basic", "vpn_pro"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export const startCheckoutHeadersSchema = z.object({
  "idempotency-key": z.string().min(8),
});
