export const PROFILE_KEY = 'fluentis.profile';
export const CSRF_COOKIE = 'fluentis_csrf';

const ROLES = ['STUDENT', 'INSTRUCTOR', 'SUPER_ADMIN'] as const;

export type AppRole = (typeof ROLES)[number];

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  locale?: 'ID' | 'EN';
}

export function sessionFromUser(user: AuthUser): Session {
  return { userId: user.id, email: user.email, name: user.name, role: user.role };
}

export function parseProfile(value: string): Session | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return null;
    }
    const userId = parsed.userId;
    const email = parsed.email;
    const name = parsed.name;
    const role = parsed.role;
    if (typeof userId !== 'string' || typeof email !== 'string' || typeof name !== 'string' || !isRole(role)) {
      return null;
    }
    return { userId, email, name, role };
  } catch {
    return null;
  }
}

export function isStaffRole(role: AppRole): boolean {
  return role === 'INSTRUCTOR' || role === 'SUPER_ADMIN';
}

export function readSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.sessionStorage.getItem(PROFILE_KEY);
  return raw ? parseProfile(raw) : null;
}

export function saveSession(user: AuthUser): Session {
  const session = sessionFromUser(user);
  window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  window.sessionStorage.removeItem(PROFILE_KEY);
}

export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${CSRF_COOKIE}=`;
  const pair = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return pair ? decodeURIComponent(pair.slice(prefix.length)) : null;
}

function isRole(value: unknown): value is AppRole {
  return typeof value === 'string' && ROLES.some((role) => role === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
