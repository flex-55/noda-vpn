import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Product } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type PricingCardProps = {
  product: Product;
};

export function PricingCard({ product }: PricingCardProps) {
  return (
    <Card className="group flex h-full flex-col rounded-[2rem] border-white/70 bg-white/80 shadow-glow backdrop-blur transition-transform duration-300 hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-2xl tracking-tight">{product.name}</CardTitle>
            <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">{product.billingCycleLabel}</p>
          </div>
          {product.isFeatured ? <Badge>Best value</Badge> : null}
        </div>
        <div className="mt-6">
          <p className="font-display text-4xl tracking-tight">{product.priceLabel}</p>
          <p className="mt-2 text-sm text-muted-foreground">{product.subtitle}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3 text-sm text-foreground/85">
          {product.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                <Check className="h-4 w-4 text-primary" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full justify-between">
          <Link href={`/checkout?planId=${product.planId}&billingCycle=${product.billingCycle}`}>
            Subscribe
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}