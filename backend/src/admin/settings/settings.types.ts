export const SETTING_KEYS = ['smtp', 'ai', 'cloudflare', 'payment'] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export type AiProvider = 'openai' | 'anthropic';

export type PaymentProvider = 'midtrans' | 'xendit';

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

export interface PaymentConfig {
  provider: PaymentProvider;
  serverKey: string;
  production: boolean;
  qris: boolean;
  virtualAccount: boolean;
  creditCard: boolean;
}

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

export type SettingResponse =
  | { key: 'smtp'; saved: boolean; smtp: SmtpView }
  | { key: 'ai'; saved: boolean; ai: AiView }
  | { key: 'cloudflare'; saved: boolean; cloudflare: CloudflareView }
  | { key: 'payment'; saved: boolean; payment: PaymentView };

export interface ConnectionTestResult {
  ok: true;
  detail: string;
}

export function isSettingKey(value: string): value is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(value);
}
