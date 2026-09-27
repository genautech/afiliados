import { describe, it, expect } from 'vitest';
import { renderPresellHtml, patchTrackingInHtml, type PresellContent } from '../presell';

const content = {
  titulo_pagina: 'T', meta_descricao: 'D', nome_site: 'S', autor: 'A', categoria: 'C',
  headline: 'H', subheadline: 'SH', abertura: 'AB',
  secao1_titulo: 's1', secao1_texto: 't1', secao2_titulo: 's2', secao2_texto: 't2',
  secao3_titulo: 's3', secao3_texto: 't3',
  beneficios: ['b1', 'b2', 'b3'], prova: 'P', cta_texto: 'CTA', cta_reforco: 'R', cta_final: 'F',
  pros: ['p'], contras: ['c'], faq: [{ pergunta: 'q1', resposta: 'r1' }, { pergunta: 'q2', resposta: 'r2' }],
  como_funciona: ['x'], temas_feedback: ['y'],
} as unknown as PresellContent;

const base = { productName: 'Produto', hopLink: 'https://hop.example/x' };

describe('tracking na presell renderizada', () => {
  it('sem ID cadastrado não deixa placeholder nem script quebrado', () => {
    const html = renderPresellHtml(content, { ...base, pageType: 'advertorial' });
    expect(html).not.toContain('GOOGLE_ADS_ID');
    expect(html).not.toContain('CONVERSION_LABEL');
    expect(html).not.toContain('googletagmanager.com/gtag/js');
    expect(html).not.toContain('fbq(');
  });

  it('com IDs cadastrados injeta gtag, GA4, pixel e o evento de conversão', () => {
    const html = renderPresellHtml(content, {
      ...base, pageType: 'advertorial',
      googleAdsId: 'AW-123456789', conversionLabel: 'AbCdEfGh', ga4Id: 'G-ABC123', metaPixelId: '4425138471073069',
    });
    expect(html).toContain('gtag/js?id=AW-123456789');
    expect(html).toContain("gtag('config', 'AW-123456789')");
    expect(html).toContain("gtag('config', 'G-ABC123')");
    expect(html).toContain("fbq('init', '4425138471073069')");
    expect(html).toContain("'send_to': 'AW-123456789/AbCdEfGh'");
  });

  it('ID sem label não emite evento de conversão inválido', () => {
    const html = renderPresellHtml(content, { ...base, pageType: 'advertorial', googleAdsId: 'AW-123456789' });
    expect(html).toContain('gtag/js?id=AW-123456789');
    expect(html).not.toContain('send_to');
  });

  it('todos os pageTypes renderizam sem placeholder de tracking', () => {
    for (const pageType of ['advertorial', 'pogo', 'vsl', 'authority', 'authority_v2', 'review', 'tsl', 'cookie_popup']) {
      const html = renderPresellHtml(content, { ...base, pageType, metaPixelId: '123' });
      expect(html, pageType).not.toMatch(/GOOGLE_ADS_ID|CONVERSION_LABEL|\{\{(GOOGLE_TAGS|GA4_TAG|META_PIXEL_TAG|GTM_HEAD|GTM_BODY|TRACKING_SCRIPT)\}\}/);
    }
  });
});

describe('patchTrackingInHtml (presell já salva)', () => {
  it('substitui tags quebradas de uma página antiga', () => {
    const antiga = `<html><head><meta charset="utf-8">
<script async src="https://www.googletagmanager.com/gtag/js?id=GOOGLE_ADS_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('config', 'GOOGLE_ADS_ID');
</script>
</head><body><script>
      if (CLICK_BEACON_URL && navigator.sendBeacon) { try { navigator.sendBeacon(CLICK_BEACON_URL); } catch (e) {} }
      if (typeof gtag === 'function') gtag('event', 'conversion', {'send_to': 'GOOGLE_ADS_ID/CONVERSION_LABEL'});
</script></body></html>`;
    const { html, changes } = patchTrackingInHtml(antiga, {
      googleAdsId: 'AW-999', conversionLabel: 'LBL', ga4Id: 'G-1', metaPixelId: '4425138471073069',
    });
    expect(html).not.toContain('GOOGLE_ADS_ID');
    expect(html).not.toContain('CONVERSION_LABEL');
    expect(html).toContain('gtag/js?id=AW-999');
    expect(html).toContain("fbq('init', '4425138471073069')");
    expect(html).toContain("'send_to': 'AW-999/LBL'");
    expect(changes.length).toBeGreaterThan(0);
  });

  it('remove o bloco quebrado quando não há nenhum ID', () => {
    const antiga = `<html><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=GOOGLE_ADS_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  gtag('config', 'GOOGLE_ADS_ID');
</script>
</head><body></body></html>`;
    const { html } = patchTrackingInHtml(antiga, {});
    expect(html).not.toContain('googletagmanager');
    expect(html).not.toContain('GOOGLE_ADS_ID');
  });

  it('injeta o evento de conversão numa presell gerada sem nenhum ID', () => {
    const semTag = renderPresellHtml(content, { ...base, pageType: 'advertorial' });
    const { html } = patchTrackingInHtml(semTag, { googleAdsId: 'AW-77', conversionLabel: 'ZZ', metaPixelId: '55' });
    expect(html).toContain("'send_to': 'AW-77/ZZ'");
    expect(html).toContain("fbq('init', '55')");
    expect(html).toContain('gtag/js?id=AW-77');
  });
});
