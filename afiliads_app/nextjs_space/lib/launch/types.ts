// Contrato de canal do Painel de Lançamento.
//
// Cada canal (Google Ads, Meta Ads) implementa a mesma superfície, e o
// orquestrador não sabe nada de nenhuma API específica. A regra que este
// contrato existe para sustentar: nenhum canal pode ser mais frouxo que o
// outro. Todo canal declara antes de agir (preflight), age uma vez só
// (create, com idempotência garantida pelo orquestrador) e sabe desfazer
// o que criou (compensate).

export type LaunchChannel = 'GOOGLE_ADS' | 'META_ADS';
export type LaunchMode = 'LIVE' | 'MOCK';

export interface ChannelContext {
  userId: string;
  campaignId: string;
  /** Veio de uma autorização verificada no boundary HTTP, nunca do corpo do request. */
  confirmed: boolean;
  /**
   * O operador pediu simulação. Força MOCK mesmo em conta configurada para LIVE.
   * O inverso nunca vale: forceMock=false não transforma MOCK em LIVE — só a
   * configuração do canal faz isso.
   */
  forceMock: boolean;
  /** Copy já aprovada; se ausente, o canal gera a sua. */
  overrides?: { headlines?: string[]; descriptions?: string[] };
}

export interface ChannelPreflight {
  /** false = nem tenta criar. O motivo vai em errors. */
  ready: boolean;
  /** Em que modo esse canal rodaria agora. MOCK nunca vira LIVE sozinho. */
  mode: LaunchMode;
  errors: string[];
  warnings: string[];
}

export interface ChannelCreateResult {
  /** IDs remotos criados, por tipo de recurso. Guardados para compensação. */
  externalIds: Record<string, string>;
  mode: LaunchMode;
  logs: string[];
  /** true quando o recurso remoto já existia e nada novo foi criado. */
  alreadyExisted?: boolean;
}

export interface ChannelCompensation {
  ok: boolean;
  logs: string[];
}

export interface ChannelAdapter {
  channel: LaunchChannel;
  label: string;
  preflight(ctx: ChannelContext): Promise<ChannelPreflight>;
  create(ctx: ChannelContext): Promise<ChannelCreateResult>;
  /** Pausa/desfaz o que create() criou. Recebe os externalIds persistidos. */
  compensate(ctx: ChannelContext, externalIds: Record<string, string>): Promise<ChannelCompensation>;
}

/** Erro de canal com mensagem já pronta para o operador ler no painel. */
export class ChannelLaunchError extends Error {
  constructor(message: string, readonly code: string = 'CHANNEL_ERROR') {
    super(message);
    this.name = 'ChannelLaunchError';
  }
}
