import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProductBillingCycle, ProductPlanId } from "@/lib/products";

const CHECKOUT_KEY_PREFIX = "noda-vpn:checkout-key:";
const CHECKOUT_KEY_TTL_MS = 30 * 60 * 1000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOrCreateIdempotencyKey(planId: ProductPlanId, billingCycle: ProductBillingCycle): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const storageKey = `${CHECKOUT_KEY_PREFIX}${planId}:${billingCycle}`;
  const rawValue = window.localStorage.getItem(storageKey);

  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as { key: string; createdAt: number };
      if (parsed.key && Date.now() - parsed.createdAt < CHECKOUT_KEY_TTL_MS) {
        return parsed.key;
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }

  const nextKey = crypto.randomUUID();
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      key: nextKey,
      createdAt: Date.now(),
    }),
  );
  return nextKey;
}

export function clearCheckoutKeys() {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(CHECKOUT_KEY_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
}