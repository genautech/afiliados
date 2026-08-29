import { describe, it, expect } from 'vitest';
import { normalizeDeployResponse } from '../_components/step-launch';

// Forma real devolvida por POST /api/campaigns/[id]/deploy (responsePayload).
const routePayload = {
  status: 'ready_for_deploy',
  checkoutUrl: 'https://pay.kiwify.com.br/mock-femicore-low-ticket',
  ebookPdf: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/ebook_final.pdf',
  ebookHtml: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/ebook_final.html',
  landingPageZip: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/landing_page_deploy.zip',
  webhookUrl: 'https://app.afiliads.com/api/webhooks/kiwify',
  deployedAt: '2026-08-29T15:18:11Z',
  mode: 'LIVE',
  idempotent: false,
};

// Forma do deploy_summary gravado por scripts/deploy_product.py no manifest.json.
const manifestPayload = {
  deploy: {
    status: 'ready_for_deploy',
    deployed_at: '2026-08-29T15:18:11Z',
    landing_page_zip: '/tmp/dist/landing_page_deploy.zip',
    ebook_pdf: '/tmp/dist/ebook_final.pdf',
    ebook_html: '/tmp/dist/ebook_final.html',
    payment_integration: {
      platform: 'Kiwify',
      checkout_url: 'https://pay.kiwify.com.br/mock-x',
      webhook_url: 'https://app.afiliads.com/api/webhooks/kiwify',
      webhook_secret: 'whsec_mock_x_987654',
    },
  },
};

describe('normalizeDeployResponse', () => {
  it('lê a forma camelCase da rota', () => {
    expect(normalizeDeployResponse(routePayload)).toEqual({
      status: 'ready_for_deploy',
      checkoutUrl: 'https://pay.kiwify.com.br/mock-femicore-low-ticket',
      webhookUrl: 'https://app.afiliads.com/api/webhooks/kiwify',
      ebookPdf: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/ebook_final.pdf',
      ebookHtml: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/ebook_final.html',
      landingPageZip: '/Users/x/campaigns_data/low_ticket/femicore-low-ticket/dist/landing_page_deploy.zip',
      deployedAt: '2026-08-29T15:18:11Z',
      mode: 'LIVE',
      idempotent: false,
    });
  });

  it('cai para o snake_case aninhado do manifest', () => {
    const out = normalizeDeployResponse(manifestPayload);
    expect(out?.checkoutUrl).toBe('https://pay.kiwify.com.br/mock-x');
    expect(out?.ebookPdf).toBe('/tmp/dist/ebook_final.pdf');
    expect(out?.landingPageZip).toBe('/tmp/dist/landing_page_deploy.zip');
    expect(out?.deployedAt).toBe('2026-08-29T15:18:11Z');
  });

  it('nunca carrega o webhook_secret para a UI', () => {
    expect(JSON.stringify(normalizeDeployResponse(manifestPayload))).not.toContain('whsec_');
  });

  it('marca idempotent quando o manifest já estava completo', () => {
    expect(normalizeDeployResponse({ ...routePayload, idempotent: true })?.idempotent).toBe(true);
  });

  it('devolve null quando o 200 não trouxe artefato nenhum', () => {
    expect(normalizeDeployResponse({ status: 'unknown', mode: 'MOCK' })).toBeNull();
    expect(normalizeDeployResponse(null)).toBeNull();
    expect(normalizeDeployResponse([])).toBeNull();
  });

  it('ignora mode fora de LIVE/MOCK', () => {
    expect(normalizeDeployResponse({ ...routePayload, mode: 'SEI_LA' })?.mode).toBeNull();
  });
});
