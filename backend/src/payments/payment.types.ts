import type { PaymentProvider, Prisma } from '@prisma/client';

export type PaymentOutcome = 'paid' | 'pending' | 'failed' | 'refunded';

export interface VerifiedPaymentNotice {
  orderId: string;
  outcome: PaymentOutcome;
  amount: Prisma.Decimal;
  providerRef: string | null;
}

export interface CheckoutRequest {
  orderId: string;
  amount: number;
  courseTitle: string;
  payerEmail: string;
  payerName: string;
  returnUrl: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  providerRef: string | null;
}

export interface QrisSession {
  qrString: string;
  qrUrl: string | null;
  providerRef: string | null;
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createCheckout(input: CheckoutRequest): Promise<CheckoutSession>;
  createQris(input: CheckoutRequest): Promise<QrisSession>;
}

export interface CheckoutResult {
  orderId: string;
  method: 'REDIRECT' | 'QRIS';
  checkoutUrl: string | null;
  qrString: string | null;
  amount: string;
  currency: 'IDR';
  enrollmentStatus: 'PENDING';
}

export interface WebhookAck {
  received: true;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
