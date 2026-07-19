'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, AlertTriangle, Target, BarChart3, FileText, CheckSquare, Lightbulb, GraduationCap, HelpCircle, Bot } from 'lucide-react';
import { GLOSSARY, SYSTEM_MANUAL } from '@/lib/knowledge-data';
import { AGENT_REGISTRY } from '@/lib/agents';

const learningTypeBadge: Record<string, { label: string; cls: string }> = {
  teste: { label: 'Teste Kill/Scale', cls: 'bg-purple-500/20 text-purple-300' },
  decisao: { label: 'Decisão', cls: 'bg-blue-500/20 text-blue-300' },
  diario: { label: 'Diário', cls: 'bg-green-500/20 text-green-300' },
  produto: { label: 'Produto', cls: 'bg-yellow-500/20 text-yellow-300' },
};

const KNOWLEDGE_BASE = {
  estrategias: {
    title: 'Estratégias',
    icon: Target,
    sections: [
      {
        title: 'Seleção de Ofertas',
        content: `**ClickBank:** Gravity (oferta viva), EPC de referência, avg sale, upsells. Ler Vendor Terms: geo, tráfego, trademark, claims. Testar LP/VSL no mobile. HopLink + UTMs.\n\n**BuyGoods:** Payout vs CPC esperado no geo. Criativos oficiais + ângulos próprios sem violar claims. Confirmar se exige bridge / proíbe direct / landing approval.\n\n**MaxWeb:** Vertical + payout (CPL vs CPA vs RevShare). Smartlink para descoberta; offer fixa após vencedor. Nunca escalar sem postback validado. Monitorar held/rejected/clawback semanalmente.\n\n**Hotmart/Eduzz/Monetizze:** Comissão %, qualidade da página, calendário de lançamento. Materiais oficiais + ângulo da sua audiência.\n\n**Shortlist:** 2–3 CB/BuyGoods + 1 path MaxWeb + 1 BR`,
      },
      {
        title: 'Funis',
        content: `1. **Direct** — anúncio → hop/smartlink (teste rápido)\n2. **Bridge / Review** — anúncio → sua página → CTA afiliado (padrão Google)\n3. **Search Intent** — keyword problema/solução → RSA → bridge\n4. **YouTube / Demand Gen** — UGC/talking-head → bridge ou SL\n5. **PMax** — só após conversões estáveis\n6. **Lançamento BR** — conteúdo/lista → carrinho\n7. **MaxWeb Smartlink** — tráfego → SL → pin na offer vencedora`,
      },
      {
        title: 'Métricas e Decisão',
        content: `| Métrica | Uso |\n|---------|-----|\n| EPC | Receita líquida / cliques |\n| eCPA | Gasto / conversões |\n| ROAS | Receita / gasto |\n| CVR | Conv / cliques |\n\n**SCALE:** EPC ≥ 1,3 × CPC ou eCPA < payout líquido com margem\n**KILL:** sem conversão com gasto ≥ orçamento de teste\n**OTIMIZAR:** perto do break-even`,
      },
    ],
  },
  googleads: {
    title: 'Google Ads',
    icon: BarChart3,
    sections: [
      {
        title: 'Arquitetura de Conta',
        content: `1 campanha = 1 rede × 1 vertical × 1 geo × 1 canal × 1 funil\nNaming: [REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_vN\n\nExemplos:\nCB_WL_US_SEARCH_BRIDGE_v1\nMW_NUTRA_BR_YT_SL_v1\nBG_BEAUTY_US_DGEN_REVIEW_v2`,
      },
      {
        title: 'Search para Afiliados',
        content: `**Quando usar:** Intent alto, problema claro, comparação.\n\n**Estrutura:** Campanha por tema/oferta. Ad groups por cluster de intenção.\nMatch: exact + phrase no começo.\n\n**RSA:** 10-15 títulos, 4 descrições. Alinhar H1 da bridge à keyword.\nEvitar claims absolutos. CTA: "veja como funciona", "compare".\n\n**Lances:** Início manual CPC. Com 30+ conv/mês: tCPA.`,
      },
      {
        title: 'YouTube, Demand Gen e PMax',
        content: `**YouTube:** Hook 0-3s; problema; mecanismo; CTA para bridge. Remarketing viewers.\n\n**Demand Gen:** Criativos feed + vídeo curto. Bridge obrigatória.\n\n**PMax:** SÓ DEPOIS de conversões confiáveis e Search/YT já lucrativos. Segmente por oferta.`,
      },
      {
        title: 'Compliance Google × Redes',
        content: `| Risco | Ação |\n|-------|------|\n| Claims saúde/renda | Linguagem condicional, sem garantia |\n| Trademark | Respeitar Vendor Terms + políticas Google |\n| Cloaking | Proibido |\n| Vertical restrita | Verificar certificação |\n| Destino | Página útil, não só hop opaco |\n\n**Regra de ouro:** anúncio approvável no Google E permitido nos terms da oferta`,
      },
    ],
  },
  playbooks: {
    title: 'Playbooks',
    icon: FileText,
    sections: [
      {
        title: 'Playbook Search + ClickBank/BuyGoods (72h)',
        content: `1. BreakEven: comissão, refund 5-15%, CVR 1-2%\n2. 1 campanha, 2-3 ad groups, 3-5 RSA, bridge única\n3. Orçamento = 1-2× comissão média por dia\n4. Dia 1-2: matar keywords com gasto alto zero conv\n5. Dia 3: se EPC ≥ 1,3× CPC → SCALE +20-30%`,
      },
      {
        title: 'Playbook YT/DGen + MaxWeb SL',
        content: `1. Postback OK + 3 criativos (hooks diferentes)\n2. Orçamento até 100-300 cliques ou 10-20 leads\n3. eCPA vs payout: se eCPA < 70-80% → escalar\n4. Held alto → cortar fonte/criativo`,
      },
      {
        title: 'Diagnóstico Rápido',
        content: `| Sintoma | Causa | Ação |\n|---------|-------|------|\n| CTR baixo | RSA fraco, keyword ampla | Reescrever; apertar match |\n| CPC alto | Competição, QS baixo | Bridge melhor; exact; negativas |\n| CTR ok, zero vendas | LP fraca, offer morta | Trocar offer; melhorar bridge |\n| Google conv ≠ rede | Postback/UTM | Corrigir tracking |\n| Ban/disapprove | Claims, cloaking | Reescrever; bridge limpa |`,
      },
    ],
  },
  templates: {
    title: 'Templates',
    icon: Lightbulb,
    sections: [
      {
        title: 'Template Bridge (Google-friendly)',
        content: `H1 alinhado à keyword\nSubhead benefício específico\nEmpatia (problema)\nO que é a solução (sem milagre)\nProva realista\nPrós e contras\nPara quem é / não é\nCTA → hop / smartlink\nFAQ + garantia do produto\nDisclaimer afiliado + "resultados variam"\nPrivacidade / contato`,
      },
      {
        title: 'RSA Esqueleto',
        content: `Títulos: {Keyword} Guia 2026 | Como Funciona | Compare Antes | Opção Que Estão Testando\nDescrições: Entenda prós e contras. Conteúdo informativo + oferta oficial. Resultados individuais variam.`,
      },
      {
        title: 'Hipótese de Teste',
        content: `Se eu usar o ângulo [X] no canal [Search/YT] para a oferta [Y] no geo [Z],\nentão EPC sobe para ≥ 1,3× CPC em [N] cliques,\nporque [motivo].`,
      },
      {
        title: 'UTMs Obrigatórios',
        content: `?utm_source=google\n&utm_medium=cpc\n&utm_campaign=[NAMING]\n&utm_content={creative}\n&utm_term={keyword}\n\nMaxWeb: adicionar clickid/subid nos tokens da rede`,
      },
    ],
  },
  checklists: {
    title: 'Checklists',
    icon: CheckSquare,
    sections: [
      {
        title: 'Checklist Pré-escala Google + MaxWeb',
        content: `☐ Terms da oferta lidos (geo, trademark, claims)\n☐ Bridge com disclaimer, privacidade, mobile OK\n☐ Conversões Google testadas (fire real)\n☐ MaxWeb: postback + clickid + 1 conv teste\n☐ UTMs = Campanha_ID\n☐ Break-even calculado; CPC alvo definido\n☐ Negativas base + exclusões\n☐ Orçamento de teste definido\n☐ Plano B de criativo/ângulo\n☐ Lucro medido pela rede`,
      },
      {
        title: 'Checklists Gerais',
        content: `☐ Contas: CB, BuyGoods, MaxWeb, BR, Google Ads\n☐ Planilha de tracking preenchida\n☐ Shortlist de ofertas com terms OK\n☐ Funil escolhido por campanha\n☐ Compliance revisado\n☐ Kill/scale documentado\n☐ Reserva para refund/clawback`,
      },
      {
        title: 'Referência Rápida Break-even',
        content: `Comissão líquida = Comissão × (1 − refund%)\nEPC break-even = Comissão líquida × CVR\nCPC máx ≈ EPC break-even\nCPC SCALE ≈ CPC máx / 1,3\neCPA máx ≈ Comissão líquida`,
      },
    ],
  },
};

const COMMON_ERRORS = [
  'Google direct link em vertical restrita',
  'MaxWeb sem postback',
  'Escalar no lucro do dia 1 ignorando refund',
  'EPC do marketplace ≠ seu EPC',
  'PMax no dia 1 sem conversão confiável',
  'Misturar redes/ofertas sem naming',
  'Claims agressivos (ban)',
  'Um criativo só até fadiga',
];

export default function ConhecimentoPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [learnings, setLearnings] = useState<any[]>([]);
  const [learningsLoading, setLearningsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learnings')
      .then(r => r.json())
      .then(d => setLearnings(Array.isArray(d?.feed) ? d.feed : []))
      .catch(console.error)
      .finally(() => setLearningsLoading(false));
  }, []);

  const filterContent = (content: string) => {
    if (!searchQuery) return true;
    return content?.toLowerCase?.()?.includes?.(searchQuery?.toLowerCase?.()) ?? false;
  };

  const glossaryFiltered = GLOSSARY.filter(g => filterContent(`${g.term} ${g.sigla ?? ''} ${g.definition} ${g.whyItMatters}`));
  const learningsFiltered = learnings.filter(l => filterContent(`${l.title} ${l.text}`));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-green-400" /> Base de Conhecimento
          </h1>
          <p className="text-slate-400 text-sm mt-1">Estratégias, playbooks e referências para afiliados</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar no conhecimento..." value={searchQuery} onChange={(e:any) => setSearchQuery(e?.target?.value ?? '')} className="bg-[#0f172a] border-[#334155] text-white pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="estrategias" className="space-y-4">
            <TabsList className="bg-[#1e293b] border border-[#334155] flex-wrap h-auto gap-1 p-1">
              {Object.entries(KNOWLEDGE_BASE).map(([key, section]) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger key={key} value={key} className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                    <Icon className="h-3 w-3" /> {section.title}
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="glossario" className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                <GraduationCap className="h-3 w-3" /> Glossário
              </TabsTrigger>
              <TabsTrigger value="aprendizados" className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                <Lightbulb className="h-3 w-3" /> Aprendizados
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                <HelpCircle className="h-3 w-3" /> Manual
              </TabsTrigger>
            </TabsList>
            {Object.entries(KNOWLEDGE_BASE).map(([key, section]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                {section.sections.filter(s => filterContent(s.title + ' ' + s.content)).map((s, i) => (
                  <Card key={i} className="bg-[#1e293b] border-[#334155]">
                    <CardHeader className="pb-2"><CardTitle className="text-base text-white">{s.title}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{s.content}</div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}

            {/* Glossário */}
            <TabsContent value="glossario" className="space-y-4">
              {(['google-ads', 'afiliados'] as const).map(cat => {
                const items = glossaryFiltered.filter(g => g.categoria === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider pt-2">
                      {cat === 'google-ads' ? 'Google Ads' : 'Programa de Afiliados'} ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map(g => (
                        <Card key={g.term} className="bg-[#1e293b] border-[#334155]">
                          <CardContent className="pt-4 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-semibold text-sm">{g.term}</span>
                              {g.sigla && <Badge className="bg-green-500/20 text-green-400 text-[10px] font-mono">{g.sigla}</Badge>}
                            </div>
                            <p className="text-sm text-slate-300">{g.definition}</p>
                            <p className="text-xs text-slate-400"><span className="text-yellow-400/90">Por que importa:</span> {g.whyItMatters}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              {glossaryFiltered.length === 0 && <p className="text-sm text-slate-500 py-6">Nenhum termo encontrado para &quot;{searchQuery}&quot;.</p>}
            </TabsContent>

            {/* Aprendizados */}
            <TabsContent value="aprendizados" className="space-y-3">
              {learningsLoading && <p className="text-sm text-slate-500 py-4">Carregando aprendizados…</p>}
              {!learningsLoading && learningsFiltered.length === 0 && (
                <p className="text-sm text-slate-500 py-6">Nenhum aprendizado registrado ainda — eles nascem dos Testes Kill/Scale, das decisões de campanha, das notas do Diário e dos dossiês de produtos.</p>
              )}
              {learningsFiltered.map((l, i) => (
                <Card key={i} className="bg-[#1e293b] border-[#334155]">
                  <CardContent className="pt-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${learningTypeBadge[l.type]?.cls ?? 'bg-slate-500/20 text-slate-400'}`}>{learningTypeBadge[l.type]?.label ?? l.type}</Badge>
                        <span className="text-white font-medium text-sm">{l.title}</span>
                      </div>
                      <span className="text-xs text-slate-500">{l.date ? new Date(l.date).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-line">{l.text}</p>
                    {l.source && <p className="text-xs text-slate-500">Fonte: {l.source}</p>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Manual */}
            <TabsContent value="manual" className="space-y-4">
              {SYSTEM_MANUAL.filter(s => filterContent(s.title + ' ' + s.content)).map((s, i) => (
                <Card key={i} className="bg-[#1e293b] border-[#334155]">
                  <CardHeader className="pb-2"><CardTitle className="text-base text-white">{s.title}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{s.content}</div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-[#1e293b] border-[#334155]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white flex items-center gap-2"><Bot className="h-4 w-4 text-green-400" /> Os 9 agentes, em uma linha cada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {AGENT_REGISTRY.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 font-medium shrink-0">{a.name}:</span>
                      <span className="text-slate-300">{a.role} — em {a.pageLabel}.</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Erros Comuns */}
        <div className="lg:col-span-1">
          <Card className="bg-[#1e293b] border-[#334155] sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" /> Erros Comuns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMMON_ERRORS.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 font-bold shrink-0">{i + 1}.</span>
                  <span className="text-slate-300">{error}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155] mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Break-even Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-400 font-mono space-y-1">
                <p>Com. Líq. = Com. × (1 - ref%)</p>
                <p>EPC BE = Com. Líq. × CVR</p>
                <p>CPC Máx ≈ EPC BE</p>
                <p>CPC SCALE ≈ CPC Máx / 1.3</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
