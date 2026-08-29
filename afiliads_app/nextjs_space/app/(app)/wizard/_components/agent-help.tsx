'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { CVR_DEFAULTS } from '@/lib/wizard-data';

export const FIELD_HELP: Record<string, {
  agent: string;
  what: string;
  why: string;
  steps: string;
  apiKeyHelp?: string;
}> = {
  name: {
    agent: 'Paid Ads Strategist',
    what: 'Nome de controle interno da campanha no painel AfiliAds.',
    why: 'Ajuda a rastrear e encontrar suas campanhas de forma organizada no seu dashboard.',
    steps: '1. Digite um nome contendo Rede, Vertical, Geo, Canal e Funil (ex: "CB_WL_US_SEARCH_BRIDGE_v1").\n2. Alinhe o nome interno com a UTM de campanha para facilitar a leitura no Analytics.\n3. Salve a campanha e mantenha o mesmo padrão no Google Ads.'
  },
  platform: {
    agent: 'Affiliate Network Specialist',
    what: 'A rede de afiliados que hospeda a oferta escolhida.',
    why: 'Diferentes plataformas possuem diferentes termos, moedas de pagamento e dinâmicas de rastreamento (postbacks/webhooks).',
    steps: '1. Selecione a plataforma onde a oferta está hospedada.\n2. Verifique os termos de pagamento e se as comissões são em dólar (USD).\n3. Confira se a plataforma requer aprovação prévia para promover a oferta.'
  },
  vertical: {
    agent: 'Niche Intelligence Agent',
    what: 'O nicho/categoria ao qual o produto pertence (ex: Emagrecimento, Finanças, Cursos).',
    why: 'Ajuda a carregar as sugestões de palavras-chave, estimativas de taxa de conversão (CVR) e listas padrão de negativas recomendadas.',
    steps: '1. Escolha a vertical correspondente ao nicho do produto.\n2. Note que a vertical define as sugestões de CVR e a lista-mestra de negativas.\n3. Se o produto pertencer a sub-nichos específicos, ajuste as palavras-chave manualmente.'
  },
  geo: {
    agent: 'Paid Ads Strategist',
    what: 'O país ou região geográfica onde os anúncios serão exibidos.',
    why: 'Os custos de clique (CPC) e conversão variam radicalmente por localização (Tier 1 vs Tier 3). Além disso, ofertas possuem restrições geográficas de entrega.',
    steps: '1. Verifique nos termos da oferta quais países (GEOS) são permitidos.\n2. Escolha o país onde seus anúncios serão veiculados.\n3. Certifique-se de configurar a segmentação de local como "presença apenas" no Google Ads.'
  },
  channel: {
    agent: 'Traffic Acquisition Strategist',
    what: 'A rede de anúncios específica do Google Ads (Pesquisa, Vídeo/YouTube, Demand Gen, Performance Max).',
    why: 'Cada canal requer criativos e landing pages adaptados. Iniciantes devem focar em Pesquisa (SEARCH) para tráfego com alta intenção.',
    steps: '1. Selecione o canal de tráfego do Google Ads (ex: SEARCH, YOUTUBE).\n2. Use SEARCH para iniciar com tráfego qualificado de intenção.\n3. Use YOUTUBE ou DEMAND GEN para escalar volume com anúncios gráficos e vídeo.'
  },
  funnel: {
    agent: 'CRO & Conversion Specialist',
    what: 'O tipo de página de destino que o usuário visitará após clicar no anúncio (Bridge Page, Review Page, Link Direto).',
    why: 'O Google Ads reprova links de afiliado direto na maioria das vezes. Bridge pages (artigo review ou pré-sell) são o padrão recomendado para evitar suspensões.',
    steps: '1. Defina o tipo de destino: BRIDGE, DIRECT, REVIEW ou SMARTLINK.\n2. Use BRIDGE (página ponte) para produtos físicos e verticais sensíveis para evitar reprovações.\n3. O link direto (DIRECT) é aceito em poucas ofertas e pode resultar em suspensão.'
  },
  pageType: {
    agent: 'Compliance Sentinel',
    what: 'A estrutura da presell gerada: advertorial, pogo, vsl, interstitial, authority, tsl, cookie_popup, review.',
    why: 'Cada canal aceita estruturas diferentes — interstitial só é seguro em YouTube/Demand Gen, nunca em Search, onde reprova revisão por falta de conteúdo editorial. Authority costuma converter melhor em nutra/saúde/beleza por reforçar credibilidade. Cookie/Popup e TSL são eficazes para fundo de funil.',
    steps: '1. Para Search, prefira Cookie/Popup, TSL ou Review para produtos com marca já estabelecida. Para produtos novos, use advertorial ou authority.\n2. VSL exige um vídeo real do vendor. TSL exige texto longo persuasivo. Review exige conteúdo de análise detalhada.\n3. Interstitial só em canais fora de Search/PMax — o Compliance Sentinel bloqueia a geração se o canal não permitir. Cookie/Popup é recomendado para iniciantes no fundo de funil, pois maximiza o rastreamento do clique.'
  },
  popupGate: {
    agent: 'CRO & Conversion Specialist',
    what: 'Pop-up de retenção "pressione e segure" opcional antes de revelar o conteúdo da presell.',
    why: 'Adiciona um passo de interação real (mesma experiência pra todo visitante, não é cloaking) que pode aumentar percepção de valor antes do CTA — mas também pode reduzir conversão se usado sem necessidade.',
    steps: '1. Ative só se fizer sentido pro ângulo/oferta (ex.: conteúdo "exclusivo").\n2. Teste com e sem pra ver o efeito real na sua vertical.\n3. Nunca combine com dark patterns — é só um delay de interação, não uma barreira enganosa.'
  },
  videoUrl: {
    agent: 'Presell Builder',
    what: 'Link do vídeo (YouTube, Vimeo ou .mp4 direto) usado como VSL na presell.',
    why: 'pageType "vsl" exige um vídeo real — sem isso a geração falha.',
    steps: '1. Cole a URL pública do vídeo (YouTube/Vimeo/.mp4).\n2. Use um vídeo do próprio vendor ou um review em vídeo genuíno.\n3. Confirme que o vídeo carrega antes de publicar a campanha.'
  },
  commission: {
    agent: 'Affiliate Finance Broker',
    what: 'O valor estimado pago pela rede de afiliados por cada conversão (venda/lead).',
    why: 'Esse valor é a base para o cálculo da comissão líquida, EPC de break-even e definição do seu lance máximo de CPC.',
    steps: '1. Insira o valor médio pago pela plataforma por conversão.\n2. Consulte a aba Marketplace da rede para obter o valor médio histórico.\n3. Utilize essa métrica para guiar seus cálculos de break-even.'
  },
  refundPct: {
    agent: 'Risk Assessment Agent',
    what: 'A taxa média de reembolsos (refund) ou cancelamentos históricos da oferta.',
    why: 'O ClickBank e redes semelhantes possuem taxas de reembolso de 5% a 15% em produtos físicos. Ignorar isso distorce a margem de lucro real.',
    steps: '1. Estime a taxa de reembolso com base no produto (geralmente 5% a 15%).\n2. Para produtos físicos nos EUA, considere usar 10% como padrão conservador.\n3. Esse valor deduzirá a comissão bruta para calcular seu lucro líquido real.'
  },
  aov: {
    agent: 'Affiliate Finance Broker',
    what: 'Valor Médio do Pedido (Average Order Value) que o cliente gasta, incluindo upsells.',
    why: 'Ofertas com forte funil de upsell geram comissões adicionais elevadas por clique.',
    steps: '1. Insira o valor médio do carrinho de compras da oferta.\n2. Considere os upsells recorrentes oferecidos pelo produtor no funil.\n3. Um AOV alto indica maior tolerância a CPCs mais caros durante a escala.'
  },
  offerUrl: {
    agent: 'Tracking & Analytics Engineer',
    what: 'O seu link de afiliado oficial (HopLink ou Smartlink) gerado na plataforma.',
    why: 'Esse link direciona o comprador para a página oficial do produto, garantindo que a sua comissão seja rastreada.',
    steps: '1. Acesse a rede de afiliados (ex: ClickBank), clique em "Promover" (Promote) e insira seu nickname para gerar o HopLink.\n2. Copie o link e certifique-se de adicionar os parâmetros de tracking necessários (como subid/clickid).\n3. Use este link no botão de chamada para ação (CTA) da sua pré-sell/bridge page.',
    apiKeyHelp: 'Acesse o Marketplace do ClickBank, clique em "Promote" no produto escolhido e copie o link. Para MaxWeb, acesse a oferta aprovada e copie o link.'
  },
  cvrExpected: {
    agent: 'CRO & Conversion Specialist',
    what: 'A taxa de conversão estimada da pré-sell para a venda (conversão por cliques).',
    why: 'Utilizada para calcular o EPC de break-even. Superestimar a CVR fará você pagar CPCs mais caros do que deveria.',
    steps: '1. Insira a taxa de conversão (cliques para vendas) esperada.\n2. Use de 1% a 2% como padrão conservador para tráfego frio em Search/YouTube.\n3. Não infle a CVR ou seus CPCs de break-even ficarão irrealisticamente altos.'
  },
  presellUrl: {
    agent: 'Compliance Sentinel',
    what: 'A URL pública onde sua pré-sell ou bridge page está hospedada.',
    why: 'Usado para auditoria e teste de carregamento rápido. O Google Ads exige que o domínio do anúncio corresponda ao destino.',
    steps: '1. Digite a URL final onde sua pré-sell ou bridge page foi publicada.\n2. O domínio deve ser idêntico ao que será usado na URL final dos anúncios do Google.\n3. Certifique-se de que a página carregue em menos de 3 segundos no mobile.'
  },
  flowpageUrl: {
    agent: 'CRO & Conversion Specialist',
    what: 'Link alternativo da sua FlowPage de tráfego rápido.',
    why: 'Útil para testes imediatos sem domínio próprio.',
    steps: '1. Crie ou configure sua página rápida no Flowpage.com.\n2. Insira os links de afiliado nos botões e publique a página.\n3. Cole o link final gerado neste campo para referência rápida.'
  },
  hostingerDomain: {
    agent: 'Hosting & Domain Specialist',
    what: 'O domínio do site hospedado na Hostinger.',
    why: 'Domínio próprio dá autoridade e qualidade ao anúncio do Google Ads.',
    steps: '1. Acesse seu painel da Hostinger para gerenciar domínios.\n2. Certifique-se de que o certificado SSL esteja ativo e configurado.\n3. Cole o domínio principal que você usará para criar as páginas ponte.'
  },
  presellHtml: {
    agent: 'Compliance & SEO Auditor',
    what: 'O código-fonte HTML completo da sua pré-sell.',
    why: 'O analisador de compliance do app lê esse HTML em milissegundos para identificar alegações proibidas antes de você subir no Google.',
    steps: '1. Desenvolva o HTML da sua pré-sell ou use o gerador de template.\n2. Cole o código HTML completo neste campo.\n3. Use o botão "Analisar com IA" para auditar possíveis alegações agressivas e claims de compliance.'
  },
  postbackUrl: {
    agent: 'Tracking & Analytics Engineer',
    what: 'O endpoint URL que notificará a rede MaxWeb ou outra de cada conversão.',
    why: 'O rastreamento via postback envia conversões diretas de volta do servidor da rede, essencial para que o Google Ads otimize os lances inteligentes.',
    steps: '1. Copie a URL de postback do seu rastreador de conversões.\n2. Configure a URL no painel da rede de afiliados (ex: MaxWeb).\n3. Teste o disparo gerando uma conversão manual de simulação.',
    apiKeyHelp: 'Acesse seu painel MaxWeb -> Pixels & Postbacks. Copie o postback para sua oferta e insira aqui. Para ClickBank, configure no menu Vendor Settings -> My Site.'
  },
  clickidToken: {
    agent: 'Tracking & Analytics Engineer',
    what: 'O nome do parâmetro que armazena o identificador exclusivo do clique no link.',
    why: 'Permite bater a conversão de volta com o clique exato no Google Ads.',
    steps: '1. Escolha o token que a rede utiliza para registrar a identificação do clique.\n2. Use "clickid" no MaxWeb e "subid" no ClickBank.\n3. Garanta que o token esteja mapeado no link final do redirecionamento.'
  },
  budgetTest: {
    agent: 'Paid Ads Finance Broker',
    what: 'O orçamento total alocado para testar e validar esta oferta.',
    why: 'Campanhas de afiliados devem ter limite de perda controlado. Recomendamos $50 a $80 para validação inicial de 48-72h.',
    steps: '1. Insira o orçamento de teste total alocado para esta oferta.\n2. Recomendamos usar o equivalente a pelo menos 1x a 2x o valor da comissão da oferta.\n3. Distribua o orçamento diário igualmente durante o período de testes de 72 horas.'
  },
  testDuration: {
    agent: 'Paid Ads Finance Broker',
    what: 'O tempo limite de duração do teste da campanha (ex: 48h, 72h).',
    why: 'Fase de validação inicial. Campanhas sem conversão nesse período devem ser desativadas.',
    steps: '1. Escolha o período que a campanha ficará ativa em fase de validação.\n2. Use 72 horas (3 dias) como padrão ideal para coletar cliques suficientes.\n3. Pause a campanha imediatamente se atingir o orçamento sem conversões.'
  },
  budgetScale: {
    agent: 'Paid Ads Finance Broker',
    what: 'O orçamento diário real a aplicar no Google Ads quando a campanha for confirmada para SCALE (depois de validada no teste).',
    why: 'Separa a etapa de risco controlado (teste) da etapa de investimento sério — evita escalar orçamento por engano e dá ao agente um número pra planejar CPC de scale e cobertura de keywords.',
    steps: '1. Só defina depois (ou junto) de ver os resultados do teste.\n2. Regra prática: 3x a 5x o budget diário de teste, se o EPC/CPC estiver saudável.\n3. Ao clicar "Scale" na página da campanha, esse valor é aplicado automaticamente como orçamento diário real no Google Ads.'
  }
};

export const AutofillContext = React.createContext<Record<string, string>>({});

export const AgentHelp = ({
  fieldKey,
  fieldValue,
  context,
  onApply,
}: {
  fieldKey: string;
  fieldValue?: string;
  context?: any;
  onApply?: (value: string) => void;
}) => {
  const help = FIELD_HELP[fieldKey];
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [suggestedValue, setSuggestedValue] = useState<string | null>(null);
  const autofillRationale = React.useContext(AutofillContext);
  const searchParams = useSearchParams();
  const campaignId = searchParams?.get('campaignId') ?? undefined;
  const autoSuggestion = autofillRationale?.[fieldKey];

  if (!help) return null;

  const handleVerify = async () => {
    if (!fieldValue || fieldValue.trim().length === 0) {
      toast.error('Preencha o campo primeiro antes de solicitar a verificação do agente.');
      return;
    }
    setAnalysing(true);
    setResult(null);
    setSuggestedValue(null);
    try {
      const res = await fetch('/api/wizard-field-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, fieldValue, context, campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.response);
        if (data.valorSugerido && data.valorSugerido !== fieldValue) setSuggestedValue(data.valorSugerido);
        toast.success('Análise de campo concluída pelo agente!');
      } else {
        setResult(data.error || 'Erro ao validar campo.');
      }
    } catch {
      setResult('Erro de rede ao falar com o agente.');
    } finally {
      setAnalysing(false);
    }
  };

  const handleApply = () => {
    if (!suggestedValue || !onApply) return;
    onApply(suggestedValue);
    toast.success('Correção aplicada ao campo.');
    setSuggestedValue(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="ml-1.5 inline-flex items-center justify-center text-slate-400 hover:text-green-400 transition-colors focus:outline-none" title={`Consultar ${help.agent}`}>
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#1e293b] border-[#334155] text-white p-4 shadow-xl z-50 rounded-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#334155] pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">{help.agent}</span>
            </div>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={analysing}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 h-6 rounded flex items-center gap-1 shrink-0"
            >
              {analysing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
              Analisar Campo
            </Button>
          </div>
          <div className="space-y-1.5 text-xs max-h-[320px] overflow-y-auto pr-1">
            <p className="text-slate-300"><strong className="text-white">O que preencher:</strong> {help.what}</p>
            <p className="text-slate-300"><strong className="text-white">Por que:</strong> {help.why}</p>
            <div className="text-slate-300">
              <strong className="text-white">Passo a passo:</strong>
              <div className="whitespace-pre-line mt-1 bg-[#0f172a] p-2 rounded text-[11px] font-mono leading-normal border border-[#334155]/50">
                {help.steps}
              </div>
            </div>
            {help.apiKeyHelp && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-[11px] text-yellow-300 mt-2">
                <strong>Onde encontrar:</strong> {help.apiKeyHelp}
              </div>
            )}
            {autoSuggestion && (
              <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded text-[11px] text-purple-200 mt-2">
                <strong className="text-purple-300 block mb-0.5">💡 Sugestão do agente (já aplicada):</strong>
                {autoSuggestion}
              </div>
            )}
            {result && (
              <div className="mt-3 bg-[#0f172a] border border-[#334155]/60 p-3 rounded-lg text-[11px] leading-relaxed space-y-1 text-slate-300">
                <span className="text-green-400 font-bold block mb-1">🤖 Análise do Agente:</span>
                <p className="whitespace-pre-line">{result}</p>
              </div>
            )}
            {suggestedValue && (
              <div className="mt-2 bg-green-500/10 border border-green-500/30 p-3 rounded-lg text-[11px] space-y-2">
                <div className="text-green-300 font-semibold">Correção sugerida:</div>
                <div className="font-mono text-white bg-[#0f172a] rounded p-2 break-all">{suggestedValue}</div>
                {onApply ? (
                  <Button type="button" onClick={handleApply} className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-7 w-full">
                    Aplicar correção no campo
                  </Button>
                ) : (
                  <p className="text-slate-400">Copie e cole manualmente — esse campo ainda não suporta aplicação direta.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ChecklistItemRow = ({
  item, checked, onToggle, meta, step, onFix,
}: {
  item: { key: string; label: string; critical: boolean };
  checked: boolean;
  onToggle: (v: boolean) => void;
  meta?: { verificationType: string; note?: string | null };
  step?: number;
  onFix?: (step: number, itemKey: string) => Promise<any>;
}) => {
  const isAuto = meta?.verificationType === 'auto';
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  const handleFix = async () => {
    if (!onFix || step === undefined) return;
    setFixing(true);
    setFixResult(null);
    try {
      setFixResult(await onFix(step, item.key));
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${checked ? 'bg-green-500/5 border border-green-500/20' : item.critical ? 'bg-red-500/5' : 'bg-[#0f172a]'}`}>
      {isAuto ? (
        checked ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      ) : (
        <Checkbox checked={checked} onCheckedChange={(v: any) => onToggle(!!v)} className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${checked ? 'text-green-300' : 'text-white'}`}>{item.label}</span>
        {isAuto
          ? <Badge className="ml-2 bg-blue-500/20 text-blue-300 text-[10px] hover:bg-blue-500/30">VERIFICADO</Badge>
          : <Badge className="ml-2 bg-slate-500/20 text-slate-300 text-[10px] hover:bg-slate-500/30">AUTOATESTADO</Badge>}
        {item.critical && !checked && <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30">CRÍTICO</Badge>}
        {isAuto && !checked && meta?.note && <p className="text-xs text-red-300 mt-1">{meta.note}</p>}
        {isAuto && !checked && onFix && step !== undefined && (
          <div className="mt-2">
            <Button type="button" size="sm" variant="outline" onClick={handleFix} disabled={fixing} className="h-7 text-[11px] border-[#334155] text-slate-300 gap-1.5">
              {fixing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Corrigir com agente
            </Button>
            {fixResult && (
              <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-[11px] space-y-1">
                {fixResult.error && <p className="text-red-300">{fixResult.error}</p>}
                {fixResult.diagnostico && <p className="text-slate-300">{fixResult.diagnostico}</p>}
                {fixResult.valorAplicado && (
                  <p className={fixResult.passouAVerificar ? 'text-green-300' : 'text-yellow-300'}>
                    Campo "{fixResult.campoAlterado}" atualizado para <span className="font-mono">{fixResult.valorAplicado}</span> —
                    {fixResult.passouAVerificar ? ' passou na verificação ✅' : ' ainda não passou, revise manualmente.'}
                  </p>
                )}
                {fixResult.correcao && <p className="text-white">{fixResult.correcao}</p>}
                {fixResult.proximaAcao && <p className="text-slate-400">{fixResult.proximaAcao}</p>}
                {fixResult.alreadyPassing && <p className="text-green-300">Este item já está passando.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export function applyEnumIfValid(options: readonly string[], setter: (v: any) => void, label: string) {
  return (v: string) => {
    if (options.includes(v)) {
      setter(v);
    } else {
      toast.error(`Sugestão do agente ("${v}") não é uma opção válida pra ${label} — ignorada.`);
    }
  };
}
