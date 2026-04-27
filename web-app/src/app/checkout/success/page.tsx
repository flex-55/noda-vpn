import Link from "next/link";
import { CheckoutStatusCard } from "@/components/checkout-status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SuccessPageProps = {
  searchParams: {
    checkoutId?: string;
  };
};

export default function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-4xl tracking-tight">Provisioning in progress</p>
          <p className="mt-2 text-muted-foreground">
            Your payment has been submitted. We are finalizing VPN access in the background.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/">Back home</Link>
        </Button>
      </div>

      {searchParams.checkoutId ? (
        <CheckoutStatusCard checkoutId={searchParams.checkoutId} />
      ) : (
        <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-glow">
          <CardContent className="p-8">
            <p className="text-lg font-semibold">Missing checkout reference</p>
            <p className="mt-2 text-muted-foreground">
              We could not determine which checkout to track. Return to pricing and start again.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}