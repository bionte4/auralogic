import { ResendTransport, courseCompletedMessage, passwordResetMessage, paymentActivatedMessage } from './mail';

describe('transactional mail', () => {
  it('includes the payment amount and the certificate link', () => {
    const payment = paymentActivatedMessage({
      name: 'Alya',
      courseTitle: 'Business English',
      amount: '250000',
      courseUrl: 'http://localhost:3000/learn/course-1',
    });
    expect(payment.text).toContain('250000');
    expect(payment.text).toContain('activated your enrollment');

    const done = courseCompletedMessage({
      name: 'Alya',
      courseTitle: 'Business English',
      certificateUrl: 'http://localhost:3000/verify/cert-1',
      dashboardUrl: 'http://localhost:3000/learn',
    });
    expect(done.text).toContain('http://localhost:3000/verify/cert-1');

    const reset = passwordResetMessage({
      name: 'Alya',
      resetUrl: 'http://localhost:3002/reset-password?token=abc',
    });
    expect(reset.text).toContain('http://localhost:3002/reset-password?token=abc');
    expect(reset.text).toContain('15 minutes');
  });

  it('posts the message to Resend with the API key', async () => {
    let sent: RequestInit | undefined;
    const post = jest.fn(async (_url: string, init: RequestInit) => {
      sent = init;
      return new Response('{}', { status: 202 });
    });
    const transport = new ResendTransport('resend-test-key-16', 'Fluentis <mail@fluentis.test>', post);

    await transport.send({ to: 'alya@fluentis.test', subject: 'Hello', text: 'Active' });

    expect(post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer resend-test-key-16' }),
      }),
    );
    expect(String(sent?.body)).toContain('alya@fluentis.test');
    expect(String(sent?.body)).not.toContain('password');
  });
});