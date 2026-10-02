import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isRecord, readString } from '../json';
import { safeEqual } from '../safe-equal';
import type { VerifiedPaymentNotice } from '../payment.types';

export function verifyXenditQrisNotification(
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

  const qrCode = payload.qr_code;
  const orderId = isRecord(qrCode) ? readString(qrCode, 'external_id') : readString(payload, 'external_id');
  const status = readString(payload, 'status');
  if (!orderId || !status) {
    throw new BadRequestException('Notification is missing required fields.');
  }

  const currency = readString(payload, 'currency');
  if (currency && currency !== 'IDR') {
    throw new BadRequestException('Only IDR payments can grant course access.');
  }

  const amount = payload.amount;
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 1) {
    throw new BadRequestException('Invalid payment amount.');
  }

  return {
    orderId,
    outcome: qrisOutcome(status),
    amount: new Prisma.Decimal(amount),
    providerRef: readString(payload, 'id'),
  };
}

function qrisOutcome(status: string): VerifiedPaymentNotice['outcome'] {
  if (status === 'COMPLETED' || status === 'SUCCEEDED') {
    return 'paid';
  }
  if (status === 'PENDING') {
    return 'pending';
  }
  return 'failed';
}
