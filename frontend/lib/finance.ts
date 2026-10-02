export interface FinanceTransaction {
  id: string;
  orderId: string;
  occurredAt: string;
  amount: string;
  status: 'PAID' | 'REFUNDED';
  provider: 'MIDTRANS' | 'XENDIT';
  channel: 'REDIRECT' | 'QRIS';
  courseId: string;
  courseTitle: string;
  level: string;
  studentName: string;
  studentEmail: string;
}

export interface FinanceFilters {
  from: string;
  to: string;
  q: string;
  level: string;
}

export function financeQuery(filters: FinanceFilters): string {
  const params = new URLSearchParams();
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  const q = filters.q.trim();
  if (q) {
    params.set('q', q);
  }
  if (filters.level) {
    params.set('level', filters.level);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function financeFilterError(filters: FinanceFilters): string | null {
  if ((filters.from && !filters.to) || (!filters.from && filters.to)) {
    return 'Choose both a start date and an end date.';
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    return 'The start date must be on or before the end date.';
  }
  return null;
}

export function financeCsv(rows: readonly FinanceTransaction[]): string {
  const header = ['Date', 'Order', 'Student', 'Email', 'Course', 'Level', 'Provider', 'Channel', 'Status', 'Amount IDR'];
  const lines = rows.map((row) =>
    [row.occurredAt, row.orderId, row.studentName, row.studentEmail, row.courseTitle, row.level, row.provider, row.channel, row.status, row.amount]
      .map(csvCell)
      .join(','),
  );
  return `\uFEFF${[header.join(','), ...lines].join('\n')}`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
