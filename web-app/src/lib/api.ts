const API_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_API_BASE_URL ?? "http://localhost:4242";

export type CreateCheckoutSessionRequest = {
  idempotencyKey: string;
  email: string;
  planCode: "vpn_basic" | "vpn_pro";
  billingCycle: "monthly" | "yearly";
};

export type CreateCheckoutSessionResponse = {
  checkoutId: string;
  status: string;
  paymentIntentId: string;
  clientSecret: string;
};

export type CheckoutStatusResponse = {
  checkoutId: string;
  status: string;
  lastError: string | null;
  workflowAttempts: number;
};

export async function createCheckoutSession(
  input: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      email: input.email,
      planCode: input.planCode,
      billingCycle: input.billingCycle,
    }),
  });

  if (!response.ok) {
    throw new Error(await toApiErrorMessage(response, "Could not create checkout session."));
  }

  return response.json();
}

export async function getCheckoutStatus(checkoutId: string): Promise<CheckoutStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/checkout/sessions/${checkoutId}`, {
    method: "GET",
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await toApiErrorMessage(response, "Could not fetch checkout status."));
  }

  return response.json();
}

async function toApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}