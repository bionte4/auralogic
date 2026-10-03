import { BadRequestException } from '@nestjs/common';
import { PaymentChannel, PaymentProvider, PaymentStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';

const paid = {
  id: 'pay-1',
  orderId: 'order-1',
  amount: { toString: () => '250000.00' },
  status: PaymentStatus.PAID,
  provider: PaymentProvider.MIDTRANS,
  channel: PaymentChannel.QRIS,
  paidAt: new Date('2026-10-02T03:00:00.000Z'),
  createdAt: new Date('2026-10-02T02:00:00.000Z'),
  enrollment: {
    user: { name: 'Alya', email: 'alya@fluentis.test' },
    course: { id: 'course-1', title: 'Network Foundations', level: 'FOUNDATION' },
  },
};

describe('FinanceService', () => {
  const prisma = { payment: { findMany: jest.fn() } };
  const service = new FinanceService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('summarizes settled payments and omits gateway secrets', async () => {
    prisma.payment.findMany.mockResolvedValue([paid]);

    const summary = await service.summary({});

    expect(summary.grossRevenue).toBe('250000');
    expect(summary.netRevenue).toBe('250000');
    expect(summary.byCourse[0]).toMatchObject({ title: 'Network Foundations', level: 'FOUNDATION' });
    expect(JSON.stringify(summary)).not.toContain('qr');
  });

  it('rejects a start date after the end date', async () => {
    await expect(service.transactions({ from: '2026-10-02', to: '2026-10-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });
});