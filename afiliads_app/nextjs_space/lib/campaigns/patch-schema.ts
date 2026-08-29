import { z } from 'zod';

const httpsUrl = (max: number) => z.string().max(max).refine((value) => {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}, 'deve ser uma URL HTTPS válida, sem credenciais ou fragmento');

const dateTime = z.string().max(64).refine((value) => Number.isFinite(new Date(value).getTime()), 'deve ser uma data ISO válida').transform((value) => new Date(value));

export const patchCampaignSchema = z.object({
  name: z.string().max(255).optional(),
  vertical: z.string().max(255).optional(),
  channel: z.string().max(255).optional(),
  funnel: z.string().max(255).optional(),
  budgetDaily: z.number().finite().nonnegative().optional(),
  budgetTest: z.number().finite().nonnegative().optional(),
  campaignNameGenerated: z.string().max(255).nullable().optional(),
  platform: z.string().max(255).optional(),
  pageType: z.enum(['advertorial', 'pogo', 'vsl', 'interstitial', 'authority', 'tsl', 'cookie_popup', 'review']).optional(),
  popupGate: z.boolean().optional(),
  videoUrl: httpsUrl(2048).optional(),
  hostingerDomain: z.string().max(255).optional(),
  geo: z.string().max(255).optional(),
  presellUrl: httpsUrl(2048).optional(),
  presellGeneratedAt: dateTime.optional(),
  productResearchId: z.string().max(255).nullable().optional(),
  status: z.enum(['RASCUNHO', 'EM_TESTE', 'PAUSADA', 'ATIVA', 'CONCLUIDA', 'ARQUIVADA']).optional(),
  wizardCompleted: z.boolean().optional(),
  launchedAt: dateTime.optional(),
  wizardStep: z.number().int().finite().nonnegative().optional(),
  loopEnabled: z.boolean().optional(),
  loopInterval: z.string().max(255).optional(),
  loopAgents: z.string().max(1000).optional(),
  postbackUrl: httpsUrl(2048).optional(),
  clickidToken: z.string().max(255).optional(),
  presellHtml: z.string().max(5000000).optional(),
  flowpageUrl: httpsUrl(2048).optional(),
  offerUrl: httpsUrl(2048).optional(),
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
  productType: z.string().max(255).optional(),
  draftData: z.union([z.record(z.any()), z.null()]).optional(),
  activeData: z.union([z.record(z.any()), z.null()]).optional(),
}).strict();


export function validateCampaignPatch(body: unknown, currentStatus: string) {
  if (!['RASCUNHO', 'EM_TESTE', 'PAUSADA', 'ATIVA', 'CONCLUIDA', 'ARQUIVADA'].includes(currentStatus)) {
    throw new Error('Status atual da campanha inválido');
  }
  const result = patchCampaignSchema.safeParse(body);
  if (!result.success) {
    throw new Error('Payload inválido: ' + result.error.errors.map(e => e.path.join('.') + ' ' + e.message).join(', '));
  }

  const data = result.data;

  // Atualização de draftData/activeData permitida apenas no status RASCUNHO
  if ((data.draftData !== undefined || data.activeData !== undefined) && currentStatus !== 'RASCUNHO') {
    throw new Error('Atualização de draftData/activeData permitida apenas no status RASCUNHO');
  }

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

  if (data.status === 'ATIVA') {
    throw new Error('Transição para ATIVA exige sincronização/mutação confirmada no Google Ads; use a rota de sync/push.');
  }

  return data;
}
