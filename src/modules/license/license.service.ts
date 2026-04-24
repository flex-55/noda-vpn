import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma/prisma.js";
import type { EnsureLicenseInput } from "./license.types.js";

function generateLicenseKey(): string {
  return `vpn_${randomBytes(16).toString("hex")}`;
}

async function ensureLicense(input: EnsureLicenseInput): Promise<void> {
  await prisma.vPNLicense.upsert({
    where: {
      checkoutId: input.checkoutId,
    },
    create: {
      checkoutId: input.checkoutId,
      licenseKey: generateLicenseKey(),
      status: "ACTIVE",
    },
    update: {},
  });
}

export const licenseService = {
  ensureLicense,
};
