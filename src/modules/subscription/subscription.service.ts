import { prisma } from "../../lib/prisma/prisma.js";
import type { EnsureSubscriptionInput } from "./subscription.types.js";

async function ensureSubscription(input: EnsureSubscriptionInput): Promise<void> {
  await prisma.subscription.upsert({
    where: {
      checkoutId: input.checkoutId,
    },
    create: {
      checkoutId: input.checkoutId,
      planCode: input.planCode,
      billingCycle: input.billingCycle,
      status: "ACTIVE",
    },
    update: {},
  });
}

export const subscriptionService = {
  ensureSubscription,
};
