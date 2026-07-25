'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Loader2, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const inputClass = 'bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500';

type Result = {
  id: string;
  slug: string;
  title: string;
  url: string;
  provider?: string;
  model?: string;
  usage?: { totalTokens?: number };
};

export default function TrendLabPage() {
  const [trend, setTrend] = useState('');
  const [productName, setProductName] = useState('');
  const [hopLink, setHopLink] = useState('');
  const [angle, setAngle] = useState('');
  const [geo, setGeo] = useState('BR');
  const [language, setLanguage] = useState('pt-BR');
  const [evidence, setEvidence] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [reviewed, setReviewed] = useState(false);

  async function generate() {
    if (!trend.trim()) return toast.error('Informe a tendência ou insight');
    if (!productName.trim()) return toast.error('Informe o produto afiliado');
    if (!/^https?:\/\//i.test(hopLink.trim())) return toast.error('Informe um link de afiliado válido');

    setLoading(true);
    setResult(null);
    setReviewed(false);
    try {
      const context = `INSIGHT/TENDÊNCIA: ${trend.trim()}
RELAÇÃO COM O PRODUTO: ${angle.trim() || 'Explique de forma editorial e verificável por que o produto é relevante para o tema.'}
EVIDÊNCIAS E OBSERVAÇÕES: ${evidence.trim() || 'Nenhuma evidência adicional fornecida; não invente dados.'}

Requisitos:
- Produza conteúdo útil que funcione mesmo sem o clique afiliado.
- Não use controvérsia enganosa, clickbait falso, preço inventado ou claims absolutos.
- Identifique claramente a relação de afiliado.
- Use a tendência como contexto editorial, sem sugerir endosso inexistente.
- Preserve compliance com Google Ads e políticas de afiliados.`;

      const response = await fetch('/api/presells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName.trim(),
          hopLink: hopLink.trim(),
          angle: angle.trim() || `conteúdo editorial relacionado a ${trend.trim()}`,
          geo,
          language,
          trackingId: `trend-${Date.now()}`,
          context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Erro ${response.status}`);
      setResult(data);
      toast.success('Presell contextualizada criada e salva');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar a presell');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
            <Sparkles className="h-4 w-4" /> Insight → ativo afiliado
          </div>
          <h1 className="text-3xl font-bold text-white">Trend Lab</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Transforme uma tendência em conteúdo editorial e uma presell rastreável usando os agentes, modelos e regras de compliance do AfiliAds.
          </p>
        </div>
        <Badge className="w-fit border-green-500/30 bg-green-500/10 text-green-400">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Compliance integrado
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="border-[#334155] bg-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-white">1. Contextualize a oportunidade</CardTitle>
            <CardDescription className="text-slate-400">Preencha na ordem. Nenhum conteúdo será publicado automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Tendência ou insight</Label>
              <Input className={inputClass} value={trend} onChange={(event) => setTrend(event.target.value)} placeholder="Ex.: interesse crescente em ferramentas de produtividade com IA" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Produto afiliado</Label>
                <Input className={inputClass} value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Nome exato do produto" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Link de afiliado</Label>
                <Input className={inputClass} value={hopLink} onChange={(event) => setHopLink(event.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Ângulo editorial</Label>
              <Textarea className={inputClass} value={angle} onChange={(event) => setAngle(event.target.value)} placeholder="Como o produto se relaciona com a tendência? Qual valor real será entregue ao leitor?" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Evidências e observações</Label>
              <Textarea className={inputClass} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Fontes, números verificáveis, limitações e informações que o agente não deve inventar." />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Mercado</Label>
                <Select value={geo} onValueChange={(value) => { setGeo(value); setLanguage(value === 'BR' ? 'pt-BR' : 'en'); }}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="BR">Brasil</SelectItem><SelectItem value="US">Estados Unidos</SelectItem><SelectItem value="UK">Reino Unido</SelectItem><SelectItem value="AU">Austrália</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pt-BR">Português</SelectItem><SelectItem value="en">Inglês</SelectItem><SelectItem value="es">Espanhol</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={generate} disabled={loading} className="w-full bg-purple-600 text-white hover:bg-purple-700">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              2. Gerar presell para revisão
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#334155] bg-[#1e293b]">
            <CardHeader><CardTitle className="text-base text-white">Fluxo utilizado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ['1', 'Insight', 'Você fornece tendência e evidências'],
                ['2', 'Presell Builder', 'Gera conteúdo editorial estruturado'],
                ['3', 'Compliance', 'Aplica disclaimers e limita claims'],
                ['4', 'Rastreamento', 'Adiciona identificação própria ao link'],
                ['5', 'Revisão', 'Você revisa antes de promover'],
              ].map(([number, title, description]) => (
                <div className="flex gap-3" key={number}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-300">{number}</span>
                  <div><strong className="block text-sm text-slate-200">{title}</strong><span className="text-xs text-slate-500">{description}</span></div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert className="border-amber-500/20 bg-amber-500/5 text-amber-100">
            <Radar className="h-4 w-4" />
            <AlertTitle>Antes de gerar</AlertTitle>
            <AlertDescription className="text-xs text-amber-200/70">
              Confirme que o programa permite o canal desejado e que você possui direito de usar imagens, marcas e alegações fornecidas.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {result && (
        <Card className="border-green-500/25 bg-green-500/5">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-400" />
              <div><strong className="text-white">{result.title}</strong><p className="mt-1 text-xs text-slate-400">Salva como {result.slug} · {result.provider || 'provider automático'} / {result.model || 'modelo automático'}</p></div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-[#334155] bg-[#0f172a] text-slate-200"><Link href="/busca-produtos"><FileText className="mr-2 h-4 w-4" />Produtos</Link></Button>
              <Button asChild className="bg-green-600 text-white hover:bg-green-700"><Link href={result.url} target="_blank">3. Revisar página <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>
            </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-green-500/20 bg-[#0f172a]/70 p-4">
              <Checkbox checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} className="mt-0.5 border-slate-500 data-[state=checked]:border-green-500 data-[state=checked]:bg-green-600" />
              <span><strong className="block text-sm text-slate-200">Confirmo que revisei a página gerada</strong><small className="mt-1 block text-xs leading-5 text-slate-500">Verifique links, disclosures, claims, preços, imagens, regras do programa e adequação ao mercado antes de liberar a criação da campanha.</small></span>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        {result && reviewed
          ? <Button asChild className="bg-green-600 text-white hover:bg-green-700"><Link href="/wizard">4. Criar campanha aprovada <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          : <Button disabled variant="outline" className="border-[#334155] bg-[#0f172a] text-slate-500">Revise e confirme para liberar a campanha <ArrowRight className="ml-2 h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
