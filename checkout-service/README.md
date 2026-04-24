# Noda VPN Checkout Service

Backend service for VPN checkout orchestration.

It handles:
- checkout session creation
- Stripe payment intent initialization
- Stripe webhook ingestion
- asynchronous post-payment workflow execution (license, subscription, identity, notification)
- retries, idempotency, and compensation on unrecoverable failures

## Architecture Summary

This project is a modular monolith built with Express and TypeScript. It combines synchronous HTTP APIs with asynchronous workflow processing through BullMQ.

Core components:
- API layer (Express): receives checkout and webhook requests
- Database layer (Prisma + SQLite): stores checkout, payment, event, and workflow state
- Queue layer (BullMQ + Redis): enqueues and processes resume-checkout jobs
- Payment provider integration (Stripe SDK)

High-level flow:
1. Client calls checkout session endpoint with idempotency key.
2. Service creates/reuses checkout session and creates Stripe PaymentIntent.
3. Client confirms payment with Stripe.
4. Stripe sends `payment_intent.succeeded` webhook.
5. Webhook handler stores event idempotently and enqueues a workflow job.
6. Worker resumes workflow steps until checkout is completed.
7. If retries are exhausted, compensation notification is created for manual review.

## Architecture Workflow

```text
Client (Web/Mobile)
  |
  | POST /checkout/sessions
  | Idempotency-Key: <key>
  v
Checkout API
  |
  | Create or reuse checkout session (PENDING_PAYMENT)
  | Create Stripe PaymentIntent
  | Return clientSecret
  v
Client confirms payment with Stripe
  |
  v
Stripe Webhook
  |
  | payment_intent.succeeded
  | Verify signature
  | Store event idempotently
  | Enqueue resume-checkout job
  v
BullMQ Worker
  |
  | Mark payment PAID
  | Mark checkout PAYMENT_COMPLETED
  | Ensure VPN license
  | Ensure subscription
  | Ensure identity
  | Ensure notification
  v
Checkout COMPLETED

Failure path:
  - Job retries with exponential backoff
  - Workflow can resume from prior state
  - On final failure, compensation notification is created for manual review
```

## Tech Stack

- Node.js
- TypeScript
- Express
- Prisma ORM
- SQLite
- BullMQ
- Redis (ioredis)
- Stripe SDK
- Zod
- Pino
- pnpm
etc

## Folder Structure (Highlighted)

```text
checkout-service/
  src/
    app.ts                         # Express app and middleware wiring
    server.ts                      # HTTP bootstrap + worker startup + graceful shutdown
    lib/
      config/
        env.ts                     # Environment validation via Zod
      logger/
        logger.ts                  # Pino logger setup
      prisma/
        schema.prisma              # Data model
        prisma.ts                  # Prisma client singleton
        migrations/                # Prisma migrations
      queues/
        checkout.queue.ts          # BullMQ queue + enqueue helper
        checkout.worker.ts         # Worker processor for resume-checkout jobs
      redis/
        redis.ts                   # Shared Redis connections
      stripe/
        stripe.client.ts           # Stripe SDK client
        stripe.webhook.ts          # Webhook signature verification
        stripe.types.ts            # Stripe event type guards
    modules/
      checkout/
        index.ts                   # Router registration
        checkout.controller.ts     # HTTP handlers
        checkout.service.ts        # Checkout orchestration logic
        checkout.validation.ts     # Request validation schemas
        checkout.types.ts          # Module types
      payment/
        payment.service.ts         # Payment record transitions
      license/
        license.service.ts         # VPN license provisioning
      subscription/
        subscription.service.ts    # Subscription provisioning
      identity/
        identity.service.ts        # Identity provisioning
      notification/
        notification.service.ts    # Notification creation
```

Folder highlights:
- `src/lib` contains infrastructure adapters (DB, queue, Stripe, logging, config).
- `src/modules` contains domain workflows and business logic by capability.
- `src/modules/checkout` is the entry point and orchestrator for the full payment-to-provisioning flow.

## Requirements

- Node.js 20+
- pnpm 9+
- Redis server
- Stripe account and webhook secret

## Environment Variables

The service validates environment variables at startup.

Required:
- `PORT` (default `3000`)
- `DATABASE_URL` (Prisma SQLite URL, for example `file:./src/lib/prisma/noda.db`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_VERSION` (default `2024-06-20`)
- `REDIS_URL` (for example `redis://localhost:6379`)

## Local Setup

1. Install dependencies

```bash
pnpm install
```

2. Generate Prisma client

```bash
pnpm prisma:generate
```

3. Run migrations

```bash
pnpm prisma:migrate
```

4. Start development server

```bash
pnpm dev
```

The service starts both:
- HTTP API server
- BullMQ checkout worker

## Scripts

- `pnpm dev` - Run service in watch mode
- `pnpm build` - Compile TypeScript to `dist/`
- `pnpm start` - Run compiled build
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Apply development migrations
- `pnpm typecheck` - Run TypeScript type checks

## API Endpoints

### Health Check

- `GET /health`

Response:

```json
{ "ok": true }
```

### Create Checkout Session

- `POST /checkout/sessions`
- Required header: `idempotency-key`

Request body:

```json
{
  "email": "user@example.com",
  "planCode": "vpn_basic",
  "billingCycle": "monthly"
}
```

Response:

```json
{
  "checkoutId": "<id>",
  "status": "PENDING_PAYMENT",
  "paymentIntentId": "pi_...",
  "clientSecret": "pi_..._secret_..."
}
```

### Stripe Webhook

- `POST /webhooks/stripe`
- Body must be raw JSON for Stripe signature verification

The handler currently processes `payment_intent.succeeded` events and ignores unsupported event types.

## Reliability and Idempotency

- Checkout creation is idempotent by `idempotency-key`
- Webhooks are idempotent by Stripe event id
- Queue job id is deterministic: `checkoutId:stripeEventId` (deduplication)
- Workflow retries are configured via BullMQ attempts + exponential backoff
- Workflow is resumable and step-safe through idempotent service methods
- On final retry failure, a compensation notification record is created

## Graceful Shutdown

On `SIGTERM` or `SIGINT`, the service:
1. closes worker
2. closes queue
3. quits Redis connections
4. closes HTTP server

This minimizes dropped in-flight work during shutdown.

## Notes

- Status values are stored as strings for SQLite compatibility.
- JSON-like payloads are persisted as serialized strings.
- Redis uses separate connections for queue and worker to support BullMQ worker blocking behavior.