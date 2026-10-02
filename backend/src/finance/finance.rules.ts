export interface SettledPayment {
  id: string;
  orderId: string;
  amount: number;
  status: 'PAID' | 'REFUNDED';
  occurredAt: Date;
  provider: 'MIDTRANS' | 'XENDIT';
  channel: 'REDIRECT' | 'QRIS';
  courseId: string;
  courseTitle: string;
  level: string;
  studentName: string;
  studentEmail: string;
}

export interface CourseSales {
  courseId: string;
  title: string;
  level: string;
  grossRevenue: string;
  netRevenue: string;
  paidCount: number;
  refundCount: number;
}

export interface MonthlyRevenue {
  month: string;
  grossRevenue: string;
  netRevenue: string;
}

export interface FinanceSummary {
  grossRevenue: string;
  netRevenue: string;
  refundedAmount: string;
  paidCount: number;
  refundCount: number;
  byCourse: CourseSales[];
  monthly: MonthlyRevenue[];
}

export function jakartaMonth(value: Date): string {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).format(value);
  return formatted.slice(0, 7);
}

export function summarizeFinance(payments: readonly SettledPayment[], span: { from: string; to: string } | null): FinanceSummary {
  let gross = 0;
  let net = 0;
  let refunded = 0;
  let paidCount = 0;
  let refundCount = 0;
  const courses = new Map<string, CourseBucket>();
  const months = new Map<string, { gross: number; net: number }>();

  for (const payment of payments) {
    const bucket = courses.get(payment.courseId) ?? emptyCourse(payment);
    const month = months.get(jakartaMonth(payment.occurredAt)) ?? { gross: 0, net: 0 };
    gross += payment.amount;
    month.gross += payment.amount;
    bucket.gross += payment.amount;
    if (payment.status === 'PAID') {
      net += payment.amount;
      month.net += payment.amount;
      bucket.net += payment.amount;
      paidCount += 1;
      bucket.paidCount += 1;
    } else {
      refunded += payment.amount;
      refundCount += 1;
      bucket.refundCount += 1;
    }
    courses.set(payment.courseId, bucket);
    months.set(jakartaMonth(payment.occurredAt), month);
  }

  const monthKeys = span ? monthsBetween(span.from, span.to) : [...months.keys()].sort();
  return {
    grossRevenue: String(gross),
    netRevenue: String(net),
    refundedAmount: String(refunded),
    paidCount,
    refundCount,
    byCourse: [...courses.values()]
      .map((bucket) => ({
        courseId: bucket.courseId,
        title: bucket.title,
        level: bucket.level,
        grossRevenue: String(bucket.gross),
        netRevenue: String(bucket.net),
        paidCount: bucket.paidCount,
        refundCount: bucket.refundCount,
      }))
      .sort((left, right) => Number(right.netRevenue) - Number(left.netRevenue) || left.title.localeCompare(right.title)),
    monthly: monthKeys.map((month) => {
      const point = months.get(month) ?? { gross: 0, net: 0 };
      return { month, grossRevenue: String(point.gross), netRevenue: String(point.net) };
    }),
  };
}

interface CourseBucket {
  courseId: string;
  title: string;
  level: string;
  gross: number;
  net: number;
  paidCount: number;
  refundCount: number;
}

function emptyCourse(payment: SettledPayment): CourseBucket {
  return {
    courseId: payment.courseId,
    title: payment.courseTitle,
    level: payment.level,
    gross: 0,
    net: 0,
    paidCount: 0,
    refundCount: 0,
  };
}

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let cursor = from.slice(0, 7);
  const end = to.slice(0, 7);
  while (cursor <= end) {
    months.push(cursor);
    cursor = nextMonth(cursor);
  }
  return months;
}

function nextMonth(month: string): string {
  const [yearText, monthText] = month.split('-');
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  const monthNumber = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${monthNumber}`;
}
