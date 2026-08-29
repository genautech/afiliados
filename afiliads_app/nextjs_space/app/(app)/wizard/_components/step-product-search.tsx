'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AgentHelp, applyEnumIfValid } from './agent-help';
import { KnowledgeInjector } from './knowledge-injector';
import type { ProductType } from './step-product-type';
import {
  Search, Bot, Loader2, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight,
  TrendingUp, Tag, ShieldAlert, Target, Link2, Key, HelpCircle
} from 'lucide-react';
import { PLATFORMS_EXTENDED, VERTICALS, GEOS, CHANNELS, ExtendedPlatform } from '@/lib/wizard-data';

interface StepProductSearchProps {
  campaignId?: string | null;
  productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
  
  // State variables and setters
  name: string;
  setName: (v: string) => void;
  platform: ExtendedPlatform;
  setPlatform: (v: ExtendedPlatform) => void;
  vertical: string;
  setVertical: (v: string) => void;
  geo: string;
  setGeo: (v: string) => void;
  channel: string;
  setChannel: (v: string) => void;
  funnel: string;
  setFunnel: (v: string) => void;
  offerUrl: string;
  setOfferUrl: (v: string) => void;
  commission: string;
  setCommission: (v: string) => void;
  refundPct: string;
  setRefundPct: (v: string) => void;
  aov: string;
  setAov: (v: string) => void;

  // New fields for low-ticket and mentorship
  checkoutWebhook?: string;
  setCheckoutWebhook?: (v: string) => void;
  leadMagnet?: string;
  setLeadMagnet?: (v: string) => void;
  whatsappLink?: string;
  setWhatsappLink?: (v: string) => void;

  // Pre-analyzed products (Affiliate only)
  researchProducts: Array<{ id: string; name: string; score: number; vertical: string; confirmedAt?: string | null }>;
  sourceProductResearchId: string | null;
  loadFromResearch: (id: string) => Promise<void>;
  autofilling: boolean;

  // Ad Scout Oracle V2 States & API trigger
  scoutQuery: string;
  setScoutQuery: (v: string) => void;
  scoutLoading: boolean;
  scoutStage: string;
  scoutResult: any;
  scoutProductType: ProductType;
  setScoutProductType: (v: ProductType) => void;
  runAdScoutResearch: () => Promise<void>;

  onPrev: () => void;
  onNext: () => void;
}

export function StepProductSearch({
  campaignId = null,
  productType,
  name,
  setName,
  platform,
  setPlatform,
  vertical,
  setVertical,
  geo,
  setGeo,
  channel,
  setChannel,
  funnel,
  setFunnel,
  offerUrl,
  setOfferUrl,
  commission,
  setCommission,
  refundPct,
  setRefundPct,
  aov,
  setAov,
  checkoutWebhook = '',
  setCheckoutWebhook,
  leadMagnet = '',
  setLeadMagnet,
  whatsappLink = '',
  setWhatsappLink,
  researchProducts,
  sourceProductResearchId,
  loadFromResearch,
  autofilling,
  scoutQuery,
  setScoutQuery,
  scoutLoading,
  scoutStage,
  scoutResult,
  scoutProductType,
  setScoutProductType,
  runAdScoutResearch,
  onPrev,
  onNext,
}: StepProductSearchProps) {
  const inputCls = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/10';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            Passo 2 de 3
          </span>
          <span className="text-slate-500 text-sm font-mono">/ Pesquisa & Dados</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {productType === 'AFFILIATE' && 'Definição da Oferta & Pesquisa de Mercado'}
          {productType === 'PROPRIETARY_LOW_TICKET' && 'Detalhes do Infoproduto & Pesquisa de Mercado'}
          {productType === 'MENTORSHIP' && 'Configuração da Mentoria & Público-Alvo'}
        </h2>
        <p className="text-sm text-slate-400">
          {productType === 'AFFILIATE' && 'Busque ofertas validadas ou insira uma nova para mapear com o Ad Scout.'}
          {productType === 'PROPRIETARY_LOW_TICKET' && 'Defina o nome do seu produto, fluxo de checkout e faça o benchmarking inteligente.'}
          {productType === 'MENTORSHIP' && 'Configure seu funil de mentoria, canal de leads e valide os temas mais buscados no mercado.'}
        </p>
      </div>

      {/* 2. Loader from Research (Affiliate Only) */}
      {productType === 'AFFILIATE' && researchProducts && researchProducts.length > 0 && (
        <Card className="bg-[#111827]/40 border-purple-500/20 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Bot className="h-4 w-4 text-purple-400 animate-pulse" />
              <Label className="text-purple-300 text-xs font-semibold uppercase tracking-wider font-mono">
                Importar Produto Analisado:
              </Label>
            </div>
            <div className="flex-1">
              <Select value={sourceProductResearchId ?? ''} onValueChange={loadFromResearch} disabled={autofilling}>
                <SelectTrigger className="bg-[#0f172a] border-[#334155] text-purple-200">
                  <SelectValue placeholder="Escolha um produto já analisado para autopreencher..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155] max-h-72">
                  {researchProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name} — {p.vertical || 'sem vertical'} (Score: {p.score}/100)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Core Campaign Details Form */}
      <Card className="bg-[#111827]/30 border-[#334155]">
        <CardHeader className="border-b border-[#334155]/40 py-4 px-6">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Parâmetros Principais da Campanha
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Insira os dados base para a geração automatizada de anúncios e páginas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field: Campanha Name */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">
                  {productType === 'AFFILIATE' ? 'Nome da Campanha *' : 'Nome do Produto *'}
                </Label>
                <AgentHelp fieldKey="name" fieldValue={name} onApply={setName} />
              </div>
              <Input
                value={name}
                onChange={(e: any) => setName(e?.target?.value ?? '')}
                placeholder={productType === 'AFFILIATE' ? 'Ex: WL Supplement Alpha' : 'Ex: Guia Emagrecimento Definitivo'}
                className={inputCls}
              />
            </div>

            {/* Field: Platform / Checkout */}
            {productType === 'AFFILIATE' ? (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Plataforma</Label>
                  <AgentHelp fieldKey="platform" fieldValue={platform} onApply={applyEnumIfValid(PLATFORMS_EXTENDED, setPlatform, 'Plataforma')} />
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    {PLATFORMS_EXTENDED.map((p) => (
                      <SelectItem key={p} value={p} className="text-white">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Plataforma de Checkout</Label>
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    <SelectItem value="Hotmart" className="text-white">Hotmart</SelectItem>
                    <SelectItem value="Eduzz" className="text-white">Eduzz</SelectItem>
                    <SelectItem value="Monetizze" className="text-white">Monetizze</SelectItem>
                    <SelectItem value="ClickBank" className="text-white">Stripe / Internacional</SelectItem>
                    <SelectItem value="Outro" className="text-white">Outra (Kiwify, Appmax...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Label className="text-slate-300 text-xs font-medium">Modelo de Entrega</Label>
                </div>
                <Select value={platform} onValueChange={(v: ExtendedPlatform) => setPlatform(v)}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155]">
                    <SelectItem value="Hotmart" className="text-white">Área de Membros Hotmart</SelectItem>
                    <SelectItem value="Outro" className="text-white">Reunião Zoom / Ao Vivo</SelectItem>
                    <SelectItem value="Eduzz" className="text-white">Consultoria WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Field: Vertical */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Vertical / Nicho</Label>
                <AgentHelp fieldKey="vertical" fieldValue={vertical} onApply={applyEnumIfValid(VERTICALS, setVertical, 'Vertical')} />
              </div>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v} className="text-white">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Geo */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Geo Segmentado</Label>
                <AgentHelp fieldKey="geo" fieldValue={geo} onApply={applyEnumIfValid(GEOS, setGeo, 'Geo')} />
              </div>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {GEOS.map((g) => (
                    <SelectItem key={g} value={g} className="text-white">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Channel */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Canal de Tráfego</Label>
                <AgentHelp fieldKey="channel" fieldValue={channel} context={{ vertical }} onApply={applyEnumIfValid(CHANNELS, setChannel, 'Canal')} />
              </div>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c} className="text-white">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field: Funnel */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-slate-300 text-xs font-medium">Estratégia de Funil</Label>
                <AgentHelp fieldKey="funnel" fieldValue={funnel} onApply={applyEnumIfValid(['BRIDGE', 'DIRECT', 'REVIEW', 'SL'], setFunnel, 'Funil')} />
              </div>
              <Select value={funnel} onValueChange={setFunnel}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  {productType === 'AFFILIATE' ? (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Bridge Page (Recomendado)</SelectItem>
                      <SelectItem value="DIRECT" className="text-white">Link Direto (Fundo de Funil)</SelectItem>
                      <SelectItem value="REVIEW" className="text-white">Artigo de Review</SelectItem>
                      <SelectItem value="SL" className="text-white">Smartlink</SelectItem>
                    </>
                  ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Landing Page com CTA Direto</SelectItem>
                      <SelectItem value="REVIEW" className="text-white">Página de Vendas de Vídeo (VSL)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="BRIDGE" className="text-white">Squeeze Page (Capturar Leads)</SelectItem>
                      <SelectItem value="DIRECT" className="text-white">Página Simples + Direct WhatsApp</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Fields dependentes do ProductType */}
            {productType === 'AFFILIATE' ? (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Comissão Inicial USD *</Label>
                    <AgentHelp fieldKey="commission" fieldValue={commission} context={{ platform, vertical, geo }} onApply={setCommission} />
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 47.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Refund % Estimado</Label>
                    <AgentHelp fieldKey="refundPct" fieldValue={refundPct} context={{ platform, vertical }} onApply={setRefundPct} />
                  </div>
                  <Input
                    type="number"
                    value={refundPct}
                    onChange={(e: any) => setRefundPct(e?.target?.value ?? '')}
                    placeholder="Ex: 8"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">AOV do Funil (USD)</Label>
                    <AgentHelp fieldKey="aov" fieldValue={aov} onApply={setAov} />
                  </div>
                  <Input
                    type="number"
                    value={aov}
                    onChange={(e: any) => setAov(e?.target?.value ?? '')}
                    placeholder="Ex: 67.00"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Link de Afiliado (HopLink/Smartlink) *</Label>
                    <AgentHelp fieldKey="offerUrl" fieldValue={offerUrl} onApply={setOfferUrl} />
                  </div>
                  <Input
                    value={offerUrl}
                    onChange={(e: any) => setOfferUrl(e?.target?.value ?? '')}
                    placeholder="https://hop.clickbank.net/..."
                    className={inputCls}
                  />
                </div>
              </>
            ) : productType === 'PROPRIETARY_LOW_TICKET' ? (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Preço do Produto (R$ / USD) *</Label>
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 47.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">AOV Estimado (com Upsells)</Label>
                  </div>
                  <Input
                    type="number"
                    value={aov}
                    onChange={(e: any) => setAov(e?.target?.value ?? '')}
                    placeholder="Ex: 67.00"
                    className={inputCls}
                  />
                </div>
                {setCheckoutWebhook && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">URL do Webhook do Checkout</Label>
                    </div>
                    <Input
                      value={checkoutWebhook}
                      onChange={(e: any) => setCheckoutWebhook(e?.target?.value ?? '')}
                      placeholder="https://sua-plataforma-checkout.com/webhook..."
                      className={inputCls}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Label className="text-slate-300 text-xs font-medium">Preço da Mentoria *</Label>
                  </div>
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e: any) => setCommission(e?.target?.value ?? '')}
                    placeholder="Ex: 997.00"
                    className={inputCls}
                  />
                </div>
                {setLeadMagnet && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">Isca Digital / Recompensa</Label>
                    </div>
                    <Input
                      value={leadMagnet}
                      onChange={(e: any) => setLeadMagnet(e?.target?.value ?? '')}
                      placeholder="Ex: E-book PDF, Aula Grátis no YouTube"
                      className={inputCls}
                    />
                  </div>
                )}
                {setWhatsappLink && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Label className="text-slate-300 text-xs font-medium">Link de Redirecionamento do WhatsApp</Label>
                    </div>
                    <Input
                      value={whatsappLink}
                      onChange={(e: any) => setWhatsappLink(e?.target?.value ?? '')}
                      placeholder="https://wa.me/5511999999999?text=Quero%20saber%20mais..."
                      className={inputCls}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Ad Scout Oracle V2 Benchmarking Panel */}
      <Card className="bg-[#111827]/30 border-purple-500/20 shadow-lg">
        <CardHeader className="border-b border-purple-500/10 py-4 px-6 bg-gradient-to-r from-purple-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-400" />
              Ad Scout Oracle v2 — Análise de Concorrência
            </CardTitle>
            {scoutResult && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                Analisado: {scoutResult.query}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-slate-400">
            Varra a web por concorrentes ativos, copie os ângulos de headline e descubra as maiores dores de fóruns (Reddit/Quora).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <Label className="text-slate-300 text-xs font-medium">Palavra-chave ou Nicho para Pesquisa</Label>
              <Input
                value={scoutQuery}
                onChange={(e: any) => setScoutQuery(e?.target?.value ?? '')}
                placeholder="Ex: weight loss supplements, emagrecer rapido, etc."
                className="bg-[#0f172a] border-purple-500/30 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/10 mt-1.5"
                disabled={scoutLoading}
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs font-medium">Tipo de Varredura</Label>
              <Select
                value={scoutProductType}
                onValueChange={(v: ProductType) => setScoutProductType(v)}
                disabled={scoutLoading}
              >
                <SelectTrigger className="bg-[#0f172a] border-purple-500/30 text-white mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="AFFILIATE" className="text-white">Afiliado / Arbitragem</SelectItem>
                  <SelectItem value="PROPRIETARY_LOW_TICKET" className="text-white">Infoproduto Próprio</SelectItem>
                  <SelectItem value="MENTORSHIP" className="text-white">Mentoria / Alto Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={runAdScoutResearch}
            disabled={scoutLoading || !scoutQuery.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 w-full sm:w-auto text-xs font-semibold py-2.5 transition-all"
          >
            {scoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando com múltiplos agentes...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Disparar Ad Scout Oracle
              </>
            )}
          </Button>

          {scoutLoading && (
            <div className="space-y-2 mt-4 p-4 rounded-lg bg-purple-950/10 border border-purple-500/10">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-purple-300">{scoutStage}</span>
                <span className="animate-pulse text-purple-400">Varrendo web...</span>
              </div>
              <Progress className="h-2 bg-slate-900 overflow-hidden">
                <div className="h-full bg-purple-500 rounded animate-progressBar" />
              </Progress>
            </div>
          )}

          {/* Scout Results Rendering */}
          {scoutResult && (
            <div className="space-y-6 mt-6 pt-6 border-t border-[#334155]/40">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-[#0f172a]/60 border-[#334155] p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Anúncios Concorrentes</p>
                  <p className="text-xl font-bold text-white font-mono mt-1">{scoutResult.adCount}</p>
                </Card>
                <Card className="bg-[#0f172a]/60 border-[#334155] p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Preço Médio do Funil</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    ${typeof scoutResult.avgPrice === 'number' ? scoutResult.avgPrice.toFixed(2) : parseFloat(scoutResult.avgPrice || '0').toFixed(2)}
                  </p>
                </Card>
                <Card className="bg-[#0f172a]/60 border-[#334155] p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Concorrentes Diretos</p>
                  <p className="text-xl font-bold text-purple-400 font-mono mt-1">{scoutResult.competitors?.length || 0}</p>
                </Card>
                <Card className="bg-[#0f172a]/60 border-[#334155] p-3 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Claims de Alto Risco</p>
                  <p className="text-xl font-bold text-rose-500 font-mono mt-1">
                    {scoutResult.analyzedClaims?.filter((c: any) => c.riskLevel === 'HIGH' || c.riskLevel === 'ALTO')?.length || 0}
                  </p>
                </Card>
              </div>

              {/* Kill Switch Warning */}
              {(scoutResult.analyzedClaims?.filter((c: any) => c.riskLevel === 'HIGH' || c.riskLevel === 'ALTO')?.length || 0) > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3 shadow-inner">
                  <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider font-mono">
                      🚨 Kill Switch de Compliance Ativado
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      O Ad Scout mapeou claims proibidas de <strong>Alto Risco</strong> no mercado. O nosso compliance robot irá remover e mascarar estas declarações da pré-sell automaticamente para proteger sua conta do Google Ads contra bloqueios imediatos.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {scoutResult.analyzedClaims
                        .filter((c: any) => c.riskLevel === 'HIGH' || c.riskLevel === 'ALTO')
                        .map((c: any, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded border border-rose-500/20 font-mono">
                            <span className="text-rose-400 font-semibold uppercase text-[10px] block mb-1">Claim proibida de alto risco:</span>
                            "{c.claim}"
                            <p className="text-[10px] text-slate-500 mt-1">Fonte: {c.sourceCompetitor} — {c.justification}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Competitors List */}
              {scoutResult.competitors && scoutResult.competitors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Benchmarking de Concorrentes Mapeados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scoutResult.competitors.map((comp: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-[#334155]/60 flex flex-col justify-between gap-2 hover:border-purple-500/30 transition-all">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate">{comp.name}</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">${comp.price}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 italic">"{comp.angle}"</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#334155]/30">
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{comp.url}</span>
                          <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 flex items-center gap-1 hover:text-purple-300">
                            Espionar LP ➜
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audience Pain points */}
              {scoutResult.audiencePain && scoutResult.audiencePain.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Dores Sentimentais Mapeadas (Reddit / Fóruns)</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {scoutResult.audiencePain.map((pain: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded border border-[#334155]/40 text-xs text-slate-300">
                        <span className="text-purple-400 font-bold font-mono text-[10px] mt-0.5">#{idx + 1}</span>
                        <p className="leading-relaxed">{pain}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Angles Suggested */}
              {scoutResult.anglesSuggested && scoutResult.anglesSuggested.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Ângulos de Anúncio Sugeridos (Alta Conversão)</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {scoutResult.anglesSuggested.map((angle: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-emerald-500/5 p-2.5 rounded border border-emerald-500/10 text-xs text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{angle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4b. Injeção de conhecimento (YouTube / GitHub / LP concorrente) */}
      <KnowledgeInjector
        campaignId={campaignId}
        extraTags={[vertical, productType].filter(Boolean) as string[]}
      />

      {/* 5. Navigation Footer */}
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
          disabled={!name.trim() || (productType === 'AFFILIATE' && !offerUrl.trim())}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 gap-1.5 text-xs font-semibold py-2 transition-all shadow-md shadow-emerald-500/10"
        >
          Avançar para Break-even <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
