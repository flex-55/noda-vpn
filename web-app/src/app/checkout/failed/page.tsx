import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FailedPageProps = {
  searchParams: {
    reason?: string;
    checkoutId?: string;
  };
};

export default function CheckoutFailedPage({ searchParams }: FailedPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Card className="w-full rounded-[2rem] border-rose-200 bg-white/90 shadow-glow">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 font-display text-3xl">Checkout needs attention</CardTitle>
          <CardDescription>
            Payment or provisioning could not be completed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
            {searchParams.reason ?? "Please retry checkout or contact support if the problem persists."}
          </div>
          {searchParams.checkoutId ? (
            <p className="text-sm text-muted-foreground">Reference: {searchParams.checkoutId}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Choose a plan again</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="mailto:support@noda.test">Contact support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}