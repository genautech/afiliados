import { describe, expect, it } from 'vitest';
import {
  getExperimentActionFeasibility,
  getDetailedStatusVocabulary,
  type ExperimentDashboardReport,
} from '../experiment-dashboard-helpers';

describe('Experiment Dashboard Helpers (B4 Vocabulary & Action Safety)', () => {
  it('desabilita promoção quando a amostra for inconclusiva ou underpowered', () => {
    const report: ExperimentDashboardReport = {
      outcome: 'UNDERPOWERED',
      controlClicks: 12,
      treatmentClicks: 14,
      targetClicks: 100,
    };
    const feas = getExperimentActionFeasibility(report);
    expect(feas.canPromote).toBe(false);
    expect(feas.canGraduate).toBe(false);
    expect(feas.reason).toContain('Amostra insuficiente');
  });

  it('habilita promoção somente quando houver vencedor estatisticamente significante', () => {
    const report: ExperimentDashboardReport = {
      outcome: 'SIGNIFICANT_WINNER',
      controlClicks: 150,
      treatmentClicks: 180,
      targetClicks: 100,
      conversionsUplift: 0.35,
      pValue: 0.02,
    };
    const feas = getExperimentActionFeasibility(report);
    expect(feas.canPromote).toBe(true);
    expect(feas.canGraduate).toBe(true);
  });

  it('exibe o vocabulário de status transparente sem ambiguidade (B4 parte 2)', () => {
    expect(getDetailedStatusVocabulary({ status: 'RASCUNHO', hasGoogleCampaignId: false }).label).toContain('Configuração Local Concluída');
    expect(getDetailedStatusVocabulary({ status: 'RASCUNHO', hasGoogleCampaignId: true }).label).toContain('PAUSED - Sem Custo');
    expect(getDetailedStatusVocabulary({ status: 'SETUP', hasGoogleCampaignId: true }).label).toContain('Sem Custo');
    expect(getDetailedStatusVocabulary({ status: 'RUNNING', hasGoogleCampaignId: true }).label).toContain('Ativo e Verificado Remotamente');
  });
});
