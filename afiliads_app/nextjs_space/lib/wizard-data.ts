export const PLATFORMS = ['ClickBank', 'BuyGoods', 'MaxWeb', 'Hotmart', 'Eduzz', 'Monetizze'] as const;
export const VERTICALS = ['Weight Loss', 'Nutra', 'Make Money', 'Relationships', 'Health', 'Beauty', 'Cursos BR', 'Outro'] as const;
export const CHANNELS = ['SEARCH', 'YOUTUBE', 'DEMAND_GEN', 'PMAX'] as const;
export const GEOS = ['US', 'UK', 'AU', 'CA', 'BR', 'DE', 'FR', 'ES', 'IT', 'MX', 'GLOBAL'] as const;

export const CVR_DEFAULTS: Record<string, number> = {
  'Weight Loss': 1.5, 'Nutra': 1.2, 'Make Money': 0.8, 'Relationships': 1.0,
  'Health': 1.3, 'Beauty': 1.4, 'Cursos BR': 2.0, 'Outro': 1.0,
};

export const ANTISTRIKE_ITEMS = [
  { key: 'client_contract', label: 'Client Contract assinado no ClickBank', critical: true },
  { key: 'vendor_terms', label: 'Vendor Terms da oferta lidos e entendidos', critical: true },
  { key: 'geo_permitido', label: 'Geo permitido nos Terms', critical: true },
  { key: 'hop_proprio', label: 'HopLink próprio (não link de terceiro)', critical: true },
  { key: 'sem_cloaking', label: 'Sem cloaking (mesma experiência bot/user)', critical: true },
  { key: 'sem_claims', label: 'Sem claims de cura/renda garantida na bridge', critical: true },
  { key: 'disclaimer_afiliado', label: 'Disclaimer de afiliado na bridge page', critical: true },
  { key: 'privacy_policy', label: 'Privacy Policy com contato na bridge', critical: true },
  { key: 'trademark_ok', label: 'Trademark verificado (não usar se proibido)', critical: false },
  { key: 'mobile_testado', label: 'Mobile testado e responsivo', critical: false },
  { key: 'ga4_configurado', label: 'GA4 configurado na bridge', critical: false },
  { key: 'ssl_ativo', label: 'SSL ativo (HTTPS)', critical: false },
];

export const BRIDGE_CHECKLIST = [
  { key: 'h1_keyword', label: 'H1 alinhado à keyword principal', critical: true },
  { key: 'cta_unico', label: 'CTA único e claro', critical: true },
  { key: 'disclaimer', label: 'Disclaimer de afiliado visível', critical: true },
  { key: 'mobile_first', label: 'Mobile-first / responsivo', critical: true },
  { key: 'ssl', label: 'SSL ativo', critical: true },
  { key: 'sem_popup', label: 'Sem pop-up enganoso', critical: false },
  { key: 'faq', label: 'FAQ inclusa', critical: false },
  { key: 'resultados_variam', label: '"Resultados variam" visível', critical: false },
];

export const GOOGLE_ADS_CHECKLIST = [
  { key: 'search_on', label: 'Search Network: ON', critical: true },
  { key: 'partners_off', label: 'Search Partners: OFF', critical: true },
  { key: 'display_off', label: 'Display Network: OFF', critical: true },
  { key: 'geo_correto', label: 'Geo correto configurado', critical: true },
  { key: 'location_presence', label: 'Location targeting: "Presence"', critical: true },
  { key: 'budget_diario', label: 'Budget diário calculado', critical: true },
  { key: 'lance_manual', label: 'Lance Manual CPC com teto definido', critical: true },
  { key: 'ad_group', label: '1 ad group temático criado', critical: false },
  { key: 'rsa', label: 'RSA com 10-15 títulos / 4 descrições', critical: false },
  { key: 'conversao_cta', label: 'Conversão CTA configurada', critical: false },
  { key: 'utms', label: 'UTMs nos anúncios', critical: false },
];

export const TRACKING_CHECKLIST_MAXWEB = [
  { key: 'postback_url', label: 'Postback URL configurada', critical: true },
  { key: 'clickid_token', label: 'Token clickid configurado', critical: true },
  { key: 'teste_postback', label: 'Teste de postback realizado e OK', critical: true },
  { key: 'gtm_container', label: 'GTM Container instalado', critical: false },
  { key: 'gtm_cta', label: 'Tag CTA clique no GTM', critical: false },
  { key: 'ga4_evento', label: 'GA4 evento configurado', critical: false },
];

export const TRACKING_CHECKLIST_CB = [
  { key: 'hop_stats', label: 'Hop stats verificados no ClickBank', critical: true },
  { key: 'gtm_container', label: 'GTM Container instalado', critical: false },
  { key: 'gtm_cta', label: 'Tag CTA clique no GTM', critical: false },
  { key: 'ga4_evento', label: 'GA4 evento configurado', critical: false },
];

export const GOLIVE_CHECKLIST = [
  { key: 'oferta_ok', label: 'Oferta/produto verificado', critical: true },
  { key: 'breakeven_ok', label: 'Break-even calculado', critical: true },
  { key: 'compliance_ok', label: 'Compliance checklist completo', critical: true },
  { key: 'bridge_ok', label: 'Bridge page publicada e testada', critical: true },
  { key: 'keywords_ok', label: 'Keywords selecionadas', critical: true },
  { key: 'google_ads_ok', label: 'Google Ads configurado', critical: true },
  { key: 'tracking_ok', label: 'Tracking/postback testado', critical: true },
  { key: 'budget_ok', label: 'Budget e prazo definidos', critical: true },
];

export const KEYWORDS_BY_VERTICAL: Record<string, Record<string, string[]>> = {
  'Weight Loss': {
    A: ['how to lose weight after 40', 'belly fat problem', 'why cant I lose weight', 'stubborn fat causes'],
    B: ['best weight loss supplement', 'natural way to lose weight', 'fast metabolism boost', 'weight loss that works'],
    C: ['weight loss supplement review', 'supplement vs diet comparison', 'top rated weight loss 2026', 'does supplement work'],
    D: ['buy weight loss supplement', 'official weight loss site', 'order supplement online', 'get weight loss solution'],
  },
  'Nutra': {
    A: ['joint pain relief', 'blood sugar problems', 'energy fatigue causes', 'digestive issues natural'],
    B: ['best supplement for joints', 'blood sugar support natural', 'energy boost supplement', 'gut health solution'],
    C: ['supplement review 2026', 'nutra product comparison', 'does supplement really work', 'real user results'],
    D: ['buy health supplement', 'order nutra online', 'official supplement store', 'get supplement now'],
  },
  'Make Money': {
    A: ['how to make money online', 'side hustle from home', 'passive income ideas', 'quit 9 to 5 job'],
    B: ['best online income method', 'proven income system', 'work from home opportunity', 'digital income guide'],
    C: ['income method review', 'online business comparison', 'does method actually work', 'real results proof'],
    D: ['start earning online', 'get income system', 'join program today', 'access income method'],
  },
  'Relationships': {
    A: ['how to save relationship', 'get ex back tips', 'relationship problems help', 'communication issues couple'],
    B: ['best relationship guide', 'save marriage program', 'improve communication partner', 'relationship coaching'],
    C: ['relationship program review', 'does guide actually work', 'real couples results', 'compare relationship advice'],
    D: ['get relationship guide', 'buy program access', 'start coaching today', 'official program site'],
  },
};

export const NEGATIVES_BY_VERTICAL: Record<string, string[]> = {
  'Weight Loss': ['free', 'grátis', 'surgery', 'reddit', 'wikipedia', 'diy', 'homemade', 'recipe', 'exercise only', 'gym'],
  'Nutra': ['free', 'grátis', 'prescription', 'doctor', 'hospital', 'side effects lawsuit', 'recall', 'fda warning'],
  'Make Money': ['free', 'grátis', 'scam', 'golpe', 'pyramid', 'mlm', 'emprego', 'vaga', 'salário', 'job'],
  'Relationships': ['free', 'grátis', 'therapist', 'counselor', 'divorce lawyer', 'legal'],
  'Health': ['free', 'grátis', 'prescription', 'doctor', 'hospital', 'emergency'],
  'Beauty': ['free', 'grátis', 'diy', 'homemade', 'recipe', 'salon near me'],
  'Cursos BR': ['grátis', 'free', 'pirata', 'torrent', 'download', 'reclame aqui'],
  'Outro': ['free', 'grátis', 'scam', 'golpe'],
};

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
