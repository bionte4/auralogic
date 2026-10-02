import { UnauthorizedException } from '@nestjs/common';
import { verifyXenditNotification } from './xendit-notification';

const TOKEN = 'xendit-webhook-token';

function body(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      id: 'inv-1',
      external_id: 'fls-abc',
      status: 'PAID',
      amount: 250000,
      paid_amount: 250000,
      currency: 'IDR',
      ...overrides,
    }),
  );
}

describe('verifyXenditNotification', () => {
  it('accepts a paid invoice when the callback token matches', () => {
    const notice = verifyXenditNotification(body(), TOKEN, TOKEN);
    expect(notice).toMatchObject({ orderId: 'fls-abc', outcome: 'paid', providerRef: 'inv-1' });
    expect(notice.amount.toFixed(2)).toBe('250000.00');
  });

  it('rejects a missing or wrong callback token', () => {
    expect(() => verifyXenditNotification(body(), undefined, TOKEN)).toThrow(UnauthorizedException);
    expect(() => verifyXenditNotification(body(), 'wrong-webhook-token', TOKEN)).toThrow(UnauthorizedException);
  });

  it('maps an expired invoice to a failed outcome', () => {
    const notice = verifyXenditNotification(body({ status: 'EXPIRED', paid_amount: undefined, amount: 250000 }), TOKEN, TOKEN);
    expect(notice.outcome).toBe('failed');
  });
});
