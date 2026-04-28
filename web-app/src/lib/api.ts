const API_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_API_BASE_URL ?? "http://localhost:3000";

function toNetworkErrorMessage(action: string): string {
  return `${action} Network error: could not reach checkout API at ${API_BASE_URL}. Ensure checkout-service is running and this URL is correct.`;
}

export type CreateCheckoutSessionRequest = {
  idempotencyKey: string;
  email: string;
  planCode: "vpn_basic" | "vpn_premium";
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
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/checkout/sessions`, {
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
  } catch {
    throw new Error(toNetworkErrorMessage("Could not create checkout session."));
  }

  if (!response.ok) {
    throw new Error(await toApiErrorMessage(response, "Could not create checkout session."));
  }

  return response.json();
}

export async function getCheckoutStatus(
  checkoutId: string,
  options: { signal?: AbortSignal } = {},
): Promise<CheckoutStatusResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/checkout/sessions/${checkoutId}`, {
      method: "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }

    throw new Error(toNetworkErrorMessage("Could not fetch checkout status."));
  }

  if (!response.ok) {
    throw new Error(await toApiErrorMessage(response, "Could not fetch checkout status."));
  }

  return response.json();
}

export async function verifyPayment(checkoutId: string): Promise<{ checkoutId: string; paymentVerified: boolean }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/checkout/sessions/${checkoutId}/verify-payment`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });
  } catch {
    throw new Error(toNetworkErrorMessage("Could not verify payment."));
  }

  if (!response.ok) {
    throw new Error(await toApiErrorMessage(response, "Could not verify payment."));
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
