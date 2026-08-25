import { describe, it, expect } from 'vitest';
import { validateCampaignPatch } from './patch-schema';

describe('validateCampaignPatch', () => {
  it('rejects unknown fields', () => {
    const body = { name: 'Test', unknownField: 123 };
    expect(() => validateCampaignPatch(body, 'RASCUNHO')).toThrow(/unknownField/);
  });

  it('rejects id and userId and internal fields', () => {
    expect(() => validateCampaignPatch({ id: 'c1' }, 'RASCUNHO')).toThrow(/id/);
    expect(() => validateCampaignPatch({ userId: 'u1' }, 'RASCUNHO')).toThrow(/userId/);
    expect(() => validateCampaignPatch({ googleCampaignId: 'g1' }, 'RASCUNHO')).toThrow(/googleCampaignId/);
  });

  it('allows valid wizard saveCampaign payload', () => {
    const payload = {
      name: "Test Campaign",
      platform: "ClickBank",
      vertical: "Health",
      geo: "US",
      channel: "Search",
      funnel: "Direct",
      offerUrl: "https://offer.example",
      commission: 100,
      refundPct: 5,
      aov: 120,
      cvrExpected: 2.5,
      commissionNet: 95,
      epcBreakeven: 2.3,
      cpcMax: 1.5,
      cpcScale: 2.0,
      flowpageUrl: "https://flow.example",
      hostingerDomain: "test.com",
      budgetTest: 50,
      budgetDaily: 25,
      testDuration: "72h",
      budgetScale: 100,
      campaignNameGenerated: "Search_Health_Test",
      googleCampaignName: "Search_Health_Test",
      utmCampaign: "Search_Health_Test",
      utmString: "utm_source=test",
      wizardStep: 5,
      loopEnabled: false,
      loopInterval: "24h",
      loopAgents: "ads,compliance",
      postbackUrl: "https://postback.example",
      clickidToken: "{clickid}",
      presellHtml: "<html></html>",
      pageType: "advertorial",
      popupGate: false,
      videoUrl: ""
    };
    const data = validateCampaignPatch(payload, 'RASCUNHO');
    expect(data.testDuration).toBe("72h");
    expect(data.loopInterval).toBe("24h");
    expect(data.platform).toBe("ClickBank");
  });

  it('allows valid wizard saveLoopConfig payload', () => {
    const payload = {
      loopEnabled: true,
      loopInterval: "12h",
      loopAgents: "ads"
    };
    const data = validateCampaignPatch(payload, 'EM_TESTE');
    expect(data.loopEnabled).toBe(true);
  });

  it('enforces status transitions', () => {
    expect(() => validateCampaignPatch({ status: 'ATIVA' }, 'ARQUIVADA')).toThrow(/Transição de status inválida/);
    expect(() => validateCampaignPatch({ status: 'EM_TESTE' }, 'RASCUNHO')).not.toThrow();
  });

  it('rejects non-HTTPS or credential-bearing URLs', () => {
    expect(() => validateCampaignPatch({ presellUrl: 'http://example.com' }, 'RASCUNHO')).toThrow();
    expect(() => validateCampaignPatch({ offerUrl: 'javascript:alert(1)' }, 'RASCUNHO')).toThrow();
    expect(() => validateCampaignPatch({ flowpageUrl: 'https://user:pass@example.com' }, 'RASCUNHO')).toThrow();
  });

  it('normalizes DateTime fields before the Prisma update', () => {
    const data = validateCampaignPatch({ launchedAt: '2026-08-25T12:00:00.000Z' }, 'RASCUNHO');
    expect(data.launchedAt).toBeInstanceOf(Date);
  });

  it('fails closed for an unknown persisted status', () => {
    expect(() => validateCampaignPatch({ name: 'x' }, 'UNKNOWN')).toThrow(/Status atual/);
  });
});
