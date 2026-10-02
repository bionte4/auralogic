import { ForbiddenException } from '@nestjs/common';
import { LessonType, Role, StreamProvider, VideoEncryption } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import type { ProgressService } from '../progress/progress.service';
import { VideoService } from './video.service';
import type { VideoDelivery } from './video.types';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';

const student: AuthenticatedUser = {
  id: 'student-1',
  email: 'alya@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
};

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  email: 'bima@fluentis.test',
  name: 'Bima',
  role: Role.INSTRUCTOR,
};

describe('VideoService', () => {
  const prisma = {
    lesson: { findUnique: jest.fn() },
    videoAsset: { upsert: jest.fn() },
  };
  const progressService = { assertLessonAccessible: jest.fn() };
  const delivery: jest.Mocked<VideoDelivery> = {
    createUpload: jest.fn(),
    signPlayback: jest.fn(),
  };
  const service = new VideoService(
    prisma as unknown as PrismaService,
    progressService as unknown as ProgressService,
    delivery,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not sign playback when the previous level is still locked', async () => {
    progressService.assertLessonAccessible.mockRejectedValue(new ForbiddenException('locked'));

    await expect(service.getPlayback(student, LESSON_ID)).rejects.toBeInstanceOf(ForbiddenException);
    expect(delivery.signPlayback).not.toHaveBeenCalled();
  });

  it('returns a signed HLS manifest and the student watermark after access is granted', async () => {
    progressService.assertLessonAccessible.mockResolvedValue(undefined);
    prisma.lesson.findUnique.mockResolvedValue({
      type: LessonType.VIDEO,
      videoAsset: {
        provider: StreamProvider.CLOUDFLARE_STREAM,
        assetId: 'ea95132c15732412d22c1476fa83f27a',
        encryption: VideoEncryption.AES_128,
      },
    });
    delivery.signPlayback.mockResolvedValue({
      manifestUrl: 'https://customer-abc123.cloudflarestream.com/token/manifest/video.m3u8',
      expiresAt: new Date('2026-10-02T13:00:00.000Z'),
    });

    const playback = await service.getPlayback(student, LESSON_ID);

    expect(playback.protocol).toBe('HLS');
    expect(playback.encryption).toBe(VideoEncryption.AES_128);
    expect(playback.manifestUrl.endsWith('/manifest/video.m3u8')).toBe(true);
    expect(playback.watermark).toEqual({ userId: student.id, email: student.email });
  });

  it('stores an AES-128 HLS asset from a direct upload and rejects an mp4 target', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      type: LessonType.VIDEO,
      module: { courseId: COURSE_ID, course: { instructorId: instructor.id } },
    });
    delivery.createUpload.mockResolvedValue({
      uploadUrl: 'https://upload.cloudflarestream.com/direct/uid',
      assetId: 'ea95132c15732412d22c1476fa83f27a',
      method: 'POST',
      headers: {},
      expiresAt: new Date('2026-10-02T13:00:00.000Z'),
    });

    const grant = await service.createUpload(instructor, LESSON_ID, {
      durationSeconds: 600,
    });

    expect(grant.uploadUrl.startsWith('https://')).toBe(true);
    expect(prisma.videoAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ encryption: VideoEncryption.AES_128, provider: StreamProvider.CLOUDFLARE_STREAM }),
      }),
    );
  });

  it('refuses to persist an upload URL that points at an mp4 file', async () => {
    prisma.lesson.findUnique.mockResolvedValue({
      id: LESSON_ID,
      type: LessonType.VIDEO,
      module: { courseId: COURSE_ID, course: { instructorId: instructor.id } },
    });
    delivery.createUpload.mockResolvedValue({
      uploadUrl: 'https://uploads.example.com/raw/video.mp4',
      assetId: 'video.mp4',
      method: 'POST',
      headers: {},
      expiresAt: new Date('2026-10-02T13:00:00.000Z'),
    });

    await expect(
      service.createUpload(instructor, LESSON_ID, {
        durationSeconds: 600,
      }),
    ).rejects.toThrow('Raw .mp4 uploads are not allowed.');
    expect(prisma.videoAsset.upsert).not.toHaveBeenCalled();
  });
});
