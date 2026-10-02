import { createHash } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { verifyMidtransNotification } from './midtrans-notification';

const SERVER_KEY = 'SB-Mid-server-test-key';

function signedNotification(overrides: Record<string, string> = {}): Buffer {
  const fields = {
    order_id: 'fls-abc',
    status_code: '200',
    gross_amount: '250000.00',
    transaction_status: 'settlement',
    fraud_status: 'accept',
    transaction_id: 'trx-1',
    ...overrides,
  };
  const signature = createHash('sha512')
    .update(`${fields.order_id}${fields.status_code}${fields.gross_amount}${SERVER_KEY}`)
    .digest('hex');
  return Buffer.from(JSON.stringify({ ...fields, signature_key: signature }));
}

describe('verifyMidtransNotification', () => {
  it('accepts a settlement notification signed with the server key', () => {
    const notice = verifyMidtransNotification(signedNotification(), SERVER_KEY);
    expect(notice).toMatchObject({ orderId: 'fls-abc', outcome: 'paid', providerRef: 'trx-1' });
    expect(notice.amount.toFixed(2)).toBe('250000.00');
  });

  it('accepts a credit-card capture only when fraud status is accept', () => {
    const paid = verifyMidtransNotification(
      signedNotification({ transaction_status: 'capture', fraud_status: 'accept' }),
      SERVER_KEY,
    );
    expect(paid.outcome).toBe('paid');

    const challenged = verifyMidtransNotification(
      signedNotification({ transaction_status: 'capture', fraud_status: 'challenge', status_code: '201' }),
      SERVER_KEY,
    );
    expect(challenged.outcome).toBe('pending');
  });

  it('rejects a notification whose amount was changed after signing', () => {
    const payload = JSON.parse(signedNotification().toString('utf8')) as { gross_amount: string };
    payload.gross_amount = '1000.00';

    expect(() => verifyMidtransNotification(Buffer.from(JSON.stringify(payload)), SERVER_KEY)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a notification signed with a different server key', () => {
    expect(() => verifyMidtransNotification(signedNotification(), 'another-server-key-value')).toThrow(
      UnauthorizedException,
    );
  });
});
