import {
  CATALOGO_OPERACAO,
  VERTICAIS,
  verticalPorLabel,
} from './generated/catalogo';

// Estas listas e números vinham escritos aqui à mão, sem dizer de onde saíam. Hoje vêm de
// subsidios/catalogo/*.yaml, onde cada valor carrega origem, confiança e data de revisão
// (ver lib/subsidios/schema.ts). Para mudar um CVR ou uma negativa, edite o YAML e rode
// `yarn subsidios:build` — editar o módulo gerado não sobrevive ao próximo build.
// As checklists abaixo continuam aqui: são regras de processo, não subsídio de mercado.

export const PLATFORMS = CATALOGO_OPERACAO.plataformas
  .filter((p) => p.id !== 'Digistore24' && p.id !== 'Outro' && p.id !== 'Kiwify')
  .map((p) => p.id);
export const PLATFORMS_EXTENDED = CATALOGO_OPERACAO.plataformas.map((p) => p.id);
export type ExtendedPlatform = string;
export const VERTICALS = VERTICAIS.map((v) => v.label);
export const CHANNELS = CATALOGO_OPERACAO.canais.map((c) => c.id);
export const GEOS = CATALOGO_OPERACAO.geos.map((g) => g.id);

export const CVR_DEFAULTS: Record<string, number> = Object.fromEntries(
  VERTICAIS.map((v) => [v.label, v.cvr_default.valor]),
);

/** CVR com a procedência junto: a UI mostra o número e de onde ele veio. */
export function cvrDefaultComProcedencia(vertical: string) {
  return verticalPorLabel(vertical)?.cvr_default ?? null;
}

/** Camadas de intenção da keyword: A problema, B solução, C comparação, D comercial. */
export type KeywordTier = 'A' | 'B' | 'C' | 'D';
export const KEYWORD_TIERS: KeywordTier[] = ['A', 'B', 'C', 'D'];

export const KEYWORDS_BY_VERTICAL: Record<string, Record<KeywordTier, string[]>> =
  Object.fromEntries(
    VERTICAIS.filter((v) => v.keywords).map((v) => [
      v.label,
      { A: [...v.keywords!.A], B: [...v.keywords!.B], C: [...v.keywords!.C], D: [...v.keywords!.D] },
    ]),
  );

export const NEGATIVES_BY_VERTICAL: Record<string, string[]> = Object.fromEntries(
  VERTICAIS.map((v) => [v.label, [...v.negativas.termos]]),
);

export const ANTISTRIKE_ITEMS = [
  { key: 'client_contract', label: 'Client Contract assinado no ClickBank', critical: true, verificationType: 'self_attested' as const },
  { key: 'vendor_terms', label: 'Vendor Terms da oferta lidos e entendidos', critical: true, verificationType: 'self_attested' as const },
  { key: 'geo_permitido', label: 'Geo permitido nos Terms', critical: true, verificationType: 'self_attested' as const },
  { key: 'hop_proprio', label: 'HopLink próprio (não link de terceiro)', critical: true, verificationType: 'self_attested' as const },
  { key: 'sem_cloaking', label: 'Sem cloaking (mesma experiência bot/user)', critical: true, verificationType: 'self_attested' as const },
  { key: 'trademark_ok', label: 'Trademark verificado (não usar se proibido)', critical: false, verificationType: 'self_attested' as const },
  { key: 'mobile_testado', label: 'Mobile testado e responsivo', critical: false, verificationType: 'self_attested' as const },
];

// Todos os itens 'auto' que dependem de HTML da presell (getPresellHtml()) vivem aqui, no
// Passo 4 — é o primeiro passo em que a presell já existe de verdade. sem_claims/
// disclaimer_afiliado/privacy_policy vieram de ANTISTRIKE_ITEMS (ver comentário acima);
// disclaimer/ssl já existiam aqui e não foram duplicados.
export const BRIDGE_CHECKLIST = [
  { key: 'h1_keyword', label: 'H1 alinhado à keyword principal', critical: true, verificationType: 'self_attested' as const },
  { key: 'cta_unico', label: 'CTA único e claro', critical: true, verificationType: 'self_attested' as const },
  { key: 'disclaimer', label: 'Disclaimer de afiliado visível', critical: true, verificationType: 'auto' as const },
  { key: 'mobile_first', label: 'Mobile-first / responsivo', critical: true, verificationType: 'self_attested' as const },
  { key: 'ssl', label: 'SSL ativo', critical: true, verificationType: 'auto' as const },
  { key: 'sem_claims', label: 'Sem claims de cura/renda garantida na bridge', critical: true, verificationType: 'auto' as const },
  { key: 'privacy_policy', label: 'Privacy Policy com contato na bridge', critical: true, verificationType: 'auto' as const },
  { key: 'sem_popup', label: 'Sem pop-up enganoso', critical: false, verificationType: 'self_attested' as const },
  { key: 'faq', label: 'FAQ inclusa', critical: false, verificationType: 'auto' as const },
  { key: 'resultados_variam', label: '"Resultados variam" visível', critical: false, verificationType: 'auto' as const },
  { key: 'ga4_configurado', label: 'GA4 configurado na bridge', critical: false, verificationType: 'auto' as const },
];

// search_on/partners_off/display_off/location_presence ainda são autoatestados porque
// lib/google-ads.ts (fetchGoogleCampaign) hoje só sincroniza status/budget/bidStrategy — não
// consulta network_settings/location targeting da API real ainda. Virar 'auto' exige estender
// essa query primeiro (não fazer isso agora seria trocar um mock por outro).
export const GOOGLE_ADS_CHECKLIST = [
  { key: 'search_on', label: 'Search Network: ON', critical: true, verificationType: 'self_attested' as const },
  { key: 'partners_off', label: 'Search Partners: OFF', critical: true, verificationType: 'self_attested' as const },
  { key: 'display_off', label: 'Display Network: OFF', critical: true, verificationType: 'self_attested' as const },
  { key: 'geo_correto', label: 'Geo correto configurado', critical: true, verificationType: 'self_attested' as const },
  { key: 'location_presence', label: 'Location targeting: "Presence"', critical: true, verificationType: 'self_attested' as const },
  { key: 'budget_diario', label: 'Budget diário calculado', critical: true, verificationType: 'auto' as const },
  { key: 'lance_manual', label: 'Lance Manual CPC com teto definido', critical: true, verificationType: 'auto' as const },
  { key: 'ad_group', label: '1 ad group temático criado', critical: false, verificationType: 'self_attested' as const },
  { key: 'rsa', label: 'RSA com 10-15 títulos / 4 descrições', critical: false, verificationType: 'self_attested' as const },
  { key: 'conversao_cta', label: 'Conversão CTA configurada', critical: false, verificationType: 'self_attested' as const },
  { key: 'utms', label: 'UTMs nos anúncios', critical: false, verificationType: 'auto' as const },
];

export const TRACKING_CHECKLIST_MAXWEB = [
  { key: 'postback_url', label: 'Postback URL configurada', critical: true, verificationType: 'auto' as const },
  { key: 'clickid_token', label: 'Token clickid configurado', critical: true, verificationType: 'auto' as const },
  { key: 'teste_postback', label: 'Teste de postback realizado e OK', critical: true, verificationType: 'self_attested' as const },
  { key: 'gtm_container', label: 'GTM Container instalado', critical: false, verificationType: 'self_attested' as const },
  { key: 'gtm_cta', label: 'Tag CTA clique no GTM', critical: false, verificationType: 'self_attested' as const },
  { key: 'ga4_evento', label: 'GA4 evento configurado', critical: false, verificationType: 'auto' as const },
];

export const TRACKING_CHECKLIST_CB = [
  { key: 'hop_stats', label: 'Hop stats verificados no ClickBank', critical: true, verificationType: 'self_attested' as const },
  { key: 'gtm_container', label: 'GTM Container instalado', critical: false, verificationType: 'self_attested' as const },
  { key: 'gtm_cta', label: 'Tag CTA clique no GTM', critical: false, verificationType: 'self_attested' as const },
  { key: 'ga4_evento', label: 'GA4 evento configurado', critical: false, verificationType: 'auto' as const },
];

export const GOLIVE_CHECKLIST = [
  { key: 'oferta_ok', label: 'Oferta/produto verificado', critical: true, verificationType: 'auto' as const },
  { key: 'breakeven_ok', label: 'Break-even calculado', critical: true, verificationType: 'auto' as const },
  { key: 'compliance_ok', label: 'Compliance checklist completo', critical: true, verificationType: 'auto' as const },
  { key: 'bridge_ok', label: 'Bridge page publicada e testada', critical: true, verificationType: 'auto' as const },
  { key: 'keywords_ok', label: 'Keywords selecionadas', critical: true, verificationType: 'auto' as const },
  { key: 'google_ads_ok', label: 'Google Ads configurado', critical: true, verificationType: 'auto' as const },
  { key: 'tracking_ok', label: 'Tracking/postback testado', critical: true, verificationType: 'auto' as const },
  { key: 'budget_ok', label: 'Budget e prazo definidos', critical: true, verificationType: 'auto' as const },
];

// Lookup itemKey -> verificationType, usado no servidor (app/api/campaigns/[id]/checklists/*)
// pra impedir que o cliente autoateste (`isChecked: true` via POST) um item que é `auto` — só
// a rota /verify pode escrever o resultado desses itens, com base em checagem real.
const ALL_CHECKLIST_ITEMS = [
  ...ANTISTRIKE_ITEMS, ...BRIDGE_CHECKLIST, ...GOOGLE_ADS_CHECKLIST,
  ...TRACKING_CHECKLIST_MAXWEB, ...TRACKING_CHECKLIST_CB, ...GOLIVE_CHECKLIST,
];
export function getChecklistVerificationType(itemKey: string): 'auto' | 'self_attested' {
  return ALL_CHECKLIST_ITEMS.find((i) => i.key === itemKey)?.verificationType ?? 'self_attested';
}

export const BRIDGE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[KEYWORD] - Guia Completo 2026</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 28px; margin-bottom: 16px; color: #1a1a1a; }
    h2 { font-size: 20px; margin: 24px 0 12px; }
    p { margin-bottom: 12px; }
    .cta-btn { display: inline-block; padding: 16px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 24px 0; }
    .cta-btn:hover { background: #16a34a; }
    .disclaimer { margin-top: 40px; padding: 16px; background: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666; }
    .faq { margin-top: 32px; }
    .faq h3 { font-size: 16px; margin-bottom: 8px; }
    .faq p { font-size: 14px; color: #555; }
  </style>
</head>
<body>
  <h1>[H1 alinhado à keyword]</h1>
  <p><strong>[Subhead com benefício específico]</strong></p>
  
  <h2>O Problema</h2>
  <p>[Empatia — descreva o problema que a audiência enfrenta]</p>
  
  <h2>A Solução</h2>
  <p>[O que é a solução, sem milagre]</p>
  
  <h2>Prós e Contras</h2>
  <p>[Lista honesta de prós e contras]</p>
  
  <h2>Para Quem É</h2>
  <p>[Defina o público ideal e quem NÃO deve usar]</p>
  
  <a href="[SEU_HOPLINK_AQUI]" class="cta-btn" target="_blank" rel="noopener">➡ Veja Como Funciona</a>
  
  <div class="faq">
    <h2>Perguntas Frequentes</h2>
    <h3>Funciona mesmo?</h3>
    <p>Resultados individuais variam. Este conteúdo é informativo.</p>
    <h3>Tem garantia?</h3>
    <p>[Mencione a garantia do produto, se houver]</p>
  </div>
  
  <div class="disclaimer">
    <p><strong>Aviso:</strong> Este site contém links de afiliado. Podemos receber uma comissão se você comprar através dos nossos links, sem custo adicional para você. Resultados individuais variam e não são garantidos.</p>
    <p><a href="/privacy">Política de Privacidade</a> | <a href="mailto:contato@seudominio.com">Contato</a></p>
  </div>
</body>
</html>`;
