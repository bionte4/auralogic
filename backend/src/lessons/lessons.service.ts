import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LessonType, Prisma, VideoEncryption } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { LessonDetail, LessonPlayback } from './lesson.types';

const lessonDetailSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  orderIndex: true,
  passingScore: true,
  module: {
    select: {
      id: true,
      title: true,
      orderIndex: true,
      courseId: true,
    },
  },
  videoAsset: {
    select: {
      provider: true,
      encryption: true,
      durationSeconds: true,
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      fileName: true,
      contentType: true,
      sizeBytes: true,
    },
  },
} satisfies Prisma.LessonSelect;

type LessonDetailRow = Prisma.LessonGetPayload<{ select: typeof lessonDetailSelect }>;

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  async getById(user: AuthenticatedUser, lessonId: string): Promise<LessonDetail> {
    await this.progressService.assertLessonAccessible(user, lessonId, 'content');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: lessonDetailSelect,
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    return toLessonDetail(lesson, user);
  }
}

function toLessonDetail(lesson: LessonDetailRow, user: AuthenticatedUser): LessonDetail {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    type: lesson.type,
    orderIndex: lesson.orderIndex,
    passingScore: lesson.passingScore,
    module: lesson.module,
    playback: toPlayback(lesson, user),
    attachments: lesson.attachments,
  };
}

function toPlayback(lesson: LessonDetailRow, user: AuthenticatedUser): LessonPlayback | null {
  if (lesson.type !== LessonType.VIDEO) {
    return null;
  }
  if (!lesson.videoAsset || lesson.videoAsset.encryption !== VideoEncryption.AES_128) {
    throw new ConflictException('Video lesson is missing an AES-128 HLS asset.');
  }
  return {
    protocol: 'HLS',
    encryption: VideoEncryption.AES_128,
    provider: lesson.videoAsset.provider,
    durationSeconds: lesson.videoAsset.durationSeconds,
    watermark: {
      userId: user.id,
      email: user.email,
    },
  };
}
