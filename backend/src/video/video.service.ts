import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LessonType, Role, StreamProvider, VideoEncryption } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { CreateUploadDto } from './dto/create-upload.dto';
import {
  VIDEO_DELIVERY,
  type PlaybackGrant,
  type UploadGrant,
  type VideoDelivery,
} from './video.types';

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
    @Inject(VIDEO_DELIVERY) private readonly delivery: VideoDelivery,
  ) {}

  async createUpload(user: AuthenticatedUser, lessonId: string, dto: CreateUploadDto): Promise<UploadGrant> {
    if (user.role !== Role.INSTRUCTOR && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only instructors can upload lesson videos.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        type: true,
        module: {
          select: {
            courseId: true,
            course: { select: { instructorId: true } },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    if (lesson.type !== LessonType.VIDEO) {
      throw new BadRequestException('Only video lessons accept an upload.');
    }
    if (user.role === Role.INSTRUCTOR && lesson.module.course.instructorId !== user.id) {
      throw new ForbiddenException('You can only upload videos to your own courses.');
    }

    const created = await this.delivery.createUpload({
      durationSeconds: dto.durationSeconds,
    });
    if (created.assetId.toLowerCase().includes('.mp4') || created.uploadUrl.toLowerCase().includes('.mp4')) {
      throw new BadRequestException('Raw .mp4 uploads are not allowed.');
    }

    await this.prisma.videoAsset.upsert({
      where: { lessonId: lesson.id },
      create: {
        lessonId: lesson.id,
        provider: StreamProvider.CLOUDFLARE_STREAM,
        assetId: created.assetId,
        encryption: VideoEncryption.AES_128,
        durationSeconds: dto.durationSeconds,
      },
      update: {
        provider: StreamProvider.CLOUDFLARE_STREAM,
        assetId: created.assetId,
        encryption: VideoEncryption.AES_128,
        durationSeconds: dto.durationSeconds,
      },
    });

    return {
      provider: StreamProvider.CLOUDFLARE_STREAM,
      assetId: created.assetId,
      uploadUrl: created.uploadUrl,
      method: created.method,
      headers: created.headers,
      expiresAt: created.expiresAt,
    };
  }

  async getPlayback(user: AuthenticatedUser, lessonId: string): Promise<PlaybackGrant> {
    await this.progressService.assertLessonAccessible(user, lessonId, 'content');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        type: true,
        videoAsset: {
          select: {
            assetId: true,
            encryption: true,
          },
        },
      },
    });
    if (!lesson || lesson.type !== LessonType.VIDEO) {
      throw new NotFoundException('Video lesson not found.');
    }
    if (!lesson.videoAsset || lesson.videoAsset.encryption !== VideoEncryption.AES_128) {
      throw new ConflictException('Video lesson is missing an AES-128 HLS asset.');
    }
    const signed = await this.delivery.signPlayback({
      assetId: lesson.videoAsset.assetId,
    });

    return {
      protocol: 'HLS',
      encryption: VideoEncryption.AES_128,
      manifestUrl: signed.manifestUrl,
      expiresAt: signed.expiresAt,
      watermark: {
        userId: user.id,
        email: user.email,
      },
    };
  }
}
