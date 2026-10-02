'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatIdr } from '@/lib/course-draft';

export interface RevenuePoint {
  month: string;
  grossRevenue: string;
  netRevenue: string;
}

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = points.map((point) => ({
    month: point.month,
    gross: Number(point.grossRevenue),
    net: Number(point.netRevenue),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="hsl(240 4% 18%)" vertical={false} />
          <XAxis dataKey="month" stroke="hsl(240 5% 65%)" tick={{ fill: 'hsl(240 5% 65%)', fontSize: 12 }} />
          <YAxis
            stroke="hsl(240 5% 65%)"
            tick={{ fill: 'hsl(240 5% 65%)', fontSize: 12 }}
            tickFormatter={(value: number) => formatIdr(String(value))}
            width={96}
          />
          <Tooltip
            formatter={(value) => formatIdr(String(value ?? 0))}
            contentStyle={{ background: 'hsl(240 6% 10%)', border: '1px solid hsl(240 4% 18%)', borderRadius: 8 }}
          />
          <Legend />
          <Line type="monotone" dataKey="gross" name="Gross" stroke="#fafafa" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Net" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
