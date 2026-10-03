import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UiLocale } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/authenticated-request';
import { readAppEnv } from '../config/env';
import { NotificationService } from '../observability/notification.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { hashPasswordResetToken, isPasswordResetCurrent, issuePasswordReset } from './password-reset';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: UiLocale;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthUser;
}

const TOKEN_TTL_SECONDS = 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const matches = await compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.active) {
      throw new UnauthorizedException('This account is deactivated.');
    }

    return this.issueToken(user);
  }

  async register(dto: RegisterDto): Promise<LoginResult> {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name,
        passwordHash,
        role: Role.STUDENT,
        locale: dto.locale ?? UiLocale.ID,
      },
    });
    return this.issueToken(user);
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' }, active: true },
      select: { id: true, email: true, name: true, locale: true },
    });
    if (!user) {
      return;
    }

    const issued = issuePasswordReset();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: issued.tokenHash, expiresAt: issued.expiresAt },
      }),
    ]);

    const origin = readAppEnv().frontendOrigin.replace(/\/$/, '');
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(issued.token)}`;
    await this.notifications.passwordReset({ email: user.email, name: user.name, resetUrl, locale: user.locale });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const tokenHash = hashPasswordResetToken(dto.token);
    const passwordHash = await hash(dto.password, 12);
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record || !isPasswordResetCurrent(record.expiresAt)) {
        throw new BadRequestException('This reset link is invalid or has expired.');
      }
      const user = await tx.user.findUnique({
        where: { id: record.userId },
        select: { id: true, active: true },
      });
      if (!user?.active) {
        throw new BadRequestException('This reset link is invalid or has expired.');
      }
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    });
  }

  async updateLocale(userId: string, locale: UiLocale): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: { id: true, email: true, name: true, role: true, locale: true },
    });
    return user;
  }

  private async issueToken(user: AuthUser): Promise<LoginResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: TOKEN_TTL_SECONDS,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    };
  }
}
