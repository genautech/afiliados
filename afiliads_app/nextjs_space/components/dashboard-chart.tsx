'use client';
import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface DashboardChartProps {
  logs: Array<{
    date: string;
    campaign: string;
    spend: number;
    revenue: number;
    clicks: number;
    conversions: number;
  }>;
}

export default function DashboardChart({ logs }: DashboardChartProps) {
  const chartData = (logs ?? []).map(l => ({
    date: new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    Gasto: l?.spend ?? 0,
    Receita: l?.revenue ?? 0,
    Lucro: (l?.revenue ?? 0) - (l?.spend ?? 0),
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickFormatter={(v: number) => '$' + v} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number, name: string) => ['$' + value.toFixed(2), name]}
          />
          <Area type="monotone" dataKey="Gasto" stroke="#ef4444" fill="url(#gradGasto)" strokeWidth={2} />
          <Area type="monotone" dataKey="Receita" stroke="#22c55e" fill="url(#gradReceita)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
