import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-lines absolute inset-0 opacity-40" />
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-10 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/60 pb-6">
          <div>
            <p className="font-display text-xl tracking-tight">Noda VPN</p>
            <p className="text-sm text-muted-foreground">Private browsing for fast-moving teams.</p>
          </div>
          <Badge className="bg-secondary text-secondary-foreground">Checkout Preview</Badge>
        </header>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-2xl">
            <Badge className="mb-5 bg-white/70 text-foreground shadow-sm backdrop-blur">Deploy in minutes</Badge>
            <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
              One clean checkout flow for your VPN subscription business.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Start with a plan, confirm payment securely with Stripe, and let the backend provision access in the
              background with retries, idempotency, and recovery built in.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-glow backdrop-blur">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <p className="mt-4 font-semibold">Stripe secured</p>
                <p className="mt-2 text-sm text-muted-foreground">Payment Element with client-secret based confirmation.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-glow backdrop-blur">
                <Zap className="h-6 w-6 text-primary" />
                <p className="mt-4 font-semibold">Fast handoff</p>
                <p className="mt-2 text-sm text-muted-foreground">Queue-driven provisioning keeps checkout responsive.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-glow backdrop-blur">
                <Sparkles className="h-6 w-6 text-primary" />
                <p className="mt-4 font-semibold">Resumable workflow</p>
                <p className="mt-2 text-sm text-muted-foreground">Success screen tracks progress until provisioning completes.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-glow backdrop-blur">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Why teams pick Noda</p>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-foreground/80">
              <li>Provision subscriptions after payment without tying up the browser.</li>
              <li>Resume safely if Stripe webhooks or downstream services retry.</li>
              <li>Use one checkout journey across web and mobile acquisition campaigns.</li>
            </ul>
          </div>
        </div>

        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="font-display text-3xl tracking-tight sm:text-4xl">Choose your plan</p>
              <p className="mt-2 text-muted-foreground">Clear pricing, annual savings, and a checkout flow built to scale.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <PricingCard key={`${product.planId}-${product.billingCycle}`} product={product} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}