import { BadGatewayException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import type { AppEnv } from '../../config/env';
import { isRecord, readString } from '../json';
import { isQrisPayload } from '../qris-payload';
import type { CheckoutRequest, CheckoutSession, PaymentGateway, QrisSession } from '../payment.types';
import { basicAuth, type HttpPost } from './http';

export class MidtransGateway implements PaymentGateway {
  readonly provider = PaymentProvider.MIDTRANS;

  constructor(
    private readonly env: AppEnv,
    private readonly post: HttpPost,
  ) {}

  async createCheckout(input: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.env.midtransServerKey) {
      throw new BadGatewayException('Payment provider is not configured.');
    }

    const baseUrl = this.env.midtransIsProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
    const result = await this.post(
      `${baseUrl}/snap/v1/transactions`,
      {
        Authorization: basicAuth(this.env.midtransServerKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      {
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amount,
        },
        item_details: [
          {
            id: input.orderId,
            price: input.amount,
            quantity: 1,
            name: input.courseTitle.slice(0, 50),
          },
        ],
        customer_details: {
          email: input.payerEmail,
          first_name: input.payerName.slice(0, 50),
        },
        callbacks: { finish: input.returnUrl },
      },
    );

    if (result.status < 200 || result.status >= 300 || !isRecord(result.body)) {
      throw new BadGatewayException('Payment provider rejected the checkout.');
    }

    const token = readString(result.body, 'token');
    const checkoutUrl = readString(result.body, 'redirect_url');
    if (!token || !checkoutUrl?.startsWith('https://')) {
      throw new BadGatewayException('Payment provider returned an invalid checkout session.');
    }

    return { checkoutUrl, providerRef: token };
  }

  async createQris(input: CheckoutRequest): Promise<QrisSession> {
    if (!this.env.midtransServerKey) {
      throw new BadGatewayException('Payment provider is not configured.');
    }

    const baseUrl = this.env.midtransIsProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    const acquirer = this.env.midtransQrisAcquirer ?? (this.env.midtransIsProduction ? null : 'gopay');
    const result = await this.post(
      `${baseUrl}/v2/charge`,
      {
        Authorization: basicAuth(this.env.midtransServerKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      {
        payment_type: 'qris',
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amount,
        },
        item_details: [
          {
            id: input.orderId,
            price: input.amount,
            quantity: 1,
            name: input.courseTitle.slice(0, 50),
          },
        ],
        customer_details: {
          email: input.payerEmail,
          first_name: input.payerName.slice(0, 50),
        },
        qris: acquirer ? { acquirer } : {},
      },
    );

    if (result.status < 200 || result.status >= 300 || !isRecord(result.body)) {
      throw new BadGatewayException('Payment provider rejected the QRIS charge.');
    }

    const qrString = readString(result.body, 'qr_string');
    if (!qrString || !isQrisPayload(qrString)) {
      throw new BadGatewayException('Payment provider returned an invalid QRIS payload.');
    }

    return {
      qrString,
      qrUrl: readQrImageUrl(result.body.actions),
      providerRef: readString(result.body, 'transaction_id'),
    };
  }
}

function readQrImageUrl(actions: unknown): string | null {
  if (!Array.isArray(actions)) {
    return null;
  }
  for (const action of actions) {
    if (!isRecord(action) || action.name !== 'generate-qr-code') {
      continue;
    }
    const url = readString(action, 'url');
    if (url?.startsWith('https://')) {
      return url;
    }
  }
  return null;
}
