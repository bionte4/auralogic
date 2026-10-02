import { UnauthorizedException } from '@nestjs/common';
import { verifyXenditQrisNotification } from './xendit-qris-notification';

const TOKEN = 'xendit-webhook-token';

describe('verifyXenditQrisNotification', () => {
  it('accepts a completed QRIS payment for the external order id', () => {
    const body = Buffer.from(
      JSON.stringify({
        id: 'qrpy-1',
        event: 'qr.payment',
        amount: 250000,
        status: 'COMPLETED',
        currency: 'IDR',
        qr_code: { id: 'qr-1', external_id: 'fls-abc' },
      }),
    );

    const notice = verifyXenditQrisNotification(body, TOKEN, TOKEN);

    expect(notice).toMatchObject({ orderId: 'fls-abc', outcome: 'paid', providerRef: 'qrpy-1' });
    expect(notice.amount.toFixed(2)).toBe('250000.00');
  });

  it('rejects a wrong callback token', () => {
    const body = Buffer.from(JSON.stringify({ amount: 250000, status: 'COMPLETED', external_id: 'fls-abc' }));
    expect(() => verifyXenditQrisNotification(body, 'wrong-webhook-token', TOKEN)).toThrow(UnauthorizedException);
  });
});