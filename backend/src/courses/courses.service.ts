import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CourseStatus, LessonType, Prisma, ProgressStatus, Role } from '@prisma/client';
import { CacheService, courseStructureKey } from '../cache/cache.service';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CourseDetail,
  CourseRoster,
  CourseSummary,
  CreatedLesson,
  CreatedModule,
  LessonSummary,
  ModuleSummary,
} from './course.types';
import type { CreateCourseDto, ListCoursesQueryDto, UpdateCourseDto } from './dto/course.dto';
import type { CreateLessonDto } from './dto/lesson.dto';
import type { CreateModuleDto } from './dto/module.dto';

const instructorSelect = { id: true, name: true } satisfies Prisma.UserSelect;

const courseSummarySelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  level: true,
  status: true,
  publishedAt: true,
  price: true,
  instructorId: true,
  instructor: { select: instructorSelect },
} satisfies Prisma.CourseSelect;

type CourseSummaryRow = Prisma.CourseGetPayload<{ select: typeof courseSummarySelect }>;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CacheService) private readonly cache?: CacheService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCourseDto): Promise<CourseSummary> {
    const course = await this.prisma.course.create({
      data: {
        instructorId: user.id,
        title: dto.title.trim(),
        slug: dto.slug ?? slugify(dto.title),
        description: dto.description.trim(),
        level: dto.level,
        price: new Prisma.Decimal(dto.price),
        status: CourseStatus.DRAFT,
      },
      select: courseSummarySelect,
    });
    return toCourseSummary(course);
  }

  async list(user: AuthenticatedUser, query: ListCoursesQueryDto): Promise<CourseSummary[]> {
    const where: Prisma.CourseWhereInput = {};
    if (query.level) {
      where.level = query.level;
    }

    if (user.role === Role.STUDENT) {
      where.status = CourseStatus.PUBLISHED;
    } else if (user.role === Role.INSTRUCTOR && query.status === CourseStatus.PUBLISHED) {
      where.status = CourseStatus.PUBLISHED;
    } else if (user.role === Role.INSTRUCTOR && query.status) {
      where.status = query.status;
      where.instructorId = user.id;
    } else if (user.role === Role.INSTRUCTOR) {
      where.OR = [{ status: CourseStatus.PUBLISHED }, { instructorId: user.id }];
    } else if (query.status) {
      where.status = query.status;
    }

    const courses = await this.prisma.course.findMany({
      where,
      select: courseSummarySelect,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return courses.map(toCourseSummary);
  }

  async getById(user: AuthenticatedUser, courseId: string): Promise<CourseDetail> {
    const cached = await this.cache?.getJson(courseStructureKey(courseId), isPublishedCourseDetail);
    if (cached) {
      return cached;
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        ...courseSummarySelect,
        modules: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            orderIndex: true,
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                orderIndex: true,
                passingScore: true,
                videoAsset: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    this.assertCanView(user, course);
    const detail: CourseDetail = {
      ...toCourseSummary(course),
      modules: course.modules.map(toModuleSummary),
    };
    if (detail.status === CourseStatus.PUBLISHED) {
      await this.cache?.setJson(courseStructureKey(courseId), detail, 120);
    }
    return detail;
  }

  async getRoster(user: AuthenticatedUser, courseId: string): Promise<CourseRoster> {
    await this.requireManagedCourse(user, courseId);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        modules: { select: { lessons: { select: { id: true } } } },
        enrollments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderId: true,
            status: true,
            paymentStatus: true,
            amount: true,
            currency: true,
            paidAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const studentIds = course.enrollments.map((enrollment) => enrollment.user.id);
    const completedByStudent = new Map<string, number>();
    if (lessonIds.length > 0 && studentIds.length > 0) {
      const grouped = await this.prisma.userProgress.groupBy({
        by: ['userId'],
        where: {
          status: ProgressStatus.COMPLETED,
          lessonId: { in: lessonIds },
          userId: { in: studentIds },
        },
        _count: { _all: true },
      });
      for (const row of grouped) {
        completedByStudent.set(row.userId, row._count._all);
      }
    }

    return {
      courseId,
      lessonCount: lessonIds.length,
      enrollments: course.enrollments.map((enrollment) => {
        const completedLessons = completedByStudent.get(enrollment.user.id) ?? 0;
        return {
          enrollmentId: enrollment.id,
          orderId: enrollment.orderId,
          student: enrollment.user,
          status: enrollment.status,
          paymentStatus: enrollment.paymentStatus,
          amount: enrollment.amount.toFixed(2),
          currency: enrollment.currency,
          paidAt: enrollment.paidAt,
          completedLessons,
          lessonCount: lessonIds.length,
          progressPercent: lessonIds.length === 0 ? 0 : Math.round((completedLessons / lessonIds.length) * 100),
        };
      }),
    };
  }

  async update(user: AuthenticatedUser, courseId: string, dto: UpdateCourseDto): Promise<CourseSummary> {
    const existing = await this.requireManagedCourse(user, courseId);
    const data: Prisma.CourseUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === CourseStatus.PUBLISHED && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data,
      select: courseSummarySelect,
    });
    await this.cache?.delete(courseStructureKey(courseId));
    return toCourseSummary(course);
  }

  async remove(user: AuthenticatedUser, courseId: string): Promise<void> {
    await this.requireManagedCourse(user, courseId);
    try {
      await this.prisma.course.delete({ where: { id: courseId } });
      await this.cache?.delete(courseStructureKey(courseId));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Course has enrollments and cannot be deleted. Archive it instead.');
      }
      throw error;
    }
  }

  async addModule(user: AuthenticatedUser, courseId: string, dto: CreateModuleDto): Promise<CreatedModule> {
    await this.requireManagedCourse(user, courseId);
    const orderIndex = await this.nextModuleOrder(courseId);
    const created = await this.prisma.module.create({
      data: {
        courseId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        orderIndex,
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        orderIndex: true,
      },
    });
    await this.cache?.delete(courseStructureKey(courseId));
    return created;
  }

  async addLesson(
    user: AuthenticatedUser,
    courseId: string,
    moduleId: string,
    dto: CreateLessonDto,
  ): Promise<CreatedLesson> {
    await this.requireManagedCourse(user, courseId);
    this.assertLessonPayload(dto);

    const courseModule = await this.prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found in this course.');
    }

    const orderIndex = await this.nextLessonOrder(moduleId);
    const created = await this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        orderIndex,
        passingScore: dto.type === LessonType.QUIZ ? dto.passingScore : null,
      },
      select: {
        id: true,
        moduleId: true,
        title: true,
        description: true,
        type: true,
        orderIndex: true,
        passingScore: true,
      },
    });
    await this.cache?.delete(courseStructureKey(courseId));
    return created;
  }

  private assertLessonPayload(dto: CreateLessonDto): void {
    if (dto.type === LessonType.QUIZ && dto.passingScore === undefined) {
      throw new BadRequestException('Quiz lessons require a passing score.');
    }
    if (dto.type !== LessonType.QUIZ && dto.passingScore !== undefined) {
      throw new BadRequestException('Passing score is only valid for quiz lessons.');
    }
  }

  private async nextModuleOrder(courseId: string): Promise<number> {
    const last = await this.prisma.module.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    return (last?.orderIndex ?? 0) + 1;
  }

  private async nextLessonOrder(moduleId: string): Promise<number> {
    const last = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    return (last?.orderIndex ?? 0) + 1;
  }

  private async requireManagedCourse(user: AuthenticatedUser, courseId: string): Promise<{ publishedAt: Date | null }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, publishedAt: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    this.assertCanManage(user, course.instructorId);
    return course;
  }

  private assertCanManage(user: AuthenticatedUser, instructorId: string): void {
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }
    if (user.role === Role.INSTRUCTOR && user.id === instructorId) {
      return;
    }
    throw new ForbiddenException('You can only manage your own courses.');
  }

  private assertCanView(user: AuthenticatedUser, course: { status: CourseStatus; instructorId: string }): void {
    if (course.status === CourseStatus.PUBLISHED) {
      return;
    }
    if (user.role === Role.SUPER_ADMIN || (user.role === Role.INSTRUCTOR && user.id === course.instructorId)) {
      return;
    }
    throw new NotFoundException('Course not found.');
  }
}

function isPublishedCourseDetail(value: unknown): value is CourseDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { status?: unknown; title?: unknown; modules?: unknown };
  return record.status === CourseStatus.PUBLISHED && typeof record.title === 'string' && Array.isArray(record.modules);
}

function toCourseSummary(course: CourseSummaryRow): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    level: course.level,
    status: course.status,
    publishedAt: course.publishedAt,
    price: course.price.toFixed(2),
    instructor: course.instructor,
  };
}

function toModuleSummary(module: {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Array<{
    id: string;
    title: string;
    type: LessonSummary['type'];
    orderIndex: number;
    passingScore: number | null;
    videoAsset: { id: string } | null;
  }>;
}): ModuleSummary {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    orderIndex: module.orderIndex,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      orderIndex: lesson.orderIndex,
      passingScore: lesson.passingScore,
      hasStream: lesson.videoAsset !== null,
    })),
  };
}

function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!slug) {
    throw new BadRequestException('Title must contain letters or numbers to form a slug.');
  }
  return slug;
}
