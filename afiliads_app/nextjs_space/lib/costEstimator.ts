import { prisma } from './prisma';
import { estimateCostUsd, type CostMultipliers } from '@/lib/llm-pricing';

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export function estimateAICostUsd(
  provider: string,
  model: string,
  usage: TokenUsage,
  multipliers?: CostMultipliers,
): number {
  return estimateCostUsd(
    provider,
    model,
    Math.max(0, Math.trunc(usage.promptTokens ?? 0)),
    Math.max(0, Math.trunc(usage.completionTokens ?? 0)),
    multipliers,
  );
}

export async function recordAICostLog(input: {
  campaignId?: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  purpose: string;
  multipliers?: CostMultipliers;
}): Promise<void> {
  if (!input.campaignId || !prisma.aICostLog) return;
  const promptTokens = Math.max(0, Math.trunc(input.usage.promptTokens ?? 0));
  const completionTokens = Math.max(0, Math.trunc(input.usage.completionTokens ?? 0));
  await prisma.aICostLog.create({
    data: {
      campaignId: input.campaignId,
      provider: input.provider,
      model: input.model,
      promptTokens,
      completionTokens,
      costUsd: estimateAICostUsd(input.provider, input.model, { promptTokens, completionTokens }, input.multipliers),
      purpose: input.purpose.slice(0, 255),
    },
  });
}
