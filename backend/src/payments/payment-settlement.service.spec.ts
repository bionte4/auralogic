import { EnrollmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { PaymentSettlementService } from './payment-settlement.service';
import type { VerifiedPaymentNotice } from './payment.types';

function notice(overrides: Partial<VerifiedPaymentNotice> = {}): VerifiedPaymentNotice {
  return {
    orderId: 'fls-abc',
    outcome: 'paid',
    amount: new Prisma.Decimal('250000.00'),
    providerRef: 'trx-1',
    ...overrides,
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    enrollmentId: 'enr-1',
    orderId: 'fls-abc',
    amount: new Prisma.Decimal('250000.00'),
    currency: 'IDR',
    status: PaymentStatus.PENDING,
    providerRef: null,
    paidAt: null,
    enrollment: {
      id: 'enr-1',
      orderId: 'fls-abc',
      status: EnrollmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paidAt: null,
      accessStartsAt: null,
      providerRef: null,
    },
    ...overrides,
  };
}

describe('PaymentSettlementService', () => {
  const tx = {
    payment: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    enrollment: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)),
  };
  const service = new PaymentSettlementService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves enrollment from PENDING to ACTIVE when the paid amount matches', async () => {
    tx.payment.findUnique.mockResolvedValue(paymentRow());

    await service.apply(notice());

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.PAID }) }),
    );
    expect(tx.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
        }),
      }),
    );
  });

  it('does not grant access when the notified amount differs from the charge', async () => {
    tx.payment.findUnique.mockResolvedValue(paymentRow());

    await service.apply(notice({ amount: new Prisma.Decimal('1000.00') }));

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.enrollment.update).not.toHaveBeenCalled();
  });

  it('keeps an active enrollment unchanged on a repeated success notification', async () => {
    tx.payment.findUnique.mockResolvedValue(
      paymentRow({
        status: PaymentStatus.PAID,
        enrollment: {
          id: 'enr-1',
          orderId: 'fls-abc',
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          accessStartsAt: new Date(),
          providerRef: 'trx-1',
        },
      }),
    );

    await service.apply(notice());

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.enrollment.update).not.toHaveBeenCalled();
  });

  it('records a failure without activating the enrollment', async () => {
    tx.payment.findUnique.mockResolvedValue(paymentRow());

    await service.apply(notice({ outcome: 'failed' }));

    expect(tx.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentStatus.PENDING,
          paymentStatus: PaymentStatus.FAILED,
        }),
      }),
    );
  });

  it('does not revoke access when a failure arrives after the course is paid', async () => {
    tx.payment.findUnique.mockResolvedValue(
      paymentRow({
        status: PaymentStatus.PAID,
        enrollment: {
          id: 'enr-1',
          orderId: 'fls-abc',
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          accessStartsAt: new Date(),
          providerRef: 'trx-1',
        },
      }),
    );

    await service.apply(notice({ outcome: 'failed' }));

    expect(tx.enrollment.update).not.toHaveBeenCalled();
  });

  it('cancels access when the paid charge is refunded', async () => {
    tx.payment.findUnique.mockResolvedValue(
      paymentRow({
        status: PaymentStatus.PAID,
        enrollment: {
          id: 'enr-1',
          orderId: 'fls-abc',
          status: EnrollmentStatus.ACTIVE,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          accessStartsAt: new Date(),
          providerRef: 'trx-1',
        },
      }),
    );
    tx.payment.count.mockResolvedValue(0);

    await service.apply(notice({ outcome: 'refunded' }));

    expect(tx.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
        }),
      }),
    );
  });
});
