import { ForbiddenException } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus, ProgressStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  email: 'bima@fluentis.test',
  name: 'Bima',
  role: Role.INSTRUCTOR,
  locale: 'ID',
};

describe('CoursesService roster', () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    userProgress: { groupBy: jest.fn() },
  };
  const tracks = { assertTrackAssignable: jest.fn(async () => undefined) };
  const service = new CoursesService(prisma as unknown as PrismaService, tracks as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an instructor who does not own the course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: 'someone-else',
      publishedAt: null,
    });

    await expect(service.getRoster(instructor, COURSE_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userProgress.groupBy).not.toHaveBeenCalled();
  });

  it('reports payment status and completed-lesson progress for the owner', async () => {
    prisma.course.findUnique
      .mockResolvedValueOnce({ id: COURSE_ID, instructorId: instructor.id, publishedAt: null })
      .mockResolvedValueOnce({
        modules: [{ lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] }],
        enrollments: [
          {
            id: 'enrollment-1',
            orderId: 'fls-1',
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.PAID,
            amount: { toFixed: () => '250000.00' },
            currency: 'IDR',
            paidAt: new Date('2026-10-02T00:00:00.000Z'),
            user: { id: 'student-1', name: 'Alya', email: 'alya@fluentis.test' },
          },
        ],
      });
    prisma.userProgress.groupBy.mockResolvedValue([{ userId: 'student-1', _count: { _all: 1 } }]);

    const roster = await service.getRoster(instructor, COURSE_ID);

    expect(prisma.userProgress.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ProgressStatus.COMPLETED }),
      }),
    );
    expect(roster.enrollments[0]).toMatchObject({
      paymentStatus: PaymentStatus.PAID,
      status: EnrollmentStatus.ACTIVE,
      amount: '250000.00',
      completedLessons: 1,
      lessonCount: 2,
      progressPercent: 50,
    });
  });
});
