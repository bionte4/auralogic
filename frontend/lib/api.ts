import { readCsrfToken } from './session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const SAFE_METHODS = new Set(['GET', 'HEAD']);

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCsrfToken();
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
  }
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(readErrorMessage(body) ?? `Request failed (${response.status}).`, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function readErrorMessage(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const message = body.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message)) {
    const lines = message.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return lines.length > 0 ? lines.join(' ') : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
