"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createCheckoutSession } from "@/lib/api";
import { Product, toBackendBillingCycle, toBackendPlanCode } from "@/lib/products";
import { clearCheckoutKeys, getOrCreateIdempotencyKey } from "@/lib/utils";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CheckoutFormProps = {
  product: Product;
};

export function CheckoutForm({ product }: CheckoutFormProps) {
  const [email, setEmail] = useState("");
  const [checkoutSession, setCheckoutSession] = useState<{
    checkoutId: string;
    clientSecret: string;
    status: string;
  } | null>(null);

  const sessionMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = getOrCreateIdempotencyKey(product.planId, product.billingCycle);
      return createCheckoutSession({
        idempotencyKey,
        email,
        planCode: toBackendPlanCode(product.planId),
        billingCycle: toBackendBillingCycle(product.billingCycle),
      });
    },
    onSuccess: (result) => {
      setCheckoutSession({
        checkoutId: result.checkoutId,
        clientSecret: result.clientSecret,
        status: result.status,
      });
    },
  });

  function handleRestartCheckout() {
    clearCheckoutKeys();
    setCheckoutSession(null);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-glow">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display text-3xl tracking-tight">{product.name}</CardTitle>
              <CardDescription className="mt-2">{product.billingCycleLabel} subscription</CardDescription>
            </div>
            {product.isFeatured ? <Badge>Popular</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl bg-secondary/70 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-secondary-foreground/70">Today&apos;s total</p>
            <p className="mt-2 font-display text-4xl tracking-tight">{product.priceLabel}</p>
            <p className="mt-2 text-sm text-secondary-foreground/80">{product.subtitle}</p>
          </div>
          <ul className="space-y-3 text-sm text-foreground/80">
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <Button asChild variant="ghost">
            <Link href="/">Choose a different plan</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-glow">
        <CardHeader>
          <CardTitle className="font-display text-3xl tracking-tight">Checkout details</CardTitle>
          <CardDescription>
            Enter your email, create the checkout session, then complete payment securely with Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!checkoutSession ? (
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void sessionMutation.mutateAsync();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {sessionMutation.error ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {sessionMutation.error instanceof Error ? sessionMutation.error.message : "Could not create checkout session."}
                </div>
              ) : null}

              <Button className="w-full" disabled={sessionMutation.isPending || !email.trim()} type="submit">
                {sessionMutation.isPending ? "Preparing secure checkout..." : "Continue to payment"}
              </Button>
            </form>
          ) : (
            <StripePaymentForm
              checkoutId={checkoutSession.checkoutId}
              clientSecret={checkoutSession.clientSecret}
              email={email}
              onRestartCheckout={handleRestartCheckout}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}