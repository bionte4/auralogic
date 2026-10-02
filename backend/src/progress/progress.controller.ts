import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { LessonPrerequisiteGuard } from './guards/lesson-prerequisite.guard';
import { ProgressService } from './progress.service';
import type { CourseProgressView, ProgressRecord } from './progress.types';

@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('courses/:courseId/progress')
  @Roles(Role.STUDENT)
  getCourseProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseProgressView> {
    return this.progressService.getCourseProgress(user, courseId);
  }

  @Put('lessons/:lessonId/progress')
  @Roles(Role.STUDENT)
  @UseGuards(LessonPrerequisiteGuard)
  recordProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ProgressRecord> {
    return this.progressService.recordProgress(user, lessonId, dto);
  }
}
