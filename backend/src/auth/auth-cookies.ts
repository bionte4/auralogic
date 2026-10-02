import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import type { AppEnv } from '../config/env';

export const ACCESS_COOKIE = 'fluentis_access';
export const CSRF_COOKIE = 'fluentis_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

export function createCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function setAuthCookies(response: Response, env: AppEnv, accessToken: string, csrfToken: string): void {
  const base = cookieBase(env);
  response.cookie(ACCESS_COOKIE, accessToken, { ...base, httpOnly: true });
  response.cookie(CSRF_COOKIE, csrfToken, { ...base, httpOnly: false });
}

export function clearAuthCookies(response: Response, env: AppEnv): void {
  const base = cookieBase(env);
  response.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true });
  response.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

export function csrfTokensMatch(request: Request): boolean {
  const expected = readCookie(request, CSRF_COOKIE);
  const header = request.header(CSRF_HEADER);
  if (!expected || !header) {
    return false;
  }
  const left = Buffer.from(expected);
  const right = Buffer.from(header);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function hasAccessCookie(request: Request): boolean {
  return Boolean(readCookie(request, ACCESS_COOKIE));
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function cookieBase(env: AppEnv): CookieOptions {
  return {
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    path: '/',
    maxAge: TOKEN_MAX_AGE_MS,
  };
}
