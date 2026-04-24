import { prisma } from "../../lib/prisma/prisma.js";
import type { CreatePendingPaymentInput, MarkPaymentPaidInput } from "./payment.types.js";

async function createPendingPayment(input: CreatePendingPaymentInput): Promise<void> {
  await prisma.payment.create({
    data: {
      checkoutId: input.checkoutId,
      providerPaymentIntentId: input.paymentIntentId,
      amount: input.amount,
      currency: input.currency,
      status: "PENDING",
    },
  });
}

async function markPaymentPaid(input: MarkPaymentPaidInput): Promise<void> {
  await prisma.payment.updateMany({
    where: {
      providerPaymentIntentId: input.paymentIntentId,
      status: {
        not: "PAID",
      },
    },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });
}

export const paymentService = {
  createPendingPayment,
  markPaymentPaid,
};
