import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../observability/audit.service';
import { NotificationService } from '../observability/notification.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentFollowUpService {
  private readonly logger = new Logger(PaymentFollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async afterGrant(result: { granted: boolean; orderId: string }): Promise<void> {
    if (!result.granted) {
      return;
    }
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { orderId: result.orderId },
        select: {
          orderId: true,
          amount: true,
          enrollment: {
            select: {
              userId: true,
              courseId: true,
              user: { select: { email: true, name: true } },
              course: { select: { title: true } },
            },
          },
        },
      });
      if (!payment) {
        return;
      }
      await this.audit.record({
        actorId: payment.enrollment.userId,
        action: 'PAYMENT_SUCCESS',
        resource: `payment:${payment.orderId}`,
        outcome: 'SUCCESS',
        detail: payment.enrollment.course.title,
      });
      await this.notifications.paymentActivated({
        email: payment.enrollment.user.email,
        name: payment.enrollment.user.name,
        courseTitle: payment.enrollment.course.title,
        courseId: payment.enrollment.courseId,
        amount: payment.amount.toString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment follow-up failed.';
      this.logger.error(`Order ${result.orderId} was settled without a notification. ${message}`);
    }
  }
}
