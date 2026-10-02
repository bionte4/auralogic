import { Logger } from '@nestjs/common';
import { parseSentryDsn, reportException } from './error-monitor';

describe('error monitor', () => {
  it('parses a Sentry DSN into the store endpoint', () => {
    expect(parseSentryDsn('https://abc@o123.ingest.sentry.io/456')).toEqual({
      key: 'abc',
      storeUrl: 'https://o123.ingest.sentry.io/api/456/store/',
    });
    expect(parseSentryDsn('not-a-dsn')).toBeNull();
  });

  it('skips ordinary client errors and reports payment webhook failures', () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    reportException(new Error('missing'), { method: 'GET', path: '/api/courses', status: 404 });
    expect(spy).not.toHaveBeenCalled();

    reportException(new Error('bad signature'), {
      method: 'POST',
      path: '/api/payments/midtrans/webhook',
      status: 400,
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
