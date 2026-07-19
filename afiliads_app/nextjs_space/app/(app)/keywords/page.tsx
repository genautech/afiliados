'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Plus, Trash2, Copy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { KEYWORDS_BY_VERTICAL, NEGATIVES_BY_VERTICAL } from '@/lib/wizard-data';

const layerLabels: Record<string, string> = { A: 'Problema', B: 'Solução', C: 'Comparação', D: 'Comercial' };
const layerColors: Record<string, string> = { A: 'bg-blue-500/20 text-blue-400', B: 'bg-green-500/20 text-green-400', C: 'bg-yellow-500/20 text-yellow-400', D: 'bg-purple-500/20 text-purple-400' };

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVertical, setSelectedVertical] = useState('Weight Loss');
  const [newKw, setNewKw] = useState('');
  const [newLayer, setNewLayer] = useState('A');
  const [newMatch, setNewMatch] = useState('phrase');

  const loadKeywords = () => {
    setLoading(true);
    fetch('/api/keywords').then(r => r.json()).then(d => setKeywords(d ?? [])).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { loadKeywords(); }, []);

  const addKeyword = async () => {
    if (!newKw.trim()) return;
    try {
      await fetch('/api/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKw.trim(), layer: newLayer, matchType: newMatch }),
      });
      toast.success('Keyword adicionada');
      setNewKw('');
      loadKeywords();
    } catch { toast.error('Erro'); }
  };

  const deleteKeyword = async (id: string) => {
    try {
      await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
      loadKeywords();
    } catch { toast.error('Erro'); }
  };

  const toggleNegativa = async (kw: any) => {
    const status = kw?.status === 'negativa' ? 'ativa' : 'negativa';
    try {
      await fetch(`/api/keywords/${kw?.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'negativa' ? 'Marcada como negativa' : 'Reativada');
      loadKeywords();
    } catch { toast.error('Erro'); }
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-400" /> Pesquisa de Keywords
        </h1>
        <p className="text-slate-400 text-sm mt-1">Pesquise, organize e gerencie suas keywords</p>
      </div>

      {/* Ferramentas de Pesquisa */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Ferramentas de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="/pesquisa-keywords" className="block">
              <div className="bg-[#0f172a] rounded-lg p-4 text-center hover:bg-[#0f172a]/80 transition-all border border-[#334155] hover:border-green-500/30">
                <ExternalLink className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-white font-medium">Answer The Public</p>
                <p className="text-xs text-slate-500 mt-1">Pesquisa integrada via API (créditos)</p>
              </div>
            </a>
            <span className="block cursor-pointer" onClick={() => window.open(`https://trends.google.com/trends/explore?q=${encodeURIComponent(selectedVertical)}`, '_blank')}>
              <div className="bg-[#0f172a] rounded-lg p-4 text-center hover:bg-[#0f172a]/80 transition-all border border-[#334155] hover:border-blue-500/30">
                <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-white font-medium">Google Trends</p>
                <p className="text-xs text-slate-500 mt-1">Tendências e sazonalidade</p>
              </div>
            </span>
            <a href="https://ads.google.com/aw/keywordplanner/home" target="_blank" rel="noopener" className="block">
              <div className="bg-[#0f172a] rounded-lg p-4 text-center hover:bg-[#0f172a]/80 transition-all border border-[#334155] hover:border-yellow-500/30">
                <Search className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-white font-medium">Keyword Planner</p>
                <p className="text-xs text-slate-500 mt-1">Volume e CPC estimado</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sugestões por Vertical */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Sugestões por Vertical</CardTitle>
            <Select value={selectedVertical} onValueChange={setSelectedVertical}>
              <SelectTrigger className={`w-48 ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                {Object.keys(KEYWORDS_BY_VERTICAL).map(v => <SelectItem key={v} value={v} className="text-white">{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['A','B','C','D'].map(layer => (
              <div key={layer}>
                <Badge className={`mb-2 ${layerColors[layer]}`}>Camada {layer} — {layerLabels[layer]}</Badge>
                <div className="flex flex-wrap gap-2">
                  {(KEYWORDS_BY_VERTICAL[selectedVertical]?.[layer] ?? []).map((kw: string) => (
                    <span key={kw} className="text-xs px-3 py-1.5 rounded-full bg-[#0f172a] text-slate-300 border border-[#334155]">{kw}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Negativas */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Negativas — {selectedVertical}</CardTitle>
            <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1" onClick={() => { navigator?.clipboard?.writeText?.((NEGATIVES_BY_VERTICAL[selectedVertical] ?? []).join('\n')); toast.success('Copiado!'); }}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(NEGATIVES_BY_VERTICAL[selectedVertical] ?? []).map((neg: string) => (
              <Badge key={neg} className="bg-red-500/10 text-red-300 text-xs">-{neg}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add keyword */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2"><CardTitle className="text-base text-white">Adicionar Keyword</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input value={newKw} onChange={(e:any) => setNewKw(e?.target?.value ?? '')} placeholder="Keyword..." className={`${inputCls} flex-1 min-w-[200px]`} onKeyDown={(e:any) => e?.key === 'Enter' && addKeyword()} />
            <Select value={newLayer} onValueChange={setNewLayer}><SelectTrigger className={`w-28 ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">{['A','B','C','D'].map(l => <SelectItem key={l} value={l} className="text-white">Camada {l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={newMatch} onValueChange={setNewMatch}><SelectTrigger className={`w-28 ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]"><SelectItem value="phrase" className="text-white">Phrase</SelectItem><SelectItem value="exact" className="text-white">Exact</SelectItem><SelectItem value="broad" className="text-white">Broad</SelectItem></SelectContent>
            </Select>
            <Button onClick={addKeyword} className="bg-green-600 hover:bg-green-700 text-white gap-1"><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Keywords table */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-2"><CardTitle className="text-base text-white">Biblioteca de Keywords ({keywords?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#334155] text-slate-400 text-xs">
                <th className="text-left py-2">Keyword</th><th>Camada</th><th>Match</th>
                <th className="text-right">CPC Est.</th><th className="text-right">Relev.</th>
                <th>Campanha</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {(keywords ?? []).map((kw: any) => (
                  <tr key={kw?.id} className="border-b border-[#334155]/50 hover:bg-[#0f172a]/50">
                    <td className="py-2 text-white">{kw?.keyword}</td>
                    <td className="text-center"><Badge className={layerColors[kw?.layer] ?? 'bg-slate-500/20 text-slate-400'}>{kw?.layer}</Badge></td>
                    <td className="text-center text-slate-300 text-xs">{kw?.matchType}</td>
                    <td className="text-right text-white font-mono">${(kw?.cpcEstimate ?? 0)?.toFixed?.(2)}</td>
                    <td className="text-right text-white">{kw?.relevanceScore ?? 0}/5</td>
                    <td className="text-slate-400 text-xs">{kw?.campaign?.name ?? '—'}</td>
                    <td>
                      <button onClick={() => toggleNegativa(kw)} title={kw?.status === 'negativa' ? 'Clique para reativar' : 'Clique para marcar como negativa'}>
                        <Badge className={kw?.status === 'ativa' ? 'bg-green-500/20 text-green-400 cursor-pointer' : kw?.status === 'negativa' ? 'bg-red-500/20 text-red-400 cursor-pointer' : 'bg-slate-500/20 text-slate-400 cursor-pointer'}>{kw?.status}</Badge>
                      </button>
                    </td>
                    <td><button onClick={() => deleteKeyword(kw?.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(keywords?.length ?? 0) === 0 && <p className="text-center text-slate-500 py-8">Nenhuma keyword cadastrada</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
