import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import {
  ACCESS_EXPIRED,
  ACCESS_NOT_STARTED,
  ENROLLMENT_REQUIRED,
  enrollmentAccessDenial,
  type EnrollmentAccess,
} from './enrollment-access';

const now = new Date('2026-10-02T12:00:00.000Z');

function enrollment(overrides: Partial<EnrollmentAccess> = {}): EnrollmentAccess {
  return {
    status: EnrollmentStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    accessStartsAt: null,
    accessEndsAt: null,
    ...overrides,
  };
}

describe('enrollmentAccessDenial', () => {
  it('allows an active paid enrollment inside the access window', () => {
    expect(enrollmentAccessDenial(enrollment(), now)).toBeNull();
  });

  it('rejects a missing or unpaid enrollment', () => {
    expect(enrollmentAccessDenial(null, now)).toBe(ENROLLMENT_REQUIRED);
    expect(enrollmentAccessDenial(enrollment({ paymentStatus: PaymentStatus.UNPAID }), now)).toBe(
      ENROLLMENT_REQUIRED,
    );
    expect(enrollmentAccessDenial(enrollment({ status: EnrollmentStatus.SUSPENDED }), now)).toBe(
      ENROLLMENT_REQUIRED,
    );
  });

  it('rejects access outside the paid window', () => {
    expect(
      enrollmentAccessDenial(enrollment({ accessStartsAt: new Date('2026-10-03T00:00:00.000Z') }), now),
    ).toBe(ACCESS_NOT_STARTED);
    expect(
      enrollmentAccessDenial(enrollment({ accessEndsAt: new Date('2026-10-02T12:00:00.000Z') }), now),
    ).toBe(ACCESS_EXPIRED);
    expect(enrollmentAccessDenial(enrollment({ status: EnrollmentStatus.EXPIRED }), now)).toBe(ACCESS_EXPIRED);
  });
});
