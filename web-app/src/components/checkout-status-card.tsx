"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";
import { getCheckoutStatus } from "@/lib/api";
import { clearCheckoutKeys } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckoutStatusCardProps = {
  checkoutId: string;
};

const MAX_STATUS_POLL_ATTEMPTS = 5;
const STATUS_POLL_INTERVAL_MS = 2000;

export function CheckoutStatusCard({ checkoutId }: CheckoutStatusCardProps) {
  const router = useRouter();
  const pollingAttemptCountRef = useRef(0);
  const [pollingAttemptCount, setPollingAttemptCount] = useState(0);

  const statusQuery = useQuery({
    queryKey: ["checkout-status", checkoutId],
    queryFn: async ({ signal }) => {
      const nextAttemptCount = Math.min(pollingAttemptCountRef.current + 1, MAX_STATUS_POLL_ATTEMPTS);

      pollingAttemptCountRef.current = nextAttemptCount;
      setPollingAttemptCount(nextAttemptCount);

      if (process.env.NODE_ENV === "development") {
        console.log(`[checkout-status] poll attempt count: ${nextAttemptCount}/${MAX_STATUS_POLL_ATTEMPTS}`);
      }

      return getCheckoutStatus(checkoutId, { signal });
    },
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const hasReachedMaxAttempts = pollingAttemptCountRef.current >= MAX_STATUS_POLL_ATTEMPTS;

      if (status === "COMPLETED" || status === "FAILED" || hasReachedMaxAttempts) {
        return false;
      }

      return STATUS_POLL_INTERVAL_MS;
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const statusData = statusQuery.data;

  useEffect(() => {
    pollingAttemptCountRef.current = 0;
    setPollingAttemptCount(0);
  }, [checkoutId]);

  useEffect(() => {
    if (statusData?.status === "COMPLETED") {
      clearCheckoutKeys();
    }

    if (statusData?.status === "FAILED") {
      const reason = statusData.lastError ?? "Provisioning failed after payment confirmation.";
      router.replace(`/checkout/failed?checkoutId=${checkoutId}&reason=${encodeURIComponent(reason)}`);
    }
  }, [checkoutId, router, statusData]);

  const status = statusData?.status ?? "PENDING_PAYMENT";
  const statusMeta = getStatusMeta(status);

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-glow">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <statusMeta.icon className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="font-display text-3xl tracking-tight">{statusMeta.title}</CardTitle>
            <CardDescription className="mt-2">{statusMeta.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-3xl bg-background/70 p-5 sm:grid-cols-4">
          <StatusMetric label="Checkout" value={checkoutId} />
          <StatusMetric label="Workflow status" value={status} />
          {/* <StatusMetric label="Attempts" value={String(statusData?.workflowAttempts ?? 0)} /> */}
          <StatusMetric label="Polling attempts" value={`${pollingAttemptCount}/${MAX_STATUS_POLL_ATTEMPTS}`} />
        </div>

        {statusQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking status...</p>
        ) : null}

        {statusQuery.error ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusQuery.error instanceof Error ? statusQuery.error.message : "Could not retrieve checkout status."}
          </div>
        ) : null}

        {status === "COMPLETED" ? (
          <div className="space-y-4 rounded-3xl bg-emerald-50 p-5 text-emerald-800">
            <p className="font-semibold">Your subscription is active.</p>
            <p className="text-sm">
              Provisioning finished successfully. The backend has completed payment reconciliation and account setup.
            </p>
            <Button asChild>
              <Link href="/">Return to pricing</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl bg-secondary/60 p-5 text-sm text-secondary-foreground">
            Keep this page open while we reconcile payment and provision your VPN access.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function getStatusMeta(status: string) {
  switch (status) {
    case "PAYMENT_COMPLETED":
      return {
        icon: LoaderCircle,
        title: "Payment received",
        description: "Provisioning is underway. We are creating your license, subscription, and identity.",
      };
    case "COMPLETED":
      return {
        icon: CheckCircle2,
        title: "Everything is ready",
        description: "The backend finished the post-payment workflow successfully.",
      };
    default:
      return {
        icon: CircleDashed,
        title: "Waiting for confirmation",
        description: "Stripe and the backend are coordinating payment and provisioning state.",
      };
  }
}
