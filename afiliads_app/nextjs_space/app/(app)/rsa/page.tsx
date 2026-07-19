'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Wand2, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { VERTICALS } from '@/lib/wizard-data';

const PROHIBITED = ['cure', 'guaranteed', '100%', 'get rich', 'miracle', 'instant', 'no risk', 'cura', 'garantido', 'milagre'];

export default function RSAPage() {
  const [keyword, setKeyword] = useState('');
  const [benefit, setBenefit] = useState('');
  const [angle, setAngle] = useState('');
  const [vertical, setVertical] = useState('Weight Loss');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!keyword.trim()) { toast.error('Informe a keyword principal'); return; }
    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await fetch('/api/rsa-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), benefit, angle, vertical }),
      });
      if (!res.ok) throw new Error('Erro na API');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let partialRead = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'processing') {
                setProgress(prev => Math.min(prev + 3, 95));
              } else if (parsed?.status === 'completed') {
                setResult(parsed?.result ?? null);
                setProgress(100);
                return;
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message ?? 'Erro');
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao gerar RSA');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = `TÍTULOS:\n${(result?.titles ?? []).map((t:string,i:number) => `${i+1}. ${t}`).join('\n')}\n\nDESCRIÇÕES:\n${(result?.descriptions ?? []).map((d:string,i:number) => `${i+1}. ${d}`).join('\n')}`;
    navigator?.clipboard?.writeText?.(text);
    toast.success('RSA copiado!');
  };

  const checkProhibited = (text: string) => {
    const lower = text?.toLowerCase?.() ?? '';
    return PROHIBITED.filter(p => lower.includes(p));
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-purple-400" /> Gerador de RSA
        </h1>
        <p className="text-slate-400 text-sm mt-1">Gere anúncios Responsive Search Ads com compliance</p>
      </div>

      {/* Form */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-slate-300">Keyword Principal *</Label><Input value={keyword} onChange={(e:any) => setKeyword(e?.target?.value ?? '')} placeholder="Ex: best weight loss supplement" className={inputCls} /></div>
            <div><Label className="text-slate-300">Vertical</Label>
              <Select value={vertical} onValueChange={setVertical}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-[#334155]">{VERTICALS.map(v => <SelectItem key={v} value={v} className="text-white">{v}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-slate-300">Benefício</Label><Input value={benefit} onChange={(e:any) => setBenefit(e?.target?.value ?? '')} placeholder="Ex: perca peso naturalmente" className={inputCls} /></div>
            <div><Label className="text-slate-300">Ângulo</Label><Input value={angle} onChange={(e:any) => setAngle(e?.target?.value ?? '')} placeholder="Ex: informativo, comparação" className={inputCls} /></div>
          </div>
          <Button onClick={generate} loading={loading} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Wand2 className="h-4 w-4" /> Gerar RSA
          </Button>
          {loading && (
            <div className="mt-3">
              <div className="w-full bg-[#0f172a] rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full transition-all" style={{width:`${progress}%`}} /></div>
              <p className="text-xs text-slate-400 mt-1">Gerando com IA... {progress}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">Títulos ({(result?.titles ?? []).length})</CardTitle>
                <Button size="sm" variant="outline" onClick={copyAll} className="border-[#334155] text-slate-300 gap-1"><Copy className="h-3 w-3" /> Copiar Tudo</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(result?.titles ?? []).map((title: string, i: number) => {
                const issues = checkProhibited(title);
                return (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${issues.length > 0 ? 'bg-red-500/10' : 'bg-[#0f172a]'}`}>
                    <span className="text-xs text-slate-500 w-5">{i+1}.</span>
                    <span className="text-sm text-white flex-1">{title}</span>
                    <span className="text-xs text-slate-500 font-mono">{title?.length ?? 0}/30</span>
                    {issues.length > 0 ? (
                      <Badge className="bg-red-500/20 text-red-400 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />{issues.join(', ')}</Badge>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2"><CardTitle className="text-base text-white">Descrições ({(result?.descriptions ?? []).length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(result?.descriptions ?? []).map((desc: string, i: number) => {
                const issues = checkProhibited(desc);
                return (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${issues.length > 0 ? 'bg-red-500/10' : 'bg-[#0f172a]'}`}>
                    <span className="text-xs text-slate-500 w-5">{i+1}.</span>
                    <span className="text-sm text-white flex-1">{desc}</span>
                    <span className="text-xs text-slate-500 font-mono">{desc?.length ?? 0}/90</span>
                    {issues.length > 0 && <Badge className="bg-red-500/20 text-red-400 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />claim</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2"><CardTitle className="text-base text-white">Preview do Anúncio</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4 max-w-lg">
                <p className="text-xs text-green-700">Anúncio · seusite.com</p>
                <p className="text-blue-700 text-lg font-medium">{result?.titles?.[0] ?? 'Título'} | {result?.titles?.[1] ?? 'Título 2'}</p>
                <p className="text-sm text-gray-600 mt-1">{result?.descriptions?.[0] ?? 'Descrição'}</p>
              </div>
            </CardContent>
          </Card>

          {(result?.warnings?.length ?? 0) > 0 && (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <p className="text-yellow-300 text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Avisos de Compliance</p>
                {(result?.warnings ?? []).map((w: string, i: number) => <p key={i} className="text-yellow-200 text-xs mt-1">• {w}</p>)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
