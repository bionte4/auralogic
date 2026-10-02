import { createHash, randomBytes } from 'crypto';

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

export interface IssuedPasswordReset {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function issuePasswordReset(now = Date.now()): IssuedPasswordReset {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now + PASSWORD_RESET_TTL_MS),
  };
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isPasswordResetCurrent(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() > now;
}
