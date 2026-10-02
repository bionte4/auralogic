import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCourseClassDto } from './dto/course-class.dto';

export interface CourseClassView {
  id: string;
  name: string;
  memberCount: number;
}

@Injectable()
export class CourseClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, courseId: string, dto: CreateCourseClassDto): Promise<CourseClassView> {
    await this.requireManagedCourse(user, courseId);
    try {
      const created = await this.prisma.courseClass.create({
        data: { courseId, name: dto.name.trim() },
        select: { id: true, name: true },
      });
      return { ...created, memberCount: 0 };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This course already has a class with that name.');
      }
      throw error;
    }
  }

  async addMember(user: AuthenticatedUser, courseId: string, classId: string, studentId: string): Promise<void> {
    await this.requireManagedCourse(user, courseId);
    const courseClass = await this.prisma.courseClass.findFirst({
      where: { id: classId, courseId },
      select: { id: true },
    });
    if (!courseClass) {
      throw new NotFoundException('Class not found in this course.');
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
      select: { id: true },
    });
    if (!enrollment) {
      throw new NotFoundException('That student is not enrolled in this course.');
    }
    await this.prisma.courseClassMember.upsert({
      where: { classId_userId: { classId, userId: studentId } },
      create: { classId, userId: studentId },
      update: {},
    });
  }

  async removeMember(user: AuthenticatedUser, courseId: string, classId: string, studentId: string): Promise<void> {
    await this.requireManagedCourse(user, courseId);
    const courseClass = await this.prisma.courseClass.findFirst({
      where: { id: classId, courseId },
      select: { id: true },
    });
    if (!courseClass) {
      throw new NotFoundException('Class not found in this course.');
    }
    await this.prisma.courseClassMember.deleteMany({ where: { classId, userId: studentId } });
  }

  private async requireManagedCourse(user: AuthenticatedUser, courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (user.role === Role.SUPER_ADMIN || user.id === course.instructorId) {
      return;
    }
    throw new ForbiddenException('You can only manage your own courses.');
  }
}
