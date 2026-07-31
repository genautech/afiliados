import { describe, expect, it } from 'vitest';
import {
  ANTISTRIKE_ITEMS,
  BRIDGE_CHECKLIST,
  GOOGLE_ADS_CHECKLIST,
  TRACKING_CHECKLIST_MAXWEB,
  TRACKING_CHECKLIST_CB,
  GOLIVE_CHECKLIST,
} from '@/lib/wizard-data';

// Função de apoio extraída/testável das regras do canAdvance
export function canWizardStepAdvance(opts: {
  step: number;
  name: string;
  commission: number;
  platform: string;
  selectedKeywordsCount: number;
  antistrikeChecks: Record<string, boolean>;
  bridgeChecks: Record<string, boolean>;
  googleAdsChecks: Record<string, boolean>;
  trackingChecks: Record<string, boolean>;
  goLiveChecks: Record<string, boolean>;
  freshChecks?: Record<number, Record<string, boolean>> | null;
}): boolean {
  const {
    step,
    name,
    commission,
    platform,
    selectedKeywordsCount,
    antistrikeChecks,
    bridgeChecks,
    googleAdsChecks,
    trackingChecks,
    goLiveChecks,
    freshChecks,
  } = opts;

  if (step === 1) return name.trim().length > 0 && commission > 0;

  const checksFor = (s: number, fallback: Record<string, boolean>) =>
    freshChecks?.[s] ? { ...fallback, ...freshChecks[s] } : fallback;

  if (step === 3 && platform === 'ClickBank') {
    return ANTISTRIKE_ITEMS.filter((i) => i.critical).every((i) => checksFor(3, antistrikeChecks)[i.key]);
  }
  if (step === 4) {
    return BRIDGE_CHECKLIST.filter((i) => i.critical).every((i) => checksFor(4, bridgeChecks)[i.key]);
  }
  if (step === 5) {
    return selectedKeywordsCount >= 1;
  }
  if (step === 7) {
    return GOOGLE_ADS_CHECKLIST.filter((i) => i.critical).every((i) => checksFor(7, googleAdsChecks)[i.key]);
  }
  if (step === 8) {
    const items = platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
    return items.filter((i) => i.critical).every((i) => checksFor(8, trackingChecks)[i.key]);
  }
  if (step === 9) {
    return GOLIVE_CHECKLIST.filter((i) => i.critical).every((i) => checksFor(9, goLiveChecks)[i.key]);
  }
  return true;
}

describe('Wizard Rules - canWizardStepAdvance (B7 Gating)', () => {
  const criticalGadsKeys = GOOGLE_ADS_CHECKLIST.filter((i) => i.critical).map((i) => i.key);
  const baseGadsChecks: Record<string, boolean> = {};
  for (const k of criticalGadsKeys) baseGadsChecks[k] = true;

  const baseState = {
    name: 'Campaign Alpha',
    commission: 50,
    platform: 'ClickBank',
    selectedKeywordsCount: 2,
    antistrikeChecks: { copyright_ok: true, no_health_claims: true, affiliate_disclosure: true },
    bridgeChecks: { disclaimer_ok: true, cta_visible: true, privacy_policy: true },
    googleAdsChecks: baseGadsChecks,
    trackingChecks: { postback_configured: true },
    goLiveChecks: { final_review: true },
  };

  it('bloqueia o Passo 7 se houver item crítico do Google Ads pendente', () => {
    const state = {
      ...baseState,
      step: 7,
      googleAdsChecks: { ...baseGadsChecks, budget_diario: false },
    };
    expect(canWizardStepAdvance(state)).toBe(false);
  });

  it('libera o Passo 7 se todos os itens críticos do Google Ads estiverem marcados', () => {
    const state = {
      ...baseState,
      step: 7,
      googleAdsChecks: baseGadsChecks,
    };
    expect(canWizardStepAdvance(state)).toBe(true);
  });

  it('bloqueia o Passo 8 se houver item crítico de tracking pendente para MaxWeb', () => {
    const state = {
      ...baseState,
      step: 8,
      platform: 'MaxWeb',
      trackingChecks: {},
    };
    expect(canWizardStepAdvance(state)).toBe(false);
  });

  it('bloqueia o Passo 5 se não houver pelo menos 1 keyword selecionada', () => {
    const state = {
      ...baseState,
      step: 5,
      selectedKeywordsCount: 0,
    };
    expect(canWizardStepAdvance(state)).toBe(false);
  });

  it('usa verificação fresca (freshChecks) quando fornecida pelo servidor', () => {
    const state = {
      ...baseState,
      step: 7,
      googleAdsChecks: { ...baseGadsChecks, budget_diario: false },
      freshChecks: {
        7: { budget_diario: true },
      },
    };
    expect(canWizardStepAdvance(state)).toBe(true);
  });
});
