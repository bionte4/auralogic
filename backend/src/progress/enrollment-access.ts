import { EnrollmentStatus, PaymentStatus } from '@prisma/client';

export const ENROLLMENT_REQUIRED = 'An active paid enrollment is required to open this lesson.';
export const ACCESS_NOT_STARTED = 'Course access has not started.';
export const ACCESS_EXPIRED = 'Course access has expired.';
export const PREVIOUS_LEVEL_INCOMPLETE =
  'Complete every lesson in the previous level before opening this lesson.';
export const PLACEMENT_REQUIRED = 'Complete the placement check before opening this level.';
export const COURSE_UNAVAILABLE = 'This course is not available.';

export interface EnrollmentAccess {
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
}

/** Returns a denial message, or null when the enrollment currently grants access. */
export function enrollmentAccessDenial(enrollment: EnrollmentAccess | null, now: Date): string | null {
  if (!enrollment || enrollment.paymentStatus !== PaymentStatus.PAID) {
    return ENROLLMENT_REQUIRED;
  }
  if (enrollment.status === EnrollmentStatus.EXPIRED) {
    return ACCESS_EXPIRED;
  }
  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    return ENROLLMENT_REQUIRED;
  }
  if (enrollment.accessStartsAt && enrollment.accessStartsAt.getTime() > now.getTime()) {
    return ACCESS_NOT_STARTED;
  }
  if (enrollment.accessEndsAt && enrollment.accessEndsAt.getTime() <= now.getTime()) {
    return ACCESS_EXPIRED;
  }
  return null;
}
