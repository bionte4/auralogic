import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { contentDisposition, inspectAttachment, MAX_ATTACHMENTS_PER_LESSON } from './attachment.rules';
import type { AttachmentStore } from './attachment.store';
import { ATTACHMENT_STORE } from './attachment.tokens';
import { watermarkPdf } from './pdf-watermark';
import { streamToBuffer } from './stream-to-buffer';

export interface AttachmentView {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface AttachmentDownload {
  stream: Readable;
  contentType: string;
  disposition: string;
}

interface UploadedMaterial {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    @Inject(ATTACHMENT_STORE) private readonly store: AttachmentStore,
  ) {}

  async listForInstructor(user: AuthenticatedUser, lessonId: string): Promise<AttachmentView[]> {
    await this.requireOwnedLesson(user, lessonId);
    return this.list(lessonId);
  }

  async upload(user: AuthenticatedUser, lessonId: string, file: UploadedMaterial): Promise<AttachmentView> {
    await this.requireOwnedLesson(user, lessonId);
    const count = await this.prisma.lessonAttachment.count({ where: { lessonId } });
    if (count >= MAX_ATTACHMENTS_PER_LESSON) {
      throw new BadRequestException('A lesson can have at most 10 materials.');
    }

    let accepted: ReturnType<typeof inspectAttachment>;
    try {
      accepted = inspectAttachment(file.originalname, file.buffer);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'This file cannot be attached.');
    }

    const objectKey = `lessons/${lessonId}/${randomUUID()}.${accepted.extension}`;
    await this.store.put(objectKey, file.buffer, accepted.contentType);
    const created = await this.prisma.lessonAttachment.create({
      data: {
        lessonId,
        fileName: accepted.fileName,
        contentType: accepted.contentType,
        objectKey,
        sizeBytes: file.buffer.length,
      },
      select: { id: true, fileName: true, contentType: true, sizeBytes: true },
    });
    return created;
  }

  async download(user: AuthenticatedUser, lessonId: string, attachmentId: string): Promise<AttachmentDownload> {
    await this.progress.assertLessonAccessible(user, lessonId);
    const attachment = await this.prisma.lessonAttachment.findFirst({
      where: { id: attachmentId, lessonId },
      select: { fileName: true, contentType: true, objectKey: true },
    });
    if (!attachment) {
      throw new NotFoundException('Lesson material not found.');
    }
    const raw = await this.store.read(attachment.objectKey);
    let stream: Readable = raw;
    if (user.role === Role.STUDENT && attachment.contentType === 'application/pdf') {
      const bytes = await streamToBuffer(raw);
      const marked = await watermarkPdf(bytes, {
        name: user.name,
        email: user.email,
        userId: user.id,
      });
      stream = Readable.from(marked);
    }
    return {
      stream,
      contentType: attachment.contentType,
      disposition: contentDisposition(attachment.fileName),
    };
  }

  async remove(user: AuthenticatedUser, lessonId: string, attachmentId: string): Promise<void> {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only an admin can delete lesson materials.');
    }
    const attachment = await this.prisma.lessonAttachment.findFirst({
      where: { id: attachmentId, lessonId },
      select: { id: true, objectKey: true },
    });
    if (!attachment) {
      throw new NotFoundException('Lesson material not found.');
    }
    await this.store.remove(attachment.objectKey);
    await this.prisma.lessonAttachment.delete({ where: { id: attachment.id } });
  }

  async list(lessonId: string): Promise<AttachmentView[]> {
    return this.prisma.lessonAttachment.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fileName: true, contentType: true, sizeBytes: true },
    });
  }

  private async requireOwnedLesson(user: AuthenticatedUser, lessonId: string): Promise<void> {
    if (user.role !== Role.INSTRUCTOR && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only instructors can manage lesson materials.');
    }
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { module: { select: { course: { select: { instructorId: true } } } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    if (user.role === Role.INSTRUCTOR && lesson.module.course.instructorId !== user.id) {
      throw new ForbiddenException('You can only attach materials to your own courses.');
    }
  }
}
