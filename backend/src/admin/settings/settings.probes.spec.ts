import { redact, testCloudflareConnection, testPaymentConnection } from './settings.probes';

describe('settings connection probes', () => {
  it('removes a secret from an error message', () => {
    expect(redact('rejected key sk-live-secret', 'sk-live-secret')).toBe('rejected key [redacted]');
  });

  it('accepts a Cloudflare token when the account stream list succeeds', async () => {
    const request = jest.fn(async () => new Response(JSON.stringify({ success: true, result: [] }), { status: 200 }));

    const detail = await testCloudflareConnection(
      { accountId: 'a'.repeat(32), apiToken: 'cf-token-value' },
      request,
    );

    expect(detail).toContain('Cloudflare Stream');
    expect(request).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/stream?per_page=1`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('treats a missing Midtrans order as a valid sandbox key', async () => {
    const request = jest.fn(async () => new Response(JSON.stringify({ status_code: '404' }), { status: 404 }));

    const detail = await testPaymentConnection(
      {
        provider: 'midtrans',
        serverKey: 'SB-Mid-server-test',
        production: false,
        qris: true,
        virtualAccount: true,
        creditCard: false,
      },
      request,
    );

    expect(detail).toContain('sandbox');
    expect(detail).toContain('QRIS');
    expect(detail).toContain('virtual accounts');
    const calls = request.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toContain('https://api.sandbox.midtrans.com/v2/');
  });

  it('rejects a Midtrans key when the gateway returns 401', async () => {
    const request = jest.fn(async () => new Response(JSON.stringify({ status_code: '401' }), { status: 401 }));

    await expect(
      testPaymentConnection(
        {
          provider: 'midtrans',
          serverKey: 'bad-key',
          production: true,
          qris: true,
          virtualAccount: false,
          creditCard: true,
        },
        request,
      ),
    ).rejects.toThrow('Midtrans rejected the server key.');
  });
});
