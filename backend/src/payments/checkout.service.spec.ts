import { ConflictException } from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, PaymentChannel, PaymentProvider, PaymentStatus, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { CheckoutService } from './checkout.service';
import type { PaymentGateway } from './payment.types';

const student: AuthenticatedUser = {
  id: 'student-1',
  email: 'student@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
  locale: 'ID',
};

describe('CheckoutService', () => {
  const prisma = {
    course: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn(), update: jest.fn() },
  };
  const gateway: PaymentGateway = {
    provider: PaymentProvider.MIDTRANS,
    createCheckout: jest.fn(),
    createQris: jest.fn(),
  };
  const service = new CheckoutService(prisma as unknown as PrismaService, gateway);

  beforeAll(() => {
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.DATABASE_URL = 'postgresql://fluentis:fluentis@localhost:5432/fluentis';
    process.env.PAYMENT_PROVIDER = 'midtrans';
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test-key';
    process.env.MIDTRANS_IS_PRODUCTION = 'false';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('charges the database price and leaves enrollment pending until the webhook', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'Business English',
      status: CourseStatus.PUBLISHED,
      price: new Prisma.Decimal(250000),
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.enrollment.create.mockResolvedValue({ id: 'enr-1' });
    prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
    jest.mocked(gateway.createCheckout).mockResolvedValue({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token',
      providerRef: 'snap-token',
    });

    const result = await service.checkout(student, 'course-1');

    expect(gateway.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 250000, payerEmail: student.email }),
    );
    expect(prisma.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EnrollmentStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        }),
      }),
    );
    expect(result.enrollmentStatus).toBe('PENDING');
    expect(result.method).toBe(PaymentChannel.REDIRECT);
    expect(result.qrString).toBeNull();
    expect(result.amount).toBe('250000.00');
    expect(result.checkoutUrl?.startsWith('https://')).toBe(true);
  });

  it('does not open another charge when the student already has access', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'Business English',
      status: CourseStatus.PUBLISHED,
      price: new Prisma.Decimal(250000),
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 'enr-1',
      status: EnrollmentStatus.ACTIVE,
      paymentStatus: PaymentStatus.PAID,
      payments: [],
    });

    await expect(service.checkout(student, 'course-1')).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createCheckout).not.toHaveBeenCalled();
  });

  it('reuses an open checkout session', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'Business English',
      status: CourseStatus.PUBLISHED,
      price: new Prisma.Decimal(250000),
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: 'enr-1',
      status: EnrollmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      payments: [
        {
          status: PaymentStatus.PENDING,
          checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/existing',
          orderId: 'fls-existing',
          amount: new Prisma.Decimal(250000),
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.checkout(student, 'course-1');

    expect(result.orderId).toBe('fls-existing');
    expect(gateway.createCheckout).not.toHaveBeenCalled();
  });

  it('creates a QRIS charge for the course price and keeps enrollment pending', async () => {
    const qrString = '00020101021226680016ID.CO.EXAMPLE.WWW';
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'Business English',
      status: CourseStatus.PUBLISHED,
      price: new Prisma.Decimal(250000),
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.enrollment.create.mockResolvedValue({ id: 'enr-1' });
    prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
    jest.mocked(gateway.createQris).mockResolvedValue({
      qrString,
      qrUrl: 'https://api.sandbox.midtrans.com/v2/qris/order/qr-code',
      providerRef: 'trx-qris',
    });

    const result = await service.checkout(student, 'course-1', PaymentChannel.QRIS);

    expect(gateway.createQris).toHaveBeenCalledWith(expect.objectContaining({ amount: 250000 }));
    expect(gateway.createCheckout).not.toHaveBeenCalled();
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ channel: PaymentChannel.QRIS }) }),
    );
    expect(result).toMatchObject({
      method: PaymentChannel.QRIS,
      qrString,
      enrollmentStatus: 'PENDING',
      amount: '250000.00',
    });
  });
});
