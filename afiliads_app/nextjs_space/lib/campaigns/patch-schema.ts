import { z } from 'zod';

export const patchCampaignSchema = z.object({
  name: z.string().optional(),
  vertical: z.string().optional(),
  channel: z.string().optional(),
  funnel: z.string().optional(),
  budgetDaily: z.number().optional(),
  budgetTest: z.number().optional(),
  campaignNameGenerated: z.string().nullable().optional(),
  pageType: z.string().optional(),
  popupGate: z.boolean().optional(),
  videoUrl: z.string().optional(),
  hostingerDomain: z.string().optional(),
  geo: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  presellUrl: z.string().optional(),
  presellGeneratedAt: z.string().optional(),
  productResearchId: z.string().nullable().optional(),
  status: z.string().optional(),
  wizardCompleted: z.boolean().optional(),
  launchedAt: z.string().optional(),
  wizardStep: z.number().optional(),
  loopEnabled: z.boolean().optional(),
  loopInterval: z.number().optional(),
  loopAgents: z.number().optional(),
  postbackUrl: z.string().optional(),
  clickidToken: z.string().optional(),
  presellHtml: z.string().optional(),
  flowpageUrl: z.string().optional(),
  offerUrl: z.string().optional(),
  commission: z.number().optional(),
  refundPct: z.number().optional(),
  aov: z.number().optional(),
  cvrExpected: z.number().optional(),
  commissionNet: z.number().optional(),
  epcBreakeven: z.number().optional(),
  cpcMax: z.number().optional(),
  cpcScale: z.number().optional(),
  budgetScale: z.number().optional(),
  googleCampaignName: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmString: z.string().optional(),
  testDuration: z.number().optional(),
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

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(data.status) && currentStatus !== data.status) {
      // Exceção de idempotência ou transição forçada pelo wizard (ex: recomeçou wizard)
      if (data.status === 'RASCUNHO' && data.wizardStep !== undefined) {
         // Wizard reset
      } else {
         throw new Error(`Transição de status inválida de ${currentStatus} para ${data.status}`);
      }
    }
  }

  return data;
}
