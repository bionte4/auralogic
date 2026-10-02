import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { LessonPrerequisiteGuard } from '../progress/guards/lesson-prerequisite.guard';
import { CreateUploadDto } from './dto/create-upload.dto';
import type { PlaybackGrant, UploadGrant } from './video.types';
import { VideoService } from './video.service';

@Controller('lessons')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post(':lessonId/uploads')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  createUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateUploadDto,
  ): Promise<UploadGrant> {
    return this.videoService.createUpload(user, lessonId, dto);
  }

  @Get(':lessonId/playback')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @UseGuards(LessonPrerequisiteGuard)
  getPlayback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<PlaybackGrant> {
    return this.videoService.getPlayback(user, lessonId);
  }
}
