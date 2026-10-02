import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { PREVIOUS_LEVEL_INCOMPLETE } from '../progress/enrollment-access';
import { AuditInterceptor } from './audit.interceptor';
import type { AuditService } from './audit.service';

function httpContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('AuditInterceptor', () => {
  const audit = { record: jest.fn() };
  const interceptor = new AuditInterceptor(audit as unknown as AuditService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a successful login without the password', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '127.0.0.1',
      headers: {},
      body: { email: 'alya@fluentis.test', password: 'secret' },
    };
    await lastValueFrom(
      interceptor.intercept(httpContext(request), { handle: () => of({ user: { id: 'user-1' } }) }),
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', actorId: 'user-1', outcome: 'SUCCESS', detail: 'alya@fluentis.test' }),
    );
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('secret');
  });

  it('records a failed login and a prerequisite denial', async () => {
    const login = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '10.0.0.8',
      headers: {},
      body: { email: 'alya@fluentis.test' },
    };
    await lastValueFrom(
      interceptor.intercept(httpContext(login), { handle: () => throwError(() => new ForbiddenException('Invalid email or password.')) }),
    ).catch(() => undefined);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_FAILED', outcome: 'FAILURE' }));

    const lesson = {
      method: 'GET',
      originalUrl: '/api/lessons/lesson-1',
      ip: '10.0.0.8',
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      user: { id: 'student-1' },
      body: {},
    };
    await lastValueFrom(
      interceptor.intercept(httpContext(lesson), {
        handle: () => throwError(() => new ForbiddenException(PREVIOUS_LEVEL_INCOMPLETE)),
      }),
    ).catch(() => undefined);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PREREQUISITE_DENIED',
        actorId: 'student-1',
        outcome: 'DENIED',
        ip: '203.0.113.9',
      }),
    );
  });

  it('records admin writes and ignores ordinary reads', async () => {
    const patch = { method: 'PATCH', originalUrl: '/api/admin/users/user-1', ip: '127.0.0.1', headers: {}, user: { id: 'admin-1' }, body: {} };
    await lastValueFrom(interceptor.intercept(httpContext(patch), { handle: () => of({ id: 'user-1' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_WRITE', actorId: 'admin-1' }));

    audit.record.mockClear();
    const read = { method: 'GET', originalUrl: '/api/admin/users', ip: '127.0.0.1', headers: {}, user: { id: 'admin-1' }, body: {} };
    await lastValueFrom(interceptor.intercept(httpContext(read), { handle: () => of([]) }));
    expect(audit.record).not.toHaveBeenCalled();
  });
});
