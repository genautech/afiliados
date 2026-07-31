import { describe, expect, it } from 'vitest';
import {
  validateExperimentSetupForm,
  getExperimentStatusBadge,
  type ExperimentSetupUIState,
} from '../experiment-setup-helpers';

describe('Experiment Setup Helpers (B4 UI Safety)', () => {
  it('valida que o split de tráfego e a URL do tratamento sejam válidos', () => {
    expect(validateExperimentSetupForm(50, 'https://example.com/treatment').valid).toBe(true);
    expect(validateExperimentSetupForm(5, 'https://example.com/treatment').valid).toBe(false);
    expect(validateExperimentSetupForm(50, 'not-a-url').valid).toBe(false);
  });

  it('deixa explícito que o status SETUP nunca veicula anúncios e tem custo $0 (B4 parte 1)', () => {
    const badge = getExperimentStatusBadge('SETUP');
    expect(badge.servesAds).toBe(false);
    expect(badge.label).toContain('Sem Custo');
  });

  it('identifica que SCHEDULED e RUNNING podem veicular anúncios e gerar custo real', () => {
    expect(getExperimentStatusBadge('SCHEDULED').servesAds).toBe(true);
    expect(getExperimentStatusBadge('RUNNING').servesAds).toBe(true);
  });
});
