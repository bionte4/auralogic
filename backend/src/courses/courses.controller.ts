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
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { CourseDetail, CourseRoster, CourseSummary, CreatedLesson, CreatedModule, PublicCourseCard } from './course.types';
import { CoursesService } from './courses.service';
import { CreateCourseDto, ListCoursesQueryDto, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { CreateModuleDto, UpdateModuleDto } from './dto/module.dto';
import { AddClassMemberDto, CreateCourseClassDto } from './dto/course-class.dto';
import { SavePhaseProjectDto, ScorePhaseProjectDto, SubmitPhaseProjectDto } from './dto/phase-project.dto';
import { CreatePlacementQuestionDto, SubmitPlacementDto } from './dto/placement.dto';
import { CourseClassService, type CourseClassView } from './course-class.service';
import { PhaseProjectService, type PhaseProjectView } from './phase-project.service';
import { PlacementService, type PlacementView } from './placement.service';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly placementService: PlacementService,
    private readonly phaseProjectService: PhaseProjectService,
    private readonly courseClassService: CourseClassService,
  ) {}

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

  @Public()
  @Get('catalog')
  listCatalog(): Promise<PublicCourseCard[]> {
    return this.coursesService.listPublished();
  }

  @Public()
  @Get('catalog/:courseId')
  getCatalog(@Param('courseId', ParseUUIDPipe) courseId: string): Promise<CourseDetail> {
    return this.coursesService.getPublished(courseId);
  }

  @Get(':courseId/roster')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  getRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseRoster> {
    return this.coursesService.getRoster(user, courseId);
  }

  @Get(':courseId/project')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  getProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<PhaseProjectView> {
    return this.phaseProjectService.get(user, courseId);
  }

  @Put(':courseId/project')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  saveProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SavePhaseProjectDto,
  ): Promise<{ id: string }> {
    return this.phaseProjectService.save(user, courseId, dto);
  }

  @Post(':courseId/project/submission')
  @Roles(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  submitProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SubmitPhaseProjectDto,
  ): Promise<{ id: string }> {
    return this.phaseProjectService.submit(user, courseId, dto);
  }

  @Patch(':courseId/project/submissions/:studentId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  scoreProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: ScorePhaseProjectDto,
  ): Promise<{ score: number }> {
    return this.phaseProjectService.score(user, courseId, studentId, dto);
  }

  @Post(':courseId/classes')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  createClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateCourseClassDto,
  ): Promise<CourseClassView> {
    return this.courseClassService.create(user, courseId, dto);
  }

  @Post(':courseId/classes/:classId/members')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  addClassMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: AddClassMemberDto,
  ): Promise<void> {
    return this.courseClassService.addMember(user, courseId, classId, dto.userId);
  }

  @Delete(':courseId/classes/:classId/members/:studentId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClassMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<void> {
    return this.courseClassService.removeMember(user, courseId, classId, studentId);
  }

  @Get(':courseId/placement')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  getPlacement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<PlacementView> {
    return this.placementService.get(user, courseId);
  }

  @Post(':courseId/placement/questions')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  addPlacementQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreatePlacementQuestionDto,
  ): Promise<{ id: string }> {
    return this.placementService.addQuestion(user, courseId, dto);
  }

  @Post(':courseId/placement/attempts')
  @Roles(Role.STUDENT)
  @HttpCode(HttpStatus.OK)
  submitPlacement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SubmitPlacementDto,
  ): Promise<{ startOrderIndex: number }> {
    return this.placementService.submit(user, courseId, dto);
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

  @Patch(':courseId/modules/:moduleId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  updateModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ): Promise<CreatedModule> {
    return this.coursesService.updateModule(user, courseId, moduleId, dto);
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

  @Patch(':courseId/modules/:moduleId/lessons/:lessonId')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  updateLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<CreatedLesson> {
    return this.coursesService.updateLesson(user, courseId, moduleId, lessonId, dto);
  }
}
