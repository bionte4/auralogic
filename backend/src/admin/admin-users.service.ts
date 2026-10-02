import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { enrollmentAccessDenial } from '../progress/enrollment-access';
import { NotificationService } from '../observability/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseBatchRoster, temporaryPassword, type BatchSkip, type BatchStudent } from './batch-roster';
import type { BatchEnrollDto, ListUsersQueryDto, UpdateAdminUserDto } from './dto/admin-user.dto';

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export interface AdminUserPage {
  items: AdminUserRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchEnrollmentResult {
  courseId: string;
  enrolled: Array<{ email: string; name: string; createdAccount: boolean; temporaryPassword: string | null }>;
  skipped: BatchSkip[];
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(NotificationService) private readonly notifications?: NotificationService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<AdminUserPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  }

  async update(actor: AuthenticatedUser, userId: string, dto: UpdateAdminUserDto): Promise<AdminUserRecord> {
    if (dto.name === undefined && dto.role === undefined && dto.active === undefined) {
      throw new BadRequestException('Provide a name, role, or active flag.');
    }
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });
    if (!current) {
      throw new NotFoundException('User not found.');
    }
    const removesAdmin = dto.active === false || (dto.role !== undefined && dto.role !== Role.SUPER_ADMIN);
    if (actor.id === current.id && removesAdmin) {
      throw new ForbiddenException('You cannot remove your own admin access.');
    }
    if (current.role === Role.SUPER_ADMIN && current.active && removesAdmin) {
      const others = await this.prisma.user.count({
        where: { role: Role.SUPER_ADMIN, active: true, id: { not: current.id } },
      });
      if (others === 0) {
        throw new ConflictException('Keep at least one active admin.');
      }
    }
    return this.prisma.user.update({
      where: { id: current.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      select: userSelect,
    });
  }

  async batchEnroll(dto: BatchEnrollDto): Promise<BatchEnrollmentResult> {
    const parsed = parseBatchRoster(dto.emails, dto.csv);
    if (parsed.students.length === 0 && parsed.skipped.length === 0) {
      throw new BadRequestException('Provide a CSV or at least one email.');
    }
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true, status: true, title: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new ConflictException('Publish the course before enrolling students.');
    }

    const enrolled: BatchEnrollmentResult['enrolled'] = [];
    for (const student of parsed.students) {
      const outcome = await this.enrollOne(course.id, course.title, student);
      if ('reason' in outcome) {
        parsed.skipped.push({ email: student.email, reason: outcome.reason });
      } else {
        enrolled.push(outcome);
      }
    }
    return { courseId: course.id, enrolled, skipped: parsed.skipped };
  }

  private async enrollOne(
    courseId: string,
    courseTitle: string,
    student: BatchStudent,
  ): Promise<{ email: string; name: string; createdAccount: boolean; temporaryPassword: string | null } | { reason: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: student.email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (existing && existing.role !== Role.STUDENT) {
      return { reason: 'This email belongs to a staff account.' };
    }
    if (existing && !existing.active) {
      return { reason: 'Account is deactivated.' };
    }

    const password = existing ? null : temporaryPassword();
    const passwordHash = password ? await hash(password, 12) : null;
    const now = new Date();

    const saved = await this.prisma.$transaction(async (tx) => {
      const user =
        existing ??
        (await tx.user.create({
          data: {
            email: student.email,
            name: student.name,
            passwordHash: passwordHash ?? '',
            role: Role.STUDENT,
            active: true,
          },
          select: { id: true, email: true, name: true },
        }));
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
        select: { id: true, status: true, paymentStatus: true, accessStartsAt: true, accessEndsAt: true, paidAt: true },
      });
      if (enrollment && enrollmentAccessDenial(enrollment, now) === null) {
        return { already: true as const, name: user.name };
      }
      if (enrollment) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.PAID,
            paidAt: enrollment.paidAt ?? now,
            accessStartsAt: enrollment.accessStartsAt ?? now,
            accessEndsAt: null,
          },
        });
      } else {
        await tx.enrollment.create({
          data: {
            userId: user.id,
            courseId,
            orderId: `corp-${randomUUID().replace(/-/g, '')}`,
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.PAID,
            amount: new Prisma.Decimal(0),
            currency: 'IDR',
            paidAt: now,
            accessStartsAt: now,
          },
        });
      }
      return { already: false as const, name: user.name };
    });

    if (saved.already) {
      return { reason: 'Already enrolled in this course.' };
    }
    const enrolled = {
      email: student.email,
      name: saved.name,
      createdAccount: !existing,
      temporaryPassword: password,
    };
    await this.notifications?.enrollmentGranted({
      email: enrolled.email,
      name: enrolled.name,
      courseTitle,
      courseId,
      temporaryPassword: enrolled.temporaryPassword,
    });
    return enrolled;
  }
}
