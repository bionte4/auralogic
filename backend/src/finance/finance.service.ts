import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { FinanceQueryDto } from './dto/finance-query.dto';
import { summarizeFinance, type FinanceSummary, type SettledPayment } from './finance.rules';

export interface FinanceTransaction {
  id: string;
  orderId: string;
  occurredAt: Date;
  amount: string;
  status: 'PAID' | 'REFUNDED';
  provider: SettledPayment['provider'];
  channel: SettledPayment['channel'];
  courseId: string;
  courseTitle: string;
  level: string;
  studentName: string;
  studentEmail: string;
}

const SETTLED = [PaymentStatus.PAID, PaymentStatus.REFUNDED];

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: FinanceQueryDto): Promise<FinanceSummary> {
    const payments = await this.load(query);
    return summarizeFinance(payments, spanOf(query));
  }

  async transactions(query: FinanceQueryDto): Promise<FinanceTransaction[]> {
    const payments = await this.load(query);
    return payments
      .slice()
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        occurredAt: payment.occurredAt,
        amount: String(payment.amount),
        status: payment.status,
        provider: payment.provider,
        channel: payment.channel,
        courseId: payment.courseId,
        courseTitle: payment.courseTitle,
        level: payment.level,
        studentName: payment.studentName,
        studentEmail: payment.studentEmail,
      }));
  }

  private async load(query: FinanceQueryDto): Promise<SettledPayment[]> {
    const range = dateRange(query.from, query.to);
    const q = query.q?.trim();
    const rows = await this.prisma.payment.findMany({
      where: {
        status: { in: SETTLED },
        ...(range
          ? {
              OR: [
                { paidAt: { gte: range.gte, lte: range.lte } },
                { paidAt: null, createdAt: { gte: range.gte, lte: range.lte } },
              ],
            }
          : {}),
        ...(query.level ? { enrollment: { course: { level: query.level } } } : {}),
        ...(q
          ? {
              AND: [
                {
                  OR: [
                    { orderId: { contains: q, mode: 'insensitive' } },
                    { enrollment: { user: { email: { contains: q, mode: 'insensitive' } } } },
                    { enrollment: { user: { name: { contains: q, mode: 'insensitive' } } } },
                    { enrollment: { course: { title: { contains: q, mode: 'insensitive' } } } },
                  ],
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        status: true,
        provider: true,
        channel: true,
        paidAt: true,
        createdAt: true,
        enrollment: {
          select: {
            user: { select: { name: true, email: true } },
            course: { select: { id: true, title: true, level: true } },
          },
        },
      },
    });

    return rows.flatMap((row) => {
      if (row.status !== PaymentStatus.PAID && row.status !== PaymentStatus.REFUNDED) {
        return [];
      }
      return [
        {
          id: row.id,
          orderId: row.orderId,
          amount: wholeIdr(row.amount),
          status: row.status,
          occurredAt: row.paidAt ?? row.createdAt,
          provider: row.provider,
          channel: row.channel,
          courseId: row.enrollment.course.id,
          courseTitle: row.enrollment.course.title,
          level: row.enrollment.course.level,
          studentName: row.enrollment.user.name,
          studentEmail: row.enrollment.user.email,
        },
      ];
    });
  }
}

function spanOf(query: FinanceQueryDto): { from: string; to: string } | null {
  if (!query.from || !query.to) {
    return null;
  }
  return { from: query.from, to: query.to };
}

function dateRange(from: string | undefined, to: string | undefined): { gte: Date; lte: Date } | null {
  if (!from && !to) {
    return null;
  }
  if (!from || !to) {
    throw new BadRequestException('Provide both from and to dates.');
  }
  const gte = jakartaBound(from, false);
  const lte = jakartaBound(to, true);
  if (gte.getTime() > lte.getTime()) {
    throw new BadRequestException('The start date must be on or before the end date.');
  }
  return { gte, lte };
}

function jakartaBound(iso: string, end: boolean): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new BadRequestException('Dates must use YYYY-MM-DD.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new BadRequestException('Date is not a real calendar day.');
  }
  const time = end ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${iso}T${time}+07:00`);
}

function wholeIdr(amount: Prisma.Decimal): number {
  const value = Number(amount.toString());
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}
