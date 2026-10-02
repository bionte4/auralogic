import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isRecord, readString } from '../json';
import { safeEqual } from '../safe-equal';
import type { PaymentOutcome, VerifiedPaymentNotice } from '../payment.types';

export function verifyXenditNotification(
  rawBody: Buffer,
  callbackToken: string | undefined,
  webhookToken: string,
): VerifiedPaymentNotice {
  if (!callbackToken || !safeEqual(callbackToken, webhookToken)) {
    throw new UnauthorizedException('Invalid payment signature.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new BadRequestException('Invalid notification body.');
  }
  if (!isRecord(payload)) {
    throw new BadRequestException('Invalid notification body.');
  }

  const orderId = readString(payload, 'external_id');
  const status = readString(payload, 'status');
  if (!orderId || !status) {
    throw new BadRequestException('Notification is missing required fields.');
  }

  const currency = readString(payload, 'currency');
  if (currency && currency !== 'IDR') {
    throw new BadRequestException('Only IDR payments can grant course access.');
  }

  const outcome = xenditOutcome(status);
  const amount = readAmount(payload, outcome === 'paid' ? 'paid_amount' : 'amount');

  return {
    orderId,
    outcome,
    amount,
    providerRef: readString(payload, 'id'),
  };
}

function xenditOutcome(status: string): PaymentOutcome {
  if (status === 'PAID' || status === 'SETTLED') {
    return 'paid';
  }
  if (status === 'PENDING') {
    return 'pending';
  }
  return 'failed';
}

function readAmount(payload: Record<string, unknown>, field: string): Prisma.Decimal {
  const value = payload[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException('Invalid payment amount.');
  }
  return new Prisma.Decimal(value);
}
