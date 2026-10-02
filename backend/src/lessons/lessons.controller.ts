import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { LessonPrerequisiteGuard } from '../progress/guards/lesson-prerequisite.guard';
import { LessonsService } from './lessons.service';
import type { LessonDetail } from './lesson.types';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':lessonId')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @UseGuards(LessonPrerequisiteGuard)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonDetail> {
    return this.lessonsService.getById(user, lessonId);
  }
}
