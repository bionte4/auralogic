import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { LessonPrerequisiteGuard } from '../progress/guards/lesson-prerequisite.guard';
import { MAX_ATTACHMENT_BYTES } from './attachment.rules';
import { AttachmentsService, type AttachmentView } from './attachments.service';

@Controller('instructor/lessons')
export class InstructorAttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':lessonId/attachments')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<AttachmentView[]> {
    return this.attachments.listForInstructor(user, lessonId);
  }

  @Post(':lessonId/attachments')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: unknown,
  ): Promise<AttachmentView> {
    if (!isUploadedMaterial(file)) {
      throw new BadRequestException('Choose a PPT, PPTX, PDF, or DOCX file.');
    }
    return this.attachments.upload(user, lessonId, file);
  }

  @Delete(':lessonId/attachments/:attachmentId')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<void> {
    return this.attachments.remove(user, lessonId, attachmentId);
  }
}

@Controller('lessons')
export class LessonMaterialsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':lessonId/attachments/:attachmentId')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @UseGuards(LessonPrerequisiteGuard)
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<StreamableFile> {
    const material = await this.attachments.download(user, lessonId, attachmentId);
    return new StreamableFile(material.stream, {
      type: material.contentType,
      disposition: material.disposition,
    });
  }
}

function isUploadedMaterial(value: unknown): value is { originalname: string; buffer: Buffer } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { originalname?: unknown; buffer?: unknown };
  return typeof record.originalname === 'string' && Buffer.isBuffer(record.buffer);
}
