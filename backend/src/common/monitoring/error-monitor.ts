import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

const logger = new Logger('ErrorMonitor');

export interface ErrorContext {
  method: string;
  path: string;
  status: number;
}

export function reportException(exception: unknown, context: ErrorContext): void {
  const webhook = context.path.includes('/payments/');
  const network = isNetworkError(exception);
  if (context.status < 500 && !(webhook && context.status >= 400) && !network) {
    return;
  }
  const message = exception instanceof Error ? exception.message : 'Unhandled exception';
  logger.error(`${context.method} ${context.path} ${context.status} ${message}`);
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }
  void sendToSentry(dsn, message, exception instanceof Error ? exception.stack ?? '' : '', context).catch(() => undefined);
}

export async function sendToSentry(dsn: string, message: string, stack: string, context: ErrorContext): Promise<void> {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) {
    return;
  }
  const eventId = randomUUID().replace(/-/g, '');
  await fetch(`${parsed.storeUrl}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=fluentis/1.0`,
    },
    body: JSON.stringify({
      event_id: eventId,
      message,
      level: context.status >= 500 || isNetworkMessage(message) ? 'error' : 'warning',
      platform: 'node',
      exception: { values: [{ type: 'Error', value: message.slice(0, 500), stacktrace: stack ? { frames: [] } : undefined }] },
      request: { method: context.method, url: context.path },
      extra: { stack: stack.slice(0, 4000) },
    }),
  });
}

export function parseSentryDsn(dsn: string): { key: string; storeUrl: string } | null {
  const match = /^https:\/\/([^@]+)@([^/]+)\/(\d+)\/?$/.exec(dsn.trim());
  if (!match) {
    return null;
  }
  const key = match[1] ?? '';
  const host = match[2] ?? '';
  const projectId = match[3] ?? '';
  if (!key || !host || !projectId) {
    return null;
  }
  return { key, storeUrl: `https://${host}/api/${projectId}/store/` };
}

function isNetworkError(exception: unknown): boolean {
  if (!(exception instanceof Error)) {
    return false;
  }
  const code = 'code' in exception && typeof exception.code === 'string' ? exception.code : '';
  return code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || isNetworkMessage(exception.message);
}

function isNetworkMessage(message: string): boolean {
  return message.includes('fetch failed') || message.includes('network');
}
