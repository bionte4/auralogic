import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { VerifiedPaymentNotice } from './payment.types';

type PaymentWithEnrollment = Prisma.PaymentGetPayload<{ include: { enrollment: true } }>;

@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(notice: VerifiedPaymentNotice): Promise<{ granted: boolean; orderId: string }> {
    const granted = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { orderId: notice.orderId },
        include: { enrollment: true },
      });
      if (!payment) {
        this.logger.warn(`Ignoring payment notification for unknown order ${notice.orderId}`);
        return false;
      }
      if (payment.currency !== 'IDR' || !payment.amount.equals(notice.amount)) {
        this.logger.warn(`Ignoring payment notification with a mismatched amount for order ${notice.orderId}`);
        return false;
      }

      if (notice.outcome === 'pending') {
        return false;
      }
      if (notice.outcome === 'paid') {
        return this.grantAccess(tx, payment, notice.providerRef);
      }
      if (notice.outcome === 'refunded') {
        await this.revokeAccess(tx, payment, notice.providerRef);
        return false;
      }
      await this.markFailed(tx, payment, notice.providerRef);
      return false;
    });
    return { granted, orderId: notice.orderId };
  }

  private async grantAccess(
    tx: Prisma.TransactionClient,
    payment: PaymentWithEnrollment,
    providerRef: string | null,
  ): Promise<boolean> {
    if (payment.status === PaymentStatus.PAID && payment.enrollment.paymentStatus === PaymentStatus.PAID) {
      return false;
    }

    const now = new Date();
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: payment.paidAt ?? now,
        providerRef: providerRef ?? payment.providerRef,
      },
    });
    await tx.enrollment.update({
      where: { id: payment.enrollmentId },
      data: {
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.PAID,
        paidAt: payment.enrollment.paidAt ?? now,
        accessStartsAt: payment.enrollment.accessStartsAt ?? now,
        accessEndsAt: null,
        orderId: payment.orderId,
        amount: payment.amount,
        providerRef: providerRef ?? payment.enrollment.providerRef,
      },
    });
    return true;
  }

  private async markFailed(
    tx: Prisma.TransactionClient,
    payment: PaymentWithEnrollment,
    providerRef: string | null,
  ): Promise<void> {
    if (payment.status === PaymentStatus.PAID || payment.enrollment.paymentStatus === PaymentStatus.PAID) {
      return;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerRef: providerRef ?? payment.providerRef,
      },
    });
    if (payment.enrollment.orderId === payment.orderId) {
      await tx.enrollment.update({
        where: { id: payment.enrollmentId },
        data: {
          status: EnrollmentStatus.PENDING,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }
  }

  private async revokeAccess(
    tx: Prisma.TransactionClient,
    payment: PaymentWithEnrollment,
    providerRef: string | null,
  ): Promise<void> {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        providerRef: providerRef ?? payment.providerRef,
      },
    });

    const otherPaid = await tx.payment.count({
      where: {
        enrollmentId: payment.enrollmentId,
        status: PaymentStatus.PAID,
        id: { not: payment.id },
      },
    });
    if (otherPaid > 0) {
      return;
    }

    await tx.enrollment.update({
      where: { id: payment.enrollmentId },
      data: {
        status: EnrollmentStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        accessEndsAt: new Date(),
      },
    });
  }
}
