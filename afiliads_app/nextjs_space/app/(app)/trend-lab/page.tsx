'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Loader2, Radar, ShieldCheck, Sparkles, Bot } from 'lucide-react';
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

type ResearchProduct = {
  id: string; name: string; vertical: string; score: number; hopLink?: string | null;
  summary?: string | null; strategy?: any;
};

type DraftCampaign = {
  id: string; name: string; vertical: string; geo: string; channel: string; funnel: string;
  offerUrl?: string | null; presellUrl?: string | null; utmCampaign?: string | null;
};

const GEN_VALUES = { trend: '', productName: '', hopLink: '', angle: '', evidence: '', geo: 'BR', language: 'pt-BR' };

export default function TrendLabPage() {
  const searchParams = useSearchParams();
  const [trend, setTrend] = useState('');
  const [productName, setProductName] = useState('');
  const [hopLink, setHopLink] = useState('');
  const [angle, setAngle] = useState('');
  const [geo, setGeo] = useState('BR');
  const [language, setLanguage] = useState('pt-BR');
  const [evidence, setEvidence] = useState('');
  const [pageType, setPageType] = useState('advertorial');
  const [videoUrl, setVideoUrl] = useState('');
  const [popupGate, setPopupGate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [reviewed, setReviewed] = useState(false);

  const [researchProducts, setResearchProducts] = useState<ResearchProduct[]>([]);
  const [draftCampaigns, setDraftCampaigns] = useState<DraftCampaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<DraftCampaign[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [sourceProductId, setSourceProductId] = useState<string | null>(null);
  const [sourceCampaignId, setSourceCampaignId] = useState<string | null>(null);
  const [sourceCampaignTrackingId, setSourceCampaignTrackingId] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [listsLoaded, setListsLoaded] = useState({ products: false, campaigns: false });

  useEffect(() => {
    fetch('/api/products').then(r => r.ok ? r.json() : [])
      .then(d => setResearchProducts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setListsLoaded(prev => ({ ...prev, products: true })));
    fetch('/api/campaigns').then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setAllCampaigns(list);
        setDraftCampaigns(list.filter((c: any) => !c.presellUrl));
      })
      .catch(() => {})
      .finally(() => setListsLoaded(prev => ({ ...prev, campaigns: true })));
  }, []);

  useEffect(() => {
    const prId = searchParams?.get('productResearchId');
    const cId = searchParams?.get('campaignId');
    if (!prId && !cId) return;
    setAutoLoading(true);
  }, [searchParams]);

  useEffect(() => {
    if (!autoLoading) return;
    if (!listsLoaded.products || !listsLoaded.campaigns) return; // aguarda os dois fetches concluírem
    const prId = searchParams?.get('productResearchId');
    const cId = searchParams?.get('campaignId');
    if (cId) {
      applySource(`campaign:${cId}`, true);
    } else if (prId) {
      applySource(`product:${prId}`, true);
    }
    setAutoLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoading, listsLoaded]);

  function applySource(value: string, autoGenerate: boolean) {
    setSelectedSourceId(value);
    if (value.startsWith('product:')) {
      const id = value.slice('product:'.length);
      const p = researchProducts.find((x) => x.id === id);
      if (!p) return;
      setSourceProductId(id);
      setSourceCampaignId(null);
      setSourceCampaignTrackingId(null);
      const vals = {
        trend: `Interesse crescente em ${p.vertical || 'soluções para esse público'} — produto pesquisado com score ${p.score}/100.${p.summary ? ' ' + p.summary : ''}`,
        productName: p.name,
        hopLink: p.hopLink || '',
        angle: p.strategy?.presell?.motivo || `Ângulo editorial para ${p.name}, destacando ${p.vertical || 'o problema do público'} de forma honesta e verificável.`,
        evidence: p.summary || '',
        geo: 'BR',
        language: 'pt-BR',
      };
      setTrend(vals.trend); setProductName(vals.productName); setHopLink(vals.hopLink);
      setAngle(vals.angle); setEvidence(vals.evidence); setGeo(vals.geo); setLanguage(vals.language);
      if (!vals.hopLink) {
        toast.warning(`"${p.name}" ainda não tem HopLink cadastrado — preencha antes de gerar.`);
        return;
      }
      if (autoGenerate) runGenerate(vals, id, null);
    } else if (value.startsWith('campaign:')) {
      const id = value.slice('campaign:'.length);
      const c = allCampaigns.find((x) => x.id === id);
      if (!c) return;
      setSourceCampaignId(id);
      setSourceCampaignTrackingId(c.utmCampaign || c.name || null);
      setSourceProductId(null);
      const supportedGeo = ['BR', 'US', 'UK', 'AU'].includes(c.geo) ? c.geo : 'US';
      const vals = {
        trend: `Campanha em andamento "${c.name}" — vertical ${c.vertical}, geo ${c.geo}, canal ${c.channel}.`,
        productName: c.name,
        hopLink: c.offerUrl || '',
        angle: `Conteúdo editorial de apoio para a campanha ${c.name}, alinhado ao funil ${c.funnel}.`,
        evidence: '',
        geo: supportedGeo,
        language: supportedGeo === 'BR' ? 'pt-BR' : 'en',
      };
      setTrend(vals.trend); setProductName(vals.productName); setHopLink(vals.hopLink);
      setAngle(vals.angle); setEvidence(vals.evidence); setGeo(vals.geo); setLanguage(vals.language);
      if (!vals.hopLink) {
        toast.warning(`A campanha "${c.name}" ainda não tem URL de oferta — preencha o HopLink antes de gerar.`);
        return;
      }
      if (autoGenerate) runGenerate(vals, null, id);
    }
  }

  async function runGenerate(vals?: Partial<typeof GEN_VALUES>, productId?: string | null, campaignId?: string | null) {
    const t = vals?.trend ?? trend;
    const pn = vals?.productName ?? productName;
    const hl = vals?.hopLink ?? hopLink;
    const ag = vals?.angle ?? angle;
    const ev = vals?.evidence ?? evidence;
    const gg = vals?.geo ?? geo;
    const lg = vals?.language ?? language;
    const pid = productId !== undefined ? productId : sourceProductId;
    const cid = campaignId !== undefined ? campaignId : sourceCampaignId;

    if (!t.trim()) return toast.error('Informe a tendência ou insight');
    if (!pn.trim()) return toast.error('Informe o produto afiliado');
    if (!/^https?:\/\//i.test(hl.trim())) return toast.error('Informe um link de afiliado válido');
    if (pageType === 'vsl' && !videoUrl.trim()) return toast.error('Tipo VSL exige o link do vídeo (YouTube, Vimeo ou .mp4)');

    setLoading(true);
    setResult(null);
    setReviewed(false);
    try {
      const context = `INSIGHT/TENDÊNCIA: ${t.trim()}
RELAÇÃO COM O PRODUTO: ${ag.trim() || 'Explique de forma editorial e verificável por que o produto é relevante para o tema.'}
EVIDÊNCIAS E OBSERVAÇÕES: ${ev.trim() || 'Nenhuma evidência adicional fornecida; não invente dados.'}

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
          productName: pn.trim(),
          productId: pid || undefined,
          hopLink: hl.trim(),
          angle: ag.trim() || `conteúdo editorial relacionado a ${t.trim()}`,
          geo: gg,
          language: lg,
          // Se vier de uma campanha, o trackingId TEM que ser o utmCampaign dela — é isso que
          // sincronizar_clickbank usa pra casar a venda com a campanha depois.
          trackingId: cid && sourceCampaignTrackingId ? sourceCampaignTrackingId : `trend-${Date.now()}`,
          pageType,
          popupGate,
          videoUrl: pageType === 'vsl' ? videoUrl.trim() : undefined,
          context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Erro ${response.status}`);
      setResult(data);
      toast.success('Presell contextualizada criada e salva');

      if (cid) {
        fetch(`/api/campaigns/${cid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presellUrl: data.url }),
        }).catch(() => {});
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar a presell');
    } finally {
      setLoading(false);
    }
  }

  const nextHref = sourceCampaignId ? `/campanhas/${sourceCampaignId}` : sourceProductId ? `/wizard?productResearchId=${sourceProductId}` : '/wizard';
  const nextLabel = sourceCampaignId ? 'Voltar para a campanha' : '4. Criar campanha aprovada';

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

      {(researchProducts.length > 0 || draftCampaigns.length > 0) && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="space-y-2 p-4">
            <Label className="flex items-center gap-1.5 text-purple-300"><Bot className="h-4 w-4" /> Carregar de um produto pesquisado ou campanha em andamento</Label>
            <Select value={selectedSourceId} onValueChange={(v) => applySource(v, true)} disabled={loading || autoLoading}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Escolha para preencher e gerar a presell automaticamente..." /></SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155] max-h-72">
                {researchProducts.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">Produtos pesquisados</div>
                    {researchProducts.map((p) => (
                      <SelectItem key={`product:${p.id}`} value={`product:${p.id}`} className="text-white">{p.name} — {p.vertical || 'sem vertical'} (score {p.score})</SelectItem>
                    ))}
                  </>
                )}
                {draftCampaigns.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">Campanhas sem presell</div>
                    {draftCampaigns.map((c) => (
                      <SelectItem key={`campaign:${c.id}`} value={`campaign:${c.id}`} className="text-white">{c.name} — {c.vertical} · {c.geo}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {autoLoading && <p className="flex items-center gap-1.5 text-xs text-purple-300"><Loader2 className="h-3 w-3 animate-spin" /> Carregando e gerando a presell automaticamente...</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="border-[#334155] bg-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-white">1. Contextualize a oportunidade</CardTitle>
            <CardDescription className="text-slate-400">Preencha na ordem, ou carregue de um produto/campanha acima. Nenhum conteúdo será publicado automaticamente.</CardDescription>
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
                <Label className="text-slate-300">Tipo de página</Label>
                <Select value={pageType} onValueChange={setPageType}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertorial">Advertorial / Review (padrão)</SelectItem>
                    <SelectItem value="pogo">Pogo — curta, vende o clique</SelectItem>
                    <SelectItem value="vsl">VSL — vídeo + CTA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-7">
                <Checkbox id="popup-gate" checked={popupGate} onCheckedChange={(v: any) => setPopupGate(!!v)} />
                <Label htmlFor="popup-gate" className="text-slate-300 cursor-pointer">Pop-up de retenção (segure para continuar)</Label>
              </div>
            </div>
            {pageType === 'vsl' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Link do vídeo (YouTube, Vimeo ou .mp4)</Label>
                <Input className={inputClass} value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            )}
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
            <Button onClick={() => runGenerate()} disabled={loading} className="w-full bg-purple-600 text-white hover:bg-purple-700">
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
                ['1', 'Insight', 'Você fornece tendência e evidências (ou carrega de um produto/campanha)'],
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
          ? <Button asChild className="bg-green-600 text-white hover:bg-green-700"><Link href={nextHref}>{nextLabel} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          : <Button disabled variant="outline" className="border-[#334155] bg-[#0f172a] text-slate-500">Revise e confirme para liberar a campanha <ArrowRight className="ml-2 h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
