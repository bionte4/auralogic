import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { ATTACHMENT_STORE } from './attachment.tokens';
import { createAttachmentStore } from './attachment.store';
import { InstructorAttachmentsController, LessonMaterialsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

/** Lesson PPT, PDF, and DOCX materials. */
@Module({
  imports: [ProgressModule],
  controllers: [InstructorAttachmentsController, LessonMaterialsController],
  providers: [
    AttachmentsService,
    { provide: ATTACHMENT_STORE, useFactory: () => createAttachmentStore() },
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
