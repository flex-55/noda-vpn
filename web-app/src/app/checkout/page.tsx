import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductBySelection, normalizeBillingCycleParam, normalizePlanIdParam } from "@/lib/products";

type CheckoutPageProps = {
  searchParams: {
    planId?: string;
    billingCycle?: string;
  };
};

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const planId = normalizePlanIdParam(searchParams.planId);
  const billingCycle = normalizeBillingCycleParam(searchParams.billingCycle);
  const selectedProduct = planId && billingCycle ? getProductBySelection(planId, billingCycle) : null;

  if (!selectedProduct) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full rounded-[2rem] border-white/70 bg-white/85 shadow-glow">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Invalid plan selection</CardTitle>
            <CardDescription>
              Choose a valid subscription option before starting checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to pricing</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-4xl tracking-tight">Secure checkout</p>
          <p className="mt-2 text-muted-foreground">Finish payment to provision your Noda VPN subscription.</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/">Back to pricing</Link>
        </Button>
      </div>

      <CheckoutForm product={selectedProduct} />
    </main>
  );
}