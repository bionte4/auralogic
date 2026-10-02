import { jakartaMonth, summarizeFinance, type SettledPayment } from './finance.rules';

function payment(overrides: Partial<SettledPayment> & Pick<SettledPayment, 'id' | 'amount' | 'status'>): SettledPayment {
  return {
    orderId: overrides.id,
    occurredAt: new Date('2026-10-02T03:00:00.000Z'),
    provider: 'MIDTRANS',
    channel: 'QRIS',
    courseId: 'course-1',
    courseTitle: 'Business English',
    level: 'B1',
    studentName: 'Alya',
    studentEmail: 'alya@fluentis.test',
    ...overrides,
  };
}

describe('finance rules', () => {
  it('treats a Jakarta evening as the next calendar month', () => {
    expect(jakartaMonth(new Date('2026-09-30T17:00:00.000Z'))).toBe('2026-10');
  });

  it('counts settled charges as gross and keeps refunds out of net', () => {
    const summary = summarizeFinance(
      [
        payment({ id: 'paid', amount: 150000, status: 'PAID' }),
        payment({
          id: 'refund',
          amount: 80000,
          status: 'REFUNDED',
          courseId: 'course-2',
          courseTitle: 'Starter',
          level: 'A2',
          occurredAt: new Date('2026-09-15T03:00:00.000Z'),
        }),
      ],
      { from: '2026-09-01', to: '2026-10-31' },
    );

    expect(summary.grossRevenue).toBe('230000');
    expect(summary.netRevenue).toBe('150000');
    expect(summary.refundedAmount).toBe('80000');
    expect(summary.paidCount).toBe(1);
    expect(summary.refundCount).toBe(1);
    expect(summary.byCourse.map((row) => row.level)).toEqual(['B1', 'A2']);
    expect(summary.monthly).toEqual([
      { month: '2026-09', grossRevenue: '80000', netRevenue: '0' },
      { month: '2026-10', grossRevenue: '150000', netRevenue: '150000' },
    ]);
  });
});
