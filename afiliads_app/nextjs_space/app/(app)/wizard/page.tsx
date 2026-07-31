'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Wand2, ArrowRight, ArrowLeft, ShieldCheck, FileText, Search, Tag,
  Settings, Radio, Rocket, CheckCircle2, Copy, ExternalLink, AlertTriangle, Info,
  Eye, Loader2, Shield, XCircle, Sparkles, TrendingUp, Save, Zap, Play, Bot
} from 'lucide-react';
import {
  PLATFORMS, VERTICALS, CHANNELS, GEOS, CVR_DEFAULTS, ANTISTRIKE_ITEMS,
  BRIDGE_CHECKLIST, GOOGLE_ADS_CHECKLIST, TRACKING_CHECKLIST_MAXWEB,
  TRACKING_CHECKLIST_CB, GOLIVE_CHECKLIST, KEYWORDS_BY_VERTICAL,
  NEGATIVES_BY_VERTICAL
} from '@/lib/wizard-data';
import { Step7LeadingStream } from '@/components/wizard/Step7LeadingStream';

const STEPS = [
  { num: 1, title: 'Oferta', icon: FileText },
  { num: 2, title: 'Break-even', icon: Settings },
  { num: 3, title: 'Anti-strike', icon: ShieldCheck },
  { num: 4, title: 'Pré-sell', icon: Eye },
  { num: 5, title: 'Keywords', icon: Search },
  { num: 6, title: 'Naming', icon: Tag },
  { num: 7, title: 'Google Ads', icon: Settings },
  { num: 8, title: 'Tracking', icon: Radio },
  { num: 9, title: 'Go-live', icon: Rocket },
];

const FIELD_HELP: Record<string, {
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
    what: 'A estrutura da presell gerada: advertorial (artigo review), pogo (curta e direta), vsl (com vídeo), authority (autoridade editorial/científica — nav, ingredientes, pacotes, certificações) ou interstitial (screenshot + popup de segmentação).',
    why: 'Cada canal aceita estruturas diferentes — interstitial só é seguro em YouTube/Demand Gen, nunca em Search, onde reprova revisão por falta de conteúdo editorial. Authority costuma converter melhor em nutra/saúde/beleza por reforçar credibilidade.',
    steps: '1. Em Search, prefira advertorial, pogo ou authority.\n2. VSL exige um vídeo real do vendor.\n3. Interstitial só em canais fora de Search/PMax — o Compliance Sentinel bloqueia a geração se o canal não permitir.'
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

const AutofillContext = React.createContext<Record<string, string>>({});

const AgentHelp = ({
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
        body: JSON.stringify({ fieldKey, fieldValue, context }),
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

// Linha de item de checklist: itens 'auto' mostram o resultado de uma verificação real (não dá
// pra clicar/mentir sobre eles) + o motivo quando falham; itens autoatestados continuam um
// checkbox manual, mas claramente rotulados como tal — nenhum dos dois finge ser o outro.
const ChecklistItemRow = ({
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
        <Checkbox checked={checked} onCheckedChange={(v: any) => onToggle(!!v)} className="mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${checked ? 'text-green-300' : 'text-white'}`}>{item.label}</span>
        {isAuto
          ? <Badge className="ml-2 bg-blue-500/20 text-blue-300 text-[10px]">VERIFICADO</Badge>
          : <Badge className="ml-2 bg-slate-500/20 text-slate-300 text-[10px]">AUTOATESTADO</Badge>}
        {item.critical && !checked && <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px]">CRÍTICO</Badge>}
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

// Aplica a sugestão do AgentHelp num campo enum/Select só se o valor bater com uma opção real —
// o servidor (wizard-field-check) já valida isso antes de devolver, mas a UI nunca deve confiar
// cegamente (defesa em profundidade): sem isso, um valor fora do enum deixa o Select em branco
// e o estado interno "corrompido" segue pro salvamento da campanha sem ninguém perceber.
function applyEnumIfValid(options: readonly string[], setter: (v: any) => void, label: string) {
  return (v: string) => {
    if (options.includes(v)) {
      setter(v);
    } else {
      toast.error(`Sugestão do agente ("${v}") não é uma opção válida pra ${label} — ignorada.`);
    }
  };
}

export default function WizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [autofilling, setAutofilling] = useState(false);
  const [autofillRationale, setAutofillRationale] = useState<Record<string, string>>({});
  const [autofillSummary, setAutofillSummary] = useState<string | null>(null);
  const [aiNegatives, setAiNegatives] = useState<string[] | null>(null);
  const [sourceProductResearchId, setSourceProductResearchId] = useState<string | null>(null);
  const [researchProducts, setResearchProducts] = useState<Array<{ id: string; name: string; score: number; vertical: string; confirmedAt?: string | null }>>([]);

  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  const runCampaignAudit = async () => {
    if (!campaignId) return;
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/campaign-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
        setShowAuditDialog(true);
        toast.success('Auditoria concluída com sucesso!');
      } else {
        toast.error('Erro ao auditar campanha');
      }
    } catch {
      toast.error('Erro ao auditar campanha');
    } finally {
      setAuditing(false);
    }
  };

  // Step 1
  const [platform, setPlatform] = useState('ClickBank');
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('Weight Loss');
  const [geo, setGeo] = useState('US');
  const [channel, setChannel] = useState('SEARCH');
  const [funnel, setFunnel] = useState('BRIDGE');
  const [blockedChannels, setBlockedChannels] = useState<string[]>([]);
  const [channelBlockReason, setChannelBlockReason] = useState<string | null>(null);
  const [commission, setCommission] = useState('');
  const [refundPct, setRefundPct] = useState('');
  const [aov, setAov] = useState('');
  const [offerUrl, setOfferUrl] = useState('');

  // Step 2
  const [cvrExpected, setCvrExpected] = useState('');

  // Step 3
  const [antistrikeChecks, setAntistrikeChecks] = useState<Record<string, boolean>>({});

  // Step 4
  const [bridgeChecks, setBridgeChecks] = useState<Record<string, boolean>>({});
  const [presellUrl, setPresellUrl] = useState('');
  const [flowpageUrl, setFlowpageUrl] = useState('');
  const [hostingerDomain, setHostingerDomain] = useState('');
  const [presellHtml, setPresellHtml] = useState('');
  const [pageType, setPageType] = useState<'advertorial' | 'pogo' | 'vsl' | 'interstitial' | 'authority'>('advertorial');
  const [popupGate, setPopupGate] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPresell, setGeneratingPresell] = useState(false);
  // Staleness cross-step (Fase 2, 2026-07-27): snapshot dos campos que a presell usa pra se
  // gerar, tirado no momento da geração — se algum divergir depois (usuário mudou canal/tipo
  // de página/vídeo/nome em passo posterior), a presell pode estar desatualizada e precisa
  // regenerar antes de lançar. Comparação é só client-side (não bloqueia nada sozinha —
  // bridge_ok em GOLIVE_CHECKLIST continua sendo o gate real), é só aviso antecipado.
  const [presellSnapshot, setPresellSnapshot] = useState<{ channel: string; pageType: string; videoUrl: string; name: string } | null>(null);
  const [presellId, setPresellId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [ftpDomains, setFtpDomains] = useState<string[]>([]);
  const [publishingOwnDomain, setPublishingOwnDomain] = useState(false);

  // Step 5
  const [selectedKeywords, setSelectedKeywords] = useState<Array<{keyword:string;layer:string;matchType:string;relevance:number;selected:boolean}>>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // Step 6
  const [version, setVersion] = useState('1');

  // Step 7
  const [googleAdsChecks, setGoogleAdsChecks] = useState<Record<string, boolean>>({});
  const [creatingGads, setCreatingGads] = useState(false);
  const [googleCampaignId, setGoogleCampaignId] = useState<string | null>(null);

  // Step 8
  const [trackingChecks, setTrackingChecks] = useState<Record<string, boolean>>({});
  const [postbackUrl, setPostbackUrl] = useState('');
  const [clickidToken, setClickidToken] = useState('clickid');

  // Step 9
  const [goLiveChecks, setGoLiveChecks] = useState<Record<string, boolean>>({});
  const [budgetTest, setBudgetTest] = useState('50');

  // Metadados de verificação real dos checklists (auto vs autoatestado) — populado ao carregar
  // a campanha e ao rodar a verificação automática (/api/campaigns/[id]/checklists/verify).
  const [checklistMeta, setChecklistMeta] = useState<Record<string, { verificationType: string; note?: string | null }>>({});
  const [verifyingChecklist, setVerifyingChecklist] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [testDuration, setTestDuration] = useState('72h');
  const [budgetScale, setBudgetScale] = useState('0');
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopInterval, setLoopInterval] = useState('24h');
  const [loopAgents, setLoopAgents] = useState('ads,compliance');

  // Break-even calculations
  const commVal = parseFloat(commission) || 0;
  const refVal = parseFloat(refundPct) || 0;
  const cvr = parseFloat(cvrExpected) || CVR_DEFAULTS[vertical] || 1.0;
  const commissionNet = commVal * (1 - refVal / 100);
  const epcBE = commissionNet * (cvr / 100);
  const cpcMax = epcBE;
  const cpcScale = cpcMax / 1.3;

  // Campaign name generator
  const platformCode: Record<string, string> = { ClickBank: 'CB', BuyGoods: 'BG', MaxWeb: 'MW', Hotmart: 'HT', Eduzz: 'ED', Monetizze: 'MZ' };
  const verticalCode: Record<string, string> = { 'Weight Loss': 'WL', Nutra: 'NUTRA', 'Make Money': 'MMO', Relationships: 'REL', Health: 'HEALTH', Beauty: 'BEAUTY', 'Cursos BR': 'CURSO', Outro: 'OTHER' };
  const campaignNameGen = `${platformCode[platform] ?? 'XX'}_${verticalCode[vertical] ?? 'XX'}_${geo}_${channel}_${funnel}_v${version}`;
  const utmString = `?utm_source=google&utm_medium=cpc&utm_campaign=${campaignNameGen}&utm_content={creative}&utm_term={keyword}`;

  const days = testDuration === '48h' ? 2 : testDuration === '72h' ? 3 : parseInt(testDuration) || 3;
  const budgetDaily = (parseFloat(budgetTest) || 50) / days;

  // Step completion tracking
  const stepCompletion = {
    1: name.trim().length > 0 && commVal > 0,
    2: true,
    3: platform !== 'ClickBank' || ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => antistrikeChecks[i.key]),
    4: BRIDGE_CHECKLIST.filter(i => i.critical).every(i => bridgeChecks[i.key]),
    5: selectedKeywords.filter(k => k.selected).length >= 1,
    6: true,
    7: GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => googleAdsChecks[i.key]),
    8: platform !== 'MaxWeb' || TRACKING_CHECKLIST_MAXWEB.filter(i => i.critical).every(i => trackingChecks[i.key]),
    9: GOLIVE_CHECKLIST.filter(i => i.critical).every(i => goLiveChecks[i.key]),
  } as Record<number, boolean>;

  // Retorna o id salvo (corrigido 2026-07-27): quem chama isso pra depois usar o id (ex.:
  // generatePresellHtml) não pode confiar em ler `campaignId` do estado logo em seguida — o
  // setCampaignId() daqui é assíncrono, o valor só aparece no próximo render, então o closure
  // de quem chamou ainda vê o valor antigo (null na primeira campanha nova).
  const saveCampaign = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const payload = {
        name: name || `${campaignNameGen}`,
        productResearchId: sourceProductResearchId,
        platform, vertical, geo, channel, funnel,
        offerUrl, commission: commVal, refundPct: refVal,
        aov: parseFloat(aov) || 0, cvrExpected: cvr,
        commissionNet, epcBreakeven: epcBE, cpcMax, cpcScale,
        // presellUrl NÃO entra aqui de propósito (corrigido 2026-07-27): esse campo já tem
        // writers dedicados e precisos (generatePresellHtml, publishToOwnDomain, e o onBlur do
        // Input abaixo) — incluir no snapshot geral do saveCampaign() faz uma aba antiga (com
        // presellUrl desatualizado no estado local) sobrescrever silenciosamente uma URL mais
        // recente gravada por outra aba/ação (ex.: publicação em WordPress). Já aconteceu em
        // produção: presellUrl real (WordPress) foi revertido pro valor antigo do AfiliAds só
        // porque o usuário clicou "Próximo"/"Verificar" numa aba aberta antes da publicação.
        flowpageUrl, hostingerDomain,
        budgetTest: parseFloat(budgetTest) || 50,
        budgetDaily, testDuration,
        budgetScale: parseFloat(budgetScale) || 0,
        campaignNameGenerated: campaignNameGen,
        googleCampaignName: campaignNameGen,
        utmCampaign: campaignNameGen,
        utmString, wizardStep: step,
        loopEnabled, loopInterval, loopAgents,
        postbackUrl, clickidToken, presellHtml,
        pageType, popupGate, videoUrl,
      };
      if (campaignId) {
        await fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return campaignId;
      } else {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const newId = data?.id ?? null;
        setCampaignId(newId);
        return newId;
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar campanha');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveChecklists = async (stepNum: number, items: Array<{key:string;label:string;critical:boolean}>, checks: Record<string,boolean>) => {
    if (!campaignId) return;
    try {
      await fetch(`/api/campaigns/${campaignId}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ step: stepNum, itemKey: i.key, itemLabel: i.label, isCritical: i.critical, isChecked: checks[i.key] ?? false })) }),
      });
    } catch (err) { console.error(err); }
  };

  const hydrateFromCampaign = (c: any) => {
    setCampaignId(c?.id ?? null);
    setSourceProductResearchId(c?.productResearchId ?? c?.productResearch?.id ?? null);
    setName(c?.name ?? '');
    setPlatform(c?.platform ?? 'ClickBank');
    setVertical(c?.vertical ?? 'Weight Loss');
    setGeo(c?.geo ?? 'US');
    setChannel(c?.channel ?? 'SEARCH');
    setFunnel(c?.funnel ?? 'BRIDGE');
    setCommission(c?.commission ? String(c.commission) : '');
    setRefundPct(c?.refundPct ? String(c.refundPct) : '');
    setAov(c?.aov ? String(c.aov) : '');
    setOfferUrl(c?.offerUrl ?? '');
    setCvrExpected(c?.cvrExpected ? String(c.cvrExpected) : '');
    setPresellUrl(c?.presellUrl ?? '');
    setFlowpageUrl(c?.flowpageUrl ?? '');
    setHostingerDomain(c?.hostingerDomain ?? '');
    setPresellHtml(c?.presellHtml ?? '');
    setPageType(c?.pageType ?? 'advertorial');
    setPopupGate(!!c?.popupGate);
    setVideoUrl(c?.videoUrl ?? '');
    setPostbackUrl(c?.postbackUrl ?? '');
    setClickidToken(c?.clickidToken ?? 'clickid');
    setBudgetTest(c?.budgetTest ? String(c.budgetTest) : '50');
    setTestDuration(c?.testDuration ?? '72h');
    setBudgetScale(c?.budgetScale ? String(c.budgetScale) : '0');
    setLoopEnabled(!!c?.loopEnabled);
    setLoopInterval(c?.loopInterval ?? '24h');
    setLoopAgents(c?.loopAgents ?? 'ads,compliance');
    setGoogleCampaignId(c?.googleCampaignId ?? null);
    // Snapshot inicial pra detecção de staleness (Fase 2): assume que os campos batiam com a
    // presell na última vez que essa campanha foi salva — só divergências feitas NESTA sessão
    // de edição (a partir daqui) vão acender o aviso, o que cobre o cenário real do pedido
    // ("corrigi algo no passo 5 que invalida o passo 4").
    if (c?.presellGeneratedAt) {
      setPresellSnapshot({ channel: c?.channel ?? 'SEARCH', pageType: c?.pageType ?? 'advertorial', videoUrl: c?.videoUrl ?? '', name: c?.name ?? '' });
    }
    if (Array.isArray(c?.keywords) && c.keywords.length > 0) {
      setSelectedKeywords(c.keywords.map((k: any) => ({
        keyword: k.keyword, layer: k.layer, matchType: k.matchType, relevance: k.relevanceScore, selected: k.isSelected,
      })));
    }
    if (Array.isArray(c?.checklists) && c.checklists.length > 0) {
      const meta: Record<string, { verificationType: string; note?: string | null }> = {};
      const byStep: Record<number, Record<string, boolean>> = {};
      for (const row of c.checklists) {
        meta[row.itemKey] = { verificationType: row.verificationType ?? 'self_attested', note: row.note };
        byStep[row.step] = byStep[row.step] ?? {};
        byStep[row.step][row.itemKey] = row.isChecked;
      }
      setChecklistMeta(meta);
      if (byStep[3]) setAntistrikeChecks(byStep[3]);
      if (byStep[4]) setBridgeChecks(byStep[4]);
      if (byStep[7]) setGoogleAdsChecks(byStep[7]);
      if (byStep[8]) setTrackingChecks(byStep[8]);
      if (byStep[9]) setGoLiveChecks(byStep[9]);
    }
    if (typeof c?.wizardStep === 'number' && c.wizardStep >= 1 && c.wizardStep <= 9) setStep(c.wizardStep);
  };

  // Roda a verificação real (SSL, disclaimer/privacy no HTML, sync do Google Ads, etc.) em vez
  // de confiar só no que o usuário marcou — substitui o resultado dos itens `auto` pelo checado
  // de verdade; itens autoatestados continuam intocados (só o toggle manual do usuário).
  // Retorna o `byStep` fresco (corrigido 2026-07-27, Fase 2): quem chama isso e precisa decidir
  // algo NO MESMO fluxo (ex.: next()/launch() checando canAdvance logo depois) não pode ler os
  // estados setAntistrikeChecks/setBridgeChecks/etc. — são assíncronos, só valem no próximo
  // render, então o valor lido ali seria sempre o antigo (mesma classe de bug de
  // generatePresellHtml/saveCampaign, ver commit c90bafc).
  const runChecklistVerify = async (): Promise<Record<number, Record<string, boolean>> | null> => {
    if (!campaignId) { toast.error('Salve a campanha (avance um passo) antes de verificar o checklist.'); return null; }
    setVerifyingChecklist(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/checklists/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao verificar checklist'); return null; }
      const meta = { ...checklistMeta };
      const byStep: Record<number, Record<string, boolean>> = {};
      for (const row of data.items ?? []) {
        meta[row.itemKey] = { verificationType: row.verificationType, note: row.note };
        byStep[row.step] = byStep[row.step] ?? {};
        byStep[row.step][row.itemKey] = row.isChecked;
      }
      setChecklistMeta(meta);
      if (byStep[3]) setAntistrikeChecks((prev) => ({ ...prev, ...byStep[3] }));
      if (byStep[4]) setBridgeChecks((prev) => ({ ...prev, ...byStep[4] }));
      if (byStep[7]) setGoogleAdsChecks((prev) => ({ ...prev, ...byStep[7] }));
      if (byStep[8]) setTrackingChecks((prev) => ({ ...prev, ...byStep[8] }));
      if (byStep[9]) setGoLiveChecks((prev) => ({ ...prev, ...byStep[9] }));
      toast.success(`Checklist verificado de verdade — ${data.verified} item(ns) checado(s) automaticamente.`);
      return byStep;
    } catch {
      toast.error('Erro de rede ao verificar checklist.');
      return null;
    } finally {
      setVerifyingChecklist(false);
    }
  };

  // "Corrigir com agente" (Fase 3): chama o agente pro item de checklist que falhou. Quando o
  // item mapeia pra um campo real (ex.: postbackUrl/clickidToken), o servidor já aplica e
  // re-verifica — só precisamos sincronizar o campo local (senão o Input fica mostrando o
  // valor velho) e resincronizar o checklist inteiro pra refletir o resultado fresco.
  const fixChecklistItem = async (step: number, itemKey: string) => {
    if (!campaignId) { toast.error('Salve a campanha antes de corrigir o checklist.'); return { error: 'Campanha não salva ainda.' }; }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/checklists/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, itemKey }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) return { error: data?.error ?? 'Erro ao corrigir item de checklist' };
      if (data.campoAlterado === 'postbackUrl' && typeof data.valorAplicado === 'string') setPostbackUrl(data.valorAplicado);
      if (data.campoAlterado === 'clickidToken' && typeof data.valorAplicado === 'string') setClickidToken(data.valorAplicado);
      if (data.passouAVerificar || data.campoAlterado) await runChecklistVerify();
      return data;
    } catch {
      return { error: 'Erro de rede ao corrigir item de checklist.' };
    }
  };

  // Cria a campanha de verdade no Google Ads (PAUSED) — corrigido 2026-07-27: antes só existia
  // em app/(app)/campanhas/[id]/page.tsx, fora do wizard, então o Passo 9 (Go-live) travava
  // pedindo googleCampaignId sem nenhuma ação disponível no próprio wizard pra consegui-lo.
  // Reaproveita literalmente o mesmo endpoint (/api/google-ads/create) e o mesmo gate de
  // checklist crítico que já existe lá.
  const createInGoogleAds = async () => {
    if (!campaignId) { toast.error('Salve a campanha (avance um passo) antes de criar no Google Ads.'); return; }
    setCreatingGads(true);
    try {
      const res = await fetch('/api/google-ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleCampaignId(data.googleCampaignId ?? 'criada');
        toast.success(data.mock ? 'Campanha criada em modo simulação (credenciais reais do Google Ads não configuradas)' : 'Campanha criada no Google Ads como PAUSED — ative manualmente quando estiver pronta');
        await runChecklistVerify();
      } else {
        toast.error(data.error || 'Erro ao criar campanha no Google Ads');
      }
    } catch {
      toast.error('Erro de rede ao criar campanha no Google Ads');
    } finally {
      setCreatingGads(false);
    }
  };

  // `baseline` traz os valores conhecidos ANTES do autofill (ex.: os da campanha recém-hidratada).
  // Necessário porque o estado do React ainda não reflete a hidratação síncrona anterior quando
  // este autofill roda logo em seguida dentro do mesmo efeito assíncrono — ler os setters de estado
  // via closure aqui pegaria valores desatualizados (stale) e sobrescreveria dados reais da campanha.
  const applyAutofill = (data: any, opts?: { onlyIfEmpty?: boolean; baseline?: Record<string, any>; existingKeywordsCount?: number }) => {
    const onlyIfEmpty = !!opts?.onlyIfEmpty;
    const baseline = opts?.baseline ?? {};
    const setIf = (key: string, setter: (v: string) => void, value: any) => {
      if (value === undefined || value === null || String(value).trim() === '') return;
      if (onlyIfEmpty) {
        const cur = baseline[key];
        if (cur !== undefined && cur !== null && String(cur).trim().length > 0) return;
      }
      setter(String(value));
    };
    setIf('name', setName, data.name);
    setIf('platform', setPlatform, data.platform);
    setIf('vertical', setVertical, data.vertical);
    setIf('geo', setGeo, data.geo);
    setIf('channel', setChannel, data.channel);
    setIf('funnel', setFunnel, data.funnel);
    setIf('commission', setCommission, data.commission);
    setIf('refundPct', setRefundPct, data.refundPct);
    setIf('aov', setAov, data.aov);
    setIf('offerUrl', setOfferUrl, data.offerUrl);
    setIf('cvrExpected', setCvrExpected, data.cvrExpected);
    setIf('budgetTest', setBudgetTest, data.budgetTest);
    setIf('testDuration', setTestDuration, data.testDuration);
    setIf('budgetScale', setBudgetScale, data.budgetScale);
    if (Array.isArray(data.keywords) && data.keywords.length > 0 && (!onlyIfEmpty || !opts?.existingKeywordsCount)) {
      setSelectedKeywords(data.keywords);
    }
    if (Array.isArray(data.negatives) && data.negatives.length > 0) setAiNegatives(data.negatives);
    if (data.rationale) setAutofillRationale((prev) => ({ ...prev, ...data.rationale }));
    if (data.summary) setAutofillSummary(data.summary);
    if (data.strategy) {
      setBlockedChannels(Array.isArray(data.strategy.blockedChannels) ? data.strategy.blockedChannels : []);
      setChannelBlockReason(data.strategy.channelBlockReason ?? null);
      // O motor determinístico (lib/campaign-strategy.ts) já decide o pageType certo por canal
      // — inclusive "interstitial" só quando o canal é YOUTUBE/DEMAND_GEN e nunca em SEARCH/PMAX.
      // Aplica como sugestão (não sobrescreve escolha manual já salva de uma campanha existente).
      const suggestedPageType = data.strategy.recommendedBridgeType;
      if (['advertorial', 'pogo', 'vsl', 'interstitial'].includes(suggestedPageType)) {
        const curPageType = baseline.pageType;
        if (!onlyIfEmpty || curPageType === undefined || curPageType === null || String(curPageType).trim() === '') {
          setPageType(suggestedPageType);
        }
      }
    }
  };

  const runAutofill = async (params: { productResearchId?: string; campaignId?: string; baseline?: Record<string, any>; existingKeywordsCount?: number }) => {
    setAutofilling(true);
    try {
      const res = await fetch('/api/wizard-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productResearchId: params.productResearchId, campaignId: params.campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao gerar sugestões do agente');
        return;
      }
      applyAutofill(data, {
        onlyIfEmpty: !params.productResearchId && !!params.campaignId,
        baseline: params.baseline,
        existingKeywordsCount: params.existingKeywordsCount,
      });
      toast.success('Wizard preenchido pelo Campaign Setup Strategist — revise e ajuste conforme necessário.');
    } catch {
      toast.error('Erro de rede ao consultar o agente.');
    } finally {
      setAutofilling(false);
    }
  };

  useEffect(() => {
    const prId = searchParams?.get('productResearchId') ?? undefined;
    const cId = searchParams?.get('campaignId') ?? undefined;
    if (!prId && !cId) return;
    (async () => {
      if (cId) {
        try {
          const res = await fetch(`/api/campaigns/${cId}`);
          if (res.ok) {
            const c = await res.json();
            hydrateFromCampaign(c);
            toast.success('Campanha carregada — continue de onde parou.');
            await runAutofill({
              campaignId: cId,
              existingKeywordsCount: Array.isArray(c?.keywords) ? c.keywords.length : 0,
              baseline: {
                name: c?.name, platform: c?.platform, vertical: c?.vertical, geo: c?.geo,
                channel: c?.channel, funnel: c?.funnel, commission: c?.commission, refundPct: c?.refundPct,
                aov: c?.aov, offerUrl: c?.offerUrl, cvrExpected: c?.cvrExpected,
                budgetTest: c?.budgetTest, testDuration: c?.testDuration, budgetScale: c?.budgetScale,
                pageType: c?.pageType,
              },
            });
            return;
          }
        } catch { /* segue sem hidratar */ }
      }
      if (prId) {
        const product = await requireConfirmedProduct(prId);
        if (!product?.confirmedAt) {
          toast.error('Confirme as regras do vendor na Busca de Produtos antes de carregar este produto.');
          router.push(`/busca-produtos?productId=${prId}`);
          return;
        }
        setSourceProductResearchId(prId);
        await runAutofill({ productResearchId: prId });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then(data => setResearchProducts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/wp-sites')
      .then(res => res.ok ? res.json() : Promise.resolve({} as { ftpDomains?: string[] }))
      .then(data => setFtpDomains(Array.isArray(data?.ftpDomains) ? data.ftpDomains! : []))
      .catch(() => {});
  }, []);

  const requireConfirmedProduct = async (id: string): Promise<{ confirmedAt?: string | null } | null> => {
    const cached = researchProducts.find(p => p.id === id);
    if (cached) return cached;
    try {
      const res = await fetch('/api/products');
      if (!res.ok) return null;
      const list = await res.json();
      return Array.isArray(list) ? (list.find((p: any) => p.id === id) ?? null) : null;
    } catch { return null; }
  };

  const loadFromResearch = async (id: string) => {
    if (!id) return;
    const product = await requireConfirmedProduct(id);
    if (!product?.confirmedAt) {
      toast.error('Confirme as regras do vendor na Busca de Produtos antes de carregar este produto.');
      router.push(`/busca-produtos?productId=${id}`);
      return;
    }
    setSourceProductResearchId(id);
    await runAutofill({ productResearchId: id });
  };

  const saveKeywords = async () => {
    const cid = campaignId || (await saveCampaign());
    if (!cid) return;
    const kws = selectedKeywords.filter(k => k.selected);
    if (kws.length > 0) {
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws.map(k => ({ ...k, relevanceScore: k.relevance, campaignId: cid, isSelected: true })) }),
      });
    }
  };

  // `fresh` (opcional): resultado recém-vindo de runChecklistVerify() — usa ele em vez do
  // estado local quando disponível (corrigido 2026-07-27, Fase 2: o estado só reflete a
  // verificação depois do próximo render, ver comentário em runChecklistVerify).
  const canAdvance = (fresh?: Record<number, Record<string, boolean>> | null) => {
    if (step === 1) return name.trim().length > 0 && commVal > 0;
    const checksFor = (s: number, fallback: Record<string, boolean>) => fresh?.[s] ? { ...fallback, ...fresh[s] } : fallback;
    if (step === 3 && platform === 'ClickBank') {
      return ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => checksFor(3, antistrikeChecks)[i.key]);
    }
    if (step === 4) return BRIDGE_CHECKLIST.filter(i => i.critical).every(i => checksFor(4, bridgeChecks)[i.key]);
    if (step === 5) return selectedKeywords.filter(k => k.selected).length >= 1;
    if (step === 7) return GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => checksFor(7, googleAdsChecks)[i.key]);
    if (step === 8) {
      const trackingItems = platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
      return trackingItems.filter(i => i.critical).every(i => checksFor(8, trackingChecks)[i.key]);
    }
    if (step === 9) return GOLIVE_CHECKLIST.filter(i => i.critical).every(i => checksFor(9, goLiveChecks)[i.key]);
    return true;
  };

  // Passos com checklist 'auto' — precisam de verificação fresca do servidor antes de avançar
  // (corrigido 2026-07-27, Fase 2): canAdvance() sozinho só lia estado local, que podia estar
  // desatualizado (ex.: presell regenerada depois da última verificação, ou correção feita num
  // campo que afeta um item 'auto' de um passo anterior). Ver
  // ~/.claude/plans/velvet-finding-cherny.md.
  const STEPS_COM_VERIFICACAO_AUTO = new Set([3, 4, 7, 8, 9]);

  const next = async () => {
    await saveCampaign();
    if (step === 3) await saveChecklists(3, ANTISTRIKE_ITEMS, antistrikeChecks);
    if (step === 4) await saveChecklists(4, BRIDGE_CHECKLIST, bridgeChecks);
    if (step === 5) await saveKeywords();
    if (step === 7) await saveChecklists(7, GOOGLE_ADS_CHECKLIST, googleAdsChecks);
    if (step === 8) {
      const items = platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
      await saveChecklists(8, items, trackingChecks);
    }
    let freshChecks: Record<number, Record<string, boolean>> | null = null;
    if (STEPS_COM_VERIFICACAO_AUTO.has(step) && campaignId) {
      setAdvancing(true);
      try {
        freshChecks = await runChecklistVerify();
      } finally {
        setAdvancing(false);
      }
    }
    // Trava real: não avança com item crítico pendente (auto ou autoatestado) — antes disso só
    // mostrava um aviso e deixava passar mesmo assim. Use "Verificar automaticamente" pra
    // confirmar os itens verificáveis, ou marque manualmente os autoatestados. Agora sempre
    // roda em cima do resultado FRESCO acima, nunca de estado que pode estar velho.
    if (!canAdvance(freshChecks)) {
      toast.error('Não é possível avançar: complete os itens críticos deste passo primeiro (use "Verificar automaticamente" ou marque os autoatestados pendentes).');
      return;
    }
    if (step < 9) setStep(step + 1);
  };

  const prev = () => { if (step > 1) setStep(step - 1); };

  const launch = async () => {
    await saveCampaign();
    await saveChecklists(9, GOLIVE_CHECKLIST, goLiveChecks);
    // Última validação fresca antes de lançar de verdade (Fase 2, 2026-07-27) — nunca lança em
    // cima de goLiveChecks potencialmente velho (ex.: usuário ficou um tempo no Passo 9 e algo
    // mudou nesse meio tempo, como o status da presell vinculada ou da campanha no Google Ads).
    if (campaignId) {
      setAdvancing(true);
      let freshChecks: Record<number, Record<string, boolean>> | null = null;
      try {
        freshChecks = await runChecklistVerify();
      } finally {
        setAdvancing(false);
      }
      if (!canAdvance(freshChecks)) {
        toast.error('A verificação final encontrou item(ns) crítico(s) pendente(s) — confira o checklist antes de lançar.');
        return;
      }
    }
    if (campaignId) {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EM_TESTE', wizardCompleted: true, launchedAt: new Date().toISOString(), wizardStep: 9 }),
      });
      const kws = selectedKeywords.filter(k => k.selected);
      if (kws.length > 0) {
        await fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: kws.map(k => ({ ...k, relevanceScore: k.relevance, campaignId, isSelected: true })) }),
        });
      }
    }
    toast.success('Campanha lançada com sucesso! 🚀');
    if (sourceProductResearchId && campaignId) {
      router.push(`/trend-lab?campaignId=${campaignId}&productResearchId=${sourceProductResearchId}`);
    } else {
      router.push('/campanhas');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator?.clipboard?.writeText?.(text);
    toast.success('Copiado!');
  };

  const addKeywordFromSuggestions = (kw: string, layer: string) => {
    if (selectedKeywords.find(k => k.keyword === kw)) return;
    setSelectedKeywords(prev => [...prev, { keyword: kw, layer, matchType: 'phrase', relevance: 3, selected: true }]);
  };

  const addManualKeyword = () => {
    if (!newKeyword.trim()) return;
    setSelectedKeywords(prev => [...prev, { keyword: newKeyword.trim(), layer: 'A', matchType: 'phrase', relevance: 3, selected: true }]);
    setNewKeyword('');
  };

  const analyzePresell = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/presell-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presellUrl: presellUrl || undefined,
          presellHtml: presellHtml || undefined,
          keyword: selectedKeywords.find(k => k.selected)?.keyword ?? name,
          vertical,
          platform,
          offerUrl,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        toast.success('Análise concluída!');
      } else {
        toast.error('Erro na análise');
      }
    } catch {
      toast.error('Erro na análise');
    } finally {
      setAnalyzing(false);
    }
  };

  // Chama o pipeline real de geração (lib/presell.ts via /api/presells) — corrigido
  // 2026-07-27: antes disso era um preenchimento de string local (BRIDGE_TEMPLATE), nunca
  // criava um Presell vinculado à campanha, e por isso o checklist 'auto' (que procura um
  // Presell real via campaignId — ver getPresellHtml() em lib/complianceVerifier.ts) nunca
  // encontrava nada pra verificar. Precisa de campaignId (salva a campanha antes, se preciso)
  // e de um hopLink real (offerUrl).
  const generatePresellHtml = async (extraContext?: string) => {
    if (!offerUrl || !/^https?:\/\//.test(offerUrl)) {
      toast.error('Preencha a URL da oferta (offerUrl, passo 1) com um link https:// válido antes de gerar a presell.');
      return;
    }
    const cid = campaignId || (await saveCampaign());
    if (!cid) {
      toast.error('Não foi possível salvar a campanha antes de gerar a presell.');
      return;
    }
    const productName = researchProducts.find(p => p.id === sourceProductResearchId)?.name || name || vertical;
    setGeneratingPresell(true);
    try {
      const res = await fetch('/api/presells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          hopLink: offerUrl,
          productId: sourceProductResearchId || undefined,
          campaignId: cid,
          pageType,
          popupGate,
          videoUrl: pageType === 'vsl' ? videoUrl : undefined,
          channel,
          geo,
          trackingId: name || undefined,
          context: extraContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao gerar a presell com o agente.');
        return;
      }
      setPresellHtml(data.html ?? '');
      setPresellId(data.id ?? null);
      const absoluteUrl = typeof data.url === 'string' && data.url.startsWith('/')
        ? `${window.location.origin}${data.url}`
        : data.url;
      if (absoluteUrl) setPresellUrl(absoluteUrl);
      setShowPreview(true);
      setPresellSnapshot({ channel, pageType, videoUrl, name });
      // Persiste a URL de verdade junto com presellGeneratedAt — sem isso, checagens que leem
      // campaign.presellUrl direto do banco (ex.: "SSL ativo") ficam falhando logo após gerar,
      // já que só um saveCampaign() completo (Próximo/Salvar Rascunho) sincronizava esse campo.
      fetch(`/api/campaigns/${cid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presellGeneratedAt: new Date().toISOString(), presellUrl: absoluteUrl || presellUrl }),
      }).catch(() => {});
      toast.success('Presell gerada pelo Presell Builder (IA) — revise antes de avançar.');
    } catch {
      toast.error('Erro de rede ao gerar a presell.');
    } finally {
      setGeneratingPresell(false);
    }
  };

  // "Regenerar com correções" (Fase 3d): busca as lições da mesma vertical/canal/plataforma
  // já aprendidas via "Corrigir com agente" (ChecklistLearning) e injeta como contexto extra
  // na regeneração — pra não ter que descrever de novo manualmente um problema já resolvido
  // numa campanha anterior.
  const regenerateWithCorrections = async () => {
    if (!campaignId) { toast.error('Salve a campanha antes de regenerar com correções.'); return; }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/checklists/learnings`);
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao buscar lições aprendidas'); return; }
      if (!data.context) { toast.error('Nenhuma correção registrada ainda pra esta vertical/canal — use "Corrigir com agente" nos itens que falharem primeiro.'); return; }
      await generatePresellHtml(data.context);
    } catch {
      toast.error('Erro de rede ao buscar lições aprendidas.');
    }
  };

  // Publica a presell gerada no domínio próprio do usuário via FTP (lib/presell.ts →
  // publishToFtp, configurado em FTP_SITES_JSON) — usado quando o domínio não é WordPress.
  // Atualiza presellUrl/hostingerDomain da campanha com a URL real publicada.
  const publishToOwnDomain = async () => {
    if (!presellId) { toast.error('Gere a presell primeiro antes de publicar no domínio próprio.'); return; }
    const domain = ftpDomains.includes(hostingerDomain) ? hostingerDomain : ftpDomains[0];
    if (!domain) { toast.error('Nenhum domínio FTP configurado (FTP_SITES_JSON).'); return; }
    setPublishingOwnDomain(true);
    try {
      const res = await fetch(`/api/presells/${presellId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino: 'ftp', dominio: domain }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao publicar no domínio próprio.'); return; }
      const publishedUrl = data?.presell?.url;
      if (publishedUrl) setPresellUrl(publishedUrl);
      setHostingerDomain(domain);
      const cid = campaignId || (await saveCampaign());
      if (cid) {
        await fetch(`/api/campaigns/${cid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presellUrl: publishedUrl, hostingerDomain: domain }),
        }).catch(() => {});
      }
      toast.success(`Publicada em ${publishedUrl}`);
    } catch {
      toast.error('Erro de rede ao publicar no domínio próprio.');
    } finally {
      setPublishingOwnDomain(false);
    }
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <AutofillContext.Provider value={autofillRationale}>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-green-400" /> Wizard de Nova Campanha
          </h1>
          <p className="text-slate-400 text-sm mt-1">Passo {step} de 9 — {STEPS[step-1]?.title}</p>
        </div>
        {campaignId && (
          <Button onClick={runCampaignAudit} disabled={auditing} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
            {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {auditing ? 'Auditando...' : 'Reanalisar Campanha com IA'}
          </Button>
        )}
      </div>

      {autofilling && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-purple-600/10 to-green-600/10 border border-purple-500/30 rounded-lg p-4">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Bot className="h-4 w-4 text-purple-400" /> Analisando produto...</p>
            <p className="text-xs text-slate-400 mt-0.5">O Campaign Setup Strategist está estudando o dossiê do produto e preenchendo o wizard com as melhores práticas.</p>
          </div>
        </div>
      )}

      {!autofilling && autofillSummary && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-200">{autofillSummary} Passe o mouse no ícone <Sparkles className="inline h-3 w-3" /> ao lado de cada campo para ver a justificativa do agente.</p>
        </div>
      )}

      {showAuditDialog && auditResult && (
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-2xl bg-[#1e293b] border-[#334155] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-400" /> Relatório de Auditoria IA
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Análise de riscos e compliance pré-lançamento
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mt-4">
              <div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-lg">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={(auditResult.audit_score ?? 0) >= 80 ? '#22c55e' : (auditResult.audit_score ?? 0) >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${((auditResult.audit_score ?? 0) / 100) * 175.9} 175.9`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{auditResult.audit_score ?? 0}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Pontuação de Prontidão</h4>
                  <p className="text-xs text-slate-400">Risk Level: <span className={`font-bold ${(auditResult.risk_level === 'LOW' || auditResult.risk_level === 'MEDIUM') ? 'text-green-400' : 'text-red-400'}`}>{auditResult.risk_level}</span></p>
                </div>
              </div>

              {auditResult.summary && (
                <p className="text-sm text-slate-300 italic bg-[#0f172a] p-3 rounded-lg border border-[#334155]/40">{auditResult.summary}</p>
              )}

              {auditResult.blockers?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Bloqueadores de Lançamento (Críticos):</p>
                  {auditResult.blockers.map((b: string, i: number) => <p key={i} className="text-xs text-red-300 pl-5">• {b}</p>)}
                </div>
              )}

              {auditResult.warnings?.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Avisos / Otimizações:</p>
                  {auditResult.warnings.map((w: string, i: number) => <p key={i} className="text-xs text-yellow-300 pl-5">• {w}</p>)}
                </div>
              )}

              {auditResult.recommendations?.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-blue-400 flex items-center gap-1.5"><Info className="h-4 w-4" /> Recomendações Estratégicas:</p>
                  {auditResult.recommendations.map((r: string, i: number) => <p key={i} className="text-xs text-blue-300 pl-5">• {r}</p>)}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={() => setShowAuditDialog(false)} className="bg-green-600 hover:bg-green-700 text-white">Fechar Relatório</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Progress with circular indicators */}
      <div className="space-y-3">
        <Progress value={(step / 9) * 100} className="h-2 bg-[#1e293b]" />
        <div className="flex justify-between gap-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const isComplete = s.num < step || (s.num === step && stepCompletion[s.num]);
            const isCurrent = s.num === step;
            const isPast = s.num < step;
            return (
              <button
                key={s.num}
                onClick={() => s.num <= step && setStep(s.num)}
                className="flex flex-col items-center gap-1 text-xs transition-all group"
              >
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCurrent ? 'bg-green-500/20 ring-2 ring-green-400' :
                  isPast && isComplete ? 'bg-green-500/10' :
                  isPast ? 'bg-yellow-500/10' :
                  'bg-[#1e293b]'
                }`}>
                  {isPast && isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <Icon className={`h-4 w-4 ${
                      isCurrent ? 'text-green-400' : isPast ? 'text-slate-400' : 'text-slate-600'
                    }`} />
                  )}
                </div>
                <span className={`hidden sm:block ${
                  isCurrent ? 'text-green-400 font-medium' : isPast ? 'text-slate-400' : 'text-slate-600'
                }`}>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aviso de presell desatualizada (Fase 2, 2026-07-27): canal/tipo de página/vídeo/nome
          mudaram depois da última geração — a presell publicada pode não bater mais com a
          configuração atual da campanha. Não bloqueia sozinho (bridge_ok em GOLIVE_CHECKLIST é
          o gate real), só avisa cedo pra evitar lançar em cima de conteúdo desatualizado. */}
      {presellSnapshot && step >= 5 && (
        presellSnapshot.channel !== channel || presellSnapshot.pageType !== pageType ||
        presellSnapshot.videoUrl !== videoUrl || presellSnapshot.name !== name
      ) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-200">
              Canal, tipo de página, vídeo ou nome mudaram desde a última geração da pré-sell — ela pode estar desatualizada. Regenere antes de lançar.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setStep(4); generatePresellHtml(); }} disabled={generatingPresell} className="border-amber-500/40 text-amber-200 gap-1.5 shrink-0">
            {generatingPresell ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerar agora
          </Button>
        </div>
      )}

      {/* Step Content */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardContent className="p-6">
          {/* STEP 1 - Oferta */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Dados da Oferta</h2>
              {researchProducts.length > 0 && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <Label className="text-purple-300 text-xs shrink-0 flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> Carregar de um produto pesquisado</Label>
                  <Select value={sourceProductResearchId ?? ''} onValueChange={loadFromResearch} disabled={autofilling}>
                    <SelectTrigger className={`${inputCls} flex-1`}><SelectValue placeholder="Escolha um produto já analisado em Busca de Produtos..." /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155] max-h-72">
                      {researchProducts.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white">{p.name} — {p.vertical || 'sem vertical'} (score {p.score})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Nome da Campanha *</Label><AgentHelp fieldKey="name" fieldValue={name} context={{ platform, vertical, geo }} onApply={setName} /></div><Input value={name} onChange={(e:any) => setName(e?.target?.value ?? '')} placeholder="Ex: WL Supplement Alpha" className={inputCls} /></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Plataforma</Label><AgentHelp fieldKey="platform" fieldValue={platform} onApply={applyEnumIfValid(PLATFORMS, setPlatform, 'Plataforma')} /></div>
                  <Select value={platform} onValueChange={setPlatform}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]">{PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Vertical</Label><AgentHelp fieldKey="vertical" fieldValue={vertical} onApply={applyEnumIfValid(VERTICALS, setVertical, 'Vertical')} /></div>
                  <Select value={vertical} onValueChange={(v) => { setVertical(v); setCvrExpected(''); }}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]">{VERTICALS.map(v => <SelectItem key={v} value={v} className="text-white">{v}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Geo</Label><AgentHelp fieldKey="geo" fieldValue={geo} onApply={applyEnumIfValid(GEOS, setGeo, 'Geo')} /></div>
                  <Select value={geo} onValueChange={setGeo}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]">{GEOS.map(g => <SelectItem key={g} value={g} className="text-white">{g}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Canal</Label><AgentHelp fieldKey="channel" fieldValue={channel} context={{ vertical }} onApply={applyEnumIfValid(CHANNELS, setChannel, 'Canal')} /></div>
                  <Select value={channel} onValueChange={setChannel}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]">{CHANNELS.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}</SelectContent>
                  </Select>
                  {blockedChannels.includes(channel) && (
                    <p className="text-xs text-amber-300 mt-1">⚠️ {channelBlockReason ?? 'Este canal pode estar bloqueado pelas regras de tráfego do vendor para este produto.'} Confirme antes de gastar.</p>
                  )}
                  </div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Funil</Label><AgentHelp fieldKey="funnel" fieldValue={funnel} onApply={applyEnumIfValid(['BRIDGE', 'DIRECT', 'REVIEW', 'SL'], setFunnel, 'Funil')} /></div>
                  <Select value={funnel} onValueChange={setFunnel}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]"><SelectItem value="BRIDGE" className="text-white">Bridge</SelectItem><SelectItem value="DIRECT" className="text-white">Direct</SelectItem><SelectItem value="REVIEW" className="text-white">Review</SelectItem><SelectItem value="SL" className="text-white">Smartlink</SelectItem></SelectContent>
                  </Select></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Comissão USD *</Label><AgentHelp fieldKey="commission" fieldValue={commission} context={{ platform, vertical, geo }} onApply={setCommission} /></div><Input type="number" value={commission} onChange={(e:any) => setCommission(e?.target?.value ?? '')} placeholder="Ex: 47.00" className={inputCls} /></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Refund % estimado</Label><AgentHelp fieldKey="refundPct" fieldValue={refundPct} context={{ platform, vertical }} onApply={setRefundPct} /></div><Input type="number" value={refundPct} onChange={(e:any) => setRefundPct(e?.target?.value ?? '')} placeholder="Ex: 10" className={inputCls} /></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">AOV (USD)</Label><AgentHelp fieldKey="aov" fieldValue={aov} onApply={setAov} /></div><Input type="number" value={aov} onChange={(e:any) => setAov(e?.target?.value ?? '')} placeholder="Ex: 67.00" className={inputCls} /></div>
                <div className="sm:col-span-2"><div className="flex items-center gap-1"><Label className="text-slate-300">URL da Oferta (HopLink/Smartlink)</Label><AgentHelp fieldKey="offerUrl" fieldValue={offerUrl} onApply={setOfferUrl} /></div><Input value={offerUrl} onChange={(e:any) => setOfferUrl(e?.target?.value ?? '')} placeholder="https://hop.clickbank.net/..." className={inputCls} /></div>
              </div>
            </div>
          )}

          {/* STEP 2 - Break-even */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Calculadora de Break-even</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">CVR Esperado (%)</Label><AgentHelp fieldKey="cvrExpected" fieldValue={cvrExpected || CVR_DEFAULTS[vertical]?.toString() || '1'} context={{ platform, vertical }} onApply={setCvrExpected} /></div>
                  <Input type="number" value={cvrExpected || CVR_DEFAULTS[vertical]?.toString() || '1'} onChange={(e:any) => setCvrExpected(e?.target?.value ?? '')} className={inputCls} />
                  <p className="text-xs text-slate-500 mt-1">Sugestão para {vertical}: {CVR_DEFAULTS[vertical] ?? 1}%</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-400">Comissão Líquida</p>
                  <p className="text-xl font-bold text-white font-mono">${commissionNet?.toFixed?.(2)}</p>
                </CardContent></Card>
                <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-400">EPC Break-even</p>
                  <p className="text-xl font-bold text-yellow-400 font-mono">${epcBE?.toFixed?.(4)}</p>
                </CardContent></Card>
                <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-400">CPC Máx</p>
                  <p className="text-xl font-bold text-orange-400 font-mono">${cpcMax?.toFixed?.(4)}</p>
                </CardContent></Card>
                <Card className="bg-[#0f172a] border-[#334155]"><CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-400">CPC SCALE</p>
                  <p className="text-xl font-bold text-green-400 font-mono">${cpcScale?.toFixed?.(4)}</p>
                </CardContent></Card>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <div className={`h-6 w-6 rounded-full ${cpcMax >= 0.5 ? 'bg-green-500' : cpcMax >= 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-300">
                  {cpcMax >= 0.5 ? '✅ CPC Máx saudável — boa margem para testar' : cpcMax >= 0.2 ? '⚠️ CPC Máx apertado — teste com cuidado' : '🚨 CPC Máx muito baixo — considere outra oferta'}
                </span>
              </div>
              <div className="bg-[#0f172a] rounded-lg p-4 mt-4">
                <p className="text-xs text-slate-400 font-mono">
                  Comissão líquida = {commVal} × (1 - {refVal}%) = ${commissionNet?.toFixed?.(2)}<br/>
                  EPC BE = ${commissionNet?.toFixed?.(2)} × {cvr}% = ${epcBE?.toFixed?.(4)}<br/>
                  CPC Máx ≈ EPC BE = ${cpcMax?.toFixed?.(4)}<br/>
                  CPC SCALE = ${cpcMax?.toFixed?.(4)} / 1.3 = ${cpcScale?.toFixed?.(4)}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 - Anti-strike */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-400" /> Anti-strike Checklist {platform === 'ClickBank' ? '(ClickBank)' : ''}
                </h2>
                <Button size="sm" variant="outline" onClick={runChecklistVerify} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              {platform !== 'ClickBank' && (
                <div className="bg-blue-500/10 rounded-lg p-4 text-blue-300 text-sm flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Este checklist é específico para ClickBank. Para {platform}, verifique os Terms da plataforma diretamente. Pode avançar.</span>
                </div>
              )}
              {/* Progress ring for this step */}
              {platform === 'ClickBank' && (
                <div className="flex items-center gap-4 bg-[#0f172a] rounded-lg p-4">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="3" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke={ANTISTRIKE_ITEMS.filter(i => i.critical).every(i => antistrikeChecks[i.key]) ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(Object.values(antistrikeChecks).filter(Boolean).length / ANTISTRIKE_ITEMS.length) * 125.6} 125.6`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Object.values(antistrikeChecks).filter(Boolean).length}/{ANTISTRIKE_ITEMS.length}</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Progresso do Checklist</p>
                    <p className="text-xs text-slate-500">{ANTISTRIKE_ITEMS.filter(i => i.critical && !antistrikeChecks[i.key]).length} itens críticos pendentes</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {ANTISTRIKE_ITEMS.map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={antistrikeChecks[item.key] ?? false}
                    onToggle={(v) => setAntistrikeChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 - Bridge/Pré-sell ENHANCED */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-400" /> Pré-sell / Bridge Page
              </h2>

              {/* Checklist with progress ring */}
              <div className="flex items-center gap-4 bg-[#0f172a] rounded-lg p-4">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={BRIDGE_CHECKLIST.filter(i => i.critical).every(i => bridgeChecks[i.key]) ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(Object.values(bridgeChecks).filter(Boolean).length / BRIDGE_CHECKLIST.length) * 125.6} 125.6`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Object.values(bridgeChecks).filter(Boolean).length}/{BRIDGE_CHECKLIST.length}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">Checklist da Bridge</p>
                  <p className="text-xs text-slate-500">{BRIDGE_CHECKLIST.filter(i => i.critical && !bridgeChecks[i.key]).length} itens críticos pendentes</p>
                </div>
                <Button size="sm" variant="outline" onClick={runChecklistVerify} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5 shrink-0">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar
                </Button>
              </div>

              <div className="space-y-3">
                {BRIDGE_CHECKLIST.map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={bridgeChecks[item.key] ?? false}
                    onToggle={(v) => setBridgeChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                    step={4}
                    onFix={fixChecklistItem}
                  />
                ))}
              </div>

              {/* URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Tipo de Página</Label><AgentHelp fieldKey="pageType" fieldValue={pageType} context={{ channel, vertical }} onApply={applyEnumIfValid(['advertorial', 'pogo', 'vsl', 'interstitial', 'authority'], setPageType, 'Tipo de Página')} /></div>
                  <Select value={pageType} onValueChange={(v: 'advertorial' | 'pogo' | 'vsl' | 'interstitial' | 'authority') => setPageType(v)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155]">
                      <SelectItem value="advertorial" className="text-white">Advertorial (Artigo de Review)</SelectItem>
                      <SelectItem value="pogo" className="text-white">Pogo (Curta, direto ao ponto)</SelectItem>
                      <SelectItem value="vsl" className="text-white">VSL (Vídeo Sales Letter)</SelectItem>
                      <SelectItem value="authority" className="text-white">Authority (Autoridade editorial — ingredientes, pacotes, certificações)</SelectItem>
                      <SelectItem value="interstitial" className="text-white">Interstitial (Screenshot + Popup — só YouTube/Demand Gen, nunca Search)</SelectItem>
                    </SelectContent>
                  </Select>
                  {pageType === 'interstitial' && (channel === 'SEARCH' || channel === 'PMAX') && (
                    <p className="text-xs text-red-400 mt-1">⚠ Interstitial não é permitido no canal {channel} — reprova revisão do Google Search. Troque o canal ou o tipo de página.</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox id="popup-gate" checked={popupGate} onCheckedChange={(v: boolean) => setPopupGate(v)} />
                  <label htmlFor="popup-gate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                    Ativar Pop-up de Retenção
                  </label>
                  <AgentHelp fieldKey="popupGate" fieldValue={String(popupGate)} />
                </div>
                {pageType === 'vsl' && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1"><Label className="text-slate-300">URL do Vídeo (YouTube, Vimeo ou .mp4)</Label><AgentHelp fieldKey="videoUrl" fieldValue={videoUrl} onApply={setVideoUrl} /></div>
                    <Input value={videoUrl} onChange={(e:any) => setVideoUrl(e?.target?.value ?? '')} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">URL da Pré-sell</Label><AgentHelp fieldKey="presellUrl" fieldValue={presellUrl} context={{ platform, vertical }} onApply={setPresellUrl} /></div><Input value={presellUrl} onChange={(e:any) => setPresellUrl(e?.target?.value ?? '')} onBlur={(e:any) => { const v = e?.target?.value ?? ''; if (campaignId) fetch(`/api/campaigns/${campaignId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presellUrl: v }) }).catch(() => {}); }} placeholder="https://seudominio.com/review" className={inputCls} /></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">URL FlowPage</Label><AgentHelp fieldKey="flowpageUrl" fieldValue={flowpageUrl} onApply={setFlowpageUrl} /></div>
                  <div className="flex gap-2"><Input value={flowpageUrl} onChange={(e:any) => setFlowpageUrl(e?.target?.value ?? '')} placeholder="URL do FlowPage" className={`${inputCls} flex-1`} />
                    <a href="https://flowpages.com" target="_blank" rel="noopener"><Button variant="outline" size="icon" className="border-[#334155] text-slate-300"><ExternalLink className="h-4 w-4" /></Button></a></div></div>
                <div><div className="flex items-center gap-1"><Label className="text-slate-300">Domínio Hostinger</Label><AgentHelp fieldKey="hostingerDomain" fieldValue={hostingerDomain} onApply={setHostingerDomain} /></div>
                  <div className="flex gap-2"><Input value={hostingerDomain} onChange={(e:any) => setHostingerDomain(e?.target?.value ?? '')} placeholder="seudominio.com" className={`${inputCls} flex-1`} />
                    <a href="https://hostinger.com" target="_blank" rel="noopener"><Button variant="outline" size="icon" className="border-[#334155] text-slate-300"><ExternalLink className="h-4 w-4" /></Button></a></div></div>
              </div>

              {/* Pre-sell builder */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" /> Builder de Pré-sell</h3>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => generatePresellHtml()} disabled={generatingPresell} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                      {generatingPresell ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingPresell ? 'Gerando com IA...' : 'Gerar com Presell Builder (IA)'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-300 gap-1" onClick={regenerateWithCorrections} disabled={generatingPresell} title="Regenera aplicando as correções já aprendidas (ChecklistLearning) pra esta vertical/canal/plataforma">
                      {generatingPresell ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} Regenerar com correções
                    </Button>
                    <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1" onClick={() => copyToClipboard(presellHtml)} disabled={!presellHtml}>
                      <Copy className="h-3 w-3" /> Copiar HTML
                    </Button>
                    {ftpDomains.length > 0 && (
                      <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-300 gap-1" onClick={publishToOwnDomain} disabled={publishingOwnDomain || !presellId} title={`Publica a presell gerada em ${ftpDomains.join(', ')} via FTP`}>
                        {publishingOwnDomain ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />} Publicar em domínio próprio
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-1">
                  <Label className="text-slate-300">HTML da Pré-sell</Label>
                  <AgentHelp fieldKey="presellHtml" fieldValue={presellHtml} />
                </div>
                <Textarea
                  value={presellHtml}
                  onChange={(e: any) => setPresellHtml(e?.target?.value ?? '')}
                  placeholder="Cole o HTML da sua pré-sell aqui para preview e análise..."
                  className={`${inputCls} min-h-[120px] font-mono text-xs`}
                />

                {/* Preview / Analysis buttons */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="border-[#334155] text-slate-300 gap-1" disabled={!presellHtml}>
                    <Eye className="h-3 w-3" /> {showPreview ? 'Fechar Preview' : 'Preview'}
                  </Button>
                  <Button size="sm" onClick={analyzePresell} disabled={analyzing || (!presellUrl && !presellHtml)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                    {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                    {analyzing ? 'Analisando...' : 'Analisar com IA'}
                  </Button>
                </div>

                {/* Preview iframe */}
                {showPreview && presellHtml && (
                  <div className="mt-3 border border-[#334155] rounded-lg overflow-hidden">
                    <div className="bg-[#0f172a] px-3 py-2 flex items-center gap-2 border-b border-[#334155]">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <div className="w-3 h-3 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-xs text-slate-500 ml-2">Preview da Pré-sell</span>
                    </div>
                    <iframe
                      srcDoc={presellHtml}
                      className="w-full h-[500px] bg-white"
                      sandbox="allow-same-origin"
                      title="Pre-sell Preview"
                    />
                  </div>
                )}

                {/* Analysis result */}
                {analysisResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="4" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke={(analysisResult.overall_score ?? 0) >= 70 ? '#22c55e' : (analysisResult.overall_score ?? 0) >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="4" strokeDasharray={`${((analysisResult.overall_score ?? 0) / 100) * 175.9} 175.9`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{analysisResult.overall_score ?? 0}</span>
                      </div>
                      <div>
                        <Badge className={analysisResult.verdict === 'APROVADA' ? 'bg-green-500/20 text-green-400' : analysisResult.verdict === 'PRECISA_AJUSTES' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>
                          {analysisResult.verdict ?? 'Sem veredicto'}
                        </Badge>
                        {analysisResult.anti_strike?.risk_level && (
                          <Badge className={`ml-2 ${analysisResult.anti_strike.risk_level === 'LOW' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            Risco: {analysisResult.anti_strike.risk_level}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Category scores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['compliance', 'conversion', 'google_ads', 'anti_strike', 'ux_design'].map(cat => {
                        const data = analysisResult[cat];
                        if (!data) return null;
                        const labels: Record<string, string> = { compliance: 'Compliance', conversion: 'Conversão', google_ads: 'Google Ads', anti_strike: 'Anti-Strike', ux_design: 'UX/Design' };
                        return (
                          <div key={cat} className="bg-[#0f172a] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white">{labels[cat]}</span>
                              <span className={`text-sm font-mono font-bold ${(data.score ?? 0) >= 70 ? 'text-green-400' : (data.score ?? 0) >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{data.score}/100</span>
                            </div>
                            {data.issues?.length > 0 && (
                              <div className="space-y-1">
                                {data.issues.map((issue: string, i: number) => (
                                  <p key={i} className="text-xs text-red-300 flex items-start gap-1"><XCircle className="h-3 w-3 shrink-0 mt-0.5" />{issue}</p>
                                ))}
                              </div>
                            )}
                            {data.passed?.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {data.passed.slice(0, 2).map((p: string, i: number) => (
                                  <p key={i} className="text-xs text-green-300 flex items-start gap-1"><CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />{p}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Blockers */}
                    {analysisResult.blockers?.length > 0 && (
                      <div className="bg-red-500/10 rounded-lg p-3">
                        <p className="text-sm text-red-400 font-semibold mb-1">Bloqueadores:</p>
                        {analysisResult.blockers.map((b: string, i: number) => <p key={i} className="text-xs text-red-300">• {b}</p>)}
                      </div>
                    )}

                    {/* Recommendations */}
                    {analysisResult.recommendations?.length > 0 && (
                      <div className="bg-blue-500/10 rounded-lg p-3">
                        <p className="text-sm text-blue-400 font-semibold mb-1">Recomendações:</p>
                        {analysisResult.recommendations.map((r: string, i: number) => <p key={i} className="text-xs text-blue-300">• {r}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 - Keywords */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Pesquisa de Keywords</h2>
              {/* Tools bar */}
              <div className="flex flex-wrap gap-2 bg-[#0f172a] rounded-lg p-3">
                <a href="https://answerthepublic.com/pt" target="_blank" rel="noopener">
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><ExternalLink className="h-3 w-3" /> Answer The Public</Button>
                </a>
                <span className="cursor-pointer" onClick={() => window.open(`https://trends.google.com/trends/explore?q=${encodeURIComponent(selectedKeywords.find(k => k.selected)?.keyword ?? vertical)}&geo=${geo}`, '_blank')}>
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><TrendingUp className="h-3 w-3" /> Google Trends</Button>
                </span>
                <a href={`https://ads.google.com/aw/keywordplanner/home`} target="_blank" rel="noopener">
                  <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1"><Search className="h-3 w-3" /> Keyword Planner</Button>
                </a>
              </div>

              {/* Suggestions by layer */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Sugestões por Camada</h3>
                {['A', 'B', 'C', 'D'].map(layer => {
                  const layerLabels: Record<string, string> = { A: 'Problema', B: 'Solução', C: 'Comparação', D: 'Comercial' };
                  const suggestions = KEYWORDS_BY_VERTICAL[vertical]?.[layer] ?? KEYWORDS_BY_VERTICAL['Weight Loss']?.[layer] ?? [];
                  return (
                    <div key={layer} className="mb-4">
                      <Badge className="mb-2 bg-[#0f172a] text-slate-300">Camada {layer} — {layerLabels[layer]}</Badge>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((kw: string) => {
                          const isAdded = selectedKeywords.find(k => k.keyword === kw);
                          return (
                            <button key={kw} onClick={() => !isAdded && addKeywordFromSuggestions(kw, layer)} className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                              isAdded ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#0f172a] text-slate-300 hover:bg-[#334155] border border-[#334155]'
                            }`}>
                              {isAdded ? '✓ ' : '+ '}{kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Manual add */}
              <div className="flex gap-2">
                <Input value={newKeyword} onChange={(e:any) => setNewKeyword(e?.target?.value ?? '')} placeholder="Adicionar keyword manualmente" className={`${inputCls} flex-1`} onKeyDown={(e:any) => e?.key === 'Enter' && addManualKeyword()} />
                <Button onClick={addManualKeyword} className="bg-green-600 hover:bg-green-700 text-white">Adicionar</Button>
              </div>
              {/* Selected keywords */}
              {selectedKeywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-2">Keywords Selecionadas ({selectedKeywords.filter(k=>k.selected).length}/8)</h3>
                  <div className="space-y-2">
                    {selectedKeywords.map((kw, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[#0f172a] rounded-lg p-3">
                        <Checkbox checked={kw.selected} onCheckedChange={(v: any) => {
                          const copy = [...selectedKeywords];
                          copy[idx] = { ...copy[idx], selected: !!v };
                          setSelectedKeywords(copy);
                        }} />
                        <span className="text-sm text-white flex-1">{kw.keyword}</span>
                        <Badge className="bg-[#1e293b] text-slate-400 text-[10px]">{kw.layer}</Badge>
                        <Select value={kw.matchType} onValueChange={(v) => {
                          const copy = [...selectedKeywords];
                          copy[idx] = { ...copy[idx], matchType: v };
                          setSelectedKeywords(copy);
                        }}>
                          <SelectTrigger className="w-24 h-7 text-xs bg-[#1e293b] border-[#334155] text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-[#334155]">
                            <SelectItem value="phrase" className="text-white">Phrase</SelectItem>
                            <SelectItem value="exact" className="text-white">Exact</SelectItem>
                            <SelectItem value="broad" className="text-white">Broad</SelectItem>
                          </SelectContent>
                        </Select>
                        <button onClick={() => setSelectedKeywords(prev => prev.filter((_,i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Negatives */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white mb-2">Negativas Sugeridas ({vertical}){aiNegatives && <span className="text-purple-400 font-normal"> · geradas pelo agente para este produto</span>}</h3>
                <div className="flex flex-wrap gap-2">
                  {(aiNegatives ?? NEGATIVES_BY_VERTICAL[vertical] ?? NEGATIVES_BY_VERTICAL['Outro'] ?? []).map((neg: string) => (
                    <Badge key={neg} className="bg-red-500/10 text-red-300 text-xs">-{neg}</Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-2 border-[#334155] text-slate-300 gap-1" onClick={() => copyToClipboard((aiNegatives ?? NEGATIVES_BY_VERTICAL[vertical] ?? []).join('\n'))}>
                  <Copy className="h-3 w-3" /> Copiar Negativas
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6 - Naming & UTMs */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Naming & UTMs</h2>
              <div><Label className="text-slate-300">Versão</Label><Input type="number" value={version} onChange={(e:any) => setVersion(e?.target?.value ?? '1')} className={`${inputCls} w-20`} min={1} /></div>
              <div className="bg-[#0f172a] rounded-lg p-4">
                <Label className="text-slate-400 text-xs">Nome da Campanha Gerado</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-green-400 font-mono text-lg">{campaignNameGen}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(campaignNameGen)} className="text-slate-400 hover:text-white"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-lg p-4">
                <Label className="text-slate-400 text-xs">UTM Completo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-blue-400 font-mono text-sm break-all">{utmString}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(utmString)} className="text-slate-400 hover:text-white shrink-0"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Formato: [REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_vN</p>
            </div>
          )}

          {/* STEP 7 - Google Ads */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white">Setup Google Ads</h2>
                <Button size="sm" variant="outline" onClick={runChecklistVerify} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              <div className="flex items-center gap-4 bg-[#0f172a] rounded-lg p-4">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={GOOGLE_ADS_CHECKLIST.filter(i => i.critical).every(i => googleAdsChecks[i.key]) ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${(Object.values(googleAdsChecks).filter(Boolean).length / GOOGLE_ADS_CHECKLIST.length) * 125.6} 125.6`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{Object.values(googleAdsChecks).filter(Boolean).length}/{GOOGLE_ADS_CHECKLIST.length}</span>
                </div>
                <div>
                  <p className="text-sm text-white">Budget diário sugerido: <strong className="font-mono text-green-400">${budgetDaily?.toFixed?.(2)}</strong></p>
                  <p className="text-xs text-slate-500">${budgetTest} / {days} dias</p>
                </div>
              </div>
              <Step7LeadingStream campaignId={campaignId ?? ''} budgetDaily={budgetDaily} onSuccess={runChecklistVerify} />
              <div className="space-y-3">
                {GOOGLE_ADS_CHECKLIST.map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={googleAdsChecks[item.key] ?? false}
                    onToggle={(v) => setGoogleAdsChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                    step={7}
                    onFix={fixChecklistItem}
                  />
                ))}
              </div>

              <div className="bg-[#0f172a] rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-white">Criar a campanha de verdade no Google Ads</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {googleCampaignId
                      ? `Já criada (PAUSED) — ID ${googleCampaignId}. Necessário pro Passo 9 (Go-live).`
                      : 'Cria em modo PAUSED (não gasta nada até você ativar manualmente). Exige os itens críticos deste checklist marcados/verificados antes.'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={createInGoogleAds} disabled={creatingGads || !!googleCampaignId} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                    {creatingGads ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    {googleCampaignId ? 'Já criada' : creatingGads ? 'Criando...' : 'Criar no Google Ads (PAUSED)'}
                  </Button>
                  {googleCampaignId && (
                    <a href={`https://ads.google.com/aw/campaigns?campaignId=${googleCampaignId}`} target="_blank" rel="noopener">
                      <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1.5" title="Abre a campanha no Google Ads — se a conta ativa no navegador não for a certa, troque de conta lá antes">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver no Google Ads
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8 - Tracking */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white">Tracking & Tags</h2>
                <Button size="sm" variant="outline" onClick={runChecklistVerify} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar automaticamente
                </Button>
              </div>
              {platform === 'MaxWeb' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Postback URL</Label><AgentHelp fieldKey="postbackUrl" fieldValue={postbackUrl} onApply={setPostbackUrl} /></div><Input value={postbackUrl} onChange={(e:any) => setPostbackUrl(e?.target?.value ?? '')} placeholder="https://...postback..." className={inputCls} /><p className="text-xs text-slate-500 mt-1">{'Ex: https://track.maxweb.com/postback?clickid={clickid}'}</p></div>
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Token ClickID</Label><AgentHelp fieldKey="clickidToken" fieldValue={clickidToken} onApply={setClickidToken} /></div><Input value={clickidToken} onChange={(e:any) => setClickidToken(e?.target?.value ?? '')} className={inputCls} /></div>
                </div>
              )}
              {platform === 'MaxWeb' && (
                <div className="bg-yellow-500/10 rounded-lg p-4 text-yellow-300 text-sm">
                  <strong>Teste de Postback:</strong><br/>
                  1. Gere 1 conversão manual → 2. Verifique no painel MaxWeb → 3. Marque OK abaixo
                </div>
              )}
              <div className="space-y-3">
                {(platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB).map(item => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    checked={trackingChecks[item.key] ?? false}
                    onToggle={(v) => setTrackingChecks(prev => ({ ...prev, [item.key]: v }))}
                    meta={checklistMeta[item.key]}
                    step={8}
                    onFix={fixChecklistItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 9 - Go-live */}
          {step === 9 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Rocket className="h-5 w-5 text-green-400" /> Go-live</h2>
                <Button size="sm" variant="outline" onClick={runChecklistVerify} disabled={verifyingChecklist || !campaignId} className="border-[#334155] text-slate-300 gap-1.5">
                  {verifyingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verificar tudo automaticamente
                </Button>
              </div>

              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-blue-300">Etapa 1 — Teste</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Budget Total de Teste (USD)</Label><AgentHelp fieldKey="budgetTest" fieldValue={budgetTest} context={{ commission: commVal }} onApply={setBudgetTest} /></div><Input type="number" value={budgetTest} onChange={(e:any) => setBudgetTest(e?.target?.value ?? '50')} className={inputCls} /></div>
                  <div><div className="flex items-center gap-1"><Label className="text-slate-300">Duração do Teste</Label><AgentHelp fieldKey="testDuration" fieldValue={testDuration} onApply={applyEnumIfValid(['48h', '72h', '5', '7'], setTestDuration, 'Duração do Teste')} /></div>
                    <Select value={testDuration} onValueChange={setTestDuration}><SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-[#334155]"><SelectItem value="48h" className="text-white">48h</SelectItem><SelectItem value="72h" className="text-white">72h</SelectItem><SelectItem value="5" className="text-white">5 dias</SelectItem><SelectItem value="7" className="text-white">7 dias</SelectItem></SelectContent>
                    </Select></div>
                  <div><Label className="text-slate-300">Budget Diário (teste)</Label><p className="text-lg font-mono text-green-400 mt-1">${budgetDaily?.toFixed?.(2)}/dia</p></div>
                </div>
              </div>

              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-purple-300">Etapa 2 — Investimento sério (só depois de validar no teste)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1"><Label className="text-slate-300">Budget Diário de Scale (USD)</Label><AgentHelp fieldKey="budgetScale" fieldValue={budgetScale} context={{ budgetTest: parseFloat(budgetTest) || 50, commission: commVal }} onApply={setBudgetScale} /></div>
                    <Input type="number" value={budgetScale} onChange={(e:any) => setBudgetScale(e?.target?.value ?? '0')} placeholder="Ex.: 150" className={inputCls} />
                  </div>
                  <div className="text-xs text-slate-400 self-end pb-2">
                    Só é aplicado quando você confirmar a decisão <strong className="text-purple-300">Scale</strong> na página da campanha
                    (troca o orçamento diário real no Google Ads automaticamente, ${budgetScale && parseFloat(budgetScale) > 0 ? parseFloat(budgetScale).toFixed(2) : '—'}/dia).
                    Deixe 0 se ainda não sabe — dá pra definir depois, antes de escalar.
                  </div>
                </div>
              </div>
              <div className="space-y-3">
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

              {/* Loop Setup Card */}
              <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" /> Loop de Automação dos Agentes
                  </h3>
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">RECOMENDADO</Badge>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para que a campanha seja monitorada de forma contínua após a publicação, configure o loop automático dos agentes. O loop só iniciará o processamento efetivo quando o status da campanha estiver em <strong>"Em Teste"</strong> ou <strong>"Ativo"</strong>.
                </p>

                <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/30">
                  <Checkbox
                    id="wizard-loop-enabled"
                    checked={loopEnabled}
                    onCheckedChange={(v: any) => setLoopEnabled(!!v)}
                  />
                  <Label htmlFor="wizard-loop-enabled" className="text-sm text-slate-300 cursor-pointer select-none">
                    Ativar automação do loop para esta campanha
                  </Label>
                </div>

                {loopEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-400">Intermitência de Loop Recomendada</Label>
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
                      <p className="text-[10px] text-slate-500 mt-1">
                        Evite loops muito curtos para não ter picos de consumo de tokens da API de IA.
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-400">Agentes no Loop de Operações</Label>
                      <div className="space-y-2 mt-1 bg-[#1e293b]/40 p-2 rounded border border-[#334155]/30">
                        <div className="flex items-center gap-2">
                          <Checkbox id="agent-ads" checked={loopAgents.includes('ads')} onCheckedChange={(v: any) => {
                            if (v) setLoopAgents(prev => prev.includes('ads') ? prev : prev + ',ads');
                            else setLoopAgents(prev => prev.split(',').filter(a => a !== 'ads').join(','));
                          }} />
                          <Label htmlFor="agent-ads" className="text-xs text-slate-300">Paid Ads Agent (Monitor de CPC)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="agent-compliance" checked={loopAgents.includes('compliance')} onCheckedChange={(v: any) => {
                            if (v) setLoopAgents(prev => prev.includes('compliance') ? prev : prev + ',compliance');
                            else setLoopAgents(prev => prev.split(',').filter(a => a !== 'compliance').join(','));
                          }} />
                          <Label htmlFor="agent-compliance" className="text-xs text-slate-300">Compliance Sentinel (Monitor de Pre-sell)</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <Card className="bg-[#0f172a] border-[#334155] mt-4">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-white font-semibold">Resumo da Campanha</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-slate-400">Nome:</span> <span className="text-white">{name || campaignNameGen}</span></div>
                    <div><span className="text-slate-400">Plataforma:</span> <span className="text-white">{platform}</span></div>
                    <div><span className="text-slate-400">Vertical:</span> <span className="text-white">{vertical}</span></div>
                    <div><span className="text-slate-400">Geo:</span> <span className="text-white">{geo}</span></div>
                    <div><span className="text-slate-400">Canal:</span> <span className="text-white">{channel}</span></div>
                    <div><span className="text-slate-400">Comissão:</span> <span className="text-green-400">${commVal}</span></div>
                    <div><span className="text-slate-400">CPC Máx:</span> <span className="text-yellow-400">${cpcMax?.toFixed?.(4)}</span></div>
                    <div><span className="text-slate-400">Keywords:</span> <span className="text-white">{selectedKeywords.filter(k=>k.selected).length}</span></div>
                    <div><span className="text-slate-400">ID:</span> <span className="text-slate-500 font-mono">{campaignNameGen}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="border-[#334155] text-slate-300 gap-2">
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" onClick={async () => {
            await saveCampaign();
            toast.success('Rascunho da campanha salvo com sucesso!');
          }} disabled={saving} className="border-[#334155] text-slate-300 gap-2">
            <Save className="h-4 w-4" /> Salvar Rascunho
          </Button>
        </div>
        {step < 9 ? (
          <Button onClick={next} disabled={saving || advancing} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {(saving || advancing) && <Loader2 className="h-4 w-4 animate-spin" />}
            {advancing ? 'Validando...' : 'Próximo'} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={launch} disabled={saving || advancing || !canAdvance()} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {(saving || advancing) && <Loader2 className="h-4 w-4 animate-spin" />}
            <Rocket className="h-4 w-4" /> {advancing ? 'Validando...' : 'Lançar Campanha'}
          </Button>
        )}
      </div>
    </div>
    </AutofillContext.Provider>
  );
}
