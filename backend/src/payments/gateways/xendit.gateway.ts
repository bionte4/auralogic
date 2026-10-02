import { BadGatewayException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import type { AppEnv } from '../../config/env';
import { isRecord, readString } from '../json';
import { isQrisPayload } from '../qris-payload';
import type { CheckoutRequest, CheckoutSession, PaymentGateway, QrisSession } from '../payment.types';
import { basicAuth, type HttpPost } from './http';

export class XenditGateway implements PaymentGateway {
  readonly provider = PaymentProvider.XENDIT;

  constructor(
    private readonly env: AppEnv,
    private readonly post: HttpPost,
  ) {}

  async createCheckout(input: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.env.xenditSecretKey) {
      throw new BadGatewayException('Payment provider is not configured.');
    }

    const result = await this.post(
      'https://api.xendit.co/v2/invoices',
      {
        Authorization: basicAuth(this.env.xenditSecretKey),
        'Content-Type': 'application/json',
      },
      {
        external_id: input.orderId,
        amount: input.amount,
        currency: 'IDR',
        description: input.courseTitle.slice(0, 255),
        payer_email: input.payerEmail,
        success_redirect_url: input.returnUrl,
        failure_redirect_url: input.returnUrl,
      },
    );

    if (result.status < 200 || result.status >= 300 || !isRecord(result.body)) {
      throw new BadGatewayException('Payment provider rejected the checkout.');
    }

    const providerRef = readString(result.body, 'id');
    const checkoutUrl = readString(result.body, 'invoice_url');
    if (!providerRef || !checkoutUrl?.startsWith('https://')) {
      throw new BadGatewayException('Payment provider returned an invalid checkout session.');
    }

    return { checkoutUrl, providerRef };
  }

  async createQris(input: CheckoutRequest): Promise<QrisSession> {
    if (!this.env.xenditSecretKey) {
      throw new BadGatewayException('Payment provider is not configured.');
    }

    const result = await this.post(
      'https://api.xendit.co/qr_codes',
      {
        Authorization: basicAuth(this.env.xenditSecretKey),
        'Content-Type': 'application/json',
      },
      {
        external_id: input.orderId,
        type: 'DYNAMIC',
        currency: 'IDR',
        amount: input.amount,
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
      qrUrl: null,
      providerRef: readString(result.body, 'id'),
    };
  }
}
