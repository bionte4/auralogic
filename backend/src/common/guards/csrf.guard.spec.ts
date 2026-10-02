import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER } from '../../auth/auth-cookies';
import { CsrfGuard } from './csrf.guard';

function contextFor(request: { method: string; cookies?: Record<string, string>; header: (name: string) => string | undefined }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();
  const token = 'a'.repeat(32);

  it('allows bearer calls that do not carry the access cookie', () => {
    expect(
      guard.canActivate(contextFor({ method: 'POST', cookies: {}, header: () => undefined })),
    ).toBe(true);
  });

  it('rejects a cookie session whose CSRF header does not match', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'POST',
          cookies: { [ACCESS_COOKIE]: 'jwt', [CSRF_COOKIE]: token },
          header: () => 'different',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('accepts a matching CSRF header', () => {
    expect(
      guard.canActivate(
        contextFor({
          method: 'PUT',
          cookies: { [ACCESS_COOKIE]: 'jwt', [CSRF_COOKIE]: token },
          header: (name) => (name === CSRF_HEADER ? token : undefined),
        }),
      ),
    ).toBe(true);
  });
});
