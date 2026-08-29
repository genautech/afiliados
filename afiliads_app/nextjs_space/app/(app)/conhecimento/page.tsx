'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, AlertTriangle, Target, BarChart3, FileText, CheckSquare, Lightbulb, GraduationCap, HelpCircle, Bot, FileSearch } from 'lucide-react';
import { GLOSSARY, SYSTEM_MANUAL } from '@/lib/knowledge-data';
import { AGENT_REGISTRY } from '@/lib/agents';
import { CATALOGO_VERTICAIS } from '@/lib/generated/catalogo';
import { AGENT_DOCTRINE } from '@/lib/generated/agent-doctrine';
import { PLAYBOOKS, ERROS_COMUNS, PLAYBOOKS_ATUALIZADO_EM, type IconePlaybook } from '@/lib/generated/catalogo-conhecimento';

// O YAML guarda o nome lógico do ícone; o componente Lucide fica aqui.
const ICONE_PLAYBOOK: Record<IconePlaybook, typeof Target> = {
  target: Target,
  grafico: BarChart3,
  documento: FileText,
  ideia: Lightbulb,
  checklist: CheckSquare,
};

const learningTypeBadge: Record<string, { label: string; cls: string }> = {
  teste: { label: 'Teste Kill/Scale', cls: 'bg-purple-500/20 text-purple-300' },
  decisao: { label: 'Decisão', cls: 'bg-blue-500/20 text-blue-300' },
  diario: { label: 'Diário', cls: 'bg-green-500/20 text-green-300' },
  produto: { label: 'Produto', cls: 'bg-yellow-500/20 text-yellow-300' },
};

export default function ConhecimentoPage() {
  // Placar honesto: quantas CVRs saíram da heurística para medição de verdade.
  const validados = CATALOGO_VERTICAIS.verticais.filter(
    (v) => v.cvr_default.origem !== 'heuristica-interna',
  ).length;
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
          <p className="text-slate-400 text-sm mt-1">
            Estratégias, playbooks e referências para afiliados ·{' '}
            <span className="font-mono text-slate-500">
              catálogo revisado em {PLAYBOOKS_ATUALIZADO_EM}
            </span>
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar no conhecimento..." value={searchQuery} onChange={(e:any) => setSearchQuery(e?.target?.value ?? '')} className="bg-[#0f172a] border-[#334155] text-white pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue={PLAYBOOKS[0]?.id ?? 'estrategias'} className="space-y-4">
            <TabsList className="bg-[#1e293b] border border-[#334155] flex-wrap h-auto gap-1 p-1">
              {PLAYBOOKS.map((grupo) => {
                const Icon = ICONE_PLAYBOOK[grupo.icone];
                return (
                  <TabsTrigger key={grupo.id} value={grupo.id} className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                    <Icon className="h-3 w-3" /> {grupo.titulo}
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
              <TabsTrigger value="procedencia" className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-400 gap-1">
                <FileSearch className="h-3 w-3" /> Procedência
              </TabsTrigger>
            </TabsList>
            {PLAYBOOKS.map((grupo) => {
              const secoes = grupo.secoes.filter((sec) => filterContent(sec.titulo + ' ' + sec.conteudo));
              return (
                <TabsContent key={grupo.id} value={grupo.id} className="space-y-4">
                  {secoes.length === 0 ? (
                    <p className="text-sm text-slate-500">Nada em {grupo.titulo} casa com a busca.</p>
                  ) : (
                    secoes.map((sec) => (
                      <Card key={sec.titulo} className="bg-[#1e293b] border-[#334155]">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base text-white">{sec.titulo}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                            {sec.conteudo}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              );
            })}

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
                  <CardTitle className="text-base text-white flex items-center gap-2"><Bot className="h-4 w-4 text-green-400" /> Os agentes, em uma linha cada</CardTitle>
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

            {/* Procedência — de onde vem cada número que o sistema usa */}
            <TabsContent value="procedencia" className="space-y-4">
              <Card className="bg-[#1e293b] border-[#334155]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">CVR por vertical</CardTitle>
                  <p className="text-xs text-slate-400 pt-1">
                    Esses valores entram no cálculo de EPC de break-even e de CPC máximo. Cada um
                    declara de onde veio: heurística inicial, dado medido em campanha própria, ou
                    fonte externa com URL. Editável em <span className="font-mono">subsidios/catalogo/verticais.yaml</span> —
                    o build recusa número sem origem.
                  </p>
                  <div className="mt-2 rounded border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
                    <p className="text-xs text-amber-200">
                      <span className="font-semibold">{validados} de {CATALOGO_VERTICAIS.verticais.length} validados.</span>{' '}
                      O resto é estimativa da operação, não medição. Trate como ponto de partida do
                      cálculo e substitua por <span className="font-mono">dado-proprio</span> assim que
                      houver campanha com volume.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CATALOGO_VERTICAIS.verticais
                    .filter(v => filterContent(`${v.label} ${v.cvr_default.origem} ${v.cvr_default.nota ?? ''}`))
                    .map(v => (
                    <div key={v.id} className="flex items-start justify-between gap-3 text-sm border-b border-[#334155] pb-2 last:border-0">
                      <div className="min-w-0">
                        <span className="text-white font-medium">{v.label}</span>
                        <span className="text-slate-400"> — CVR {v.cvr_default.valor}%</span>
                        {v.cvr_default.nota && (
                          <p className="text-xs text-slate-500 mt-0.5">{v.cvr_default.nota}</p>
                        )}
                        {v.cvr_default.amostra && (
                          <p className="text-xs text-slate-500 mt-0.5">Amostra: {v.cvr_default.amostra}</p>
                        )}
                        {v.cvr_default.referencias && v.cvr_default.referencias.length > 0 && (
                          <div className="mt-1.5 space-y-1.5 border-l-2 border-[#334155] pl-2.5">
                            {v.cvr_default.referencias.map((ref) => (
                              <div key={ref.url} className="text-xs">
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                                >
                                  {ref.titulo}
                                </a>
                                <span className="text-slate-600"> · acesso {ref.acessado_em}</span>
                                <p className="text-slate-500">
                                  {ref.valor_citado} <span className="text-slate-600">({ref.metrica})</span>
                                </p>
                                <p className="text-amber-400/70">Não substitui: {ref.por_que_nao_substitui}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge className={
                        v.cvr_default.origem === 'dado-proprio' ? 'bg-green-600 shrink-0'
                        : v.cvr_default.origem === 'fonte-externa' ? 'bg-blue-600 shrink-0'
                        : 'bg-slate-600 shrink-0'
                      }>
                        {v.cvr_default.origem}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-[#1e293b] border-[#334155]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Doutrina dos agentes</CardTitle>
                  <p className="text-xs text-slate-400 pt-1">
                    Estes agentes não trazem só o prompt escrito no código: o build injeta as regras
                    do método em <span className="font-mono">frameworks/agentes-referencia/*.agent.md</span>.
                    Mudar o documento muda o comportamento do agente — sem os dois saírem de sincronia.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {AGENT_DOCTRINE.filter(d => filterContent(`${d.name} ${d.binds.join(' ')}`)).map(d => (
                    <div key={d.id} className="text-sm border-b border-[#334155] pb-2 last:border-0">
                      <span className="text-white font-medium">{d.name}</span>
                      <span className="text-slate-400">
                        {' '}— {d.doctrine.length} seção(ões) de regra
                        {d.binds.length > 0 ? `, aplicada a: ${d.binds.join(', ')}` : ', ainda sem agente do app ligado'}
                      </span>
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
              {ERROS_COMUNS.map((error, i) => (
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
