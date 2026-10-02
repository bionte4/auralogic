import { ForbiddenException } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import type { PaymentGateway } from './payment.types';
import { CheckoutService } from './checkout.service';

const student: AuthenticatedUser = {
  id: 'student-1',
  email: 'alya@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
};

describe('CheckoutService listEnrollments', () => {
  const prisma = { enrollment: { findMany: jest.fn() } };
  const service = new CheckoutService(prisma as unknown as PrismaService, {} as PaymentGateway);

  it('rejects a non-student', async () => {
    await expect(
      service.listEnrollments({ ...student, role: Role.INSTRUCTOR }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns published enrollments with access granted only when paid and active', async () => {
    prisma.enrollment.findMany.mockResolvedValue([
      {
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.PAID,
        accessStartsAt: null,
        accessEndsAt: null,
        course: { title: 'Business English', level: 'B1' },
      },
    ]);

    const rows = await service.listEnrollments(student);

    expect(rows[0]).toMatchObject({
      title: 'Business English',
      accessGranted: true,
      paymentStatus: PaymentStatus.PAID,
      progressPercent: 0,
    });
  });
});
