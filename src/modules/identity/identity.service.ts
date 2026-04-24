import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma/prisma.js";
import type { EnsureIdentityInput } from "./identity.types.js";

function generateTemporarySecret(): string {
  return randomBytes(18).toString("base64url");
}

async function ensureIdentity(input: EnsureIdentityInput): Promise<void> {
  await prisma.identity.upsert({
    where: {
      checkoutId: input.checkoutId,
    },
    create: {
      checkoutId: input.checkoutId,
      email: input.email,
      temporarySecret: generateTemporarySecret(),
      activationStatus: "PENDING_ACTIVATION",
    },
    update: {},
  });
}

export const identityService = {
  ensureIdentity,
};
