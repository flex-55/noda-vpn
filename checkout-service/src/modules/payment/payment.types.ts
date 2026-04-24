export type CreatePendingPaymentInput = {
  checkoutId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
};

export type MarkPaymentPaidInput = {
  paymentIntentId: string;
};
