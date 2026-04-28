import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma.js";
import { logger } from "../../lib/logger/logger.js";
import { stripeClient } from "../../lib/stripe/stripe.client.js";
import { isPaymentIntentSucceededEvent } from "../../lib/stripe/stripe.types.js";
import { enqueueCheckoutWorkflow } from "../../lib/queues/checkout.queue.js";
import { paymentService } from "../payment/payment.service.js";
import { licenseService } from "../license/license.service.js";
import { subscriptionService } from "../subscription/subscription.service.js";
import { identityService } from "../identity/identity.service.js";
import { notificationService } from "../notification/notification.service.js";
import type {
  HandleWebhookInput,
  ResumeCheckoutWorkflowInput,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResponse,
  GetCheckoutStatusResponse,
} from "./checkout.types.js";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  vpn_basic: {
    monthly: 999,
    yearly: 9990,
  },
  vpn_premium: {
    monthly: 1499,
    yearly: 14990,
  },
};

type BillingCycle = "monthly" | "yearly";
type PlanCode = keyof typeof PLAN_PRICES;

const CHECKOUT_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

function resolveAmount(planCode: PlanCode, billingCycle: BillingCycle): number {
  const plan = PLAN_PRICES[planCode];
  if (!plan) {
    throw new Error(`Unsupported plan: ${planCode}`);
  }

  return plan[billingCycle];
}

function mapCheckoutSessionResponse(checkout: {
  id: string;
  status: string;
  stripePaymentIntentId: string | null;
  clientSecret: string | null;
}): CreateCheckoutSessionResponse {
  if (!checkout.stripePaymentIntentId || !checkout.clientSecret) {
    throw new Error("Checkout was created without payment intent metadata");
  }

  return {
    checkoutId: checkout.id,
    status: checkout.status,
    paymentIntentId: checkout.stripePaymentIntentId,
    clientSecret: checkout.clientSecret,
  };
}

function mapCheckoutStatusResponse(checkout: {
  id: string;
  status: string;
  lastError: string | null;
  workflowAttempts: number;
}): GetCheckoutStatusResponse {
  return {
    checkoutId: checkout.id,
    status: checkout.status,
    lastError: checkout.lastError,
    workflowAttempts: checkout.workflowAttempts,
  };
}

async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResponse> {
  const existing = await prisma.checkoutSession.findUnique({
    where: {
      idempotencyKey: input.idempotencyKey,
    },
    select: {
      id: true,
      status: true,
      stripePaymentIntentId: true,
      clientSecret: true,
    },
  });

  if (existing?.stripePaymentIntentId && existing.clientSecret) {
    return mapCheckoutSessionResponse(existing);
  }

  const amount = resolveAmount(input.planCode, input.billingCycle);

  try {
    // Create checkout session record in DB with PENDING_PAYMENT status
    const checkout =
      existing ??
      (await prisma.checkoutSession.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          email: input.email,
          planCode: input.planCode,
          billingCycle: input.billingCycle,
          status: CHECKOUT_STATUS.PENDING_PAYMENT,
        },
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
          clientSecret: true,
        },
      }));

    // Create Stripe Payment Intent with metadata linking back to our checkout session
      const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        checkoutId: checkout.id,
        planCode: input.planCode,
        billingCycle: input.billingCycle,
        email: input.email,
      },
    });

    const updatedCheckout = await prisma.$transaction(async (tx) => {
      // Create payment record linked to checkout session
      await tx.payment.create({
        data: {
          checkoutId: checkout.id,
          provider: "stripe",
          providerPaymentIntentId: paymentIntent.id,
          amount,
          currency: "usd",
          status: "PENDING",
        },
      });

      // Update checkout session with Stripe payment intent details and return updated record
      return tx.checkoutSession.update({
        where: {
          id: checkout.id,
        },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        },
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
          clientSecret: true,
        },
      });
    });

    return mapCheckoutSessionResponse(updatedCheckout);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await prisma.checkoutSession.findUnique({
        where: {
          idempotencyKey: input.idempotencyKey,
        },
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
          clientSecret: true,
        },
      });

      if (concurrent?.stripePaymentIntentId && concurrent.clientSecret) {
        return mapCheckoutSessionResponse(concurrent);
      }
    }

    logger.error({ err: error, idempotencyKey: input.idempotencyKey }, "Failed to start checkout");
    throw error;
  }
}

async function getCheckoutStatus(checkoutId: string): Promise<GetCheckoutStatusResponse | null> {
  const checkout = await prisma.checkoutSession.findUnique({
    where: {
      id: checkoutId,
    },
    select: {
      id: true,
      status: true,
      lastError: true,
      workflowAttempts: true,
    },
  });

  if (!checkout) {
    return null;
  }

  return mapCheckoutStatusResponse(checkout);
}

async function handleStripeWebhook(input: HandleWebhookInput): Promise<void> {
  if (!isPaymentIntentSucceededEvent(input.event)) {
    return;
  }

  console.log("Received Stripe webhook event:", input.event.type, "for PaymentIntent:", input.event.data.object.id);

  const event = input.event;
  const paymentIntentId = event.data.object.id;

  let storedEvent = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
  });

  if (!storedEvent) {
    storedEvent = await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payload: JSON.stringify(event),
        status: "RECEIVED",
      },
    });
  } else if (storedEvent.status === "ENQUEUED" || storedEvent.status === "PROCESSED") {
    return;
  }

  const checkout = await prisma.checkoutSession.findUnique({
    where: {
      stripePaymentIntentId: paymentIntentId,
    },
    select: {
      id: true,
    },
  });

  if (!checkout) {
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "ORPHANED",
        processedAt: new Date(),
      },
    });
    return;
  }

  await enqueueCheckoutWorkflow({
    checkoutId: checkout.id,
    stripeEventId: event.id,
  });

  await prisma.stripeEvent.update({
    where: { id: event.id },
    data: {
      checkoutId: checkout.id,
      status: "ENQUEUED",
      processedAt: new Date(),
    },
  });
}

async function resumeCheckoutWorkflow(input: ResumeCheckoutWorkflowInput): Promise<void> {
  const checkout = await prisma.checkoutSession.findUnique({
    where: {
      id: input.checkoutId,
    },
    select: {
      id: true,
      email: true,
      planCode: true,
      billingCycle: true,
      stripePaymentIntentId: true,
      status: true,
    },
  });

  if (!checkout) {
    throw new Error(`Checkout not found: ${input.checkoutId}`);
  }

  if (!checkout.stripePaymentIntentId) {
    throw new Error(`Checkout ${input.checkoutId} has no stripePaymentIntentId`);
  }

  if (checkout.status === CHECKOUT_STATUS.COMPLETED) {
    await prisma.stripeEvent.updateMany({
      where: {
        id: input.stripeEventId,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
    return;
  }

  try {
    await paymentService.markPaymentPaid({
      paymentIntentId: checkout.stripePaymentIntentId,
    });

    await prisma.checkoutSession.update({
      where: { id: checkout.id },
      data: {
        status: CHECKOUT_STATUS.PAYMENT_COMPLETED,
      },
    });

    await licenseService.ensureLicense({
      checkoutId: checkout.id,
    });

    await subscriptionService.ensureSubscription({
      checkoutId: checkout.id,
      planCode: checkout.planCode,
      billingCycle: checkout.billingCycle,
    });

    await identityService.ensureIdentity({
      checkoutId: checkout.id,
      email: checkout.email,
    });

    await notificationService.ensureWelcomeNotification({
      checkoutId: checkout.id,
      email: checkout.email,
    });

    await prisma.checkoutSession.update({
      where: { id: checkout.id },
      data: {
        status: CHECKOUT_STATUS.COMPLETED,
        lastError: null,
      },
    });

    await prisma.stripeEvent.updateMany({
      where: {
        id: input.stripeEventId,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.checkoutSession.update({
      where: {
        id: checkout.id,
      },
      data: {
        workflowAttempts: {
          increment: 1,
        },
        lastError: error instanceof Error ? error.message : "Unknown workflow error",
        status: CHECKOUT_STATUS.FAILED,
      },
    });

    throw error;
  }
}

async function compensateFailedCheckout(input: { checkoutId: string; errorMessage: string }): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: {
      checkoutId: input.checkoutId,
      type: "CHECKOUT_COMPENSATION_REQUIRED",
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return;
  }

  await prisma.notification.create({
    data: {
      checkoutId: input.checkoutId,
      type: "CHECKOUT_COMPENSATION_REQUIRED",
      payload: JSON.stringify({
        reason: input.errorMessage,
      }),
      status: "PENDING_MANUAL_REVIEW",
    },
  });
}

export const checkoutService = {
  createCheckoutSession,
  getCheckoutStatus,
  handleStripeWebhook,
  resumeCheckoutWorkflow,
  compensateFailedCheckout,
};
