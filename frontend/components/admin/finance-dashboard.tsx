'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest } from '@/lib/api';
import { CEFR_LEVELS, formatIdr } from '@/lib/course-draft';
import { financeCsv, financeFilterError, financeQuery, type FinanceFilters, type FinanceTransaction } from '@/lib/finance';

interface CourseSales {
  courseId: string;
  title: string;
  level: string;
  grossRevenue: string;
  netRevenue: string;
  paidCount: number;
  refundCount: number;
}

interface FinanceSummary {
  grossRevenue: string;
  netRevenue: string;
  refundedAmount: string;
  paidCount: number;
  refundCount: number;
  byCourse: CourseSales[];
  monthly: Array<{ month: string; grossRevenue: string; netRevenue: string }>;
}

const RevenueChart = dynamic(() => import('@/components/admin/revenue-chart').then((mod) => mod.RevenueChart), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading chart…</p>,
});

const EMPTY_FILTERS: FinanceFilters = { from: '', to: '', q: '', level: '' };

export function FinanceDashboard() {
  const [draft, setDraft] = useState<FinanceFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FinanceFilters>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filterError = financeFilterError(filters);
    if (filterError) {
      setError(filterError);
      return;
    }
    const query = financeQuery(filters);
    let active = true;
    setError(null);
    setSummary(null);
    setTransactions(null);
    void Promise.all([
      apiRequest<FinanceSummary>(`/admin/finance/summary${query}`),
      apiRequest<FinanceTransaction[]>(`/admin/finance/transactions${query}`),
    ])
      .then(([nextSummary, nextTransactions]) => {
        if (!active) {
          return;
        }
        setSummary(nextSummary);
        setTransactions(nextTransactions);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof ApiError ? caught.message : 'Could not load finance data.');
      });
    return () => {
      active = false;
    };
  }, [filters]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Financial dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gross is every settled charge. Net is the amount still held after refunds. Dates use Asia/Jakarta.
        </p>
      </div>
      <form
        className="grid gap-3 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters(draft);
        }}
      >
        <Input type="date" value={draft.from} aria-label="From" onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
        <Input type="date" value={draft.to} aria-label="To" onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
        <Input
          value={draft.q}
          placeholder="Search order, student, or course"
          aria-label="Search transactions"
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
        <select
          className="flex h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          aria-label="Level"
          value={draft.level}
          onChange={(event) => setDraft({ ...draft, level: event.target.value })}
        >
          <option value="">All levels</option>
          {CEFR_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <Button type="submit">Apply</Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!summary || !transactions ? <p className="text-sm text-muted-foreground">Loading finance…</p> : null}
      {summary && transactions ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Gross revenue" value={formatIdr(summary.grossRevenue)} />
            <MetricCard label="Net revenue" value={formatIdr(summary.netRevenue)} />
            <MetricCard label="Refunded" value={formatIdr(summary.refundedAmount)} />
            <MetricCard label="Settled charges" value={`${summary.paidCount} paid · ${summary.refundCount} refunded`} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Monthly revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.monthly.length === 0 ? (
                <p className="text-sm text-muted-foreground">No settled payments in this range.</p>
              ) : (
                <RevenueChart points={summary.monthly} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sales by course</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.byCourse.length === 0 ? (
                <p className="text-sm text-muted-foreground">No course sales in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Course</th>
                        <th className="px-3 py-2 font-medium">Level</th>
                        <th className="px-3 py-2 font-medium">Gross</th>
                        <th className="px-3 py-2 font-medium">Net</th>
                        <th className="px-3 py-2 font-medium">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byCourse.map((row) => (
                        <tr key={row.courseId} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{row.title}</td>
                          <td className="px-3 py-2">{row.level}</td>
                          <td className="px-3 py-2">{formatIdr(row.grossRevenue)}</td>
                          <td className="px-3 py-2">{formatIdr(row.netRevenue)}</td>
                          <td className="px-3 py-2">
                            {row.paidCount} paid · {row.refundCount} refunded
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Transactions</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={transactions.length === 0}
                onClick={() => downloadCsv(transactions)}
              >
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions match these filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">Student</th>
                        <th className="px-3 py-2 font-medium">Course</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{formatWhen(row.occurredAt)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.orderId}</td>
                          <td className="px-3 py-2">
                            <p>{row.studentName}</p>
                            <p className="text-muted-foreground">{row.studentEmail}</p>
                          </td>
                          <td className="px-3 py-2">
                            {row.courseTitle} · {row.level}
                          </td>
                          <td className="px-3 py-2">
                            <Badge>
                              {row.status} · {row.channel}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{formatIdr(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function downloadCsv(rows: readonly FinanceTransaction[]): void {
  const blob = new Blob([financeCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'fluentis-finance.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
