import { describe, expect, it, vi } from 'vitest';
import {
  CampaignGuardError,
  assertCampaignLlmAllowed,
  type CampaignGuardDependencies,
} from './campaign-guard';

const NOW = new Date('2030-01-01T12:00:00.000Z');

function dependencies(
  campaign: { id: string; status: string; updatedAt: Date } | null,
): CampaignGuardDependencies {
  return {
    findCampaign: vi.fn().mockResolvedValue(campaign),
    now: () => NOW,
    logDecision: vi.fn(),
  };
}

describe('assertCampaignLlmAllowed', () => {
  it('não consulta campanha para trabalho explicitamente não vinculado', async () => {
    const deps = dependencies(null);

    await expect(assertCampaignLlmAllowed('user-1', { kind: 'non-campaign' }, deps)).resolves.toBeUndefined();

    expect(deps.findCampaign).not.toHaveBeenCalled();
  });

  it('libera campanha atualizada exatamente há 30 minutos', async () => {
    const deps = dependencies({
      id: 'campaign-1',
      status: 'EM_TESTE',
      updatedAt: new Date('2030-01-01T11:30:00.000Z'),
    });

    await expect(assertCampaignLlmAllowed(
      'user-1',
      { kind: 'campaign', campaignId: 'campaign-1' },
      deps,
    )).resolves.toBeUndefined();

    expect(deps.findCampaign).toHaveBeenCalledWith('campaign-1', 'user-1');
    expect(deps.logDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'ALLOW' }));
  });

  it('bloqueia campanha com inatividade superior a 30 minutos', async () => {
    const deps = dependencies({
      id: 'campaign-1',
      status: 'EM_TESTE',
      updatedAt: new Date('2030-01-01T11:29:59.999Z'),
    });

    await expect(assertCampaignLlmAllowed(
      'user-1',
      { kind: 'campaign', campaignId: 'campaign-1' },
      deps,
    )).rejects.toBeInstanceOf(CampaignGuardError);

    expect(deps.logDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'BLOCK' }));
  });

  it('falha fechado quando a campanha não pertence ao usuário ou não existe', async () => {
    const deps = dependencies(null);

    await expect(assertCampaignLlmAllowed(
      'user-1',
      { kind: 'campaign', campaignId: 'campaign-1' },
      deps,
    )).rejects.toThrow('não encontrada');
  });

  it('falha fechado quando a leitura da campanha falha', async () => {
    const deps = dependencies(null);
    vi.mocked(deps.findCampaign).mockRejectedValue(new Error('database unavailable'));

    await expect(assertCampaignLlmAllowed(
      'user-1',
      { kind: 'campaign', campaignId: 'campaign-1' },
      deps,
    )).rejects.toThrow('não pôde ser verificada');

    expect(deps.logDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'BLOCK' }));
  });
});
