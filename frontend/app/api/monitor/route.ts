import { NextResponse } from 'next/server';
import { reportServerError } from '@/lib/error-monitor';

export async function POST(request: Request): Promise<NextResponse> {
  let message = 'Unhandled exception';
  let path = 'client';
  try {
    const body: unknown = await request.json();
    if (isClientReport(body)) {
      message = body.message.slice(0, 500);
      path = body.path.slice(0, 200);
    }
  } catch {
    message = 'Unreadable client error.';
  }
  reportServerError(new Error(message), { method: 'POST', path, status: 500 });
  return NextResponse.json({ ok: true });
}

function isClientReport(value: unknown): value is { message: string; path: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { message?: unknown; path?: unknown };
  return typeof record.message === 'string' && record.message.length > 0 && typeof record.path === 'string';
}
