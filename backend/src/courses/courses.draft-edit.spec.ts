import { ConflictException, NotFoundException } from '@nestjs/common';
import { CourseStatus, LessonType, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const MODULE_ID = '22222222-2222-4222-8222-222222222222';
const LESSON_ID = '33333333-3333-4333-8333-333333333333';

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  email: 'instructor@fluentis.test',
  name: 'Auralogic Studio',
  role: Role.INSTRUCTOR,
  locale: 'ID',
};

describe('CoursesService draft edits', () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    module: { findFirst: jest.fn(), update: jest.fn() },
    lesson: { findFirst: jest.fn(), update: jest.fn() },
  };
  const service = new CoursesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renames a module while the course is still a draft', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: instructor.id,
      publishedAt: null,
      status: CourseStatus.DRAFT,
    });
    prisma.module.findFirst.mockResolvedValue({ id: MODULE_ID });
    prisma.module.update.mockResolvedValue({
      id: MODULE_ID,
      courseId: COURSE_ID,
      title: 'Instalasi Orion',
      description: null,
      outcome: 'Peserta memasang server.',
      orderIndex: 2,
    });

    const updated = await service.updateModule(instructor, COURSE_ID, MODULE_ID, {
      title: 'Instalasi Orion',
      outcome: 'Peserta memasang server.',
    });

    expect(updated.title).toBe('Instalasi Orion');
    expect(prisma.module.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: 'Instalasi Orion', outcome: 'Peserta memasang server.' },
      }),
    );
  });

  it('refuses a lesson change after the course is published', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: instructor.id,
      publishedAt: new Date('2026-10-05T00:00:00.000Z'),
      status: CourseStatus.PUBLISHED,
    });

    await expect(
      service.updateLesson(instructor, COURSE_ID, MODULE_ID, LESSON_ID, { title: 'Judul baru' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });

  it('saves a draft lesson title and keeps a quiz score', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: instructor.id,
      publishedAt: null,
      status: CourseStatus.DRAFT,
    });
    prisma.lesson.findFirst.mockResolvedValue({
      id: LESSON_ID,
      type: LessonType.QUIZ,
      passingScore: 80,
    });
    prisma.lesson.update.mockResolvedValue({
      id: LESSON_ID,
      moduleId: MODULE_ID,
      title: 'Membaca metrik',
      description: null,
      type: LessonType.QUIZ,
      orderIndex: 1,
      passingScore: 80,
    });

    const updated = await service.updateLesson(instructor, COURSE_ID, MODULE_ID, LESSON_ID, {
      title: 'Membaca metrik',
    });

    expect(updated.title).toBe('Membaca metrik');
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: LESSON_ID, moduleId: MODULE_ID, module: { courseId: COURSE_ID } } }),
    );
  });

  it('rejects a lesson edit when the lesson is not in the module', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      instructorId: instructor.id,
      publishedAt: null,
      status: CourseStatus.DRAFT,
    });
    prisma.lesson.findFirst.mockResolvedValue(null);

    await expect(
      service.updateLesson(instructor, COURSE_ID, MODULE_ID, LESSON_ID, { title: 'Hilang' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
