import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import * as env from '../config/env';
import type { NotificationService } from '../observability/notification.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPasswordResetToken } from './password-reset';

describe('AuthService registration', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const notifications = { passwordReset: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    notifications as unknown as NotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a student account and returns a bearer token', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: { data: { passwordHash: string; role: Role; name: string } }) => ({
      id: 'user-1',
      email: 'alya@fluentis.test',
      name: data.name,
      role: data.role,
      passwordHash: data.passwordHash,
    }));
    jwt.signAsync.mockResolvedValue('signed-token');

    const result = await service.register({
      email: 'alya@fluentis.test',
      name: 'Alya',
      password: 'fluentis1',
    });

    const created = prisma.user.create.mock.calls[0]?.[0] as { data: { role: Role; passwordHash: string } };
    expect(created.data.role).toBe(Role.STUDENT);
    expect(created.data.passwordHash).not.toBe('fluentis1');
    await expect(compare('fluentis1', created.data.passwordHash)).resolves.toBe(true);
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toMatchObject({ id: 'user-1', role: Role.STUDENT, name: 'Alya' });
  });

  it('rejects a duplicate email before creating another account', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.register({ email: 'alya@fluentis.test', name: 'Alya', password: 'fluentis1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('AuthService password reset', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = { passwordReset: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    { signAsync: jest.fn() } as unknown as JwtService,
    notifications as unknown as NotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (work: unknown) => {
      if (typeof work === 'function') {
        return work(prisma);
      }
      return Promise.all(work as Promise<unknown>[]);
    });
    jest.spyOn(env, 'readAppEnv').mockReturnValue({ frontendOrigin: 'http://localhost:3002' } as ReturnType<typeof env.readAppEnv>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a hashed one-time link when the account is active', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'alya@fluentis.test', name: 'Alya' });
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'reset-1' });

    await service.requestPasswordReset({ email: 'alya@fluentis.test' });

    const created = prisma.passwordResetToken.create.mock.calls[0]?.[0] as {
      data: { tokenHash: string; expiresAt: Date };
    };
    expect(created.data.tokenHash).toHaveLength(64);
    expect(created.data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    const notice = notifications.passwordReset.mock.calls[0]?.[0] as { resetUrl: string };
    const token = new URL(notice.resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();
    expect(hashPasswordResetToken(token ?? '')).toBe(created.data.tokenHash);
    expect(notice.resetUrl.startsWith('http://localhost:3002/reset-password?token=')).toBe(true);
  });

  it('stays silent when the email has no active account', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await service.requestPasswordReset({ email: 'missing@fluentis.test' });

    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(notifications.passwordReset).not.toHaveBeenCalled();
  });

  it('rejects an expired token before changing the password', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.resetPassword({ token: 'a'.repeat(43), password: 'fluentis2', confirmPassword: 'fluentis2' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('hashes the new password and deletes outstanding reset tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: true });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });

    await service.resetPassword({
      token: 'reset-token-value-with-enough-length',
      password: 'fluentis2',
      confirmPassword: 'fluentis2',
    });

    const updated = prisma.user.update.mock.calls[0]?.[0] as { data: { passwordHash: string } };
    expect(updated.data.passwordHash).not.toBe('fluentis2');
    await expect(compare('fluentis2', updated.data.passwordHash)).resolves.toBe(true);
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('rejects a confirmation that does not match', async () => {
    await expect(
      service.resetPassword({ token: 'a'.repeat(43), password: 'fluentis2', confirmPassword: 'fluentis3' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
