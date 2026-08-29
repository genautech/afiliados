'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Sparkles, Youtube, Globe, Code, AlertTriangle, 
  CheckCircle2, Info, ChevronRight, Eye, RefreshCw, FileText, Check 
} from 'lucide-react';
import { toast } from 'sonner';

interface Knowledge {
  id: string;
  sourceType: 'YOUTUBE_URL' | 'CONCORRENTE_URL' | 'SOURCE_CODE';
  sourceUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  refinedMetadata: any;
  createdAt: string;
  proposals?: Proposal[];
}

interface Proposal {
  id: string;
  explanation: string;
  proposedContent: any;
  proposedCustomCode: string | null;
  applied: boolean;
  createdAt: string;
}

interface KnowledgeInjectionPanelProps {
  campaignId: string | null;
  onProposalApplied?: () => void;
}

export function KnowledgeInjectionPanel({ campaignId, onProposalApplied }: KnowledgeInjectionPanelProps) {
  const [sourceType, setSourceType] = useState<'YOUTUBE_URL' | 'CONCORRENTE_URL' | 'SOURCE_CODE'>('YOUTUBE_URL');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Modais / Detalhamento
  const [activeDossier, setActiveDossier] = useState<Knowledge | null>(null);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [applyingProposalId, setApplyingProposalId] = useState<string | null>(null);

  // Buscar conhecimentos do banco
  const fetchKnowledges = async (silent = false) => {
    if (!campaignId) return;
    if (!silent) setLoadingList(true);
    try {
      const res = await fetch(`/api/knowledge/inject?campaignId=${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledges(data.knowledges || []);
      }
    } catch (e) {
      console.error('[knowledge-panel] Erro ao buscar conhecimentos:', e);
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  // Polling ativo se algum estiver processando
  useEffect(() => {
    fetchKnowledges();
  }, [campaignId]);

  useEffect(() => {
    const hasActiveProcessing = knowledges.some(
      k => k.status === 'PENDING' || k.status === 'PROCESSING'
    );
    if (!hasActiveProcessing) return;

    const interval = setInterval(() => {
      fetchKnowledges(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [knowledges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) {
      toast.error('Grave a campanha antes de injetar inteligência.');
      return;
    }

    if ((sourceType === 'YOUTUBE_URL' || sourceType === 'CONCORRENTE_URL') && !sourceUrl.trim()) {
      toast.error('Insira uma URL válida.');
      return;
    }

    if (sourceType === 'SOURCE_CODE' && !rawContent.trim()) {
      toast.error('Insira o texto bruto/código para processamento.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/knowledge/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceUrl: sourceType !== 'SOURCE_CODE' ? sourceUrl : undefined,
          rawContent: sourceType === 'SOURCE_CODE' ? rawContent : undefined,
          campaignId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast.success('Ingestão iniciada! A IA está processando em background.');
      setSourceUrl('');
      setRawContent('');
      fetchKnowledges();
    } catch (error: any) {
      console.error(error);
      toast.error(`Falha ao injetar inteligência: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyProposal = async (proposalId: string) => {
    setApplyingProposalId(proposalId);
    try {
      const res = await fetch('/api/knowledge/apply-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao aplicar proposta.');
      }

      toast.success('Dossiê aplicado! Copy adaptada e HTML regenerado com sucesso.');
      setActiveProposal(null);
      if (onProposalApplied) onProposalApplied();
      fetchKnowledges();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao aplicar: ${error.message}`);
    } finally {
      setApplyingProposalId(null);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'YOUTUBE_URL': return <Youtube className="h-4 w-4 text-rose-500" />;
      case 'CONCORRENTE_URL': return <Globe className="h-4 w-4 text-sky-500" />;
      default: return <Code className="h-4 w-4 text-purple-500" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'YOUTUBE_URL': return 'Vídeo do YouTube';
      case 'CONCORRENTE_URL': return 'Página Concorrente';
      default: return 'Código/Texto Bruto';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Fila</Badge>;
      case 'PROCESSING':
        return (
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 gap-1 animate-pulse">
            <Loader2 className="h-2.5 w-2.5 animate-spin" /> Extraindo & Analisando
          </Badge>
        );
      case 'COMPLETED':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Processado</Badge>;
      default:
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Falhou</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Card para Inserção */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Injetar Conhecimento (Dossiê IA)
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Injete inteligência real (transcrições de VSLs, LPs concorrentes ou textos) para refinar sua Pre-sell automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tipo de Inteligência</Label>
                <Select 
                  value={sourceType} 
                  onValueChange={(v) => setSourceType(v as any)}
                >
                  <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#334155] text-white text-xs">
                    <SelectItem value="YOUTUBE_URL" className="text-xs">Legendas YouTube (Real)</SelectItem>
                    <SelectItem value="CONCORRENTE_URL" className="text-xs">Landing Page Concorrente</SelectItem>
                    <SelectItem value="SOURCE_CODE" className="text-xs">Código-Fonte ou Cópia Bruta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sourceType !== 'SOURCE_CODE' ? (
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-slate-300">
                    {sourceType === 'YOUTUBE_URL' ? 'URL do Vídeo (YouTube)' : 'URL da Landing Page'}
                  </Label>
                  <Input
                    className="bg-[#0f172a] border-[#334155] text-white h-9 text-xs"
                    placeholder={sourceType === 'YOUTUBE_URL' ? 'https://www.youtube.com/watch?v=...' : 'https://exemplo.com/produto'}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              ) : (
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-slate-300">Código-Fonte HTML ou Texto de Apoio</Label>
                  <Textarea
                    className="bg-[#0f172a] border-[#334155] text-white min-h-[36px] max-h-[150px] text-xs py-1.5"
                    placeholder="Cole aqui o texto da VSL, código-fonte da página concorrente, etc."
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Injetando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Injetar & Gerar Melhorias
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Listagem dos Conhecimentos Injetados */}
      {knowledges.length > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-xs font-semibold">
              Histórico de Inteligência Injetada ({knowledges.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchKnowledges()}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#334155]">
              {knowledges.map((k) => (
                <div key={k.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-[#0f172a] rounded border border-[#334155]">
                      {getSourceIcon(k.sourceType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium truncate max-w-[240px] md:max-w-[400px]">
                        {k.refinedMetadata?.title || k.sourceUrl || getSourceLabel(k.sourceType)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Injetado em {new Date(k.createdAt).toLocaleDateString('pt-BR')} às {new Date(k.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(k.status)}

                    {k.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveDossier(k)}
                          className="h-7 px-2 border-[#334155] text-slate-300 hover:text-white bg-[#0f172a] text-[11px] gap-1"
                        >
                          <Eye className="h-3 w-3" /> Dossiê
                        </Button>

                        {k.proposals && k.proposals.length > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setActiveProposal(k.proposals![0])}
                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1"
                          >
                            {k.proposals[0].applied ? (
                              <>
                                <Check className="h-3 w-3" /> Aplicado
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" /> Ver Ajuste
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {k.status === 'FAILED' && k.errorMessage && (
                      <Badge 
                        className="bg-rose-500/10 text-rose-400 border-rose-500/20 max-w-[150px] truncate cursor-pointer"
                        title={k.errorMessage}
                        onClick={() => toast.error(k.errorMessage || 'Erro desconhecido')}
                      >
                        Erro: {k.errorMessage}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Modal de Visualização de Dossiê de Insights */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-white">
            <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a] rounded-t-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">Dossiê de Marketing Refinado</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveDossier(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Título de Inteligência</h4>
                <p className="text-emerald-400 text-sm font-medium mt-1">{activeDossier.refinedMetadata?.title}</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Gancho Central / Headline</h4>
                <div className="bg-[#0f172a] p-3 rounded border border-[#334155] mt-1 italic text-slate-100 font-medium">
                  "{activeDossier.refinedMetadata?.headline}"
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1.5">Dores Mapeadas</h4>
                  <ul className="space-y-1 bg-[#0f172a]/40 p-2.5 rounded border border-[#334155]">
                    {activeDossier.refinedMetadata?.dores?.map((d: string, i: number) => (
                      <li key={i} className="flex gap-1.5 items-start text-slate-300">
                        <span className="text-rose-400">💔</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1.5">Desejos Inconscientes</h4>
                  <ul className="space-y-1 bg-[#0f172a]/40 p-2.5 rounded border border-[#334155]">
                    {activeDossier.refinedMetadata?.desejos?.map((d: string, i: number) => (
                      <li key={i} className="flex gap-1.5 items-start text-slate-300">
                        <span className="text-emerald-400">✨</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1.5">Objeções de Vendas</h4>
                  <ul className="space-y-1 bg-[#0f172a]/40 p-2.5 rounded border border-[#334155]">
                    {activeDossier.refinedMetadata?.objecoes?.map((o: string, i: number) => (
                      <li key={i} className="flex gap-1.5 items-start text-slate-300">
                        <span className="text-amber-400">🛡️</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1.5">Ângulos de Conversão</h4>
                  <ul className="space-y-1 bg-[#0f172a]/40 p-2.5 rounded border border-[#334155]">
                    {activeDossier.refinedMetadata?.angulos?.map((a: string, i: number) => (
                      <li key={i} className="flex gap-1.5 items-start text-slate-300">
                        <span className="text-purple-400">📐</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1.5">Frases de Alto Impacto</h4>
                <div className="space-y-2">
                  {activeDossier.refinedMetadata?.frases_chave?.map((f: string, i: number) => (
                    <div key={i} className="bg-[#0f172a] p-2 rounded border border-[#334155] text-slate-300">
                      "{f}"
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#334155] flex justify-between bg-[#0f172a] rounded-b-lg">
              <span className="text-[10px] text-slate-400 self-center">Salvo localmente no Obsidian Vault</span>
              <Button size="sm" onClick={() => setActiveDossier(null)} className="bg-slate-700 hover:bg-slate-600 h-8 text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal de Comparação e Aplicação de Proposta */}
      {activeProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-white">
            <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0f172a] rounded-t-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">Proposta de Otimização de Copy (IA)</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveProposal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-[#0f172a] p-3.5 rounded border border-[#334155]">
                <h4 className="font-semibold text-emerald-400 text-xs mb-1">Motivação & Explicação da IA</h4>
                <p className="text-slate-300 leading-relaxed italic">"{activeProposal.explanation}"</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-2">Comparações Visuais de Copy</h4>
                
                <div className="space-y-3">
                  <div className="border border-[#334155] rounded overflow-hidden">
                    <div className="bg-[#0f172a] px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase border-b border-[#334155]">
                      Nova Headline Recomendada (Google Ads Compliant)
                    </div>
                    <div className="p-3 bg-emerald-950/15 text-emerald-400 font-medium text-sm">
                      {activeProposal.proposedContent?.headline}
                    </div>
                  </div>

                  <div className="border border-[#334155] rounded overflow-hidden">
                    <div className="bg-[#0f172a] px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase border-b border-[#334155]">
                      Texto de Abertura Proposto
                    </div>
                    <div className="p-3 text-slate-300 leading-relaxed whitespace-pre-line">
                      {activeProposal.proposedContent?.abertura}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border border-[#334155] rounded overflow-hidden">
                      <div className="bg-[#0f172a] px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase border-b border-[#334155]">
                        Prós (Consistentes)
                      </div>
                      <div className="p-2.5 bg-slate-900 space-y-1">
                        {activeProposal.proposedContent?.pros?.map((p: string, idx: number) => (
                          <div key={idx} className="flex gap-1.5 text-slate-300">
                            <span className="text-emerald-500">✓</span> {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-[#334155] rounded overflow-hidden">
                      <div className="bg-[#0f172a] px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase border-b border-[#334155]">
                        Contras Sinceros (Gera Confiança)
                      </div>
                      <div className="p-2.5 bg-slate-900 space-y-1">
                        {activeProposal.proposedContent?.contras?.map((c: string, idx: number) => (
                          <div key={idx} className="flex gap-1.5 text-slate-300">
                            <span className="text-amber-500">⚠</span> {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {activeProposal.proposedCustomCode && (
                    <div className="border border-[#334155] rounded overflow-hidden">
                      <div className="bg-[#0f172a] px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase border-b border-[#334155]">
                        Estilo CSS Customizado Adicional
                      </div>
                      <pre className="p-2.5 bg-[#0f172a] text-slate-400 font-mono text-[10px] overflow-x-auto max-h-[100px]">
                        {activeProposal.proposedCustomCode}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#334155] flex justify-between bg-[#0f172a] rounded-b-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveProposal(null)}
                className="border-[#334155] text-slate-300 hover:text-white bg-slate-800"
              >
                Voltar
              </Button>

              <Button
                size="sm"
                onClick={() => handleApplyProposal(activeProposal.id)}
                disabled={applyingProposalId === activeProposal.id || activeProposal.applied}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {applyingProposalId === activeProposal.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Aplicando...
                  </>
                ) : activeProposal.applied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Proposta Já Aplicada
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aplicar ao Pre-sell Atual
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
