import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { readAppEnv } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiSettingDto, CloudflareSettingDto, PaymentSettingDto, SaveSettingDto, SmtpSettingDto } from './dto/settings.dto';
import { isSealedSecret, openSecret, sealSecret } from './settings.crypto';
import {
  redact,
  sendSmtpTest,
  testAiConnection,
  testCloudflareConnection,
  testPaymentConnection,
  type HttpRequest,
} from './settings.probes';
import {
  isSettingKey,
  type AiConfig,
  type CloudflareConfig,
  type ConnectionTestResult,
  type PaymentConfig,
  type SettingKey,
  type SettingResponse,
  type SmtpConfig,
} from './settings.types';

interface SettingsRuntime {
  sealKey: () => string;
  sendSmtp: (config: SmtpConfig) => Promise<string>;
  request: HttpRequest;
}

type StoredRecord =
  | { key: 'smtp'; config: SmtpConfig }
  | { key: 'ai'; config: AiConfig }
  | { key: 'cloudflare'; config: CloudflareConfig }
  | { key: 'payment'; config: PaymentConfig };

@Injectable()
export class SettingsService {
  private readonly runtime: SettingsRuntime;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() runtime?: SettingsRuntime,
  ) {
    this.runtime = runtime ?? defaultRuntime();
  }

  async get(key: string): Promise<SettingResponse> {
    if (!isSettingKey(key)) {
      throw new BadRequestException('Unknown settings key.');
    }
    const stored = await this.load(key);
    return stored ? toResponse(stored, true) : emptyResponse(key);
  }

  async save(dto: SaveSettingDto): Promise<SettingResponse> {
    const material = this.runtime.sealKey();
    const previous = await this.load(dto.key);
    const record = this.merge(dto, previous, material);
    await this.prisma.setting.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value: JSON.stringify(record.config) },
      update: { value: JSON.stringify(record.config) },
    });
    return toResponse(record, true);
  }

  async testSmtp(dto: SmtpSettingDto): Promise<ConnectionTestResult> {
    const material = this.runtime.sealKey();
    const previous = await this.load('smtp');
    const password = resolveSecret(dto.password, previous?.key === 'smtp' ? previous.config.password : undefined, material, 'SMTP password');
    try {
      const detail = await this.runtime.sendSmtp({
        host: dto.host,
        port: dto.port,
        username: dto.username,
        password,
        fromEmail: dto.fromEmail,
      });
      return { ok: true, detail };
    } catch (error) {
      throw probeError(error, password);
    }
  }

  async testAi(dto: AiSettingDto): Promise<ConnectionTestResult> {
    const material = this.runtime.sealKey();
    const previous = await this.load('ai');
    const apiKey = resolveSecret(dto.apiKey, previous?.key === 'ai' ? previous.config.apiKey : undefined, material, 'API key');
    try {
      const detail = await testAiConnection({ provider: dto.provider, model: dto.model, apiKey }, this.runtime.request);
      return { ok: true, detail };
    } catch (error) {
      throw probeError(error, apiKey);
    }
  }

  async testCloudflare(dto: CloudflareSettingDto): Promise<ConnectionTestResult> {
    const material = this.runtime.sealKey();
    const previous = await this.load('cloudflare');
    const apiToken = resolveSecret(
      dto.apiToken,
      previous?.key === 'cloudflare' ? previous.config.apiToken : undefined,
      material,
      'API token',
    );
    try {
      const detail = await testCloudflareConnection({ accountId: dto.accountId, apiToken }, this.runtime.request);
      return { ok: true, detail };
    } catch (error) {
      throw probeError(error, apiToken);
    }
  }

  async testPayment(dto: PaymentSettingDto): Promise<ConnectionTestResult> {
    const material = this.runtime.sealKey();
    const previous = await this.load('payment');
    const serverKey = resolveSecret(
      dto.serverKey,
      previous?.key === 'payment' ? previous.config.serverKey : undefined,
      material,
      'Server key',
    );
    try {
      const detail = await testPaymentConnection(
        {
          provider: dto.provider,
          serverKey,
          production: dto.production,
          qris: dto.qris,
          virtualAccount: dto.virtualAccount,
          creditCard: dto.creditCard,
        },
        this.runtime.request,
      );
      return { ok: true, detail };
    } catch (error) {
      throw probeError(error, serverKey);
    }
  }

  private merge(dto: SaveSettingDto, previous: StoredRecord | null, material: string): StoredRecord {
    if (dto.key === 'smtp') {
      if (!dto.smtp) {
        throw new BadRequestException('SMTP settings are required.');
      }
      const password = resolveSecret(dto.smtp.password, previous?.key === 'smtp' ? previous.config.password : undefined, material, 'SMTP password');
      return {
        key: 'smtp',
        config: {
          host: dto.smtp.host,
          port: dto.smtp.port,
          username: dto.smtp.username,
          fromEmail: dto.smtp.fromEmail,
          password: sealSecret(password, material),
        },
      };
    }
    if (dto.key === 'ai') {
      if (!dto.ai) {
        throw new BadRequestException('AI settings are required.');
      }
      const apiKey = resolveSecret(dto.ai.apiKey, previous?.key === 'ai' ? previous.config.apiKey : undefined, material, 'API key');
      return { key: 'ai', config: { provider: dto.ai.provider, model: dto.ai.model, apiKey: sealSecret(apiKey, material) } };
    }
    if (dto.key === 'cloudflare') {
      if (!dto.cloudflare) {
        throw new BadRequestException('Cloudflare settings are required.');
      }
      const apiToken = resolveSecret(
        dto.cloudflare.apiToken,
        previous?.key === 'cloudflare' ? previous.config.apiToken : undefined,
        material,
        'API token',
      );
      return { key: 'cloudflare', config: { accountId: dto.cloudflare.accountId, apiToken: sealSecret(apiToken, material) } };
    }
    if (!dto.payment) {
      throw new BadRequestException('Payment settings are required.');
    }
    const serverKey = resolveSecret(
      dto.payment.serverKey,
      previous?.key === 'payment' ? previous.config.serverKey : undefined,
      material,
      'Server key',
    );
    return {
      key: 'payment',
      config: {
        provider: dto.payment.provider,
        production: dto.payment.production,
        qris: dto.payment.qris,
        virtualAccount: dto.payment.virtualAccount,
        creditCard: dto.payment.creditCard,
        serverKey: sealSecret(serverKey, material),
      },
    };
  }

  private async load(key: SettingKey): Promise<StoredRecord | null> {
    const row = await this.prisma.setting.findUnique({ where: { key }, select: { value: true } });
    if (!row) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      throw new BadRequestException('Stored settings could not be read.');
    }
    const record = readStored(key, parsed);
    if (!record) {
      throw new BadRequestException('Stored settings could not be read.');
    }
    return record;
  }
}

function defaultRuntime(): SettingsRuntime {
  return {
    sealKey: () => readAppEnv().jwtSecret,
    sendSmtp: sendSmtpTest,
    request: (url, init) => fetch(url, init),
  };
}

function resolveSecret(incoming: string | undefined, stored: string | undefined, material: string, label: string): string {
  const typed = incoming?.trim() ?? '';
  if (typed && typed !== '********') {
    return typed;
  }
  if (!stored) {
    throw new BadRequestException(`${label} is required.`);
  }
  try {
    return isSealedSecret(stored) ? openSecret(stored, material) : stored;
  } catch {
    throw new BadRequestException(`${label} could not be read. Enter it again.`);
  }
}

function probeError(error: unknown, secret: string): BadRequestException {
  if (error instanceof BadRequestException) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Connection test failed.';
  return new BadRequestException(redact(message, secret).slice(0, 240));
}

function toResponse(record: StoredRecord, saved: boolean): SettingResponse {
  if (record.key === 'smtp') {
    return {
      key: 'smtp',
      saved,
      smtp: {
        host: record.config.host,
        port: record.config.port,
        username: record.config.username,
        fromEmail: record.config.fromEmail,
        passwordConfigured: record.config.password.length > 0,
      },
    };
  }
  if (record.key === 'ai') {
    return {
      key: 'ai',
      saved,
      ai: { provider: record.config.provider, model: record.config.model, apiKeyConfigured: record.config.apiKey.length > 0 },
    };
  }
  if (record.key === 'cloudflare') {
    return {
      key: 'cloudflare',
      saved,
      cloudflare: { accountId: record.config.accountId, apiTokenConfigured: record.config.apiToken.length > 0 },
    };
  }
  return {
    key: 'payment',
    saved,
    payment: {
      provider: record.config.provider,
      production: record.config.production,
      qris: record.config.qris,
      virtualAccount: record.config.virtualAccount,
      creditCard: record.config.creditCard,
      serverKeyConfigured: record.config.serverKey.length > 0,
    },
  };
}

function emptyResponse(key: SettingKey): SettingResponse {
  if (key === 'smtp') {
    return { key, saved: false, smtp: { host: '', port: 587, username: '', fromEmail: '', passwordConfigured: false } };
  }
  if (key === 'ai') {
    return { key, saved: false, ai: { provider: 'openai', model: 'gpt-4o-mini', apiKeyConfigured: false } };
  }
  if (key === 'cloudflare') {
    return { key, saved: false, cloudflare: { accountId: '', apiTokenConfigured: false } };
  }
  return {
    key,
    saved: false,
    payment: { provider: 'midtrans', production: false, qris: true, virtualAccount: true, creditCard: true, serverKeyConfigured: false },
  };
}

function readStored(key: SettingKey, value: unknown): StoredRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  if (key === 'smtp' && isString(value.host) && isNumber(value.port) && isString(value.username) && isString(value.password) && isString(value.fromEmail)) {
    return { key, config: { host: value.host, port: value.port, username: value.username, password: value.password, fromEmail: value.fromEmail } };
  }
  if (key === 'ai' && (value.provider === 'openai' || value.provider === 'anthropic') && isString(value.apiKey) && isString(value.model)) {
    return { key, config: { provider: value.provider, model: value.model, apiKey: value.apiKey } };
  }
  if (key === 'cloudflare' && isString(value.accountId) && isString(value.apiToken)) {
    return { key, config: { accountId: value.accountId, apiToken: value.apiToken } };
  }
  if (
    key === 'payment' &&
    (value.provider === 'midtrans' || value.provider === 'xendit') &&
    isString(value.serverKey) &&
    typeof value.production === 'boolean' &&
    typeof value.qris === 'boolean' &&
    typeof value.virtualAccount === 'boolean' &&
    typeof value.creditCard === 'boolean'
  ) {
    return {
      key,
      config: {
        provider: value.provider,
        serverKey: value.serverKey,
        production: value.production,
        qris: value.qris,
        virtualAccount: value.virtualAccount,
        creditCard: value.creditCard,
      },
    };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
