import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { csrfTokensMatch, hasAccessCookie } from '../../auth/auth-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method) || !hasAccessCookie(request) || isCredentialPost(request)) {
      return true;
    }
    if (!csrfTokensMatch(request)) {
      throw new ForbiddenException('Invalid CSRF token.');
    }
    return true;
  }
}

const CREDENTIAL_POSTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

function isCredentialPost(request: Request): boolean {
  if (request.method !== 'POST') {
    return false;
  }
  const path = request.path.replace(/\/$/, '');
  return CREDENTIAL_POSTS.some((suffix) => path === suffix || path.endsWith(suffix));
}
