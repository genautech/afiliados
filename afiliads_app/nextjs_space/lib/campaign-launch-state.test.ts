import { describe, expect, it } from 'vitest';
import { deriveCampaignLaunchState } from './campaign-launch-state';

describe('deriveCampaignLaunchState', () => {
  it('distingue configuração local sem recurso remoto', () => {
    expect(deriveCampaignLaunchState({ wizardCompleted: false })).toBe('CONFIGURING');
    expect(deriveCampaignLaunchState({ wizardCompleted: true })).toBe('READY_FOR_REMOTE_CREATE');
  });

  it('não confunde ID remoto criado com campanha ativa', () => {
    expect(deriveCampaignLaunchState({ wizardCompleted: true, googleCampaignId: '123', status: 'EM_TESTE' })).toBe('REMOTE_PAUSED');
  });

  it('representa pausa e ativação somente pelo estado sincronizado', () => {
    expect(deriveCampaignLaunchState({ wizardCompleted: true, googleCampaignId: '123', status: 'PAUSADA' })).toBe('PAUSED');
    expect(deriveCampaignLaunchState({ wizardCompleted: true, googleCampaignId: '123', status: 'ATIVA' })).toBe('ACTIVE');
  });
});
