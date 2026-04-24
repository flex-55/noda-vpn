Your company sells VPN subscriptions (like ExpressVPN).
A non-authenticated user starts a checkout on web or mobile.
The checkout flow must perform these steps:
1. Process payment via a payment provider
2. Create a VPN license for the user
3. Create a subscription record (plan, billing cycle, etc.)
4. Create an initial user identity (with temporary password)
5. Send a notification with a magic-link or reset link
The flow can fail at any step.
It must be able to resume automatically from the exact point it stopped,
and rollback/compensate if recovery fails after several attempts.
Assume high concurrency and that users may refresh or retry the checkout.
The Task definition
Design the backend architecture to support this flow.
Focus on:
- Service boundaries and their responsibilities
- Databases
- How services communicate
- Handling failures, retries, and idempotency
- Ensuring data consistency and recovery after crashes


noda-vpn(checkout-service)/
  src/
    app.ts
    server.ts

    lib/
      config/
        env.ts
      prisma/
        schema.prisma
        noda.db
        prisma.ts
        migrations/
      logger/
        logger.ts
      stripe/
        stripe.client.ts
        stripe.webhook.ts
        stripe.types.ts
      queues/
        checkout.queue.ts
        checkout.worker.ts

    modules/
      checkout/
        index.ts
        checkout.controller.ts
        checkout.service.ts
        checkout.validation.ts
        checkout.types.ts

      payment/
        payment.service.ts
        payment.types.ts

      license/
        license.service.ts
        license.types.ts

      subscription/
        subscription.service.ts
        subscription.types.ts

      identity/
        identity.service.ts
        identity.types.ts

      notification/
        notification.service.ts
        notification.types.ts

Architecture - Workflow
Client
  |
  | POST /checkout/start
  | Idempotency-Key: abc-123
  v
Checkout API
  |
  | Create checkout session: PENDING_PAYMENT
  | Create Stripe PaymentIntent
  | Return clientSecret
  v
Client confirms payment with Stripe
  |
  v
Stripe Webhook
  |
  | payment_intent.succeeded
  | Store event
  | Enqueue workflow job
  v
BullMQ Checkout Worker
  |
  | Mark payment as PAID
  | Mark checkout as PAYMENT_COMPLETED
  | Create VPN license
  | Create subscription
  | Create identity
  | Send notification
  v
COMPLETED

Tech stack
- Nodejs
- TypeScript
- pnpm
- express
- lint
- modular architecture
- prisma
- sqlite
- libsql
- prisma client libsql
- BullMQ
- zod
- pino logger
etc