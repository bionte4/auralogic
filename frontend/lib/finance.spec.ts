import { financeCsv, financeFilterError, financeQuery } from './finance';

describe('finance dashboard helpers', () => {
  it('builds a filtered query and rejects a one-sided date range', () => {
    expect(financeQuery({ from: '2026-10-01', to: '2026-10-31', q: ' Alya ', level: 'B1' })).toBe(
      '?from=2026-10-01&to=2026-10-31&q=Alya&level=B1',
    );
    expect(financeFilterError({ from: '2026-10-02', to: '', q: '', level: '' })).toBe(
      'Choose both a start date and an end date.',
    );
  });

  it('exports the visible transactions as CSV', () => {
    const csv = financeCsv([
      {
        id: 'pay-1',
        orderId: 'order-1',
        occurredAt: '2026-10-02T03:00:00.000Z',
        amount: '250000',
        status: 'PAID',
        provider: 'MIDTRANS',
        channel: 'QRIS',
        courseId: 'course-1',
        courseTitle: 'Business "English"',
        level: 'B1',
        studentName: 'Alya',
        studentEmail: 'alya@fluentis.test',
      },
    ]);

    expect(csv.startsWith('\uFEFFDate,Order,')).toBe(true);
    expect(csv).toContain('"Business ""English"""');
    expect(csv).toContain('250000');
  });
});
