import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import type { ProgressService } from '../progress/progress.service';
import type { AttachmentStore } from './attachment.store';
import { AttachmentsService } from './attachments.service';

const LESSON_ID = '11111111-1111-4111-8111-111111111111';

describe('AttachmentsService', () => {
  const prisma = {
    lesson: { findUnique: jest.fn() },
    lessonAttachment: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  const progress = { assertLessonAccessible: jest.fn() };
  const store: AttachmentStore = {
    put: jest.fn(async () => undefined),
    read: jest.fn(async () => ({}) as Readable),
    remove: jest.fn(async () => undefined),
  };
  const service = new AttachmentsService(
    prisma as unknown as PrismaService,
    progress as unknown as ProgressService,
    store,
  );
  const instructor: AuthenticatedUser = { id: 'instructor-1', email: 'instructor@fluentis.test', name: 'Instructor', role: Role.INSTRUCTOR, locale: 'ID' };
  const student: AuthenticatedUser = { id: 'student-1', email: 'student@fluentis.test', name: 'Student', role: Role.STUDENT, locale: 'ID' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses an instructor who does not own the course', async () => {
    prisma.lesson.findUnique.mockResolvedValue({ module: { course: { instructorId: 'someone-else' } } });

    await expect(
      service.upload(instructor, LESSON_ID, { originalname: 'notes.pdf', buffer: Buffer.from('%PDF-1.7') }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(store.put).not.toHaveBeenCalled();
  });

  it('stores a private object key and returns the file name without that key', async () => {
    prisma.lesson.findUnique.mockResolvedValue({ module: { course: { instructorId: instructor.id } } });
    prisma.lessonAttachment.count.mockResolvedValue(0);
    prisma.lessonAttachment.create.mockImplementation(async ({ data }: { data: { fileName: string; objectKey: string; contentType: string; sizeBytes: number } }) => ({
      id: 'attachment-1',
      fileName: data.fileName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
    }));

    const saved = await service.upload(instructor, LESSON_ID, { originalname: 'notes.pdf', buffer: Buffer.from('%PDF-1.7') });

    const stored = (store.put as jest.Mock).mock.calls[0]?.[0] as string;
    expect(stored.startsWith(`lessons/${LESSON_ID}/`)).toBe(true);
    expect(stored.endsWith('.pdf')).toBe(true);
    expect(saved.fileName).toBe('notes.pdf');
    expect(JSON.stringify(saved)).not.toContain(stored);
  });

  it('lets only an admin delete a stored material', async () => {
    const admin: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@auralogic.web.id',
      name: 'Admin',
      role: Role.SUPER_ADMIN,
      locale: 'ID',
    };
    prisma.lessonAttachment.findFirst.mockResolvedValue({
      id: 'attachment-1',
      objectKey: `lessons/${LESSON_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf`,
    });

    await expect(service.remove(instructor, LESSON_ID, 'attachment-1')).rejects.toBeInstanceOf(ForbiddenException);
    await service.remove(admin, LESSON_ID, 'attachment-1');
    expect(store.remove).toHaveBeenCalled();
    expect(prisma.lessonAttachment.delete).toHaveBeenCalledWith({ where: { id: 'attachment-1' } });
  });

  it('watermarks PDF downloads for students but not for instructors', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const pdf = Buffer.from(await doc.save());
    prisma.lessonAttachment.findFirst.mockResolvedValue({
      fileName: 'notes.pdf',
      contentType: 'application/pdf',
      objectKey: 'lessons/x/file.pdf',
    });
    (store.read as jest.Mock).mockResolvedValue(Readable.from(pdf));

    const studentDownload = await service.download(student, LESSON_ID, 'attachment-1');
    const studentBytes = await streamToBuffer(studentDownload.stream);
    expect(studentBytes.length).toBeGreaterThan(pdf.length);

    (store.read as jest.Mock).mockResolvedValue(Readable.from(pdf));
    const instructorDownload = await service.download(instructor, LESSON_ID, 'attachment-1');
    const instructorBytes = await streamToBuffer(instructorDownload.stream);
    expect(instructorBytes.equals(pdf)).toBe(true);
  });
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
