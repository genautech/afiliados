import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock é içado acima das consts, então os delegates vêm de vi.hoisted.
const { campaign, productResearch, brandKit, claimLedgerEntry } = vi.hoisted(() => ({
  campaign: { findFirst: vi.fn() },
  productResearch: { findFirst: vi.fn() },
  brandKit: { findFirst: vi.fn(), create: vi.fn() },
  claimLedgerEntry: { findFirst: vi.fn(), createMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { campaign, productResearch, brandKit, claimLedgerEntry },
}));

import {
  StudioScopeError,
  persistBrandKit,
  persistClaimLedger,
  resolveScope,
} from './product-agent-persistence';

const telemetry = { provider: 'openrouter', model: 'kimi', totalTokens: 30, durationMs: 12 };

const brandKitOutput = {
  palette: [{ role: 'primary', hex: '#1D4ED8', usage: 'CTA' }],
  typography: { display: 'Inter Tight', text: 'Inter', rationale: 'legibilidade' },
  tone: { voice: 'direto', dos: ['a'], donts: ['b'] },
  bannedWords: ['cura'],
  positioning: 'guia prático',
  gaps: [],
};

describe('resolveScope', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devolve escopo vazio quando nenhum id é passado, sem tocar no banco', async () => {
    const scope = await resolveScope('user-1', {});
    expect(scope).toEqual({ campaignId: null, productResearchId: null });
    expect(campaign.findFirst).not.toHaveBeenCalled();
  });

  it('recusa campanha que não é do usuário', async () => {
    campaign.findFirst.mockResolvedValue(null);
    await expect(resolveScope('user-1', { campaignId: 'camp-de-outro' })).rejects.toThrow(
      StudioScopeError
    );
  });

  it('recusa produto que não é do usuário', async () => {
    productResearch.findFirst.mockResolvedValue(null);
    await expect(resolveScope('user-1', { productResearchId: 'prod-de-outro' })).rejects.toThrow(
      StudioScopeError
    );
  });

  it('filtra sempre por userId ao validar a campanha', async () => {
    campaign.findFirst.mockResolvedValue({ id: 'camp-1' });
    await resolveScope('user-1', { campaignId: 'camp-1' });
    expect(campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'camp-1', userId: 'user-1' } })
    );
  });
});

describe('persistBrandKit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('grava versão 1 quando não há artefato anterior no escopo', async () => {
    brandKit.findFirst.mockResolvedValue(null);
    brandKit.create.mockResolvedValue({ id: 'bk-1', version: 1 });

    const res = await persistBrandKit({
      userId: 'user-1',
      input: { brandName: 'X' },
      output: brandKitOutput,
      scope: { campaignId: 'camp-1', productResearchId: null },
      telemetry,
    });

    expect(res).toEqual({ recordId: 'bk-1', version: 1 });
    const data = brandKit.create.mock.calls[0][0].data;
    expect(data.version).toBe(1);
    expect(data.campaignId).toBe('camp-1');
    expect(data.positioning).toBe('guia prático');
    expect(data.provider).toBe('openrouter');
  });

  it('incrementa a versão em vez de sobrescrever o artefato anterior', async () => {
    brandKit.findFirst.mockResolvedValue({ version: 3 });
    brandKit.create.mockResolvedValue({ id: 'bk-4', version: 4 });

    await persistBrandKit({
      userId: 'user-1',
      input: {},
      output: brandKitOutput,
      scope: { campaignId: 'camp-1', productResearchId: null },
      telemetry,
    });

    expect(brandKit.create.mock.calls[0][0].data.version).toBe(4);
  });

  it('procura a última versão dentro do mesmo escopo do usuário', async () => {
    brandKit.findFirst.mockResolvedValue(null);
    brandKit.create.mockResolvedValue({ id: 'bk-1', version: 1 });

    await persistBrandKit({
      userId: 'user-1',
      input: {},
      output: brandKitOutput,
      scope: { campaignId: null, productResearchId: 'prod-1' },
      telemetry,
    });

    expect(brandKit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', campaignId: null, productResearchId: 'prod-1' },
        orderBy: { version: 'desc' },
      })
    );
  });
});

describe('persistClaimLedger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('grava uma linha por claim, todas na mesma versão', async () => {
    claimLedgerEntry.findFirst.mockResolvedValue({ version: 2 });
    claimLedgerEntry.createMany.mockResolvedValue({ count: 2 });

    const res = await persistClaimLedger({
      userId: 'user-1',
      input: {},
      output: {
        ledger: [
          { claim: 'perde 5kg', status: 'PROIBIDO', source: null, rewrite: 'r1', allowedChannels: [], reason: 'saúde' },
          { claim: '30 receitas', status: 'FATO', source: 'sumario.pdf', rewrite: 'r2', allowedChannels: ['ads'], reason: 'consta' },
        ],
      },
      scope: { campaignId: 'camp-1', productResearchId: null },
      telemetry,
    });

    const rows = claimLedgerEntry.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows.every((r: any) => r.version === 3)).toBe(true);
    expect(rows[0].status).toBe('PROIBIDO');
    expect(res.version).toBe(3);
  });

  it('falha em vez de gravar lote vazio', async () => {
    claimLedgerEntry.findFirst.mockResolvedValue(null);
    await expect(
      persistClaimLedger({
        userId: 'user-1',
        input: {},
        output: { ledger: [] },
        scope: { campaignId: null, productResearchId: null },
        telemetry,
      })
    ).rejects.toThrow(/ledger vazio/);
    expect(claimLedgerEntry.createMany).not.toHaveBeenCalled();
  });
});
