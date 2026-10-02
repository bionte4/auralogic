export type SettingsTab = 'smtp' | 'ai' | 'cloudflare' | 'payment';

export type AiProvider = 'openai' | 'anthropic';

export type PaymentProvider = 'midtrans' | 'xendit';

export interface SmtpView {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  passwordConfigured: boolean;
}

export interface AiView {
  provider: AiProvider;
  model: string;
  apiKeyConfigured: boolean;
}

export interface CloudflareView {
  accountId: string;
  apiTokenConfigured: boolean;
}

export interface PaymentView {
  provider: PaymentProvider;
  production: boolean;
  qris: boolean;
  virtualAccount: boolean;
  creditCard: boolean;
  serverKeyConfigured: boolean;
}

export interface SmtpResponse {
  key: 'smtp';
  saved: boolean;
  smtp: SmtpView;
}

export interface AiResponse {
  key: 'ai';
  saved: boolean;
  ai: AiView;
}

export interface CloudflareResponse {
  key: 'cloudflare';
  saved: boolean;
  cloudflare: CloudflareView;
}

export interface PaymentResponse {
  key: 'payment';
  saved: boolean;
  payment: PaymentView;
}

export interface ConnectionTestResult {
  ok: true;
  detail: string;
}

export const AI_MODELS: Record<AiProvider, readonly { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
  ],
};

export function isSmtpResponse(value: unknown): value is SmtpResponse {
  return isRecord(value) && value.key === 'smtp' && isRecord(value.smtp);
}

export function isAiResponse(value: unknown): value is AiResponse {
  return isRecord(value) && value.key === 'ai' && isRecord(value.ai);
}

export function isCloudflareResponse(value: unknown): value is CloudflareResponse {
  return isRecord(value) && value.key === 'cloudflare' && isRecord(value.cloudflare);
}

export function isPaymentResponse(value: unknown): value is PaymentResponse {
  return isRecord(value) && value.key === 'payment' && isRecord(value.payment);
}

export function isConnectionTestResult(value: unknown): value is ConnectionTestResult {
  return isRecord(value) && value.ok === true && typeof value.detail === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
