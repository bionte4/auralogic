import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { BadgeCode, LessonType, Prisma, ProgressStatus } from '@prisma/client';
import { CertificatesService } from '../certificates/certificates.service';
import { NotificationService } from '../observability/notification.service';
import { isCourseComplete } from '../certificates/course-complete';
import { PrismaService } from '../prisma/prisma.service';
import { isDistinction, jakartaDate, nextStreak, xpForCompletion } from './scoring.rules';

export interface RewardBadge {
  code: BadgeCode;
  courseId: string;
  label: string;
  awardedAt: Date;
}

export interface QuizHistoryItem {
  lessonTitle: string;
  levelTitle: string;
  levelIndex: number;
  courseTitle: string;
  score: number;
  passed: boolean;
  createdAt: Date;
}

export interface RewardsView {
  xp: number;
  streakCount: number;
  badges: RewardBadge[];
  quizAttempts: QuizHistoryItem[];
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificates: CertificatesService,
    @Optional() @Inject(NotificationService) private readonly notifications?: NotificationService,
  ) {}

  async recordQuizAttempt(userId: string, lessonId: string, score: number, passingScore: number): Promise<void> {
    await this.prisma.quizAttempt.create({
      data: { userId, lessonId, score, passed: score >= passingScore },
    });
  }

  async awardCompletion(userId: string, lessonId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        type: true,
        module: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            courseId: true,
            lessons: {
              select: {
                id: true,
                progress: { where: { userId }, select: { status: true } },
              },
            },
          },
        },
      },
    });
    const progress = await this.prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, score: true, rewardedAt: true },
    });
    if (!lesson || !progress || progress.status !== ProgressStatus.COMPLETED || progress.rewardedAt) {
      return;
    }

    const levelCompleted = lesson.module.lessons.every((item) => item.progress[0]?.status === ProgressStatus.COMPLETED);
    const amount = xpForCompletion(lesson.type, levelCompleted);
    const now = new Date();
    const today = jakartaDate(now);
    const badges = badgeRows(userId, lesson, progress.score, levelCompleted);

    const certificateId = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.userProgress.updateMany({
        where: { userId, lessonId, rewardedAt: null, status: ProgressStatus.COMPLETED },
        data: { rewardedAt: now },
      });
      if (claimed.count !== 1) {
        return null;
      }
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { streakCount: true, lastActiveOn: true },
      });
      const previous = user?.lastActiveOn ? jakartaDate(user.lastActiveOn) : null;
      await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: amount },
          streakCount: nextStreak(previous, user?.streakCount ?? 0, today),
          lastActiveOn: new Date(`${today}T00:00:00.000Z`),
        },
      });
      if (badges.length > 0) {
        await tx.userBadge.createMany({ data: badges, skipDuplicates: true });
      }
      return issueCertificateIfComplete(tx, userId, lesson.module.courseId);
    });
    if (certificateId) {
      try {
        await this.certificates.materialize(certificateId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Certificate PDF render failed.';
        this.logger.error(`Certificate ${certificateId} was issued without a PDF. ${message}`);
      }
      await this.notifications?.courseCompleted(certificateId);
    }
  }

  async getRewards(userId: string): Promise<RewardsView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        streakCount: true,
        badges: {
          orderBy: { awardedAt: 'desc' },
          take: 24,
          select: { code: true, courseId: true, label: true, awardedAt: true },
        },
        quizAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            score: true,
            passed: true,
            createdAt: true,
            lesson: {
              select: {
                title: true,
                module: { select: { title: true, orderIndex: true, course: { select: { title: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      return { xp: 0, streakCount: 0, badges: [], quizAttempts: [] };
    }
    return {
      xp: user.xp,
      streakCount: user.streakCount,
      badges: user.badges,
      quizAttempts: user.quizAttempts.map((attempt) => ({
        lessonTitle: attempt.lesson.title,
        levelTitle: attempt.lesson.module.title,
        levelIndex: attempt.lesson.module.orderIndex,
        courseTitle: attempt.lesson.module.course.title,
        score: attempt.score,
        passed: attempt.passed,
        createdAt: attempt.createdAt,
      })),
    };
  }
}

function badgeRows(
  userId: string,
  lesson: {
    id: string;
    title: string;
    type: LessonType;
    module: { id: string; title: string; orderIndex: number; courseId: string };
  },
  score: number | null,
  levelCompleted: boolean,
): Array<{ userId: string; code: BadgeCode; courseId: string; sourceId: string; label: string }> {
  const rows: Array<{ userId: string; code: BadgeCode; courseId: string; sourceId: string; label: string }> = [];
  if (lesson.type === LessonType.QUIZ && score !== null && isDistinction(score)) {
    rows.push({
      userId,
      code: BadgeCode.DISTINCTION,
      courseId: lesson.module.courseId,
      sourceId: lesson.id,
      label: `Distinction · ${lesson.title}`,
    });
  }
  if (levelCompleted) {
    rows.push({
      userId,
      code: BadgeCode.LEVEL_COMPLETE,
      courseId: lesson.module.courseId,
      sourceId: lesson.module.id,
      label: `Level ${lesson.module.orderIndex} complete · ${lesson.module.title}`,
    });
  }
  return rows;
}

async function issueCertificateIfComplete(
  tx: Prisma.TransactionClient,
  userId: string,
  courseId: string,
): Promise<string | null> {
  const lessons = await tx.lesson.findMany({
    where: { module: { courseId } },
    select: { progress: { where: { userId, status: ProgressStatus.COMPLETED }, select: { id: true } } },
  });
  if (!isCourseComplete(lessons.map((lesson) => lesson.progress.length))) {
    return null;
  }
  const certificate = await tx.certificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
    select: { id: true },
  });
  return certificate.id;
}
