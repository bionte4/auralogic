import type { AppEnv } from '../../config/env';
import type { HttpPost } from './http';
import { MidtransGateway } from './midtrans.gateway';

const QR_STRING = '00020101021226680016ID.CO.EXAMPLE.WWW';

describe('MidtransGateway QRIS', () => {
  const post = jest.fn<ReturnType<HttpPost>, Parameters<HttpPost>>();
  const gateway = new MidtransGateway(
    {
      midtransServerKey: 'SB-Mid-server-test-key',
      midtransIsProduction: false,
      midtransQrisAcquirer: null,
    } as AppEnv,
    post,
  );

  beforeEach(() => {
    post.mockReset();
  });

  it('charges QRIS for the requested amount and returns the EMV payload', async () => {
    post.mockResolvedValue({
      status: 201,
      body: {
        transaction_id: 'trx-qris',
        qr_string: QR_STRING,
        actions: [
          {
            name: 'generate-qr-code',
            url: 'https://api.sandbox.midtrans.com/v2/qris/order/qr-code',
          },
        ],
      },
    });

    const session = await gateway.createQris({
      orderId: 'fls-abc',
      amount: 250000,
      courseTitle: 'Business English',
      payerEmail: 'alya@fluentis.test',
      payerName: 'Alya',
      returnUrl: 'http://localhost:3000/checkout/return',
    });

    expect(post).toHaveBeenCalledWith(
      'https://api.sandbox.midtrans.com/v2/charge',
      expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }),
      expect.objectContaining({
        payment_type: 'qris',
        transaction_details: { order_id: 'fls-abc', gross_amount: 250000 },
        qris: { acquirer: 'gopay' },
      }),
    );
    expect(session.qrString).toBe(QR_STRING);
    expect(session.qrUrl).toBe('https://api.sandbox.midtrans.com/v2/qris/order/qr-code');
  });
});
