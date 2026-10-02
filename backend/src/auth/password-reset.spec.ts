import { hashPasswordResetToken, isPasswordResetCurrent, issuePasswordReset, PASSWORD_RESET_TTL_MS } from './password-reset';

describe('password reset tokens', () => {
  it('stores a hash and expires fifteen minutes after it is issued', () => {
    const now = Date.parse('2026-10-02T12:00:00.000Z');
    const issued = issuePasswordReset(now);

    expect(issued.token).not.toBe(issued.tokenHash);
    expect(issued.tokenHash).toBe(hashPasswordResetToken(issued.token));
    expect(issued.expiresAt.toISOString()).toBe('2026-10-02T12:15:00.000Z');
    expect(PASSWORD_RESET_TTL_MS).toBe(15 * 60 * 1000);
    expect(isPasswordResetCurrent(issued.expiresAt, now + PASSWORD_RESET_TTL_MS - 1)).toBe(true);
    expect(isPasswordResetCurrent(issued.expiresAt, now + PASSWORD_RESET_TTL_MS)).toBe(false);
  });
});
