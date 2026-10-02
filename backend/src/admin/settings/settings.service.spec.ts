import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { openSecret } from './settings.crypto';
import { SettingsService } from './settings.service';

const MATERIAL = 'jwt-secret-material-32-characters-xx';

describe('SettingsService', () => {
  const prisma = {
    setting: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const service = new SettingsService(prisma as unknown as PrismaService, {
    sealKey: () => MATERIAL,
    sendSmtp: jest.fn(async () => 'sent'),
    request: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.setting.upsert.mockResolvedValue({ id: 'setting-1' });
  });

  it('stores a sealed SMTP password and returns a masked view', async () => {
    prisma.setting.findUnique.mockResolvedValue(null);

    const saved = await service.save({
      key: 'smtp',
      smtp: { host: 'smtp.school.edu', port: 587, username: 'mailer', password: 'secret-mail', fromEmail: 'mail@school.edu' },
    });

    const written = prisma.setting.upsert.mock.calls[0]?.[0] as { create: { value: string } };
    const stored = JSON.parse(written.create.value) as { password: string };
    expect(stored.password.startsWith('enc:v1:')).toBe(true);
    expect(written.create.value).not.toContain('secret-mail');
    expect(openSecret(stored.password, MATERIAL)).toBe('secret-mail');
    expect(saved).toMatchObject({ key: 'smtp', saved: true, smtp: { passwordConfigured: true, host: 'smtp.school.edu' } });
    expect(JSON.stringify(saved)).not.toContain('secret-mail');
  });

  it('keeps the saved secret when the password field is left blank', async () => {
    prisma.setting.findUnique.mockResolvedValue(null);
    await service.save({
      key: 'smtp',
      smtp: { host: 'smtp.school.edu', port: 587, username: 'mailer', password: 'secret-mail', fromEmail: 'mail@school.edu' },
    });
    const first = prisma.setting.upsert.mock.calls[0]?.[0] as { create: { value: string } };
    prisma.setting.findUnique.mockResolvedValue({ value: first.create.value });

    await service.save({
      key: 'smtp',
      smtp: { host: 'smtp.school.edu', port: 587, username: 'mailer', password: '', fromEmail: 'mail@school.edu' },
    });

    const second = prisma.setting.upsert.mock.calls[1]?.[0] as { create: { value: string } };
    const stored = JSON.parse(second.create.value) as { password: string };
    expect(openSecret(stored.password, MATERIAL)).toBe('secret-mail');
  });

  it('rejects an unknown settings key', async () => {
    await expect(service.get('billing')).rejects.toBeInstanceOf(BadRequestException);
  });
});
