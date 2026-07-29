import { describe, expect, it } from 'vitest';
import {
  GOOGLE_EXPERIMENT_REMOTE_STATUSES,
  mapGoogleExperimentRemoteStatus,
} from '@/lib/google-ads-experiments/types';

// A4 (checkpoint pós-Tarefa 8, .hermes/handoffs/2026-07-29_task8-cross-flow-quality-gate.md):
// contract test baseado no enum oficial `ExperimentStatusEnum.ExperimentStatus` v25, não em
// mocks — cobre TODO valor documentado + a regra "nunca cair em SETUP por default".
describe('mapGoogleExperimentRemoteStatus', () => {
  it('1. mapeia cada status remoto oficial pro workflow local correto e preserva remoteStatusRaw', () => {
    const cases: Array<[string, string]> = [
      ['SETUP', 'SETUP'],
      ['INITIATED', 'SCHEDULED'],
      ['ENABLED', 'RUNNING'],
      ['HALTED', 'ENDED'],
      ['REMOVED', 'ENDED'],
      ['PROMOTED', 'PROMOTED'],
      ['GRADUATED', 'GRADUATED'],
    ];
    for (const [remote, local] of cases) {
      const result = mapGoogleExperimentRemoteStatus(remote);
      expect(result.local).toBe(local);
      expect(result.remoteStatusRaw).toBe(remote);
    }
  });

  it('2. UNKNOWN/UNSPECIFIED mapeiam pra ERROR local, nunca pra SETUP', () => {
    expect(mapGoogleExperimentRemoteStatus('UNKNOWN').local).toBe('ERROR');
    expect(mapGoogleExperimentRemoteStatus('UNSPECIFIED').local).toBe('ERROR');
  });

  it('3. qualquer string fora do enum documentado também mapeia pra ERROR, nunca pra SETUP', () => {
    const result = mapGoogleExperimentRemoteStatus('ALGO_NOVO_QUE_A_API_AINDA_NAO_TINHA');
    expect(result.local).toBe('ERROR');
    expect(result.remoteStatusRaw).toBe('ALGO_NOVO_QUE_A_API_AINDA_NAO_TINHA');
  });

  it('4. todo valor do enum remoto documentado tem um mapeamento explícito (sem exceção não tratada)', () => {
    for (const remote of GOOGLE_EXPERIMENT_REMOTE_STATUSES) {
      expect(() => mapGoogleExperimentRemoteStatus(remote)).not.toThrow();
    }
  });
});
