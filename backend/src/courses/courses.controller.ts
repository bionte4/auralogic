import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { CourseDetail, CourseRoster, CourseSummary, CreatedLesson, CreatedModule } from './course.types';
import { CoursesService } from './courses.service';
import { CreateCourseDto, ListCoursesQueryDto, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto } from './dto/lesson.dto';
import { CreateModuleDto } from './dto/module.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto): Promise<CourseSummary> {
    return this.coursesService.create(user, dto);
  }

  @Get()
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCoursesQueryDto): Promise<CourseSummary[]> {
    return this.coursesService.list(user, query);
  }

  @Get(':courseId/roster')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  getRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseRoster> {
    return this.coursesService.getRoster(user, courseId);
  }

  @Get(':courseId')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseDetail> {
    return this.coursesService.getById(user, courseId);
  }

  @Patch(':courseId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseSummary> {
    return this.coursesService.update(user, courseId, dto);
  }

  @Delete(':courseId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<void> {
    return this.coursesService.remove(user, courseId);
  }

  @Post(':courseId/modules')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  addModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateModuleDto,
  ): Promise<CreatedModule> {
    return this.coursesService.addModule(user, courseId, dto);
  }

  @Post(':courseId/modules/:moduleId/lessons')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  addLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<CreatedLesson> {
    return this.coursesService.addLesson(user, courseId, moduleId, dto);
  }
}
