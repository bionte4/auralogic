import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import {
  CourseStatus,
  EnrollmentStatus,
  LessonType,
  PaymentStatus,
  ProgressStatus,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { ENROLLMENT_REQUIRED, PREVIOUS_LEVEL_INCOMPLETE } from './enrollment-access';
import type { ScoringService } from '../scoring/scoring.service';
import { ProgressService } from './progress.service';

const COURSE_ID = 'course-1';
const LESSON_ID = 'lesson-current';

const student: AuthenticatedUser = {
  id: 'student-1',
  email: 'student@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
};

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  email: 'instructor@fluentis.test',
  name: 'Bima',
  role: Role.INSTRUCTOR,
};

function lessonAt(orderIndex: number, status: CourseStatus = CourseStatus.PUBLISHED) {
  return {
    id: LESSON_ID,
    moduleId: 'module-current',
    module: {
      id: 'module-current',
      orderIndex,
      courseId: COURSE_ID,
      course: {
        id: COURSE_ID,
        status,
        instructorId: instructor.id,
      },
    },
  };
}

function activeEnrollment() {
  return {
    status: EnrollmentStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    accessStartsAt: null,
    accessEndsAt: null,
  };
}

describe('ProgressService sequential access', () => {
  const prisma = {
    lesson: { findUnique: jest.fn() },
    quizQuestion: { count: jest.fn() },
    module: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    userProgress: { count: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    course: { findUnique: jest.fn() },
  };
  const scoring = { recordQuizAttempt: jest.fn(), awardCompletion: jest.fn() };
  const service = new ProgressService(prisma as unknown as PrismaService, scoring as unknown as ScoringService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.quizQuestion.count.mockResolvedValue(0);
  });

  it('allows level 1 when the student has an active paid enrollment', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(1));
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());

    await expect(service.assertLessonAccessible(student, LESSON_ID)).resolves.toBeUndefined();
    expect(prisma.module.findUnique).not.toHaveBeenCalled();
  });

  it('rejects level N when any lesson in level N-1 is still incomplete', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(2));
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.module.findUnique.mockResolvedValue({
      id: 'module-1',
      lessons: [{ id: 'lesson-a' }, { id: 'lesson-b' }],
    });
    prisma.userProgress.count.mockResolvedValue(1);

    await expect(service.assertLessonAccessible(student, LESSON_ID)).rejects.toMatchObject({
      message: PREVIOUS_LEVEL_INCOMPLETE,
      status: 403,
    });
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('allows level N after every lesson in level N-1 is completed', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(3));
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.module.findUnique.mockResolvedValue({
      id: 'module-2',
      lessons: [{ id: 'lesson-a' }, { id: 'lesson-b' }],
    });
    prisma.userProgress.count.mockResolvedValue(2);

    await expect(service.assertLessonAccessible(student, LESSON_ID)).resolves.toBeUndefined();
    expect(prisma.module.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId_orderIndex: { courseId: COURSE_ID, orderIndex: 2 } },
      }),
    );
  });

  it('rejects a gap or an empty previous level', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(2));
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.module.findUnique.mockResolvedValue({ id: 'module-1', lessons: [] });

    await expect(service.assertLessonAccessible(student, LESSON_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects lesson content when enrollment is missing', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(2));
    prisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(service.assertLessonAccessible(student, LESSON_ID)).rejects.toMatchObject({
      message: ENROLLMENT_REQUIRED,
    });
    expect(prisma.module.findUnique).not.toHaveBeenCalled();
  });

  it('lets the owning instructor preview without completing the previous level', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(4, CourseStatus.DRAFT));

    await expect(service.assertLessonAccessible(instructor, LESSON_ID)).resolves.toBeUndefined();
    expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
    expect(prisma.module.findUnique).not.toHaveBeenCalled();
  });

  it('rejects progress writes from non-students before the prerequisite query', async () => {
    await expect(
      service.recordProgress(instructor, LESSON_ID, { status: ProgressStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('does not write progress when the previous level is incomplete', async () => {
    prisma.lesson.findUnique.mockResolvedValue(lessonAt(2));
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.module.findUnique.mockResolvedValue({
      id: 'module-1',
      lessons: [{ id: 'lesson-a' }],
    });
    prisma.userProgress.count.mockResolvedValue(0);

    await expect(
      service.recordProgress(student, LESSON_ID, { status: ProgressStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('rejects a client score once the lesson has a question bank', async () => {
    prisma.lesson.findUnique
      .mockResolvedValueOnce(lessonAt(1))
      .mockResolvedValueOnce({ id: LESSON_ID, type: LessonType.QUIZ, passingScore: 80, module: { courseId: COURSE_ID } });
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.quizQuestion.count.mockResolvedValue(2);

    await expect(
      service.recordProgress(student, LESSON_ID, { status: ProgressStatus.COMPLETED, score: 100 }),
    ).rejects.toThrow('Submit the quiz answers to receive a score.');
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('rejects a quiz completion below the passing score', async () => {
    prisma.lesson.findUnique
      .mockResolvedValueOnce(lessonAt(1))
      .mockResolvedValueOnce({ id: LESSON_ID, type: LessonType.QUIZ, passingScore: 80 });
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());

    await expect(
      service.recordProgress(student, LESSON_ID, { status: ProgressStatus.COMPLETED, score: 70 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('keeps a completed lesson from being reopened', async () => {
    prisma.lesson.findUnique
      .mockResolvedValueOnce(lessonAt(1))
      .mockResolvedValueOnce({ id: LESSON_ID, type: LessonType.READING, passingScore: null });
    prisma.enrollment.findUnique.mockResolvedValue(activeEnrollment());
    prisma.userProgress.findUnique.mockResolvedValue({ status: ProgressStatus.COMPLETED, score: null, completedAt: new Date() });

    await expect(
      service.recordProgress(student, LESSON_ID, { status: ProgressStatus.IN_PROGRESS }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userProgress.upsert).not.toHaveBeenCalled();
  });

  it('locks level N on the progress tree until level N-1 is fully completed', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      status: CourseStatus.PUBLISHED,
      enrollments: [activeEnrollment()],
      modules: [
        {
          id: 'module-1',
          title: 'Level 1',
          orderIndex: 1,
          lessons: [
            {
              id: 'lesson-a',
              title: 'Greetings',
              type: LessonType.VIDEO,
              orderIndex: 1,
              progress: [{ status: ProgressStatus.IN_PROGRESS, score: null, completedAt: null }],
            },
          ],
        },
        {
          id: 'module-2',
          title: 'Level 2',
          orderIndex: 2,
          lessons: [
            {
              id: 'lesson-b',
              title: 'Travel',
              type: LessonType.READING,
              orderIndex: 1,
              progress: [],
            },
          ],
        },
      ],
    });

    const progress = await service.getCourseProgress(student, COURSE_ID);

    expect(progress.enrollmentActive).toBe(true);
    expect(progress.modules[0]).toMatchObject({ orderIndex: 1, locked: false, completed: false });
    expect(progress.modules[1]).toMatchObject({ orderIndex: 2, locked: true, completed: false });
    expect(progress.modules[1]?.lessons[0]?.locked).toBe(true);
  });

  it('unlocks the next level only after the current level is completed', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: COURSE_ID,
      status: CourseStatus.PUBLISHED,
      enrollments: [activeEnrollment()],
      modules: [
        {
          id: 'module-1',
          title: 'Level 1',
          orderIndex: 1,
          lessons: [
            {
              id: 'lesson-a',
              title: 'Greetings',
              type: LessonType.VIDEO,
              orderIndex: 1,
              progress: [{ status: ProgressStatus.COMPLETED, score: null, completedAt: new Date() }],
            },
          ],
        },
        {
          id: 'module-2',
          title: 'Level 2',
          orderIndex: 2,
          lessons: [
            {
              id: 'lesson-b',
              title: 'Travel',
              type: LessonType.QUIZ,
              orderIndex: 1,
              progress: [],
            },
          ],
        },
      ],
    });

    const progress = await service.getCourseProgress(student, COURSE_ID);

    expect(progress.modules[0]).toMatchObject({ locked: false, completed: true });
    expect(progress.modules[1]).toMatchObject({ locked: false, completed: false });
  });
});
