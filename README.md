# Noda VPN — Technical Reference

A full-stack VPN subscription checkout system composed of two discrete services: a Node.js/Express backend (`checkout-service`) and a Next.js frontend (`web-app`). The system handles plan selection, Stripe payment collection, and post-payment provisioning through a resilient, queue-driven workflow.

---

## Repository Layout

```
noda-vpn/
├── checkout-service/   # Express API, BullMQ worker, Prisma ORM, Stripe integration
└── web-app/            # Next.js 14 storefront and checkout UI
```

---

## checkout-service

### Overview

The checkout service is a standalone HTTP API responsible for:

1. Creating idempotent checkout sessions backed by Stripe Payment Intents
2. Verifying Stripe webhook signatures and persisting incoming events
3. Enqueuing a post-payment provisioning workflow via BullMQ
4. Executing that workflow: marking payment, generating a VPN license, activating a subscription, creating an identity record, and queuing a welcome notification
5. Compensating failed workflows after exhausting all retry attempts

### Stack

| Concern | Technology |
|---|---|
| Runtime | Node.js (ESM, TypeScript) |
| HTTP framework | Express 4 |
| ORM / database | Prisma 5 with SQLite |
| Queue / worker | BullMQ 5 over Redis (ioredis) |
| Payment | Stripe SDK v16 |
| Validation | Zod |
| Logging | Pino + pino-http |

### Environment Variables

All variables are validated at startup via a Zod schema. The service refuses to boot if any are missing or malformed.

| Variable | Description |
|---|---|
| `PORT` | HTTP listen port (default `3000`) |
| `DATABASE_URL` | Prisma connection string (SQLite file path) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Secret used to verify `stripe-signature` headers |
| `STRIPE_API_VERSION` | Pinned Stripe API version (default `2024-06-20`) |
| `REDIS_URL` | Redis connection URL used by BullMQ |
| `NODE_ENV` | `development` \| `test` \| `production` |

### HTTP API

Base path: `http://localhost:<PORT>`

#### `GET /health`

Liveness probe. Returns `200 { ok: true }`.

---

#### `POST /checkout/sessions`

Creates a checkout session and a Stripe Payment Intent for the requested plan.

**Required headers**

| Header | Description |
|---|---|
| `idempotency-key` | Client-generated key (min 8 chars). Safe to retry — duplicate keys return the existing session. |
| `content-type` | `application/json` |

**Request body**

```json
{
  "email": "user@example.com",
  "planCode": "vpn_basic" | "vpn_pro",
  "billingCycle": "monthly" | "yearly"
}
```

**Response `200`**

```json
{
  "checkoutId": "<cuid>",
  "status": "PENDING_PAYMENT",
  "paymentIntentId": "pi_...",
  "clientSecret": "pi_..._secret_..."
}
```

**Idempotency behaviour**

The `idempotencyKey` is stored as a unique constraint on `CheckoutSession`. If a concurrent request creates the same key (Prisma `P2002`), the service recovers by re-fetching and returning the existing record — no duplicate Payment Intents are created.

**Pricing (hardcoded)**

| Plan | Monthly (USD) | Yearly (USD) |
|---|---|---|
| `vpn_basic` | $9.99 | $99.90 |
| `vpn_pro` | $14.99 | $149.90 |

Amounts are stored and transmitted in cents (Stripe convention).

---

#### `GET /checkout/sessions/:checkoutId`

Polls the current state of a checkout session.

**Response `200`**

```json
{
  "checkoutId": "<cuid>",
  "status": "PENDING_PAYMENT" | "PAYMENT_COMPLETED" | "COMPLETED" | "FAILED",
  "lastError": null | "<error message>",
  "workflowAttempts": 0
}
```

Returns `404` if the session does not exist.

---

#### `POST /webhooks/stripe`

Stripe webhook receiver. The route is registered **before** `express.json()` so the body is kept as a raw `Buffer` — required for `stripe.webhooks.constructEvent` signature verification. Requests missing or carrying an invalid `stripe-signature` header are rejected with `400`.

Currently handled event: `payment_intent.succeeded`

On receipt:
1. The event is persisted to `StripeEvent` with status `RECEIVED`.
2. The corresponding `CheckoutSession` is located via `stripePaymentIntentId`.
3. A BullMQ job is enqueued and the event is updated to `ENQUEUED`.
4. Duplicate delivery of the same event short-circuits (status `ENQUEUED` or `PROCESSED` → no-op).

---

### Checkout Lifecycle & State Machine

```
PENDING_PAYMENT
      │
      │  payment_intent.succeeded webhook received
      ▼
PAYMENT_COMPLETED  ──────────────────────────────────────┐
      │                                                   │
      │  BullMQ worker runs resumeCheckoutWorkflow        │ retry
      │    1. markPaymentPaid                             │ (exponential backoff,
      │    2. ensureLicense                               │  up to 10 attempts)
      │    3. ensureSubscription                          │
      │    4. ensureIdentity                              │
      │    5. ensureWelcomeNotification                   │
      ▼                                                   │
  COMPLETED                                        FAILED (after max attempts)
```

Every provisioning step uses `upsert` semantics — steps are safe to re-execute after a partial failure or a retry. If the worker exhausts all 10 attempts, `compensateFailedCheckout` marks the session `FAILED` and records the last error message.

---

### Queue Configuration

Queue name: `checkout-workflow`  
Job name: `resume-checkout`

| Option | Value |
|---|---|
| Max attempts | 10 |
| Backoff strategy | Exponential, starting at 1 s |
| Worker concurrency | 20 |
| `removeOnComplete` | 1 000 jobs retained |
| `removeOnFail` | 1 000 jobs retained |
| Job ID | `<checkoutId>:<stripeEventId>` (deduplication) |

Two separate ioredis connections are used — one for the queue client, one for the worker — following the BullMQ recommendation to avoid connection contention.

---

### Database Schema (Prisma / SQLite)

| Model | Purpose |
|---|---|
| `CheckoutSession` | Root aggregate; tracks idempotency key, plan, status, and Stripe references |
| `Payment` | Stripe Payment Intent record; transitions `PENDING → PAID` |
| `StripeEvent` | Immutable event log; tracks delivery status (`RECEIVED → ENQUEUED → PROCESSED`) |
| `VPNLicense` | Generated license key (`vpn_<32 hex chars>`); status `ACTIVE` |
| `Subscription` | Plan + billing cycle + date range; status `ACTIVE` |
| `Identity` | User identity with `temporarySecret` (18-byte base64url) for magic-link activation; status `PENDING_ACTIVATION` |
| `Notification` | Outbox record for welcome/magic-link emails; status `PENDING_SEND` |

All child models cascade-delete when their parent `CheckoutSession` is deleted.

---

### Graceful Shutdown

On `SIGTERM` or `SIGINT` the server:
1. Closes the BullMQ worker (drains in-flight jobs)
2. Closes the BullMQ queue client
3. Quits both Redis connections
4. Closes the HTTP server

---

### Scripts

```bash
pnpm dev              # tsx watch — live reload during development
pnpm build            # tsc compile → dist/
pnpm start            # node dist/server.js (production)
pnpm prisma:generate  # regenerate Prisma client
pnpm prisma:migrate   # run migrations (dev)
pnpm typecheck        # tsc --noEmit
```

---

## web-app

### Overview

The web app is a Next.js 14 (App Router) storefront that:

1. Presents VPN plan pricing with a `PricingCard` grid
2. Drives users through a checkout flow: email capture → `POST /checkout/sessions` → Stripe Payment Element → payment confirmation
3. Redirects to a success page that polls `GET /checkout/sessions/:id` until provisioning completes or fails
4. Displays a failure page with a reason string and support contact

### Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| UI primitives | Radix UI Slot, shadcn-style components |
| Stripe (frontend) | `@stripe/react-stripe-js` + `@stripe/stripe-js` |
| Server-state | TanStack Query v5 |
| Icons | Lucide React |

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CHECKOUT_API_BASE_URL` | Base URL of the checkout-service (default `http://localhost:4242`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key used to initialise `loadStripe` |

### Page Routes

| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | Marketing landing and plan pricing grid |
| `/checkout?planId=&billingCycle=` | `CheckoutPage` | Checkout session creation and Stripe payment form |
| `/checkout/success?checkoutId=` | `CheckoutSuccessPage` | Post-payment provisioning status tracker |
| `/checkout/failed?checkoutId=&reason=` | `CheckoutFailedPage` | Error display with retry and support options |

### Checkout Flow (client-side)

```
HomePage (plan selected)
      │  navigate to /checkout?planId=<id>&billingCycle=<cycle>
      ▼
CheckoutPage
  └─ CheckoutForm
        │  1. User enters email
        │  2. useMutation → POST /checkout/sessions
        │     Headers: idempotency-key (localStorage-persisted per plan+cycle)
        │  3. On success: clientSecret received
        ▼
  StripePaymentForm
        │  Stripe Payment Element (client_secret)
        │  stripe.confirmPayment() → return_url = /checkout/success?checkoutId=
        ▼
CheckoutSuccessPage
  └─ CheckoutStatusCard
        │  useQuery polling GET /checkout/sessions/:checkoutId
        │  Renders status badge: PENDING_PAYMENT / PAYMENT_COMPLETED / COMPLETED / FAILED
        │  Redirects to /checkout/failed on FAILED status
```

**Idempotency key strategy**: the key is generated once per `(planId, billingCycle)` combination and persisted to `localStorage` under a stable key. Reloading or retrying the same plan reuses the same key, preventing duplicate Payment Intents on the backend.

### API Client (`src/lib/api.ts`)

Thin `fetch` wrapper with no external dependencies. Reads `NEXT_PUBLIC_CHECKOUT_API_BASE_URL` at module load time.

| Function | Method | Path |
|---|---|---|
| `createCheckoutSession` | `POST` | `/checkout/sessions` |
| `getCheckoutStatus` | `GET` | `/checkout/sessions/:checkoutId` |

Error responses are decoded from the JSON body (`{ error: string }`) before being thrown, so TanStack Query surfaces meaningful messages.

### Product Catalogue (`src/lib/products.ts`)

Four static `Product` entries (2 plans × 2 billing cycles). Utility functions `normalizePlanIdParam` and `normalizeBillingCycleParam` accept URL query strings and return typed values or `null`, guarding the checkout page against invalid deep-links.

A translation layer (`toBackendPlanCode`, `toBackendBillingCycle`) maps frontend enum values (`vpn_premium`, `MONTHLY`) to the backend's expected values (`vpn_pro`, `monthly`).

### Scripts

```bash
pnpm dev          # next dev --port 3001
pnpm build        # next build
pnpm start        # next start --port 3001 (requires prior build)
pnpm typecheck    # tsc --noEmit
```

---

## Running Locally

### Prerequisites

- Node.js ≥ 20
- pnpm
- Redis instance (local or Docker)
- Stripe account + [Stripe CLI](https://stripe.com/docs/stripe-cli) for webhook forwarding

### 1. checkout-service

```bash
cd checkout-service
cp .env.example .env          # fill in DATABASE_URL, STRIPE_*, REDIS_URL
pnpm install
pnpm prisma:migrate           # creates the SQLite DB and runs migrations
pnpm prisma:generate          # generates the Prisma client
pnpm dev                      # starts on PORT (default 3000)
```

Forward Stripe webhooks locally:

```bash
stripe listen --forward-to http://localhost:3000/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

### 2. web-app

```bash
cd web-app
cp .env.example .env.local    # set NEXT_PUBLIC_CHECKOUT_API_BASE_URL and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
pnpm install
pnpm dev                      # starts on port 3001
```

Open [http://localhost:3001](http://localhost:3001).

---

## Key Design Decisions

**Idempotent checkout sessions** — the `idempotencyKey` unique constraint means the `POST /checkout/sessions` endpoint is safe to call multiple times from the browser (network retries, page reloads). The service returns the existing session rather than creating a second Payment Intent.

**Stripe webhook signature verification** — the `/webhooks/stripe` route receives the body as a raw `Buffer` before any JSON parsing middleware runs. This is required by `stripe.webhooks.constructEvent` to validate the HMAC signature; any body-parsing layer in between would corrupt the verification.

**Decoupled provisioning via BullMQ** — payment confirmation and resource provisioning are separated. The webhook handler returns `200` to Stripe immediately after enqueuing, keeping the webhook processing time well under Stripe's 30-second timeout. Provisioning happens asynchronously in the worker.

**Upsert-based workflow steps** — every provisioning step (`ensureLicense`, `ensureSubscription`, `ensureIdentity`, `ensureWelcomeNotification`) uses `upsert`. This makes the `resumeCheckoutWorkflow` function fully idempotent: if the worker retries after a partial failure, already-completed steps are no-ops.

**Duplicate event handling** — `StripeEvent` records are keyed on the Stripe event ID. If Stripe re-delivers the same event, the service detects the `ENQUEUED` or `PROCESSED` status and short-circuits without enqueuing a duplicate job. The BullMQ job ID (`<checkoutId>:<stripeEventId>`) provides a second deduplication layer at the queue level.

**Two Redis connections** — BullMQ requires separate connections for the queue client and the worker to avoid blocking operations interfering with each other. The service exports `redis` (queue) and `redisWorker` (worker) from `src/lib/redis/redis.ts`.
