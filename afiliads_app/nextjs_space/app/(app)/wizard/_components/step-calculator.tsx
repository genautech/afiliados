'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentHelp } from './agent-help';
import {
  TrendingUp, Calculator, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle,
  ArrowLeft, ArrowRight, Activity, Percent, Coins, UserCheck
} from 'lucide-react';
import { CVR_DEFAULTS } from '@/lib/wizard-data';

interface StepCalculatorProps {
  productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
  vertical: string;

  // Basic Inputs
  commission: string;
  setCommission: (v: string) => void;
  refundPct: string;
  setRefundPct: (v: string) => void;
  cvrExpected: string;
  setCvrExpected: (v: string) => void;

  // Mentorship specific inputs
  leadCvrExpected?: string;
  setLeadCvrExpected?: (v: string) => void;
  closeRateExpected?: string;
  setCloseRateExpected?: (v: string) => void;

  onPrev: () => void;
  onNext: () => void;
}

export function StepCalculator({
  productType,
  vertical,
  commission,
  setCommission,
  refundPct,
  setCvrExpected,
  cvrExpected,
  leadCvrExpected = '15',
  setLeadCvrExpected,
  closeRateExpected = '10',
  setCloseRateExpected,
  onPrev,
  onNext,
}: StepCalculatorProps) {
  const inputCls = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/10';

  // Calculations wrapped in useMemo for determinism and high performance
  const metrics = useMemo(() => {
    const rawPrice = parseFloat(commission) || 0;
    const rawRefund = parseFloat(refundPct) || 0;

    let netCommission = 0;
    let cvr = 0;
    let leadCvr = parseFloat(leadCvrExpected) || 15;
    let closeRate = parseFloat(closeRateExpected) || 10;
    let formulaExplanation = '';

    if (productType === 'AFFILIATE') {
      netCommission = rawPrice * (1 - rawRefund / 100);
      cvr = parseFloat(cvrExpected) || CVR_DEFAULTS[vertical] || 1.0;
      const epcBE = netCommission * (cvr / 100);
      const cpcMax = epcBE;
      const cpcScale = cpcMax / 1.3;

      formulaExplanation = `Comissão Líquida = ${rawPrice.toFixed(2)} USD × (1 - ${rawRefund}%) = $${netCommission.toFixed(2)} USD\nEPC Break-even = $${netCommission.toFixed(2)} × ${cvr}% = $${epcBE.toFixed(4)}\nCPC Máx = $${cpcMax.toFixed(4)} USD | CPC Scale (Recomendado) = $${cpcScale.toFixed(4)} USD`;

      return {
        netCommission,
        cvr,
        epcBE,
        cpcMax,
        cpcScale,
        leadCvr,
        closeRate,
        formulaExplanation,
      };
    } else if (productType === 'PROPRIETARY_LOW_TICKET') {
      // For proprietary low ticket: optimal pricing (R$ 29 - R$ 97), checkout fee is ~9.9% + R$ 1.00
      // If price is entered, assume payment gateway takes 9.9% + 1.00
      const gatewayFeePercent = 9.9;
      const fixedFee = 1.00;
      netCommission = Math.max(0, rawPrice * (1 - gatewayFeePercent / 100) - fixedFee);
      cvr = parseFloat(cvrExpected) || CVR_DEFAULTS[vertical] || 1.5;
      const epcBE = netCommission * (cvr / 100);
      const cpcMax = epcBE;
      const cpcScale = cpcMax / 1.3;

      formulaExplanation = `Preço Líquido (checkout) = (${rawPrice.toFixed(2)} - ${gatewayFeePercent}% - $${fixedFee.toFixed(2)}) = $${netCommission.toFixed(2)}\nEPC Break-even = $${netCommission.toFixed(2)} × ${cvr}% = $${epcBE.toFixed(4)}\nCPC Máx = $${cpcMax.toFixed(4)} | CPC Scale = $${cpcScale.toFixed(4)}`;

      return {
        netCommission,
        cvr,
        epcBE,
        cpcMax,
        cpcScale,
        leadCvr,
        closeRate,
        formulaExplanation,
      };
    } else {
      // MENTORSHIP: premium coaching or high ticket
      // gateway fee ~4.9% + 0.30
      const gatewayFeePercent = 4.9;
      const fixedFee = 0.30;
      netCommission = Math.max(0, rawPrice * (1 - gatewayFeePercent / 100) - fixedFee);

      // Overall CVR is lead generation rate * sales close rate
      cvr = (leadCvr * closeRate) / 100;
      const epcBE = netCommission * (cvr / 100);
      const cpcMax = epcBE;
      const cpcScale = cpcMax / 1.3;

      formulaExplanation = `Margem Líquida da Mentoria = (${rawPrice.toFixed(2)} - ${gatewayFeePercent}% - $${fixedFee.toFixed(2)}) = $${netCommission.toFixed(2)}\nConversão Geral (Tráfego -> Venda) = ${leadCvr}% (Lead) × ${closeRate}% (Fechamento) = ${cvr.toFixed(2)}%\nEPC Break-even = $${netCommission.toFixed(2)} × ${cvr.toFixed(2)}% = $${epcBE.toFixed(4)}\nCPC Máx = $${cpcMax.toFixed(4)} | CPC Scale = $${cpcScale.toFixed(4)}`;

      return {
        netCommission,
        cvr,
        epcBE,
        cpcMax,
        cpcScale,
        leadCvr,
        closeRate,
        formulaExplanation,
      };
    }
  }, [productType, commission, refundPct, cvrExpected, vertical, leadCvrExpected, closeRateExpected]);

  // CVR Traffic Light calculations
  const trafficLight = useMemo(() => {
    const cpc = metrics.cpcMax;
    if (cpc >= 0.6) {
      return {
        color: 'bg-emerald-500',
        text: 'Excelente Viabilidade',
        textColor: 'text-emerald-400',
        description: 'CPC Máximo de break-even acima de $0.60. Você possui uma margem confortável para disputar lances e comprar tráfego altamente qualificado.',
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
      };
    } else if (cpc >= 0.25) {
      return {
        color: 'bg-amber-500',
        text: 'Margem Apertada (Atenção)',
        textColor: 'text-amber-400',
        description: 'CPC Máximo entre $0.25 e $0.60. Exige controle cirúrgico de palavras-chave negativas e otimização constante da taxa de conversão (CVR).',
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/5',
      };
    } else {
      return {
        color: 'bg-rose-500',
        text: 'Alto Risco de LTI (Prejuízo)',
        textColor: 'text-rose-400',
        description: 'CPC Máximo abaixo de $0.25. Altíssima probabilidade de que os lances mínimos do Google Ads fiquem acima do seu break-even. Considere aumentar a precificação, a comissão ou otimizar radicalmente a página.',
        border: 'border-rose-500/20',
        bg: 'bg-rose-500/5',
      };
    }
  }, [metrics.cpcMax]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            Passo 3 de 3
          </span>
          <span className="text-slate-500 text-sm font-mono">/ Calculadora de Margem</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Simulador Financeiro de Break-Even
        </h2>
        <p className="text-sm text-slate-400">
          Calcule dinamicamente seu EPC limite, CPC máximo aceitável e a taxa de conversão necessária para manter sua campanha no azul.
        </p>
      </div>

      {/* 2. Interactive Input Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#111827]/30 border-[#334155] lg:col-span-1">
          <CardHeader className="border-b border-[#334155]/40 py-4 px-6">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-400" />
              Parâmetros de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {productType === 'MENTORSHIP' ? (
              <>
                {/* Mentorship Lead Magnet CVR */}
                {setLeadCvrExpected && (
                  <div>
                    <Label className="text-slate-300 text-xs font-medium">Conversão de Leads (Tráfego &rarr; Lead %)</Label>
                    <Input
                      type="number"
                      value={leadCvrExpected}
                      onChange={(e: any) => setLeadCvrExpected(e?.target?.value ?? '15')}
                      className={`${inputCls} mt-1.5`}
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Padrão: 15% para squeeze pages</p>
                  </div>
                )}
                {/* Mentorship Sales Close Rate */}
                {setCloseRateExpected && (
                  <div>
                    <Label className="text-slate-300 text-xs font-medium">Taxa de Fechamento (Lead &rarr; Venda %)</Label>
                    <Input
                      type="number"
                      value={closeRateExpected}
                      onChange={(e: any) => setCloseRateExpected(e?.target?.value ?? '10')}
                      className={`${inputCls} mt-1.5`}
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Padrão: 10% (venda humana / WhatsApp)</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Expected CVR */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Taxa de Conversão Esperada (CVR %)</Label>
                    <AgentHelp fieldKey="cvrExpected" fieldValue={cvrExpected} onApply={setCvrExpected} />
                  </div>
                  <Input
                    type="number"
                    value={cvrExpected}
                    onChange={(e: any) => setCvrExpected(e?.target?.value ?? '')}
                    placeholder={(CVR_DEFAULTS[vertical] || 1.0).toString()}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Sugestão conservadora para {vertical}: {CVR_DEFAULTS[vertical] ?? 1}%
                  </p>
                </div>
              </>
            )}

            {/* Price Override (Shortcut) */}
            <div>
              <Label className="text-slate-300 text-xs font-medium">
                {productType === 'AFFILIATE' && 'Ajustar Comissão Bruta (USD)'}
                {productType === 'PROPRIETARY_LOW_TICKET' && 'Ajustar Preço de Venda (R$)'}
                {productType === 'MENTORSHIP' && 'Ajustar Ticket da Mentoria (R$)'}
              </Label>
              <Input
                type="number"
                value={commission}
                onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                className={`${inputCls} mt-1.5 font-mono text-emerald-400`}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Calculations & Traffic Light */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-[#111827]/40 border-[#334155] p-4 text-center flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Margem Líquida Real</p>
                <p className="text-2xl font-black text-white font-mono mt-1.5">
                  ${metrics.netCommission.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-2">Deduções aplicadas</span>
            </Card>

            <Card className="bg-[#111827]/40 border-[#334155] p-4 text-center flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">EPC Break-Even</p>
                <p className="text-2xl font-black text-yellow-400 font-mono mt-1.5">
                  ${metrics.epcBE.toFixed(4)}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-2">Valor limite por clique</span>
            </Card>

            <Card className="bg-[#111827]/40 border-rose-500/20 p-4 text-center flex flex-col justify-between bg-rose-500/5">
              <div>
                <p className="text-[10px] text-rose-400 uppercase tracking-wider font-mono font-bold">CPC Máximo (Teto)</p>
                <p className="text-2xl font-black text-rose-400 font-mono mt-1.5">
                  ${metrics.cpcMax.toFixed(4)}
                </p>
              </div>
              <span className="text-[10px] text-rose-500/70 font-mono block mt-2">Ponto de equilíbrio zero</span>
            </Card>

            <Card className="bg-[#111827]/40 border-emerald-500/20 p-4 text-center flex flex-col justify-between bg-emerald-500/5">
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">CPC Scale Recomendado</p>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1.5">
                  ${metrics.cpcScale.toFixed(4)}
                </p>
              </div>
              <span className="text-[10px] text-emerald-500/70 font-mono block mt-2">Margem de 30% inclusa</span>
            </Card>
          </div>

          {/* Traffic Light Signalizer */}
          <div className={`p-4 rounded-xl border ${trafficLight.border} ${trafficLight.bg} space-y-2`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${trafficLight.color} animate-pulse shrink-0`} />
              <span className={`text-xs font-black uppercase tracking-wider ${trafficLight.textColor} font-mono`}>
                Diagnóstico de Leilão: {trafficLight.text}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {trafficLight.description}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Graphical Visualizations (Inline Pure SVGs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graph 1: Funnel visualization */}
        <Card className="bg-[#111827]/20 border-[#334155] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Funil de Escala de Tráfego</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>

          <div className="flex justify-center py-4">
            <svg viewBox="0 0 400 160" className="w-full max-w-[320px] h-auto">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Segment 1: Clicks */}
              <polygon points="20,10 380,10 340,50 60,50" fill="url(#grad1)" stroke="#3b82f6" strokeWidth="1" />
              <text x="200" y="32" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                100% Cliques de Alta Intenção
              </text>

              {/* Segment 2: Squeeze/Bridge */}
              <polygon points="60,55 340,55 290,95 110,95" fill="url(#grad2)" stroke="#8b5cf6" strokeWidth="1" />
              <text x="200" y="78" fill="#e9d5ff" fontSize="10" textAnchor="middle" fontFamily="monospace">
                {productType === 'MENTORSHIP' ? `${metrics.leadCvr}% Captura Lead` : '75% Visualizações de Página'}
              </text>

              {/* Segment 3: Converts */}
              <polygon points="110,100 290,100 220,140 180,140" fill="url(#grad3)" stroke="#10b981" strokeWidth="1" />
              <text x="200" y="123" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {metrics.cvr.toFixed(2)}% Conversão Final
              </text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            As taxas do funil determinam a relação matemática estrita de lances no Google Ads.
          </p>
        </Card>

        {/* Graph 2: Bid Dispersion curve with markers */}
        <Card className="bg-[#111827]/20 border-[#334155] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Dispersão de Lances do Leilão</span>
            <Coins className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="flex justify-center py-4">
            <svg viewBox="0 0 400 160" className="w-full max-w-[320px] h-auto">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="40" y2="130" stroke="#334155" strokeDasharray="3,3" />
              <line x1="40" y1="130" x2="360" y2="130" stroke="#334155" />

              {/* Normal distribution curve representing bids */}
              <path d="M 40,125 Q 120,120 180,50 T 320,125" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4,2" />

              {/* Marker for CPC Scale */}
              {metrics.cpcScale > 0 && (
                <>
                  <line x1="160" y1="20" x2="160" y2="130" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="160" cy="70" r="5" fill="#10b981" />
                  <text x="160" y="15" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Scale: ${metrics.cpcScale.toFixed(2)}
                  </text>
                </>
              )}

              {/* Marker for CPC Max */}
              {metrics.cpcMax > 0 && (
                <>
                  <line x1="220" y1="20" x2="220" y2="130" stroke="#f43f5e" strokeWidth="1.5" />
                  <circle cx="220" cy="100" r="5" fill="#f43f5e" />
                  <text x="220" y="15" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Teto Max: ${metrics.cpcMax.toFixed(2)}
                  </text>
                </>
              )}

              <text x="40" y="145" fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">Barato</text>
              <text x="320" y="145" fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">Caro</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Seus limites definem onde a campanha escala e onde ela desliga para estancar prejuízos.
          </p>
        </Card>
      </div>

      {/* 5. Formulas Explanation */}
      <Card className="bg-slate-950 border border-[#334155]/60 p-4">
        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono block mb-2">
          Memória de Cálculo (Matemática Pura de Tráfego)
        </span>
        <pre className="text-slate-400 text-xs font-mono leading-normal whitespace-pre-wrap">
          {metrics.formulaExplanation}
        </pre>
      </Card>

      {/* 6. Navigation Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-[#334155]/60">
        <Button
          variant="outline"
          onClick={onPrev}
          className="border-[#334155] text-slate-300 hover:bg-[#1e293b] gap-1.5 text-xs font-semibold py-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <Button
          onClick={onNext}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 gap-1.5 text-xs font-semibold py-2 transition-all shadow-md shadow-emerald-500/10"
        >
          Prosseguir no Wizard <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
