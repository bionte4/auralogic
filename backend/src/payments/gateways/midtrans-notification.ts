import { createHash } from 'crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isRecord, readRawJsonString, readString } from '../json';
import { safeEqual } from '../safe-equal';
import type { PaymentOutcome, VerifiedPaymentNotice } from '../payment.types';

export function verifyMidtransNotification(rawBody: Buffer, serverKey: string): VerifiedPaymentNotice {
  const raw = rawBody.toString('utf8');
  const payload = parseObject(raw);
  const orderId = readString(payload, 'order_id');
  const statusCode = readRawJsonString(raw, 'status_code');
  const grossAmount = readRawJsonString(raw, 'gross_amount');
  const signature = readString(payload, 'signature_key');
  const transactionStatus = readString(payload, 'transaction_status');

  if (!orderId || !statusCode || !grossAmount || !signature || !transactionStatus) {
    throw new BadRequestException('Notification is missing required fields.');
  }

  const expected = createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex');
  if (!safeEqual(expected, signature.toLowerCase())) {
    throw new UnauthorizedException('Invalid payment signature.');
  }

  let amount: Prisma.Decimal;
  try {
    amount = new Prisma.Decimal(grossAmount);
  } catch {
    throw new BadRequestException('Invalid payment amount.');
  }

  return {
    orderId,
    outcome: midtransOutcome(transactionStatus, readString(payload, 'fraud_status')),
    amount,
    providerRef: readString(payload, 'transaction_id'),
  };
}

export function midtransOutcome(transactionStatus: string, fraudStatus: string | null): PaymentOutcome {
  if (fraudStatus === 'deny') {
    return 'failed';
  }
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') {
    return 'refunded';
  }
  if (transactionStatus === 'settlement') {
    return 'paid';
  }
  if (transactionStatus === 'capture' && fraudStatus === 'accept') {
    return 'paid';
  }
  if (transactionStatus === 'capture' && fraudStatus === 'challenge') {
    return 'pending';
  }
  if (transactionStatus === 'pending') {
    return 'pending';
  }
  return 'failed';
}

function parseObject(raw: string): Record<string, unknown> {
  try {
    const payload: unknown = JSON.parse(raw);
    if (!isRecord(payload)) {
      throw new BadRequestException('Invalid notification body.');
    }
    return payload;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Invalid notification body.');
  }
}
