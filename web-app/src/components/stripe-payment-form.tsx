"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { Button } from "@/components/ui/button";

type StripePaymentFormProps = {
  checkoutId: string;
  clientSecret: string;
  email: string;
};

export function StripePaymentForm({ checkoutId, clientSecret, email }: StripePaymentFormProps) {
  const stripePromise = getStripePromise();

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#15705c",
          colorBackground: "#ffffff",
          colorText: "#11332d",
          borderRadius: "16px",
        },
      },
    }),
    [clientSecret],
  );

  if (!stripePromise) {
    return <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Missing Stripe publishable key configuration.</div>;
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      <StripePaymentFormInner checkoutId={checkoutId} email={email} />
    </Elements>
  );
}

function StripePaymentFormInner({ checkoutId, email }: { checkoutId: string; email: string }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage("Payment form is still loading. Try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const returnUrl = `${window.location.origin}/checkout/success?checkoutId=${checkoutId}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: email,
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (result.error) {
      router.push(`/checkout/failed?checkoutId=${checkoutId}&reason=${encodeURIComponent(result.error.message ?? "Payment confirmation failed.")}`);
      return;
    }

    if (result.paymentIntent?.status === "succeeded" || result.paymentIntent?.status === "processing") {
      router.push(`/checkout/success?checkoutId=${checkoutId}`);
      return;
    }

    setMessage("Payment confirmation is pending. Please wait or try again.");
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
        <PaymentElement />
      </div>

      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div> : null}

      <Button className="w-full" disabled={!stripe || !elements || isSubmitting} type="submit">
        {isSubmitting ? "Confirming payment..." : "Pay securely"}
      </Button>
    </form>
  );
}