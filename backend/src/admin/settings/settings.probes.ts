import { createTransport } from 'nodemailer';
import type { AiConfig, CloudflareConfig, PaymentConfig, SmtpConfig } from './settings.types';

export type HttpRequest = (url: string, init: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 10_000;

export async function sendSmtpTest(config: SmtpConfig): Promise<string> {
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  await transporter.verify();
  await transporter.sendMail({
    from: config.fromEmail,
    to: config.fromEmail,
    subject: 'Fluentis SMTP test',
    text: 'Fluentis confirmed this SMTP server can send mail.',
  });
  return `A test message was sent to ${config.fromEmail}.`;
}

export async function testAiConnection(config: AiConfig, request: HttpRequest): Promise<string> {
  if (config.provider === 'openai') {
    const response = await request('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Reply with ok.' }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await assertOk(response, config.apiKey, 'OpenAI');
    return `OpenAI accepted the key for ${config.model}.`;
  }

  const response = await request('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with ok.' }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await assertOk(response, config.apiKey, 'Anthropic');
  return `Anthropic accepted the key for ${config.model}.`;
}

export async function testCloudflareConnection(config: CloudflareConfig, request: HttpRequest): Promise<string> {
  const response = await request(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/stream?per_page=1`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  await assertOk(response, config.apiToken, 'Cloudflare Stream');
  return 'Cloudflare Stream accepted the account ID and API token.';
}

export async function testPaymentConnection(config: PaymentConfig, request: HttpRequest): Promise<string> {
  if (config.provider === 'midtrans') {
    await testMidtrans(config, request);
  } else {
    await testXendit(config, request);
  }
  const channels = enabledChannels(config);
  const mode = config.production ? 'production' : 'sandbox';
  const channelText = channels.length > 0 ? channels.join(', ') : 'no payment channels enabled';
  return `${config.provider === 'midtrans' ? 'Midtrans' : 'Xendit'} ${mode} key accepted for ${channelText}.`;
}

async function testMidtrans(config: PaymentConfig, request: HttpRequest): Promise<void> {
  const base = config.production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  const orderId = `fluentis-probe-${Date.now()}`;
  const response = await request(`${base}/v2/${orderId}/status`, {
    method: 'GET',
    headers: { Authorization: basicAuth(config.serverKey), Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readJson(response);
  const statusCode = typeof body.status_code === 'string' ? body.status_code : String(response.status);
  if (response.status === 401 || response.status === 403 || statusCode === '401') {
    throw new Error('Midtrans rejected the server key.');
  }
  if (response.status === 404 || statusCode === '404' || response.ok) {
    return;
  }
  throw new Error(`Midtrans connection test failed (${response.status}).`);
}

async function testXendit(config: PaymentConfig, request: HttpRequest): Promise<void> {
  if (config.production && config.serverKey.startsWith('xnd_development')) {
    throw new Error('A Xendit development key cannot be used in production mode.');
  }
  if (!config.production && config.serverKey.startsWith('xnd_production')) {
    throw new Error('A Xendit production key cannot be used in sandbox mode.');
  }
  const response = await request('https://api.xendit.co/balance', {
    method: 'GET',
    headers: { Authorization: basicAuth(config.serverKey) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await assertOk(response, config.serverKey, 'Xendit');
}

function enabledChannels(config: PaymentConfig): string[] {
  const channels = [
    config.qris ? 'QRIS' : null,
    config.virtualAccount ? 'virtual accounts' : null,
    config.creditCard ? 'credit cards' : null,
  ];
  return channels.filter((channel): channel is string => channel !== null);
}

function basicAuth(secret: string): string {
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`;
}

async function assertOk(response: Response, secret: string, provider: string): Promise<void> {
  if (response.ok) {
    return;
  }
  const detail = redact(await response.text(), secret).slice(0, 180);
  throw new Error(detail ? `${provider} rejected the credentials (${response.status}): ${detail}` : `${provider} rejected the credentials (${response.status}).`);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function redact(message: string, secret: string): string {
  if (!secret) {
    return message;
  }
  return message.split(secret).join('[redacted]');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
