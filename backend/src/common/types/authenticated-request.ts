import type { Role, UiLocale } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: UiLocale;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
