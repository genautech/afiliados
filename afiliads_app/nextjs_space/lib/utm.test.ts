import { describe, it, expect } from 'vitest';
import { validateUtmString } from './utm';

const UTM_DO_WIZARD =
  '?utm_source=google&utm_medium=cpc&utm_campaign=CB_WL_US_SEARCH_BRIDGE_v1&utm_content={creative}&utm_term={keyword}';

describe('validateUtmString', () => {
  it('aprova a UTM que o wizard gera', () => {
    const r = validateUtmString(UTM_DO_WIZARD, { utmCampaign: 'CB_WL_US_SEARCH_BRIDGE_v1' });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('reprova UTM ausente', () => {
    expect(validateUtmString(null).valid).toBe(false);
    expect(validateUtmString('   ').errors[0]).toContain('não configurada');
  });

  it('exige ? no começo', () => {
    const r = validateUtmString('utm_source=google&utm_medium=cpc&utm_campaign=x');
    expect(r.errors.some((e) => e.includes('começar com "?"'))).toBe(true);
  });

  it('aceita & quando a UTM é concatenada a uma URL que já tem query', () => {
    const r = validateUtmString('&utm_source=google&utm_medium=cpc&utm_campaign=x', { utmCampaign: 'x' });
    expect(r.valid).toBe(true);
  });

  it('pega macro de ValueTrack que não existe', () => {
    // {keywords} no plural é o erro clássico: não dá erro no Google, vai literal pra URL.
    const r = validateUtmString('?utm_source=google&utm_medium=cpc&utm_campaign=x&utm_term={keywords}', { utmCampaign: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('{keywords}'))).toBe(true);
  });

  it('aceita macro com modificador depois de :', () => {
    const r = validateUtmString(
      '?utm_source=google&utm_medium=cpc&utm_campaign=x&utm_term={keyword:generico}&utm_content={ifmobile:mobile}',
      { utmCampaign: 'x' },
    );
    expect(r.valid).toBe(true);
  });

  it('exige utm_source, utm_medium e utm_campaign', () => {
    const r = validateUtmString('?utm_term={keyword}');
    expect(r.errors.some((e) => e.includes('utm_source'))).toBe(true);
    expect(r.errors.some((e) => e.includes('utm_medium'))).toBe(true);
    expect(r.errors.some((e) => e.includes('utm_campaign'))).toBe(true);
  });

  it('acusa utm_campaign diferente do campo da campanha', () => {
    // É o par que decide a atribuição: clickbank casa pela forma canônica do utmCampaign.
    const r = validateUtmString(UTM_DO_WIZARD, { utmCampaign: 'OUTRA_CAMPANHA_v2' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('campanhas diferentes'))).toBe(true);
  });

  it('não acusa diferença quando só a grafia muda (mesma forma canônica)', () => {
    const r = validateUtmString(
      '?utm_source=google&utm_medium=cpc&utm_campaign=CB-WL-US-v1',
      { utmCampaign: 'cb_wl_us_v1' },
    );
    expect(r.valid).toBe(true);
  });

  it('pega parâmetro duplicado', () => {
    const r = validateUtmString('?utm_source=google&utm_medium=cpc&utm_campaign=x&utm_source=bing', { utmCampaign: 'x' });
    expect(r.errors.some((e) => e.includes('utm_source') && e.includes('2 vezes'))).toBe(true);
  });

  it('pega espaço em branco na UTM', () => {
    const r = validateUtmString('?utm_source=google ads&utm_medium=cpc&utm_campaign=x', { utmCampaign: 'x' });
    expect(r.errors.some((e) => e.includes('espaço'))).toBe(true);
  });

  it('reprova gclid com valor fixo', () => {
    const r = validateUtmString('?utm_source=google&utm_medium=cpc&utm_campaign=x&gclid=Cj0KabcFIXO', { utmCampaign: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('gclid'))).toBe(true);
  });

  it('aceita gclid como macro', () => {
    const r = validateUtmString('?utm_source=google&utm_medium=cpc&utm_campaign=x&cid={gclid}', { utmCampaign: 'x' });
    expect(r.valid).toBe(true);
  });

  it('avisa sobre utm_medium fora do padrão de tráfego pago', () => {
    const r = validateUtmString('?utm_source=google&utm_medium=email&utm_campaign=x', { utmCampaign: 'x' });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('utm_medium'))).toBe(true);
  });

  it('avisa quando não há utm_term nem utm_content', () => {
    const r = validateUtmString('?utm_source=google&utm_medium=cpc&utm_campaign=x', { utmCampaign: 'x' });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('keyword'))).toBe(true);
  });

  it('sem utmCampaign no contexto, não inventa erro de divergência', () => {
    const r = validateUtmString(UTM_DO_WIZARD);
    expect(r.valid).toBe(true);
  });
});
