'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Rocket, Loader2, ShieldCheck, Save, ArrowLeft, ArrowRight, Zap, Play, CheckCircle2, AlertTriangle, Terminal, Eye, HelpCircle,
  Package, Download, CreditCard, FileArchive
} from 'lucide-react';
import { AgentHelp, ChecklistItemRow } from './agent-help';
import { GOLIVE_CHECKLIST } from '@/lib/wizard-data';
import { useRouter } from 'next/navigation';
import { LaunchChannelsPanel } from './launch-channels';

/** Espelha o deploy_summary escrito por scripts/deploy_product.py no manifest.json. */
interface DeploySummary {
  status?: string;
  deployed_at?: string;
  landing_page_zip?: string;
  ebook_pdf?: string;
  ebook_html?: string;
  payment_integration?: {
    platform?: string;
    checkout_url?: string;
    webhook_url?: string;
  };
}

const DEPLOY_STAGES = [
  'Formatando o e-book em HTML responsivo...',
  'Renderizando o PDF final...',
  'Empacotando a landing page em .zip...',
  'Conectando o checkout e o webhook...',
];

/** Só vira link o que for http(s); o resto é caminho local do worker. */
function isHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface StepLaunchProps {
  campaignId: string | null;
  campaignNameGen: string;
  name: string;
  platform: string;
  vertical: string;
  geo: string;
  channel: string;
  funnel: string;
  commVal: number;
  cpcMax: number;
  selectedKeywords: any[];
  sourceProductResearchId?: string | null;

  budgetTest: string;
  setBudgetTest: (v: string) => void;
  testDuration: string;
  setTestDuration: (v: string) => void;
  budgetDaily: number;
  budgetScale: string;
  setBudgetScale: (v: string) => void;

  goLiveChecks: Record<string, boolean>;
  setGoLiveChecks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  checklistMeta: Record<string, any>;
  setChecklistMeta: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  loopEnabled: boolean;
  setLoopEnabled: (v: boolean) => void;
  loopInterval: string;
  setLoopInterval: (v: string) => void;
  loopAgents: string;
  setLoopAgents: (v: string) => void;

  verifyingChecklist: boolean;
  runChecklistVerify: (targetId?: string) => Promise<any>;
  fixChecklistItem: (step: number, itemKey: string) => Promise<any>;

  onPrev: () => void;
  saveCampaign: () => Promise<string | null>;
  canAdvance: (freshChecks?: Record<number, Record<string, boolean>> | null) => boolean;
}

export function StepLaunch({
  campaignId,
  campaignNameGen,
  name,
  platform,
  vertical,
  geo,
  channel,
  funnel,
  commVal,
  cpcMax,
  selectedKeywords,
  sourceProductResearchId,

  budgetTest,
  setBudgetTest,
  testDuration,
  setTestDuration,
  budgetDaily,
  budgetScale,
  setBudgetScale,

  goLiveChecks,
  setGoLiveChecks,
  checklistMeta,
  setChecklistMeta,

  loopEnabled,
  setLoopEnabled,
  loopInterval,
  setLoopInterval,
  loopAgents,
  setLoopAgents,

  verifyingChecklist,
  runChecklistVerify,
  fixChecklistItem,

  onPrev,
  saveCampaign,
  canAdvance
}: StepLaunchProps) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployStage, setDeployStage] = useState(0);
  const [deployResult, setDeployResult] = useState<DeploySummary | null>(null);
  const [launchLogs, setLaunchLogs] = useState<string[]>([]);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState(false);
  // Bump depois de cada execução, para o painel por canal reidratar do banco.
  const [launchRefresh, setLaunchRefresh] = useState(0);
  const [isMockMode, setIsMockMode] = useState(true); // default true for safety & budget protection
  const [bypassReadiness, setBypassReadiness] = useState(false);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [launchLogs]);

  // Apply enum helpers
  const applyEnumIfValid = (options: readonly string[], setter: (v: any) => void, label: string) => {
    return (v: string) => {
      if (options.includes(v)) {
        setter(v);
      } else {
        toast.error(`Sugestão do agente não é uma opção válida para ${label}.`);
      }
    };
  };

  const handleLaunchCampaign = async () => {
    const savedId = await saveCampaign();
    if (!savedId) return;

    setLaunching(true);
    setLaunchError(null);
    setLaunchSuccess(false);
    setLaunchLogs([`Iniciando verificação de pré-lançamento...`]);

    try {
      // 1. Run final fresh checklist verification
      const freshChecks = await runChecklistVerify(savedId);
      if (!freshChecks) {
        throw new Error('Falha ao verificar os checklists finais.');
      }

      if (!canAdvance(freshChecks)) {
        throw new Error('A verificação final encontrou item(ns) crítico(s) pendente(s). Por favor, corrija os erros do checklist antes de prosseguir.');
      }

      // 2. Save Selected Keywords to database
      const kws = selectedKeywords.filter(k => k.selected);
      if (kws.length > 0) {
        setLaunchLogs(prev => [...prev, `Salvando ${kws.length} palavras-chave selecionadas...`]);
        const keywordResponse = await fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: kws.map(k => ({
              ...k,
              relevanceScore: k.relevance,
              campaignId: savedId,
              isSelected: true
            }))
          }),
        });
        if (!keywordResponse.ok) {
          throw new Error('Erro ao salvar as palavras-chave no banco de dados.');
        }
      }

      // 3. Trigger unified launch saga
      const idempotencyKey = `launch-idemp-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      setLaunchLogs(prev => [
        ...prev,
        `Requisitando execução do saga transacional...`,
        `Idempotency Key gerada: ${idempotencyKey}`,
        `Modo Simulação (Mock): ${isMockMode ? 'ATIVADO ✅' : 'DESATIVADO ⚠️'}`
      ]);

      const res = await fetch(`/api/campaigns/${savedId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          isMockMode,
          bypassReadiness
        })
      });

      const data = await res.json();
      
      if (data.logs && data.logs.length > 0) {
        setLaunchLogs(prev => [...prev, ...data.logs]);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro durante a execução do saga de lançamento.');
      }

      setLaunchSuccess(true);
      toast.success('Campanha lançada com sucesso via Saga Multicanal!');

    } catch (err: any) {
      setLaunchError(err.message || 'Ocorreu um erro inesperado.');
      toast.error(err.message || 'Falha no lançamento.');
    } finally {
      setLaunching(false);
      setLaunchRefresh(n => n + 1);
    }
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white focus:ring-green-500 focus:border-green-500 placeholder-slate-500";

  useEffect(() => {
    if (!deploying) { setDeployStage(0); return; }
    const timer = setInterval(() => setDeployStage((i) => (i + 1) % DEPLOY_STAGES.length), 1500);
    return () => clearInterval(timer);
  }, [deploying]);

  const handleDeployProduct = async () => {
    if (!campaignId) { toast.error('Salve a campanha antes de lançar o produto.'); return; }
    setDeploying(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deploy`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.status === 404 && !data?.error) {
        toast.error('A rota POST /api/campaigns/:id/deploy ainda não existe no app.');
        return;
      }
      if (!res.ok) {
        toast.error(data?.error || `Empacotamento falhou (HTTP ${res.status}).`);
        return;
      }
      const summary = (data?.deploy ?? data) as DeploySummary;
      if (!summary || typeof summary !== 'object') {
        toast.error('O deploy respondeu 200 sem o resumo dos artefatos.');
        return;
      }
      setDeployResult(summary);
      toast.success('Produto empacotado: PDF, zip da landing e checkout prontos.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao chamar o deploy.');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER E BARRA DE FERRAMENTAS */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Rocket className="h-6 w-6 text-green-400" /> Go-live & Lançamento Multicanal
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void runChecklistVerify()}
            disabled={verifyingChecklist || launching || !campaignId}
            className="border-[#334155] text-slate-300 gap-1.5"
          >
            {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Re-verificar checklist agora
          </Button>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DA SAGA DE LANÇAMENTO */}
      {launching || launchLogs.length > 0 ? (
        <Card className="bg-[#0b0f19] border-emerald-500/20 overflow-hidden">
          <div className="bg-[#111827] px-4 py-2 border-b border-emerald-500/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" /> MONITOR DE AUDITORIA DE SAGA (SAGA CONSOLE)
            </span>
            <div className="flex items-center gap-2">
              {launching && <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] animate-pulse">PROCESSANDO SAGA</Badge>}
              {launchSuccess && <Badge className="bg-green-500/20 text-green-400 text-[10px]">SUCESSO</Badge>}
              {launchError && <Badge className="bg-red-500/20 text-red-400 text-[10px]">REPROVADO</Badge>}
            </div>
          </div>
          <CardContent className="p-4 space-y-4">
            {/* Terminal logs */}
            <div className="bg-[#090d16] border border-emerald-950 rounded-lg p-4 font-mono text-xs text-emerald-300 h-64 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-950">
              {launchLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all">
                  <span className="text-emerald-600 mr-2">[{new Date().toLocaleTimeString('pt-BR')}]</span>
                  {log.startsWith('Error') || log.includes('error') || log.includes('bloqueou') ? (
                    <span className="text-red-400 font-semibold">{log}</span>
                  ) : log.includes('sucessfully') || log.includes('aprovado') || log.includes('sucesso') ? (
                    <span className="text-green-400 font-semibold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Error or Success box */}
            {launchError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-300">Falha no Lançamento de Campanha</h4>
                  <p className="text-xs text-red-400/90 leading-relaxed">{launchError}</p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    A Saga transacional de lançamento garante idempotência. Corrija o problema (como regras de claims de compliance no editor de criativos ou URL de pre-sell) e tente novamente para continuar do último checkpoint bem-sucedido.
                  </p>
                </div>
              </div>
            )}

            {launchSuccess && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-green-300">Campanha Lançada com Sucesso Total!</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sua campanha foi integrada com os endpoints síncronos e está pronta para rodar. Todos os checkpoints foram concluídos sem erros de compliance de Claim Gates.
                  </p>
                  <div className="flex gap-2 mt-3 pt-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        if (sourceProductResearchId) {
                          router.push(`/trend-lab?campaignId=${campaignId}&productResearchId=${sourceProductResearchId}`);
                        } else {
                          router.push('/campanhas');
                        }
                      }}
                    >
                      Ir para Gerenciamento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#334155] text-slate-300"
                      onClick={() => {
                        setLaunchLogs([]);
                        setLaunchSuccess(false);
                        setLaunchError(null);
                      }}
                    >
                      Voltar ao Painel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <LaunchChannelsPanel
        campaignId={campaignId}
        isMockMode={isMockMode}
        bypassReadiness={bypassReadiness}
        refreshToken={launchRefresh}
      />

      {/* ETAPAS DE CONFIGURAÇÃO DE BUDGET */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Teste */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-400" /> Etapa 1 — Período de Teste Inicial
            </h3>
            <Badge className="bg-blue-500/15 text-blue-400 text-[10px]">Obrigatório</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-xs text-slate-300">Orçamento Total (USD)</Label>
                <AgentHelp fieldKey="budgetTest" fieldValue={budgetTest} context={{ commission: commVal }} onApply={setBudgetTest} />
              </div>
              <Input
                type="number"
                value={budgetTest}
                onChange={(e: any) => setBudgetTest(e?.target?.value ?? '50')}
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Label className="text-xs text-slate-300">Duração do Teste</Label>
                <AgentHelp fieldKey="testDuration" fieldValue={testDuration} onApply={applyEnumIfValid(['48h', '72h', '5', '7'], setTestDuration, 'Duração do Teste')} />
              </div>
              <Select value={testDuration} onValueChange={setTestDuration}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="48h" className="text-white">48h (Rápido)</SelectItem>
                  <SelectItem value="72h" className="text-white">72h (Ideal)</SelectItem>
                  <SelectItem value="5" className="text-white">5 dias</SelectItem>
                  <SelectItem value="7" className="text-white">7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-2 border-t border-blue-500/10 flex justify-between items-center text-xs">
            <span className="text-slate-400">Orçamento Diário de Teste:</span>
            <strong className="text-base font-mono text-emerald-400">${budgetDaily?.toFixed?.(2)}/dia</strong>
          </div>
        </div>

        {/* Budget Scale */}
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-400" /> Etapa 2 — Escala e Otimização
            </h3>
            <Badge className="bg-purple-500/15 text-purple-400 text-[10px]">Opcional</Badge>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Label className="text-xs text-slate-300">Orçamento Diário para Escala (USD)</Label>
              <AgentHelp fieldKey="budgetScale" fieldValue={budgetScale} context={{ budgetTest: parseFloat(budgetTest) || 50, commission: commVal }} onApply={setBudgetScale} />
            </div>
            <Input
              type="number"
              value={budgetScale}
              onChange={(e: any) => setBudgetScale(e?.target?.value ?? '0')}
              placeholder="Ex.: 150"
              className={inputCls}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Só será aplicado quando você confirmar a decisão <strong className="text-purple-300">Scale</strong> na página de gerenciamento de campanhas. Deixe 0 para preencher depois.
          </p>
        </div>
      </div>

      {/* MOCK MODE & MUTATION GUARDS PROTECTION */}
      <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]/40 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Proteção de Orçamento & Modo Simulado (Mock Mode)
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              Para evitar faturas indesejadas em contas de anúncios em produção, o lançamento pode simular a criação de campanhas no Google Ads e Meta Ads sem realizar chamadas de mutação de escrita reais.
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">MUTATION GUARD ATIVO</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="flex items-start gap-2.5 bg-[#141b2e] p-3 rounded border border-[#27355c]/30">
            <Checkbox
              id="mock-mode-checkbox"
              checked={isMockMode}
              onCheckedChange={(v: any) => setIsMockMode(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-0.5 cursor-pointer">
              <Label htmlFor="mock-mode-checkbox" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Habilitar Modo Simulado (Mock Mode)
              </Label>
              <p className="text-[10px] text-slate-400 leading-normal">
                Gera campanhas fictícias com logs simulados 100% síncronos na saga. Extremamente seguro para desenvolvimento.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-[#1a131b] p-3 rounded border border-[#4d232a]/30">
            <Checkbox
              id="bypass-readiness-checkbox"
              checked={bypassReadiness}
              onCheckedChange={(v: any) => setBypassReadiness(!!v)}
              className="mt-0.5 text-red-500 border-red-900/40"
            />
            <div className="space-y-0.5 cursor-pointer">
              <Label htmlFor="bypass-readiness-checkbox" className="text-xs font-semibold text-red-300 cursor-pointer flex items-center gap-1">
                Forçar Bypass de Readiness <AlertTriangle className="h-3 w-3 text-red-400" />
              </Label>
              <p className="text-[10px] text-slate-400 leading-normal">
                Pula as checagens de integridade estrutural e de contas no Google Ads. <strong className="text-red-400/90 font-medium">Nota: O Claim Gate de compliance não é afetado por este bypass.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKLISTS GOLIVE */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="h-4.5 w-4.5 text-slate-400" /> Checklist Final de Segurança
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {GOLIVE_CHECKLIST.map(item => (
            <ChecklistItemRow
              key={item.key}
              item={item}
              checked={goLiveChecks[item.key] ?? false}
              onToggle={(v) => setGoLiveChecks(prev => ({ ...prev, [item.key]: v }))}
              meta={checklistMeta[item.key]}
              step={9}
              onFix={fixChecklistItem}
            />
          ))}
        </div>
      </div>

      {/* LOOP SETUP CARD */}
      <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]/40 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" /> Loop de Monitoramento Contínuo dos Agentes
          </h3>
          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">RECOMENDADO</Badge>
        </div>
        
        <p className="text-xs text-slate-400 leading-relaxed">
          Após o lançamento bem-sucedido, o sistema de Schedulers do AfiliAds pode acionar periodicamente os agentes para auditar lances (Paid Ads Agent) e compliance na página de destino (Compliance Sentinel).
        </p>

        <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/30">
          <Checkbox
            id="wizard-loop-enabled"
            checked={loopEnabled}
            onCheckedChange={(v: any) => setLoopEnabled(!!v)}
          />
          <Label htmlFor="wizard-loop-enabled" className="text-sm text-slate-300 cursor-pointer select-none font-medium">
            Ativar automação do loop para esta campanha
          </Label>
        </div>

        {loopEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-400">Frequência de Atualização</Label>
              <Select value={loopInterval} onValueChange={setLoopInterval}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">
                  <SelectItem value="12h" className="text-white">A cada 12h</SelectItem>
                  <SelectItem value="24h" className="text-white">A cada 24h (Sugerido)</SelectItem>
                  <SelectItem value="48h" className="text-white">A cada 48h (Alta economia de tokens)</SelectItem>
                  <SelectItem value="72h" className="text-white">A cada 72h</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-400 font-medium mb-1.5 block">Agentes a Rodar no Loop</Label>
              <div className="space-y-2 bg-[#1e293b]/40 p-2.5 rounded border border-[#334155]/30">
                <div className="flex items-center gap-2">
                  <Checkbox id="agent-ads" checked={loopAgents.includes('ads')} onCheckedChange={(v: any) => {
                    const updated = v 
                      ? (loopAgents.includes('ads') ? loopAgents : (loopAgents ? `${loopAgents},ads` : 'ads'))
                      : loopAgents.split(',').filter(a => a !== 'ads').join(',');
                    setLoopAgents(updated);
                  }} />
                  <Label htmlFor="agent-ads" className="text-xs text-slate-300 cursor-pointer">Paid Ads Agent (Monitor de CPC)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="agent-compliance" checked={loopAgents.includes('compliance')} onCheckedChange={(v: any) => {
                    const updated = v 
                      ? (loopAgents.includes('compliance') ? loopAgents : (loopAgents ? `${loopAgents},compliance` : 'compliance'))
                      : loopAgents.split(',').filter(a => a !== 'compliance').join(',');
                    setLoopAgents(updated);
                  }} />
                  <Label htmlFor="agent-compliance" className="text-xs text-slate-300 cursor-pointer">Compliance Sentinel (Monitor de Pre-sell)</Label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EMPACOTAMENTO DO PRODUTO (e-book + landing) */}
      <Card className="bg-[#0b0f19] border-amber-500/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-400" /> Empacotamento do produto
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gera o PDF do e-book, o .zip estático da landing e o checkout. Roda sobre a versão
                aprovada no passo 6 — não sobre o rascunho.
              </p>
            </div>
            <Button
              onClick={handleDeployProduct}
              disabled={deploying || !campaignId}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold px-6 py-5 rounded-lg text-sm shadow-lg shadow-amber-900/20 disabled:opacity-40"
            >
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Empacotando...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Lançar Produto
                </>
              )}
            </Button>
          </div>

          {deploying && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-200 font-mono flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                {DEPLOY_STAGES[deployStage]}
              </p>
              <div className="mt-2 flex gap-1">
                {DEPLOY_STAGES.map((stage, i) => (
                  <span
                    key={stage}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= deployStage ? 'bg-amber-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {deployResult && !deploying && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] hover:bg-emerald-500/25">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {deployResult.status || 'empacotado'}
                </Badge>
                {deployResult.deployed_at && (
                  <span className="text-[11px] text-slate-500">em {deployResult.deployed_at}</span>
                )}
              </div>

              {deployResult.payment_integration?.checkout_url && (
                <div className="rounded-lg border border-[#334155] bg-[#0f172a] p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    <CreditCard className="h-3 w-3" />
                    Checkout {deployResult.payment_integration.platform || 'Kiwify'} (simulado)
                  </p>
                  {isHttpUrl(deployResult.payment_integration.checkout_url) ? (
                    <a
                      href={deployResult.payment_integration.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-emerald-400 hover:text-emerald-300 break-all underline underline-offset-2"
                    >
                      {deployResult.payment_integration.checkout_url}
                    </a>
                  ) : (
                    <code className="text-sm font-mono text-slate-300 break-all">
                      {deployResult.payment_integration.checkout_url}
                    </code>
                  )}
                  {deployResult.payment_integration.webhook_url && (
                    <p className="text-[11px] text-slate-500 break-all">
                      webhook: <code className="font-mono">{deployResult.payment_integration.webhook_url}</code>
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { label: 'E-book (PDF)', value: deployResult.ebook_pdf, icon: Download },
                  { label: 'E-book (HTML)', value: deployResult.ebook_html, icon: Eye },
                  { label: 'Landing (.zip)', value: deployResult.landing_page_zip, icon: FileArchive },
                ] as const).map(({ label, value, icon: Icon }) =>
                  value ? (
                    <div key={label} className="rounded-lg border border-[#334155] bg-[#0f172a] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                        <Icon className="h-3 w-3" /> {label}
                      </p>
                      {isHttpUrl(value) ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-sky-400 hover:text-sky-300 break-all underline underline-offset-2"
                        >
                          baixar
                        </a>
                      ) : (
                        <code className="text-[11px] font-mono text-slate-400 break-all block mt-1">{value}</code>
                      )}
                    </div>
                  ) : null,
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Caminho local significa artefato no disco do worker: para virar download no browser é
                preciso uma rota que sirva o arquivo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RESUMO DA CAMPANHA */}
      <Card className="bg-[#0f172a] border-[#334155]">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Resumo da Configuração</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-slate-400 block mb-0.5">Nome da Campanha:</span> <span className="text-white font-mono break-all font-semibold">{name || campaignNameGen}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Plataforma:</span> <span className="text-white font-semibold">{platform}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Vertical:</span> <span className="text-white font-semibold">{vertical}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Geo:</span> <span className="text-white font-semibold">{geo}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Canal / Funil:</span> <span className="text-white font-semibold">{channel} / {funnel}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Comissão:</span> <span className="text-green-400 font-semibold">${commVal}</span></div>
            <div><span className="text-slate-400 block mb-0.5">CPC Máximo:</span> <span className="text-yellow-400 font-semibold">${cpcMax?.toFixed?.(4)}</span></div>
            <div><span className="text-slate-400 block mb-0.5">Keywords Ativas:</span> <span className="text-white font-semibold">{selectedKeywords.filter(k => k.selected).length}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* BOTÕES DE NAVEGAÇÃO DE FLUXO */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onPrev} disabled={launching} className="border-[#334155] text-slate-300 gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          onClick={handleLaunchCampaign}
          disabled={launching || verifyingChecklist}
          className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold px-6 py-5 rounded-lg text-sm shadow-lg shadow-green-900/20"
        >
          {launching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processando Saga...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 animate-emerald-300" /> Lançar Campanha Multicanal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
