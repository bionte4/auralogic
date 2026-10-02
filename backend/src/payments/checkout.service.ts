import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, PaymentChannel, PaymentStatus, Prisma, ProgressStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { readAppEnv } from '../config/env';
import { enrollmentAccessDenial } from '../progress/enrollment-access';
import { PrismaService } from '../prisma/prisma.service';
import { wholeIdr } from './money';
import { createOrderId } from './order-id';
import { PAYMENT_GATEWAY, type CheckoutResult, type PaymentGateway, type QrisSession } from './payment.types';

const OPEN_CHECKOUT_MS = 2 * 60 * 1000;
const QRIS_REUSE_MS = 15 * 60 * 1000;

export interface EnrollmentView {
  courseId: string;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  accessGranted: boolean;
}

export interface EnrollmentCourse {
  courseId: string;
  title: string;
  level: string;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  accessGranted: boolean;
  progressPercent: number;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async listEnrollments(user: AuthenticatedUser): Promise<EnrollmentCourse[]> {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can view their enrollments.');
    }
    const rows = await this.prisma.enrollment.findMany({
      where: { userId: user.id, course: { status: CourseStatus.PUBLISHED } },
      orderBy: { updatedAt: 'desc' },
      select: {
        courseId: true,
        status: true,
        paymentStatus: true,
        accessStartsAt: true,
        accessEndsAt: true,
        course: {
          select: {
            title: true,
            level: true,
            modules: {
              select: {
                lessons: {
                  select: {
                    progress: {
                      where: { userId: user.id, status: ProgressStatus.COMPLETED },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return rows.map((row) => {
      const lessons = (row.course.modules ?? []).flatMap((module) => module.lessons);
      const completed = lessons.filter((lesson) => lesson.progress.length > 0).length;
      return {
        courseId: row.courseId,
        title: row.course.title,
        level: row.course.level,
        status: row.status,
        paymentStatus: row.paymentStatus,
        accessGranted: enrollmentAccessDenial(row, new Date()) === null,
        progressPercent: lessons.length === 0 ? 0 : Math.round((completed / lessons.length) * 100),
      };
    });
  }

  async getEnrollment(user: AuthenticatedUser, courseId: string): Promise<EnrollmentView> {
    this.assertStudent(user);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: {
        courseId: true,
        status: true,
        paymentStatus: true,
        accessStartsAt: true,
        accessEndsAt: true,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }
    return {
      courseId: enrollment.courseId,
      status: enrollment.status,
      paymentStatus: enrollment.paymentStatus,
      accessGranted: enrollmentAccessDenial(enrollment, new Date()) === null,
    };
  }

  async checkout(
    user: AuthenticatedUser,
    courseId: string,
    channel: PaymentChannel = PaymentChannel.REDIRECT,
  ): Promise<CheckoutResult> {
    this.assertStudent(user);
    const returnUrl = `${readAppEnv().frontendOrigin}/checkout/return`;
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, status: true, price: true },
    });
    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException('Course not found.');
    }

    const amount = wholeIdr(course.price);
    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing?.status === EnrollmentStatus.ACTIVE && existing.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('You already have access to this course.');
    }
    if (existing?.status === EnrollmentStatus.SUSPENDED) {
      throw new ForbiddenException('Course access is suspended.');
    }

    const latest = existing?.payments[0];
    if (latest?.status === PaymentStatus.PENDING && canReusePayment(latest, channel)) {
      return {
        orderId: latest.orderId,
        method: channel,
        checkoutUrl: latest.checkoutUrl,
        qrString: latest.qrString ?? null,
        amount: latest.amount.toFixed(2),
        currency: 'IDR',
        enrollmentStatus: 'PENDING',
      };
    }
    if (latest?.status === PaymentStatus.PENDING) {
      const age = Date.now() - latest.createdAt.getTime();
      if (age < OPEN_CHECKOUT_MS) {
        throw new ConflictException('Checkout is already in progress.');
      }
      await this.prisma.payment.update({
        where: { id: latest.id },
        data: { status: PaymentStatus.FAILED },
      });
    }

    const orderId = createOrderId();
    const price = new Prisma.Decimal(amount);
    const enrollment = existing
      ? await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: {
            orderId,
            status: EnrollmentStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            amount: price,
            currency: 'IDR',
            paidAt: null,
            accessStartsAt: null,
            accessEndsAt: null,
            providerRef: null,
          },
        })
      : await this.prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId,
            orderId,
            status: EnrollmentStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            amount: price,
            currency: 'IDR',
          },
        });

    const payment = await this.prisma.payment.create({
      data: {
        enrollmentId: enrollment.id,
        orderId,
        provider: this.gateway.provider,
        channel,
        amount: price,
        currency: 'IDR',
        status: PaymentStatus.PENDING,
      },
    });

    try {
      const charge = { orderId, amount, courseTitle: course.title, payerEmail: user.email, payerName: user.name, returnUrl };
      const session =
        channel === PaymentChannel.QRIS
          ? toQrisResult(await this.gateway.createQris(charge))
          : toRedirectResult(await this.gateway.createCheckout(charge));
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutUrl: session.checkoutUrl,
          qrString: session.qrString,
          providerRef: session.providerRef,
        },
      });
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { providerRef: session.providerRef },
      });
      return {
        orderId,
        method: channel,
        checkoutUrl: session.checkoutUrl,
        qrString: session.qrString,
        amount: price.toFixed(2),
        currency: 'IDR',
        enrollmentStatus: 'PENDING',
      };
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadGatewayException('Payment provider is unavailable.');
    }
  }

  private assertStudent(user: AuthenticatedUser): void {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can purchase a course.');
    }
  }
}

function canReusePayment(
  payment: { channel?: PaymentChannel; checkoutUrl: string | null; qrString?: string | null; createdAt: Date },
  channel: PaymentChannel,
): boolean {
  const stored = payment.channel ?? PaymentChannel.REDIRECT;
  if (stored !== channel) {
    return false;
  }
  if (channel === PaymentChannel.QRIS) {
    return Boolean(payment.qrString) && Date.now() - payment.createdAt.getTime() < QRIS_REUSE_MS;
  }
  return Boolean(payment.checkoutUrl);
}

function toRedirectResult(session: { checkoutUrl: string; providerRef: string | null }): {
  checkoutUrl: string;
  qrString: null;
  providerRef: string | null;
} {
  return { checkoutUrl: session.checkoutUrl, qrString: null, providerRef: session.providerRef };
}

function toQrisResult(session: QrisSession): {
  checkoutUrl: string | null;
  qrString: string;
  providerRef: string | null;
} {
  return { checkoutUrl: session.qrUrl, qrString: session.qrString, providerRef: session.providerRef };
}
