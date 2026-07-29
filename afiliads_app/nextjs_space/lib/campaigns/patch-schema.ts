import { z } from 'zod';

export const patchCampaignSchema = z.object({
  name: z.string().max(255).optional(),
  vertical: z.string().max(255).optional(),
  channel: z.string().max(255).optional(),
  funnel: z.string().max(255).optional(),
  budgetDaily: z.number().finite().nonnegative().optional(),
  budgetTest: z.number().finite().nonnegative().optional(),
  campaignNameGenerated: z.string().max(255).nullable().optional(),
  platform: z.string().max(255).optional(),
  pageType: z.string().max(255).optional(),
  popupGate: z.boolean().optional(),
  videoUrl: z.string().max(2048).optional(),
  hostingerDomain: z.string().max(255).optional(),
  geo: z.string().max(255).optional(),
  presellUrl: z.string().max(2048).optional(),
  presellGeneratedAt: z.string().max(255).optional(),
  productResearchId: z.string().max(255).nullable().optional(),
  status: z.enum(['RASCUNHO', 'EM_TESTE', 'PAUSADA', 'ATIVA', 'CONCLUIDA', 'ARQUIVADA']).optional(),
  wizardCompleted: z.boolean().optional(),
  launchedAt: z.string().max(255).optional(),
  wizardStep: z.number().int().finite().nonnegative().optional(),
  loopEnabled: z.boolean().optional(),
  loopInterval: z.string().max(255).optional(),
  loopAgents: z.string().max(1000).optional(),
  postbackUrl: z.string().max(2048).optional(),
  clickidToken: z.string().max(255).optional(),
  presellHtml: z.string().max(5000000).optional(),
  flowpageUrl: z.string().max(2048).optional(),
  offerUrl: z.string().max(2048).optional(),
  commission: z.number().finite().nonnegative().optional(),
  refundPct: z.number().finite().nonnegative().optional(),
  aov: z.number().finite().nonnegative().optional(),
  cvrExpected: z.number().finite().nonnegative().optional(),
  commissionNet: z.number().finite().optional(),
  epcBreakeven: z.number().finite().nonnegative().optional(),
  cpcMax: z.number().finite().nonnegative().optional(),
  cpcScale: z.number().finite().nonnegative().optional(),
  budgetScale: z.number().finite().nonnegative().optional(),
  googleCampaignName: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmString: z.string().max(2048).optional(),
  testDuration: z.string().max(255).optional(),
}).strict();


export function validateCampaignPatch(body: unknown, currentStatus: string) {
  const result = patchCampaignSchema.safeParse(body);
  if (!result.success) {
    throw new Error('Payload inválido: ' + result.error.errors.map(e => e.path.join('.') + ' ' + e.message).join(', '));
  }

  const data = result.data;

  // Regra explícita de status
  if (data.status && data.status !== currentStatus) {
    const validTransitions: Record<string, string[]> = {
      'RASCUNHO': ['EM_TESTE', 'PAUSADA', 'ATIVA', 'ARQUIVADA'],
      'EM_TESTE': ['PAUSADA', 'ATIVA', 'ARQUIVADA', 'CONCLUIDA'],
      'PAUSADA': ['EM_TESTE', 'ATIVA', 'ARQUIVADA', 'CONCLUIDA'],
      'ATIVA': ['PAUSADA', 'ARQUIVADA', 'CONCLUIDA'],
      'CONCLUIDA': ['ARQUIVADA'],
      'ARQUIVADA': [],
    };

    const allowedNext = validTransitions[currentStatus as keyof typeof validTransitions] || [];
    if (!allowedNext.includes(data.status) && currentStatus !== data.status) {
       throw new Error(`Transição de status inválida de ${currentStatus} para ${data.status}`);
    }
  }

  return data;
}
