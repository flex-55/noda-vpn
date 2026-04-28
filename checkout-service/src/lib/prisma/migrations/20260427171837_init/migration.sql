-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "stripePaymentIntentId" TEXT,
    "clientSecret" TEXT,
    "lastError" TEXT,
    "workflowAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerPaymentIntentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "checkoutId" TEXT,
    "processedAt" DATETIME,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VPNLicense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VPNLicense_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "temporarySecret" TEXT NOT NULL,
    "activationStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Identity_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CheckoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_idempotencyKey_key" ON "CheckoutSession"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_stripePaymentIntentId_key" ON "CheckoutSession"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkoutId_key" ON "Payment"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentIntentId_key" ON "Payment"("providerPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "VPNLicense_checkoutId_key" ON "VPNLicense"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "VPNLicense_licenseKey_key" ON "VPNLicense"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_checkoutId_key" ON "Subscription"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_checkoutId_key" ON "Identity"("checkoutId");

-- CreateIndex
CREATE INDEX "Notification_checkoutId_idx" ON "Notification"("checkoutId");
