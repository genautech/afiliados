// Orquestrador do Painel de Lançamento.
//
// Substitui lib/campaignLaunchSaga.ts. As diferenças que importam:
//
//   1. Idempotência é do banco, não da memória. O @@unique
//      (campaignId, channel, idempotencyKey) de ChannelLaunch é o que impede
//      lançamento duplicado, mesmo com dois requests simultâneos.
//   2. Nenhum canal cria nada sem passar pelo seu guard default-deny. O saga
//      antigo escrevia googleCampaignId sem guard nenhum.
//   3. O gate de claims (Fase E) roda antes de qualquer canal e não tem bypass.
//   4. MOCK nunca vira LIVE sozinho: o modo real de cada canal vem do preflight
//      do próprio canal e fica gravado na linha.
//   5. Falha parcial compensa: se um canal criou e outro falhou, o que subiu é
//      pausado e a linha vira COMPENSATED. Nada fica no ar sem o par.
import { prisma } from '@/lib/prisma';
import { PENDING_LAUNCH } from '@/lib/campaign-status';
import { evaluateClaimGate, type ClaimGateRow } from '@/lib/subsidios/ebook-os/claim-gate';
import { googleAdsAdapter } from './google-adapter';
import { metaAdsAdapter } from './meta-adapter';
import {
  ChannelAdapter,
  ChannelContext,
  LaunchChannel,
  LaunchMode,
} from './types';

const ADAPTERS: Record<LaunchChannel, ChannelAdapter> = {
  GOOGLE_ADS: googleAdsAdapter,
  META_ADS: metaAdsAdapter,
};

export type ChannelLaunchStatus =
  | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'COMPENSATED';

export interface ChannelOutcome {
  channel: LaunchChannel;
  label: string;
  status: ChannelLaunchStatus;
  mode: LaunchMode | null;
  externalIds: Record<string, string>;
  error: string | null;
  logs: string[];
  alreadyExisted: boolean;
}

export interface LaunchResult {
  success: boolean;
  /** Compatível com o consumidor antigo do saga: log corrido para a UI. */
  logs: string[];
  error?: string;
  channels: ChannelOutcome[];
  /** true quando nada foi feito porque essa chave já tinha rodado. */
  replayed: boolean;
}

export interface LaunchInput {
  userId: string;
  campaignId: string;
  idempotencyKey: string;
  channels?: LaunchChannel[];
  /** Pedido de simulação. Não força LIVE: um canal sem credencial fica MOCK de qualquer jeito. */
  requestMock?: boolean;
  /** Vale só para o readiness operacional do Google. NUNCA pula o gate de claims. */
  bypassReadiness?: boolean;
  overrides?: { headlines?: string[]; descriptions?: string[] };
}

/** Gate de claims — idêntico ao que o saga antigo fazia, e sem bypass. */
// Exportada porque /api/google-ads/create é um segundo caminho de mutação real
// (rota autorizada por revisão) e não pode escapar do gate de claims só por não
// passar pelo orquestrador.
export async function assertClaimsAllowed(userId: string, campaignId: string): Promise<string[]> {
  const agg = await prisma.claimLedgerEntry.aggregate({
    where: { campaignId, userId },
    _max: { version: true },
  });
  const version = agg._max.version;
  if (version == null) return ['Ledger de claims vazio: nada a verificar.'];

  const rows = await prisma.claimLedgerEntry.findMany({
    where: { campaignId, userId, version },
  });
  const gate = evaluateClaimGate(
    rows.map((r): ClaimGateRow => ({
      id: r.id,
      claim: r.claim,
      status: r.status as ClaimGateRow['status'],
      source: r.source,
      allowedChannels: Array.isArray(r.allowedChannels) ? (r.allowedChannels as string[]) : [],
    })),
  );
  if (!gate.allowed) {
    const detail = gate.issues.map(i => `${i.code}: ${i.message}`).join(' | ');
    throw new Error(`Ledger de claims reprovado — ${gate.issues.length} problema(s). ${detail}`);
  }
  return [`Gate de claims: ${rows.length} claim(s) da versão ${version} aprovadas.`];
}

/**
 * Grava a reprovação de preflight como linha do canal. Se a chave já foi usada
 * naquele canal, a linha existente manda — idempotência não pode ser
 * sobrescrita por uma segunda avaliação.
 */
async function recordBlocked(args: {
  userId: string; campaignId: string; idempotencyKey: string;
  channel: LaunchChannel; mode: LaunchMode; error: string; logs: string[];
}): Promise<void> {
  try {
    await prisma.channelLaunch.create({
      data: {
        userId: args.userId, campaignId: args.campaignId, channel: args.channel,
        idempotencyKey: args.idempotencyKey, status: 'FAILED', mode: args.mode,
        externalIds: {}, error: args.error, logs: args.logs,
      },
    });
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err;
  }
}

function toOutcome(row: {
  channel: string; status: string; mode: string | null;
  externalIds: unknown; error: string | null; logs: unknown;
}): ChannelOutcome {
  const channel = row.channel as LaunchChannel;
  return {
    channel,
    label: ADAPTERS[channel]?.label ?? channel,
    status: row.status as ChannelLaunchStatus,
    mode: (row.mode as LaunchMode | null) ?? null,
    externalIds: (row.externalIds as Record<string, string>) ?? {},
    error: row.error,
    logs: Array.isArray(row.logs) ? (row.logs as string[]) : [],
    alreadyExisted: false,
  };
}

export async function executeLaunch(input: LaunchInput): Promise<LaunchResult> {
  const { userId, campaignId, idempotencyKey } = input;
  const channels = input.channels?.length ? input.channels : (['GOOGLE_ADS', 'META_ADS'] as LaunchChannel[]);
  const logs: string[] = [];

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) {
    return { success: false, logs, error: 'Campanha não encontrada.', channels: [], replayed: false };
  }

  // Replay: essa chave já rodou por inteiro? Devolve o que ficou gravado.
  const existing = await prisma.channelLaunch.findMany({
    where: { campaignId, idempotencyKey },
  });
  if (existing.length > 0 && existing.every(r => r.status === 'SUCCESS')) {
    return {
      success: true,
      logs: [`Idempotência: chave ${idempotencyKey} já concluída. Nada foi reexecutado.`],
      channels: existing.map(toOutcome),
      replayed: true,
    };
  }

  try {
    logs.push(...await assertClaimsAllowed(userId, campaignId));
  } catch (err: any) {
    return { success: false, logs, error: err.message, channels: [], replayed: false };
  }

  const ctx: ChannelContext = {
    userId,
    campaignId,
    confirmed: true,
    forceMock: !!input.requestMock,
    overrides: input.overrides,
  };

  // Preflight de todos os canais ANTES de criar qualquer coisa. Se algum canal
  // pedido não está pronto, ninguém sobe — evita o meio-lançamento que o saga
  // antigo produzia.
  const outcomes: ChannelOutcome[] = [];
  const plan: Array<{ adapter: ChannelAdapter; mode: LaunchMode }> = [];
  for (const channel of channels) {
    const adapter = ADAPTERS[channel];
    const pre = await adapter.preflight(ctx);
    logs.push(...pre.errors.map(e => `[${adapter.label}] bloqueio: ${e}`));
    logs.push(...pre.warnings.map(w => `[${adapter.label}] aviso: ${w}`));
    if (!pre.ready) {
      const error = pre.errors.join(' | ') || 'Canal não está pronto.';
      const channelLogs = [...pre.errors, ...pre.warnings];
      // A reprovação precisa virar linha no banco. O painel hidrata pelo
      // getLaunchState, então bloqueio que só existe na resposta HTTP some no
      // primeiro refresh e o canal volta a aparecer como "não iniciado".
      await recordBlocked({ userId, campaignId, idempotencyKey, channel, mode: pre.mode, error, logs: channelLogs });
      outcomes.push({
        channel, label: adapter.label, status: 'FAILED', mode: pre.mode,
        externalIds: {}, error, logs: channelLogs, alreadyExisted: false,
      });
      continue;
    }
    plan.push({ adapter, mode: pre.mode });
  }

  // Todo-ou-nada no preflight. Antes daqui o código deixava os canais aprovados
  // subirem enquanto outro estava bloqueado — foi exatamente o meio-lançamento
  // que este bloco existe para impedir (Meta no ar, Google barrado por brand
  // bidding). Quem quer subir um canal isolado manda channels: ['X'].
  const blocked = outcomes.filter(o => o.status === 'FAILED');
  if (blocked.length > 0) {
    for (const { adapter } of plan) {
      logs.push(`[${adapter.label}] não iniciado: outro canal do mesmo lançamento foi reprovado.`);
      outcomes.push({
        channel: adapter.channel, label: adapter.label, status: 'PENDING', mode: 'MOCK',
        externalIds: {}, error: null,
        logs: ['Não iniciado: outro canal do mesmo lançamento foi reprovado.'],
        alreadyExisted: false,
      });
    }
    return {
      success: false, logs,
      error: plan.length > 0
        ? 'Lançamento abortado: canal reprovado no preflight. Nada foi criado.'
        : 'Nenhum canal passou no preflight. Nada foi criado.',
      channels: outcomes, replayed: false,
    };
  }

  const done: Array<{ adapter: ChannelAdapter; externalIds: Record<string, string>; rowId: string }> = [];
  let fatal: string | null = null;

  for (const { adapter, mode } of plan) {
    // A linha é criada ANTES da chamada externa: o @@unique é o lock. Se outro
    // request com a mesma chave chegar junto, um dos dois falha aqui e não na API.
    let rowId: string;
    try {
      const row = await prisma.channelLaunch.create({
        data: {
          userId, campaignId, channel: adapter.channel, idempotencyKey,
          status: 'RUNNING', mode, externalIds: {}, logs: [],
        },
      });
      rowId = row.id;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Chave já usada neste canal. Não basta pular: o operador precisa ver o
        // que aquela execução deixou, senão um replay parcial devolve painel
        // vazio e um erro genérico. Reaproveita a linha existente como resultado.
        logs.push(`[${adapter.label}] já existe execução com essa chave; devolvendo o resultado gravado.`);
        const prev = await prisma.channelLaunch.findFirst({
          where: { campaignId, channel: adapter.channel, idempotencyKey },
        });
        if (prev) outcomes.push({ ...toOutcome(prev), alreadyExisted: true });
        continue;
      }
      throw err;
    }

    try {
      const res = await adapter.create(ctx);
      await prisma.channelLaunch.update({
        where: { id: rowId },
        data: { status: 'SUCCESS', mode: res.mode, externalIds: res.externalIds, logs: res.logs },
      });
      logs.push(...res.logs);
      outcomes.push({
        channel: adapter.channel, label: adapter.label, status: 'SUCCESS',
        mode: res.mode, externalIds: res.externalIds, error: null,
        logs: res.logs, alreadyExisted: Boolean(res.alreadyExisted),
      });
      if (!res.alreadyExisted) done.push({ adapter, externalIds: res.externalIds, rowId });
    } catch (err: any) {
      const message = err?.message || 'Falha desconhecida no canal.';
      await prisma.channelLaunch.update({
        where: { id: rowId },
        data: { status: 'FAILED', error: message, logs: [message] },
      });
      logs.push(`[${adapter.label}] FALHOU: ${message}`);
      outcomes.push({
        channel: adapter.channel, label: adapter.label, status: 'FAILED',
        mode, externalIds: {}, error: message, logs: [message], alreadyExisted: false,
      });
      fatal = message;
      break;
    }
  }

  // Compensação: canal que subiu enquanto outro falhou não fica no ar sozinho.
  if (fatal && done.length > 0) {
    for (const item of done) {
      try {
        const comp = await item.adapter.compensate(ctx, item.externalIds);
        logs.push(...comp.logs);
        await prisma.channelLaunch.update({
          where: { id: item.rowId },
          data: { status: comp.ok ? 'COMPENSATED' : 'FAILED', logs: comp.logs },
        });
        const o = outcomes.find(x => x.channel === item.adapter.channel);
        if (o) { o.status = comp.ok ? 'COMPENSATED' : 'FAILED'; o.logs = [...o.logs, ...comp.logs]; }
      } catch (err: any) {
        // Compensação falhou: isso é o caso que exige olho humano, então fica
        // gritado no log e na linha, nunca engolido.
        const message = `COMPENSAÇÃO FALHOU em ${item.adapter.label}: ${err?.message}. Pausar manualmente.`;
        logs.push(message);
        await prisma.channelLaunch.update({
          where: { id: item.rowId },
          data: { status: 'FAILED', error: message },
        });
      }
    }
  }

  const success = !fatal && outcomes.some(o => o.status === 'SUCCESS')
    && outcomes.every(o => o.status === 'SUCCESS');

  if (success) {
    const anyLive = outcomes.some(o => o.mode === 'LIVE');
    // A01: o adapter cria a campanha PAUSED no anunciante. Marcar ATIVA aqui era estado
    // local otimista — o painel dizia "no ar" com a campanha parada lá fora. Fica
    // PENDING_LAUNCH até uma ativação confirmada remotamente (rota de sync/push).
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        launchCheckpoint: 'SUCCESS',
        launchIdempotencyKey: idempotencyKey,
        ...(anyLive ? { status: PENDING_LAUNCH } : {}),
      },
    });
    logs.push(anyLive
      ? 'Lançamento concluído. Campanhas criadas PAUSED no anunciante — ativar pela rota de sync/push.'
      : 'Simulação concluída. Nenhum recurso real foi criado.');
  }

  return {
    success,
    logs,
    error: fatal ?? (success ? undefined : 'Lançamento incompleto. Veja os canais.'),
    channels: outcomes,
    replayed: false,
  };
}

/** Estado atual do painel, por canal, para hidratar a UI. */
export async function getLaunchState(userId: string, campaignId: string) {
  const rows = await prisma.channelLaunch.findMany({
    where: { campaignId, userId },
    orderBy: { createdAt: 'desc' },
  });
  const latestByChannel = new Map<string, typeof rows[number]>();
  for (const r of rows) if (!latestByChannel.has(r.channel)) latestByChannel.set(r.channel, r);
  return {
    channels: (['GOOGLE_ADS', 'META_ADS'] as LaunchChannel[]).map(channel => {
      const row = latestByChannel.get(channel);
      return row
        ? { ...toOutcome(row), startedAt: row.createdAt }
        : {
            channel, label: ADAPTERS[channel].label, status: 'PENDING' as const,
            mode: null, externalIds: {}, error: null, logs: [],
            alreadyExisted: false, startedAt: null,
          };
    }),
    history: rows.slice(0, 20).map(r => ({
      id: r.id, channel: r.channel, status: r.status, mode: r.mode,
      idempotencyKey: r.idempotencyKey, error: r.error, createdAt: r.createdAt,
    })),
  };
}
