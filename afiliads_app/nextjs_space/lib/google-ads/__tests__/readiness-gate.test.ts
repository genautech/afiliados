// Gate de lançamento: UTM e link de afiliado. Antes o readiness validava HTTPS, checklist,
// keywords e brand bidding, mas não olhava o conteúdo da UTM nem se o link que paga comissão era
// de afiliado — validateAffiliateLink() só rodava no cliente, como aviso na tela do wizard.
import { describe, it, expect } from 'vitest';
import { checkGoogleAdsReadiness, type ReadinessCampaign, type ReadinessDependencies } from '../readiness';

const UTM_OK = '?utm_source=google&utm_medium=cpc&utm_campaign=CB_WL_US_v1&utm_content={creative}&utm_term={keyword}';
const HOPLINK_OK = 'https://hop.clickbank.net/?affiliate=aff123&vendor=prod';

const campanhaBase: ReadinessCampaign = {
  id: 'c1',
  name: 'CB_WL_US_v1',
  budgetDaily: 30,
  geo: 'US',
  presellUrl: 'https://minha-presell.com/p/x',
  platform: 'ClickBank',
  funnel: 'BRIDGE',
  utmString: UTM_OK,
  utmCampaign: 'CB_WL_US_v1',
  productResearchId: 'p1',
  keywords: [{ keyword: 'lymph supplement', matchType: 'phrase', isSelected: true }],
};

function deps(over: {
  campaign?: Partial<ReadinessCampaign>;
  product?: any;
} = {}): ReadinessDependencies {
  return {
    findCampaign: async () => ({ ...campanhaBase, ...over.campaign }),
    findChecklists: async () => [],
    getAdsConfig: async () => ({ id: 'a1', customerId: '123' }),
    findProduct: async () => ('product' in over ? over.product : { hopLink: HOPLINK_OK, affiliateInsights: {} }),
    verifyApprovedUrlUnchanged: async () => true,
  };
}

const run = (o?: Parameters<typeof deps>[0]) => checkGoogleAdsReadiness('c1', 'u1', 'PREPARE', deps(o));

describe('readiness — UTM', () => {
  it('campanha completa e coerente passa', async () => {
    const r = await run();
    expect(r.errors).toEqual([]);
    expect(r.ready).toBe(true);
  });

  it('bloqueia UTM sem utm_source', async () => {
    const r = await run({ campaign: { utmString: '?utm_medium=cpc&utm_campaign=CB_WL_US_v1' } });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.startsWith('UTM:') && e.includes('utm_source'))).toBe(true);
  });

  it('bloqueia macro de ValueTrack inexistente', async () => {
    const r = await run({ campaign: { utmString: '?utm_source=google&utm_medium=cpc&utm_campaign=CB_WL_US_v1&utm_term={keywords}' } });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('{keywords}'))).toBe(true);
  });

  it('bloqueia utm_campaign divergente do campo da campanha', async () => {
    const r = await run({ campaign: { utmCampaign: 'OUTRA_v9' } });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('campanhas diferentes'))).toBe(true);
  });

  it('UTM ausente é aviso, não bloqueio — o item utms do checklist é critical:false', async () => {
    const r = await run({ campaign: { utmString: null } });
    expect(r.ready).toBe(true);
    expect(r.warnings.some((w) => w.includes('UTM: não configurada'))).toBe(true);
  });
});

describe('readiness — link de afiliado', () => {
  it('bloqueia quando o link é a página de checkout do produtor', async () => {
    const r = await run({ product: { hopLink: 'https://pay.hotmart.com/checkout/XYZ', affiliateInsights: {} } });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('Link de comissão inválido'))).toBe(true);
  });

  it('bloqueia link que não é URL', async () => {
    const r = await run({ product: { hopLink: 'hop.clickbank.net/sem-protocolo', affiliateInsights: {} } });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('Link de comissão inválido'))).toBe(true);
  });

  it('avisa, sem bloquear, quando é domínio próprio limpo', async () => {
    const r = await run({ product: { hopLink: 'https://meudominio.com/oferta', affiliateInsights: {} } });
    expect(r.ready).toBe(true);
    expect(r.warnings.some((w) => w.startsWith('Link de comissão:'))).toBe(true);
  });

  it('funil DIRECT sem offerUrl é erro (não há onde o clique gerar comissão)', async () => {
    const r = await run({ campaign: { funnel: 'DIRECT', offerUrl: null }, product: null });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('Funil DIRECT sem offerUrl'))).toBe(true);
  });

  it('funil DIRECT valida a offerUrl, não o hopLink do produto', async () => {
    const r = await run({
      campaign: { funnel: 'DIRECT', offerUrl: 'https://pay.eduzz.com/checkout/123' },
      product: { hopLink: HOPLINK_OK, affiliateInsights: {} },
    });
    expect(r.ready).toBe(false);
    expect(r.errors.some((e) => e.includes('Link de comissão inválido'))).toBe(true);
  });

  it('sem produto e sem offerUrl, avisa em vez de bloquear no funil BRIDGE', async () => {
    const r = await run({ campaign: { offerUrl: null }, product: null });
    expect(r.ready).toBe(true);
    expect(r.warnings.some((w) => w.includes('Nenhum HopLink cadastrado'))).toBe(true);
  });
});
