import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseStatus, LessonType, Prisma, ProgressStatus, Role } from '@prisma/client';
import { CacheService, progressKey } from '../cache/cache.service';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import type { UpdateProgressDto } from './dto/update-progress.dto';
import {
  COURSE_UNAVAILABLE,
  ENROLLMENT_REQUIRED,
  PLACEMENT_REQUIRED,
  PREVIOUS_LEVEL_INCOMPLETE,
  enrollmentAccessDenial,
} from './enrollment-access';
import type { CourseProgressView, LessonProgressView, ModuleProgressView, ProgressRecord } from './progress.types';

export type LessonAccessMode = 'content' | 'write';

const lessonAccessSelect = {
  id: true,
  orderIndex: true,
  moduleId: true,
  module: {
    select: {
      id: true,
      orderIndex: true,
      courseId: true,
      course: {
        select: {
          id: true,
          status: true,
          instructorId: true,
        },
      },
    },
  },
} satisfies Prisma.LessonSelect;

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    @Optional() @Inject(CacheService) private readonly cache?: CacheService,
  ) {}

  /**
   * Server-side gate for lesson level N.
   * Students reach level N only after every lesson in level N - 1 is COMPLETED
   * and the course enrollment is active and paid. Staff preview is limited to
   * SUPER_ADMIN and the owning instructor.
   */
  async assertLessonAccessible(
    user: AuthenticatedUser,
    lessonId: string,
    mode: LessonAccessMode = 'write',
  ): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: lessonAccessSelect,
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    if (user.role === Role.INSTRUCTOR) {
      if (lesson.module.course.instructorId !== user.id) {
        throw new ForbiddenException('You can only access lessons in your own courses.');
      }
      return;
    }

    if (lesson.module.course.status !== CourseStatus.PUBLISHED) {
      throw new ForbiddenException(COURSE_UNAVAILABLE);
    }

    const openingPreview = mode === 'content' && lesson.orderIndex === 1 && lesson.module.orderIndex === 1;
    const denial = await this.enrollmentDenial(user.id, lesson.module.courseId);
    if (openingPreview && denial) {
      return;
    }
    if (denial) {
      throw new ForbiddenException(denial);
    }
    if (await this.placementBlocks(user.id, lesson.module.courseId)) {
      throw new ForbiddenException(PLACEMENT_REQUIRED);
    }
    await this.assertPreviousLevelCompleted(user.id, lesson.module.courseId, lesson.module.orderIndex);
  }

  async getCourseProgress(user: AuthenticatedUser, courseId: string): Promise<CourseProgressView> {
    const key = progressKey(user.id, courseId);
    const cached = await this.cache?.getJson(key, isCourseProgressView);
    if (cached) {
      return cached;
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        status: true,
        modules: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                orderIndex: true,
                progress: {
                  where: { userId: user.id },
                  select: { status: true, score: true, completedAt: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { userId: user.id },
          take: 1,
          select: {
            status: true,
            paymentStatus: true,
            accessStartsAt: true,
            accessEndsAt: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new ForbiddenException(COURSE_UNAVAILABLE);
    }

    const enrollment = course.enrollments[0] ?? null;
    if (!enrollment) {
      throw new ForbiddenException(ENROLLMENT_REQUIRED);
    }

    const enrollmentActive = enrollmentAccessDenial(enrollment, new Date()) === null;
    const placement = await this.prisma.coursePlacement.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { startOrderIndex: true },
    });
    const questionCount = await this.prisma.placementQuestion.count({ where: { courseId } });
    const placementRequired = questionCount > 0 && !placement;
    const startOrderIndex = placement?.startOrderIndex ?? 1;
    let previousSatisfied = true;
    const modules: ModuleProgressView[] = course.modules.map((module) => {
      const openedByPlacement = module.orderIndex <= startOrderIndex;
      const locked = !enrollmentActive || placementRequired || !(previousSatisfied || openedByPlacement);
      const lessons: LessonProgressView[] = module.lessons.map((lesson) => {
        const progress = lesson.progress[0];
        return {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          orderIndex: lesson.orderIndex,
          locked,
          status: progress?.status ?? ProgressStatus.NOT_STARTED,
          score: progress?.score ?? null,
          completedAt: progress?.completedAt ?? null,
        };
      });
      const completed =
        !locked && lessons.length > 0 && lessons.every((lesson) => lesson.status === ProgressStatus.COMPLETED);
      previousSatisfied = completed || module.orderIndex < startOrderIndex;
      return {
        id: module.id,
        title: module.title,
        orderIndex: module.orderIndex,
        locked,
        completed,
        lessons,
      };
    });

    const view = { courseId: course.id, enrollmentActive, startOrderIndex, placementRequired, modules };
    await this.cache?.setJson(key, view, 30);
    return view;
  }

  async recordProgress(
    user: AuthenticatedUser,
    lessonId: string,
    dto: UpdateProgressDto,
    source: 'client' | 'quiz' = 'client',
  ): Promise<ProgressRecord> {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can record lesson progress.');
    }

    const status: ProgressStatus = dto.status;
    if (status === ProgressStatus.NOT_STARTED) {
      throw new BadRequestException('Progress cannot be reset from this endpoint.');
    }

    await this.assertLessonAccessible(user, lessonId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, type: true, passingScore: true, module: { select: { courseId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    if (source !== 'quiz' && lesson.type === LessonType.QUIZ && (dto.score !== undefined || dto.status === ProgressStatus.COMPLETED)) {
      const bank = await this.prisma.quizQuestion.count({ where: { lessonId } });
      if (bank > 0) {
        throw new UnprocessableEntityException('Submit the quiz answers to receive a score.');
      }
    }

    if (lesson.type === LessonType.QUIZ && dto.score !== undefined && lesson.passingScore !== null) {
      await this.scoring.recordQuizAttempt(user.id, lesson.id, dto.score, lesson.passingScore);
    }
    this.assertScoreCanComplete(lesson, dto);

    const existing = await this.prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });
    if (existing?.status === ProgressStatus.COMPLETED && dto.status !== ProgressStatus.COMPLETED) {
      throw new ConflictException('A completed lesson cannot be reopened.');
    }

    const now = new Date();
    const completedAt = status === ProgressStatus.COMPLETED ? (existing?.completedAt ?? now) : null;
    const countsAttempt = dto.score !== undefined || status === ProgressStatus.COMPLETED;

    const saved = await this.prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: {
        userId: user.id,
        lessonId,
        status,
        score: dto.score ?? null,
        attemptCount: countsAttempt ? 1 : 0,
        completedAt,
      },
      update: {
        status,
        score: dto.score ?? existing?.score ?? null,
        completedAt,
        ...(countsAttempt ? { attemptCount: { increment: 1 } } : {}),
      },
    });

    if (status === ProgressStatus.COMPLETED && existing?.status !== ProgressStatus.COMPLETED) {
      await this.scoring.awardCompletion(user.id, lesson.id);
    }
    const courseId = lesson.module?.courseId;
    if (courseId) {
      await this.cache?.delete(progressKey(user.id, courseId));
    }

    return {
      id: saved.id,
      lessonId: saved.lessonId,
      status: saved.status,
      score: saved.score,
      attemptCount: saved.attemptCount,
      completedAt: saved.completedAt,
    };
  }

  private assertScoreCanComplete(
    lesson: { type: LessonType; passingScore: number | null },
    dto: UpdateProgressDto,
  ): void {
    if (lesson.type === LessonType.QUIZ && lesson.passingScore === null) {
      throw new ConflictException('Quiz lesson is missing a passing score.');
    }
    if (dto.status !== ProgressStatus.COMPLETED || lesson.passingScore === null) {
      return;
    }
    if (dto.score === undefined) {
      throw new UnprocessableEntityException('A score is required to complete this lesson.');
    }
    if (dto.score < lesson.passingScore) {
      throw new UnprocessableEntityException('Score is below the passing score for this lesson.');
    }
  }

  private async enrollmentDenial(userId: string, courseId: string): Promise<string | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: {
        status: true,
        paymentStatus: true,
        accessStartsAt: true,
        accessEndsAt: true,
      },
    });
    return enrollmentAccessDenial(enrollment, new Date());
  }

  private async placementBlocks(userId: string, courseId: string): Promise<boolean> {
    const [placement, questionCount] = await Promise.all([
      this.prisma.coursePlacement.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true },
      }),
      this.prisma.placementQuestion.count({ where: { courseId } }),
    ]);
    return questionCount > 0 && !placement;
  }

  private async assertPreviousLevelCompleted(
    userId: string,
    courseId: string,
    orderIndex: number,
  ): Promise<void> {
    if (orderIndex <= 1) {
      return;
    }

    const placement = await this.prisma.coursePlacement.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { startOrderIndex: true },
    });
    if (placement && orderIndex <= placement.startOrderIndex) {
      return;
    }

    const previous = await this.prisma.module.findUnique({
      where: {
        courseId_orderIndex: {
          courseId,
          orderIndex: orderIndex - 1,
        },
      },
      select: {
        id: true,
        lessons: { select: { id: true } },
      },
    });

    if (!previous || previous.lessons.length === 0) {
      throw new ForbiddenException(PREVIOUS_LEVEL_INCOMPLETE);
    }

    const completedCount = await this.prisma.userProgress.count({
      where: {
        userId,
        status: ProgressStatus.COMPLETED,
        lessonId: { in: previous.lessons.map((lesson) => lesson.id) },
      },
    });

    if (completedCount !== previous.lessons.length) {
      throw new ForbiddenException(PREVIOUS_LEVEL_INCOMPLETE);
    }
  }
}

function isCourseProgressView(value: unknown): value is CourseProgressView {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as {
    courseId?: unknown;
    modules?: unknown;
    enrollmentActive?: unknown;
    startOrderIndex?: unknown;
    placementRequired?: unknown;
  };
  return (
    typeof record.courseId === 'string' &&
    typeof record.enrollmentActive === 'boolean' &&
    typeof record.startOrderIndex === 'number' &&
    typeof record.placementRequired === 'boolean' &&
    Array.isArray(record.modules)
  );
}
