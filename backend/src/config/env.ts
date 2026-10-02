export type PaymentProviderName = 'midtrans' | 'xendit';

export interface AppEnv {
  port: number;
  frontendOrigin: string;
  jwtSecret: string;
  databaseUrl: string;
  paymentProvider: PaymentProviderName;
  midtransServerKey: string | null;
  midtransIsProduction: boolean;
  midtransQrisAcquirer: 'gopay' | 'airpay shopee' | null;
  xenditSecretKey: string | null;
  xenditWebhookToken: string | null;
  cookieSameSite: 'lax' | 'strict' | 'none';
  cookieSecure: boolean;
  mailProvider: 'log' | 'resend';
  resendApiKey: string | null;
  mailFrom: string | null;
}

export function readAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const frontendOrigin = source.FRONTEND_ORIGIN?.trim();
  const jwtSecret = source.JWT_SECRET?.trim();
  const databaseUrl = source.DATABASE_URL?.trim();
  const missing: string[] = [];

  if (!frontendOrigin) missing.push('FRONTEND_ORIGIN');
  if (!jwtSecret) missing.push('JWT_SECRET');
  if (!databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!frontendOrigin || !jwtSecret || !databaseUrl) {
    throw new Error('Missing required environment variables.');
  }

  if (frontendOrigin === '*' || frontendOrigin.includes(',')) {
    throw new Error('FRONTEND_ORIGIN must be a single frontend origin.');
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(frontendOrigin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be an absolute http(s) URL.');
  }

  if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
    throw new Error('FRONTEND_ORIGIN must use http or https.');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }

  const port = Number(source.PORT ?? '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const paymentProvider = source.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (paymentProvider !== 'midtrans' && paymentProvider !== 'xendit') {
    throw new Error('PAYMENT_PROVIDER must be midtrans or xendit.');
  }

  const midtransServerKey = readSecret(source.MIDTRANS_SERVER_KEY);
  const xenditSecretKey = readSecret(source.XENDIT_SECRET_KEY);
  const xenditWebhookToken = readSecret(source.XENDIT_WEBHOOK_TOKEN);
  const midtransIsProduction = source.MIDTRANS_IS_PRODUCTION?.trim().toLowerCase() === 'true';
  const midtransQrisAcquirer = readQrisAcquirer(source.MIDTRANS_QRIS_ACQUIRER);

  if (paymentProvider === 'midtrans' && !midtransServerKey) {
    throw new Error('MIDTRANS_SERVER_KEY is required when PAYMENT_PROVIDER is midtrans.');
  }
  if (paymentProvider === 'xendit' && (!xenditSecretKey || !xenditWebhookToken)) {
    throw new Error('XENDIT_SECRET_KEY and XENDIT_WEBHOOK_TOKEN are required when PAYMENT_PROVIDER is xendit.');
  }

  const cookieSameSite = readSameSite(source.COOKIE_SAMESITE);
  const cookieSecure = source.COOKIE_SECURE?.trim().toLowerCase() === 'true' || cookieSameSite === 'none';
  if (cookieSameSite === 'none' && parsedOrigin.protocol !== 'https:') {
    throw new Error('COOKIE_SAMESITE=none requires an https FRONTEND_ORIGIN.');
  }

  const mail = readMailConfig(source);

  return {
    port,
    frontendOrigin: parsedOrigin.origin,
    jwtSecret,
    databaseUrl,
    paymentProvider,
    midtransServerKey,
    midtransIsProduction,
    midtransQrisAcquirer,
    xenditSecretKey,
    xenditWebhookToken,
    cookieSameSite,
    cookieSecure,
    mailProvider: mail.provider,
    resendApiKey: mail.apiKey,
    mailFrom: mail.from,
  };
}

function readMailConfig(source: NodeJS.ProcessEnv): { provider: 'log' | 'resend'; apiKey: string | null; from: string | null } {
  const provider = source.MAIL_PROVIDER?.trim().toLowerCase() || 'log';
  if (provider !== 'log' && provider !== 'resend') {
    throw new Error('MAIL_PROVIDER must be log or resend.');
  }
  if (provider === 'log') {
    return { provider, apiKey: null, from: null };
  }
  const apiKey = source.RESEND_API_KEY?.trim() ?? '';
  const from = source.MAIL_FROM?.trim() ?? '';
  if (apiKey.length < 16) {
    throw new Error('RESEND_API_KEY must be at least 16 characters when MAIL_PROVIDER is resend.');
  }
  if (!from.includes('@') || from.length > 200) {
    throw new Error('MAIL_FROM must be a sender address when MAIL_PROVIDER is resend.');
  }
  return { provider, apiKey, from };
}

function readSameSite(value: string | undefined): 'lax' | 'strict' | 'none' {
  const sameSite = value?.trim().toLowerCase() || 'lax';
  if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
    return sameSite;
  }
  throw new Error('COOKIE_SAMESITE must be lax, strict, or none.');
}

function readQrisAcquirer(value: string | undefined): 'gopay' | 'airpay shopee' | null {
  const acquirer = value?.trim().toLowerCase();
  if (!acquirer) {
    return null;
  }
  if (acquirer === 'gopay' || acquirer === 'airpay shopee') {
    return acquirer;
  }
  throw new Error('MIDTRANS_QRIS_ACQUIRER must be gopay or "airpay shopee".');
}

function readSecret(value: string | undefined): string | null {
  const secret = value?.trim();
  if (!secret) {
    return null;
  }
  if (secret.length < 16) {
    throw new Error('Payment secrets must be at least 16 characters.');
  }
  return secret;
}
