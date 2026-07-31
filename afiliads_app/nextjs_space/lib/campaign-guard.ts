import { prisma } from './prisma';

export interface CampaignGuardTarget {
  kind: 'campaign' | 'non-campaign';
  campaignId?: string;
}

export interface CampaignGuardDecision {
  allowed: boolean;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  campaignId?: string;
  userId: string;
}

export class CampaignGuardError extends Error {
  constructor(public readonly decision: CampaignGuardDecision) {
    super(`CampaignGuard: ${decision.reason}`);
    this.name = 'CampaignGuardError';
  }
}

export interface CampaignGuardDependencies {
  findCampaign: (campaignId: string, userId: string) => Promise<{ id: string; status: string; updatedAt: Date } | null>;
  now: () => Date;
  logDecision: (decision: CampaignGuardDecision) => void;
}

export const INACTIVITY_LIMIT_MINUTES = 30;

function logDecisionConsole(decision: CampaignGuardDecision): void {
  const ts = new Date().toISOString();
  console.log(`[CAMPAIGN_GUARD ${ts}] ${decision.allowed ? 'ALLOW' : 'BLOCK'} user=${decision.userId} campaign=${decision.campaignId ?? 'none'} :: ${decision.reason}`);
}

const defaultDependencies: CampaignGuardDependencies = {
  findCampaign: async (campaignId: string, userId: string) => {
    return prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      select: { id: true, status: true, updatedAt: true },
    });
  },
  now: () => new Date(),
  logDecision: logDecisionConsole,
};

export async function assertCampaignLlmAllowed(
  userId: string,
  target: CampaignGuardTarget,
  deps: CampaignGuardDependencies = defaultDependencies,
): Promise<void> {
  if (target.kind === 'non-campaign') {
    return;
  }

  if (!target.campaignId) {
    const decision: CampaignGuardDecision = {
      allowed: false,
      decision: 'BLOCK',
      reason: 'Chamada de LLM de campanha sem campaignId informado (bloqueio fail-closed)',
      userId,
    };
    deps.logDecision(decision);
    throw new CampaignGuardError(decision);
  }

  const cid = target.campaignId;

  let campaign: { id: string; status: string; updatedAt: Date } | null = null;
  try {
    campaign = await deps.findCampaign(cid, userId);
  } catch (err: any) {
    const decision: CampaignGuardDecision = {
      allowed: false,
      decision: 'BLOCK',
      reason: `Campanha ${cid} não pôde ser verificada no banco: ${err?.message ?? String(err)}`,
      campaignId: cid,
      userId,
    };
    deps.logDecision(decision);
    throw new CampaignGuardError(decision);
  }

  if (!campaign) {
    const decision: CampaignGuardDecision = {
      allowed: false,
      decision: 'BLOCK',
      reason: `Campanha ${cid} não encontrada para o usuário ${userId}`,
      campaignId: cid,
      userId,
    };
    deps.logDecision(decision);
    throw new CampaignGuardError(decision);
  }

  const now = deps.now();
  const minutesSinceUpdate = (now.getTime() - campaign.updatedAt.getTime()) / 60000;

  if (minutesSinceUpdate > INACTIVITY_LIMIT_MINUTES) {
    const decision: CampaignGuardDecision = {
      allowed: false,
      decision: 'BLOCK',
      reason: `Campanha ${cid} inativa há ${minutesSinceUpdate.toFixed(1)} min (> ${INACTIVITY_LIMIT_MINUTES} min) → BLOQUEADO`,
      campaignId: cid,
      userId,
    };
    deps.logDecision(decision);
    throw new CampaignGuardError(decision);
  }

  const decision: CampaignGuardDecision = {
    allowed: true,
    decision: 'ALLOW',
    reason: `Campanha ${cid} com status=${campaign.status} e update recente (${minutesSinceUpdate.toFixed(1)} min) → LIBERADO`,
    campaignId: cid,
    userId,
  };
  deps.logDecision(decision);
}
