export type ProductPlanId = "vpn_basic" | "vpn_premium";
export type ProductBillingCycle = "MONTHLY" | "YEARLY";

export type Product = {
  planId: ProductPlanId;
  name: string;
  billingCycle: ProductBillingCycle;
  billingCycleLabel: string;
  priceLabel: string;
  subtitle: string;
  features: string[];
  isFeatured?: boolean;
};

export const products: Product[] = [
  {
    planId: "vpn_basic",
    name: "VPN Basic",
    billingCycle: "MONTHLY",
    billingCycleLabel: "Monthly",
    priceLabel: "$9.99/mo",
    subtitle: "Flexible entry plan for essential protection.",
    features: ["Secure VPN", "3 devices", "Standard support"],
  },
  {
    planId: "vpn_basic",
    name: "VPN Basic",
    billingCycle: "YEARLY",
    billingCycleLabel: "Yearly",
    priceLabel: "$99.90/yr",
    subtitle: "Lower annual spend for everyday secure browsing.",
    features: ["Secure VPN", "3 devices", "Standard support", "Two months free"],
  },
  {
    planId: "vpn_premium",
    name: "VPN Premium",
    billingCycle: "MONTHLY",
    billingCycleLabel: "Monthly",
    priceLabel: "$14.99/mo",
    subtitle: "For heavier usage across personal and work devices.",
    features: ["Secure VPN", "10 devices", "Priority support", "Faster routing"],
  },
  {
    planId: "vpn_premium",
    name: "VPN Premium",
    billingCycle: "YEARLY",
    billingCycleLabel: "Yearly",
    priceLabel: "$149.90/yr",
    subtitle: "Best value for teams and power users.",
    features: ["Secure VPN", "10 devices", "Priority support", "Faster routing", "Dedicated onboarding"],
    isFeatured: true,
  },
];

export function normalizePlanIdParam(value?: string): ProductPlanId | null {
  if (value === "vpn_basic") {
    return value;
  }

  if (value === "vpn_premium") {
    return "vpn_premium";
  }

  return null;
}

export function normalizeBillingCycleParam(value?: string): ProductBillingCycle | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();

  if (normalized === "MONTHLY" || normalized === "YEARLY") {
    return normalized;
  }

  return null;
}

export function getProductBySelection(planId: ProductPlanId, billingCycle: ProductBillingCycle): Product | null {
  return products.find((product) => product.planId === planId && product.billingCycle === billingCycle) ?? null;
}

export function toBackendPlanCode(planId: ProductPlanId): "vpn_basic" | "vpn_premium" {
  return planId === "vpn_premium" ? "vpn_premium" : "vpn_basic";
}

export function toBackendBillingCycle(billingCycle: ProductBillingCycle): "monthly" | "yearly" {
  return billingCycle === "MONTHLY" ? "monthly" : "yearly";
}