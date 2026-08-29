'use client';

import React from 'react';
import type { ProductTypeEnum } from '@/lib/validations/market-research';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Tag, Users, ArrowRight, ShieldCheck, Zap, Link2 } from 'lucide-react';

// Fonte única: o enum Zod, que espelha o enum ProductType do Prisma.
export type ProductType = ProductTypeEnum;

interface StepProductTypeProps {
  value: ProductType;
  onChange: (type: ProductType) => void;
  onNext?: () => void;
}

export function StepProductType({ value, onChange, onNext }: StepProductTypeProps) {
  const options = [
    {
      id: 'AFFILIATE' as ProductType,
      title: 'Afiliação de Alta Conversão',
      description: 'Promova ofertas globais altamente validadas em dólares.',
      icon: Link2,
      badge: 'USD Payout',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      highlights: [
        'Busca nos marketplaces ClickBank, MaxWeb e Hotmart',
        'Geração automática de Pré-sells (Quiz/Review/Advertorial)',
        'Validação automática de HopLinks de afiliado'
      ],
      details: 'Ideal para arbitrage de tráfego com campanhas fundo e meio de funil, com foco em otimização de CPC e alta intenção de busca.'
    },
    {
      id: 'PROPRIETARY_LOW_TICKET' as ProductType,
      title: 'Infoproduto Próprio Low-Ticket',
      description: 'Venda seus e-books ou mini-cursos com conversão ágil e direta.',
      icon: Tag,
      badge: 'R$ 29 - R$ 97',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      highlights: [
        'Painel de precificação ótima recomendada',
        'Integração direta de Webhooks de checkout (Kiwify/Stripe)',
        'Landing Pages otimizadas com foco em CTA de compra direta'
      ],
      details: 'Maximize sua margem livre sem depender de redes de afiliados. Otimizado para funis rápidos de conversão direta com upsells.'
    },
    {
      id: 'MENTORSHIP' as ProductType,
      title: 'Mentoria & High-Ticket',
      description: 'Venda consultorias premium e mentorias exclusivas.',
      icon: Users,
      badge: 'High-Ticket',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      highlights: [
        'Configurador de iscas digitais (PDF / Aula Grátis)',
        'Squeeze Pages elegantes para captação de leads qualificados',
        'Redirecionamento direto e estratégico para WhatsApp'
      ],
      details: 'Voltado para profissionais e experts que buscam capturar dados enriquecidos de leads antes de levá-los à venda humana.'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Selecione o Modelo de Negócio
        </h2>
        <p className="text-sm text-slate-400">
          Escolha o tipo de produto para o qual deseja estruturar sua campanha. Toda a lógica, interfaces e métricas do Wizard se adaptarão dinamicamente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`group relative flex flex-col justify-between rounded-xl border p-5 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'bg-slate-900/60 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/20'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`rounded-lg p-2.5 transition-colors duration-300 ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={`font-mono text-[10px] ${opt.badgeColor}`}>
                    {opt.badge}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-base text-white group-hover:text-emerald-300 transition-colors">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="border-t border-slate-800/60 pt-4 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Recursos Inclusos:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {opt.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-900/80">
                <p className="text-[11px] text-slate-500 italic leading-snug">
                  {opt.details}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 flex h-2 w-2 rounded-full bg-emerald-500">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all duration-200 shadow-md"
        >
          Próximo Passo <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
