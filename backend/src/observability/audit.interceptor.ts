import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { Request } from 'express';
import { PREVIOUS_LEVEL_INCOMPLETE } from '../progress/enrollment-access';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { AuditService } from './audit.service';

type AuditRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<AuditRequest>();
    return next.handle().pipe(
      tap((body: unknown) => {
        void this.onSuccess(request, body);
      }),
      catchError((error: unknown) => {
        void this.onError(request, error);
        return throwError(() => error);
      }),
    );
  }

  private async onSuccess(request: AuditRequest, body: unknown): Promise<void> {
    const path = requestPath(request);
    const method = request.method.toUpperCase();
    if (method === 'POST' && path.endsWith('/auth/login')) {
      const actorId = readUserId(body);
      await this.audit.record({
        actorId,
        action: 'LOGIN',
        resource: 'auth/login',
        outcome: 'SUCCESS',
        ip: clientIp(request),
        detail: loginEmail(request),
      });
      return;
    }
    if (isAdminWrite(method, path)) {
      await this.audit.record({
        actorId: request.user?.id ?? null,
        action: 'ADMIN_WRITE',
        resource: `${method} ${path}`.slice(0, 200),
        outcome: 'SUCCESS',
        ip: clientIp(request),
      });
    }
  }

  private async onError(request: AuditRequest, error: unknown): Promise<void> {
    const path = requestPath(request);
    const method = request.method.toUpperCase();
    if (method === 'POST' && path.endsWith('/auth/login')) {
      await this.audit.record({
        action: 'LOGIN_FAILED',
        resource: 'auth/login',
        outcome: 'FAILURE',
        ip: clientIp(request),
        detail: loginEmail(request),
      });
      return;
    }
    if (error instanceof ForbiddenException && error.message === PREVIOUS_LEVEL_INCOMPLETE) {
      await this.audit.record({
        actorId: request.user?.id ?? null,
        action: 'PREREQUISITE_DENIED',
        resource: `${method} ${path}`.slice(0, 200),
        outcome: 'DENIED',
        ip: clientIp(request),
        detail: PREVIOUS_LEVEL_INCOMPLETE,
      });
    }
  }
}

function isAdminWrite(method: string, path: string): boolean {
  return path.includes('/admin/') && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE');
}

function requestPath(request: Request): string {
  const raw = request.originalUrl || request.url || '';
  return raw.split('?')[0] ?? '';
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  const header = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = header?.split(',')[0]?.trim();
  if (first && first.length <= 64) {
    return first;
  }
  return request.ip ? request.ip.slice(0, 64) : null;
}

function loginEmail(request: Request): string {
  if (!isRecord(request.body)) {
    return '';
  }
  const email = request.body.email;
  return typeof email === 'string' ? email.slice(0, 200) : '';
}

function readUserId(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.user)) {
    return null;
  }
  return typeof body.user.id === 'string' ? body.user.id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
