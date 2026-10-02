export interface ErrorContext {
  method: string;
  path: string;
  status: number;
}

export function reportServerError(exception: unknown, context: ErrorContext): void {
  const message = exception instanceof Error ? exception.message : 'Unhandled exception';
  const network = message.includes('fetch failed') || message.includes('network');
  if (context.status < 500 && !network) {
    return;
  }
  console.error(`${context.method} ${context.path} ${context.status} ${message.slice(0, 500)}`);
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }
  void sendToSentry(dsn, message, exception instanceof Error ? exception.stack ?? '' : '', context).catch(() => undefined);
}

async function sendToSentry(dsn: string, message: string, stack: string, context: ErrorContext): Promise<void> {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) {
    return;
  }
  await fetch(parsed.storeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=fluentis-web/1.0`,
    },
    body: JSON.stringify({
      event_id: crypto.randomUUID().replace(/-/g, ''),
      message: message.slice(0, 500),
      level: 'error',
      platform: 'javascript',
      request: { method: context.method, url: context.path.slice(0, 200) },
      extra: { stack: stack.slice(0, 4000) },
    }),
  });
}

function parseSentryDsn(dsn: string): { key: string; storeUrl: string } | null {
  const match = /^https:\/\/([^@]+)@([^/]+)\/(\d+)\/?$/.exec(dsn.trim());
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }
  return { key: match[1], storeUrl: `https://${match[2]}/api/${match[3]}/store/` };
}
