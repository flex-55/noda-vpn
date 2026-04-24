import { prisma } from "../../lib/prisma/prisma.js";
import type { EnsureNotificationInput } from "./notification.types.js";

async function ensureWelcomeNotification(input: EnsureNotificationInput): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: {
      checkoutId: input.checkoutId,
      type: "WELCOME_MAGIC_LINK",
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
      type: "WELCOME_MAGIC_LINK",
      payload: JSON.stringify({
        email: input.email,
      }),
      status: "PENDING_SEND",
    },
  });
}

export const notificationService = {
  ensureWelcomeNotification,
};
