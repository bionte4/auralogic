import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, PaymentStatus, Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

const admin: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@fluentis.test',
  name: 'Admin',
  role: Role.SUPER_ADMIN,
  locale: 'ID',
};

describe('AdminUsersService', () => {
  const tx = {
    user: { create: jest.fn() },
    enrollment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    course: { findUnique: jest.fn() },
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const service = new AdminUsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists accounts without password hashes', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    await service.list({ q: 'alya', role: Role.STUDENT, page: 1, pageSize: 20 });

    const query = prisma.user.findMany.mock.calls[0]?.[0] as { select: Record<string, boolean> };
    expect(query.select.passwordHash).toBeUndefined();
    expect(query.select.email).toBe(true);
  });

  it('refuses to deactivate the signed-in admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: admin.id, role: Role.SUPER_ADMIN, active: true });

    await expect(service.update(admin, admin.id, { active: false })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('registers a new student and grants course access without a payment row', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', status: CourseStatus.PUBLISHED, price: '250000.00' });
    prisma.user.findFirst.mockResolvedValue(null);
    tx.user.create.mockImplementation(async ({ data }: { data: { passwordHash: string; name: string } }) => ({
      id: 'student-1',
      email: 'alya@corp.test',
      name: data.name,
      passwordHash: data.passwordHash,
    }));
    tx.enrollment.findUnique.mockResolvedValue(null);
    tx.enrollment.create.mockResolvedValue({ id: 'enr-1' });

    const result = await service.batchEnroll({ courseId: '11111111-1111-4111-8111-111111111111', emails: ['alya@corp.test'] });

    expect(result.enrolled[0]?.createdAccount).toBe(true);
    const password = result.enrolled[0]?.temporaryPassword ?? '';
    expect(password).toMatch(/[A-Za-z]/);
    expect(password).toMatch(/\d/);
    const created = tx.user.create.mock.calls[0]?.[0] as { data: { passwordHash: string; role: Role } };
    expect(created.data.role).toBe(Role.STUDENT);
    await expect(compare(password, created.data.passwordHash)).resolves.toBe(true);
    expect(tx.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
        }),
      }),
    );
  });

  it('rejects a course that is not published', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1', status: CourseStatus.DRAFT, price: '0' });

    await expect(service.batchEnroll({ courseId: '11111111-1111-4111-8111-111111111111', emails: ['alya@corp.test'] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});