import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { csrfTokensMatch, hasAccessCookie } from '../../auth/auth-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method) || !hasAccessCookie(request)) {
      return true;
    }
    if (!csrfTokensMatch(request)) {
      throw new ForbiddenException('Invalid CSRF token.');
    }
    return true;
  }
}
