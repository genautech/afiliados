'use client';
import React from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  logs: any[];
  breakeven: number;
}

export default function DailyCharts({ logs, breakeven }: Props) {
  const data = [...(logs ?? [])].reverse().map((l: any) => {
    const clicks = l?.clicks ?? 0;
    return {
      date: new Date(l?.logDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }),
      gasto: l?.spend ?? 0,
      receita: l?.revenue ?? 0,
      epc: clicks > 0 ? (l?.revenue ?? 0) / clicks : 0,
      cpc: clicks > 0 ? (l?.spend ?? 0) / clicks : 0,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
      {/* Gasto vs Receita */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Gasto vs Receita</CardTitle>
          <p className="text-sm text-slate-400">Evolução diária do investimento e retorno</p>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={48} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Line type="monotone" dataKey="gasto" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Gasto" />
                <Line type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Receita" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* EPC por dia */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">EPC vs CPC por Dia</CardTitle>
          <p className="text-sm text-slate-400">Comparativo com linha de break-even</p>
        </CardHeader>
        <CardContent>
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={48} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                {breakeven > 0 && <ReferenceLine y={breakeven} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'BE', fill: '#f59e0b', fontSize: 11 }} />}
                <Bar dataKey="epc" fill="#60B5FF" name="EPC" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cpc" fill="#FF9149" name="CPC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
