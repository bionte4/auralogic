import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const MODULE_ID = '22222222-2222-4222-8222-222222222222';
const LESSON_ID = '33333333-3333-4333-8333-333333333333';
const OBJECT_KEY = `lessons/${LESSON_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf`;

const admin: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@auralogic.web.id',
  name: 'Admin',
  role: Role.SUPER_ADMIN,
  locale: 'ID',
};

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  email: 'instructor@fluentis.test',
  name: 'Studio',
  role: Role.INSTRUCTOR,
  locale: 'ID',
};

describe('CoursesService admin delete', () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    module: { findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn(), update: jest.fn(), count: jest.fn() },
    lesson: { findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn(), update: jest.fn() },
    userBadge: { deleteMany: jest.fn() },
    placementChoice: { updateMany: jest.fn() },
    coursePlacement: { updateMany: jest.fn() },
  };
  const attachments = { remove: jest.fn(async () => undefined) };
  const service = new CoursesService(prisma as unknown as PrismaService, undefined, attachments as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: instructor.id,
      publishedAt: new Date('2026-10-05T00:00:00.000Z'),
      status: CourseStatus.PUBLISHED,
    });
  });

  it('refuses an instructor who tries to delete a lesson', async () => {
    await expect(service.removeLesson(instructor, COURSE_ID, MODULE_ID, LESSON_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.lesson.delete).not.toHaveBeenCalled();
  });

  it('deletes a lesson, purges its files, and renumbers the rest', async () => {
    prisma.lesson.findFirst.mockResolvedValue({
      id: LESSON_ID,
      attachments: [{ objectKey: OBJECT_KEY }],
    });
    prisma.lesson.findMany.mockResolvedValue([{ id: 'lesson-keep' }]);

    await service.removeLesson(admin, COURSE_ID, MODULE_ID, LESSON_ID);

    expect(prisma.lesson.delete).toHaveBeenCalledWith({ where: { id: LESSON_ID } });
    expect(attachments.remove).toHaveBeenCalledWith(OBJECT_KEY);
    expect(prisma.userBadge.deleteMany).toHaveBeenCalledWith({ where: { sourceId: LESSON_ID } });
    expect(prisma.lesson.update).toHaveBeenCalledTimes(2);
  });

  it('deletes a module and clamps placement targets', async () => {
    prisma.module.findFirst.mockResolvedValue({
      id: MODULE_ID,
      lessons: [{ id: LESSON_ID, attachments: [{ objectKey: OBJECT_KEY }] }],
    });
    prisma.module.findMany.mockResolvedValue([{ id: 'module-keep' }]);
    prisma.module.count.mockResolvedValue(1);

    await service.removeModule(admin, COURSE_ID, MODULE_ID);

    expect(prisma.module.delete).toHaveBeenCalledWith({ where: { id: MODULE_ID } });
    expect(attachments.remove).toHaveBeenCalledWith(OBJECT_KEY);
    expect(prisma.placementChoice.updateMany).toHaveBeenCalled();
    expect(prisma.coursePlacement.updateMany).toHaveBeenCalled();
  });

  it('rejects a missing module', async () => {
    prisma.module.findFirst.mockResolvedValue(null);
    await expect(service.removeModule(admin, COURSE_ID, MODULE_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
