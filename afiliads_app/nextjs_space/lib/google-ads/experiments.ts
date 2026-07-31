// Serviço de Experimentos A/B: setup (Tarefa 6), aplicar variação de pré-sell (Tarefa 7) e
// lifecycle assíncrono/síncrono (Tarefa 8 — schedule/poll/listAsyncErrors/end/promote/
// graduate). Nenhuma chamada real foi exercida nesta sessão: todos os testes usam fetch
// mockado; o shape exato de alguns campos (ex.: `includeDrafts`, nomes de método de custom
// RPC) precisa ser conferido contra a documentação atual da API antes do primeiro teste real
// (Tarefa 16).

import { createHash } from 'node:crypto';
import {
  googleAdsGetResource,
  googleAdsMutateRequest,
  googleAdsRequest,
  googleAdsResourceGetRequest,
  googleAdsResourceMutateRequest,
  isMockMode,
  type GoogleAdsCredentials,
  type MutationCapability,
} from './client';
import { assertMutationAllowed } from './mutation-guard';
import { findAdGroupAdsInCampaign, updateAdFinalUrlsBatch, type AdGroupAdSummary } from './ads';
import type { ExperimentActionType, ExperimentStatus } from '../google-ads-experiments/types';

export interface CreateExperimentInput {
  name: string;
  // Sufixo que a API aplica ao nome da campanha de tratamento gerada automaticamente.
  suffix: string;
  // Seed interno usado somente pelo modo mock; nunca é serializado para a API real.
  mockIdentitySeed?: string;
  type?: string; // default SEARCH_CUSTOM — único workflow do MVP (ver handoff seção 3)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  syncEnabled?: boolean;
}

export interface CreateExperimentResult {
  mock: boolean;
  resourceName: string;
  googleExperimentId: string;
  status: ExperimentStatus;
}

// Payload/parsing puros (sem rede/guard) — testáveis direto, separados da orquestração abaixo.
export function buildCreateExperimentOperation(input: CreateExperimentInput) {
  return {
    create: {
      name: input.name,
      suffix: input.suffix,
      type: input.type ?? 'SEARCH_CUSTOM',
      status: 'SETUP' as const,
      startDate: input.startDate,
      endDate: input.endDate,
      syncEnabled: input.syncEnabled ?? true,
    },
  };
}

export function parseCreateExperimentResponse(data: any): CreateExperimentResult {
  const resourceName: string | undefined = data?.results?.[0]?.resourceName;
  if (!resourceName) {
    throw new Error('Google Ads API não retornou resourceName pro Experiment criado.');
  }
  return {
    mock: false,
    resourceName,
    googleExperimentId: resourceName.split('/').pop() ?? '',
    status: 'SETUP',
  };
}

function buildMockExperimentIdentity(customerId: string, suffix: string) {
  const rawCustomerId = customerId.trim();
  const normalizedCustomerId = /^\d{10}$/.test(rawCustomerId)
    ? rawCustomerId
    : /^\d{3}-\d{3}-\d{4}$/.test(rawCustomerId)
      ? rawCustomerId.replace(/-/g, '')
      : null;
  if (!normalizedCustomerId) throw new Error('customerId mock possui formato inválido.');

  const digestHex = createHash('sha256').update(suffix, 'utf8').digest('hex');
  const experimentId = BigInt(`0x${digestHex}`).toString(10);
  return { customerId: normalizedCustomerId, experimentId };
}

// Cria o Experiment sempre em SETUP — nesse estado não veicula nem gasta (ver plano seção 1,
// correção conceitual: SETUP != sandbox, só não serve anúncios ainda).
export async function createExperiment(
  token: string,
  config: GoogleAdsCredentials,
  input: CreateExperimentInput,
  capability: MutationCapability
): Promise<CreateExperimentResult> {
  if (isMockMode(config)) {
    const mockIdentity = buildMockExperimentIdentity(config.customerId, input.mockIdentitySeed ?? input.suffix);
    return {
      mock: true,
      resourceName: `customers/${mockIdentity.customerId}/experiments/${mockIdentity.experimentId}`,
      googleExperimentId: mockIdentity.experimentId,
      status: 'SETUP',
    };
  }

  const data = await googleAdsMutateRequest(token, config, 'experiments:mutate', capability, {
    body: {
      operations: [buildCreateExperimentOperation(input)],
    },
  });

  return parseCreateExperimentResponse(data);
}

export interface ExperimentArmInput {
  name: string;
  isControl: boolean;
  trafficSplit: number;
  // Só o controle referencia uma campanha existente — o tratamento nunca informa campaign
  // aqui, a API gera in_design_campaigns sozinha (handoff seção 3, ponto 8).
  campaignResourceName?: string;
}

export interface ExperimentArmResult {
  name: string;
  isControl: boolean;
  trafficSplit: number;
  resourceName: string;
  inDesignCampaignResourceName: string | null;
  servedCampaignResourceName: string | null;
}

export interface CreateExperimentArmsInput {
  experimentResourceName: string;
  // Exatamente 2 braços no MVP — control + treatment, sempre nessa ordem por convenção interna
  // (a API não exige ordem, mas o restante do código depende dela pra simplicidade).
  arms: [ExperimentArmInput, ExperimentArmInput];
}

function assertExactlyOneControlAndSum100(arms: ExperimentArmInput[]): void {
  const controls = arms.filter((a) => a.isControl);
  if (controls.length !== 1) {
    throw new Error(`Esperado exatamente 1 braço de controle, recebido ${controls.length}.`);
  }
  const sum = arms.reduce((acc, a) => acc + a.trafficSplit, 0);
  if (sum !== 100) {
    throw new Error(`Soma dos trafficSplit precisa ser 100, recebido ${sum}.`);
  }
  if (!controls[0].campaignResourceName) {
    throw new Error(
      'Braço de controle precisa apontar pra uma campanha existente (campaignResourceName).'
    );
  }
}

// Envia os 2 braços NA MESMA mutate request (obrigatório pela API — handoff seção 3, ponto 4),
// com responseContentType=MUTABLE_RESOURCE pra já vir com in_design_campaigns na resposta, sem
// precisar de uma segunda chamada. partialFailure desabilitado: ou os 2 braços são criados, ou
// nenhum é (evita ficar com só o controle criado e o experimento inconsistente).
export async function createExperimentArms(
  token: string,
  config: GoogleAdsCredentials,
  input: CreateExperimentArmsInput,
  capability: MutationCapability
): Promise<ExperimentArmResult[]> {
  assertExactlyOneControlAndSum100(input.arms);

  if (isMockMode(config)) {
    // Resource name real de experimentArm é composto com til (A7): customers/{cid}/
    // experimentArms/{experimentId}~{index}, nunca aninhado sob o resource name do experiment.
    const googleExperimentId = input.experimentResourceName.split('/').pop() ?? 'unknown';
    return input.arms.map((arm, i) => ({
      name: arm.name,
      isControl: arm.isControl,
      trafficSplit: arm.trafficSplit,
      resourceName: `customers/${config.customerId}/experimentArms/${googleExperimentId}~${i + 1}`,
      inDesignCampaignResourceName: arm.isControl
        ? null
        : `customers/${config.customerId}/campaigns/MOCK-IN-DESIGN-${i + 1}`,
      servedCampaignResourceName: arm.isControl ? arm.campaignResourceName ?? null : null,
    }));
  }

  const data = await googleAdsMutateRequest(
    token,
    config,
    'experimentArms:mutate',
    capability,
    {
      body: {
        operations: buildCreateExperimentArmsOperations(input.experimentResourceName, input.arms),
        partialFailure: false,
        responseContentType: 'MUTABLE_RESOURCE',
      },
    }
  );

  return parseCreateExperimentArmsResponse(data, input.arms);
}

// Payload puro (sem rede/guard).
export function buildCreateExperimentArmsOperations(
  experimentResourceName: string,
  arms: ExperimentArmInput[]
) {
  return arms.map((arm) => ({
    create: {
      experiment: experimentResourceName,
      name: arm.name,
      control: arm.isControl,
      trafficSplit: arm.trafficSplit,
      ...(arm.isControl && arm.campaignResourceName
        ? { campaigns: [arm.campaignResourceName] }
        : {}),
    },
  }));
}

// Parsing puro (sem rede/guard) da resposta MUTABLE_RESOURCE.
export function parseCreateExperimentArmsResponse(
  data: any,
  arms: ExperimentArmInput[]
): ExperimentArmResult[] {
  const results: any[] = data?.results ?? [];
  if (results.length !== arms.length) {
    throw new Error(
      `Google Ads API retornou ${results.length} resultado(s) pra ${arms.length} braço(s) enviados.`
    );
  }

  return results.map((result, i) => {
    const arm = arms[i];
    const mutableResource = result?.experimentArm ?? {};
    const resourceName: string | undefined = mutableResource?.resourceName ?? result?.resourceName;
    if (!resourceName) {
      throw new Error(`Braço "${arm.name}" criado sem resourceName na resposta da API.`);
    }
    const inDesignCampaigns: string[] = mutableResource?.inDesignCampaigns ?? [];
    return {
      name: arm.name,
      isControl: arm.isControl,
      trafficSplit: arm.trafficSplit,
      resourceName,
      inDesignCampaignResourceName: inDesignCampaigns[0] ?? null,
      servedCampaignResourceName: arm.isControl ? arm.campaignResourceName ?? null : null,
    };
  });
}

export interface ExperimentArmRow {
  resourceName: string;
  experimentResourceName: string;
  control: boolean;
  inDesignCampaignResourceName: string | null;
}

// Parsing puro de uma linha de `experiment_arm` (sem rede) — testável direto.
export function parseExperimentArmRow(row: any): ExperimentArmRow | null {
  const resourceName: string | undefined = row?.experimentArm?.resourceName;
  const experimentResourceName: string | undefined = row?.experimentArm?.experiment;
  if (!resourceName || !experimentResourceName) return null;
  const inDesignCampaigns: string[] = row?.experimentArm?.inDesignCampaigns ?? [];
  return {
    resourceName,
    experimentResourceName,
    control: Boolean(row?.experimentArm?.control),
    inDesignCampaignResourceName: inDesignCampaigns[0] ?? null,
  };
}

// Consulta os braços de um experimento — usada tanto pelo fallback público
// (getTreatmentInDesignCampaign) quanto pela resolução interna e vinculada da Tarefa 7 (A6).
// Correção A3: `SearchGoogleAdsRequest` v25 não tem `includeDrafts` — removido; recursos em
// design são consultados por busca normal via `experiment_arm.in_design_campaigns`.
async function queryExperimentArms(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string
): Promise<ExperimentArmRow[]> {
  const query = `
    SELECT experiment_arm.resource_name, experiment_arm.experiment, experiment_arm.control,
      experiment_arm.in_design_campaigns
    FROM experiment_arm
    WHERE experiment_arm.experiment = '${experimentResourceName.replace(/'/g, "\\'")}'
  `;

  const data = await googleAdsRequest(token, config, 'googleAds:search', { body: { query } });
  const rows: any[] = data?.results ?? [];
  return rows
    .map(parseExperimentArmRow)
    .filter((row): row is ExperimentArmRow => row !== null);
}

// Fallback pra reconsultar a in-design campaign do tratamento depois da criação (ex.: se a
// resposta do mutate não veio com MUTABLE_RESOURCE por algum motivo, ou numa sync posterior).
// Não valida exclusividade do braço de tratamento — pra isso, ver
// `resolveTreatmentCampaignForVariation`, usado por `applyFinalUrlVariation` (A6).
export async function getTreatmentInDesignCampaign(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string
): Promise<string | null> {
  if (isMockMode(config)) {
    return `customers/${config.customerId}/campaigns/MOCK-IN-DESIGN-treatment`;
  }

  const rows = await queryExperimentArms(token, config, experimentResourceName);
  const treatmentRow = rows.find((row) => row.control === false);
  return treatmentRow?.inDesignCampaignResourceName ?? null;
}

// Deriva o treatment campaign SEMPRE a partir do experimento — nunca aceita um resource name
// arbitrário do chamador (A6, ponto 1-2). Valida: exatamente 1 braço não-controle, a linha
// retornada realmente pertence ao `experimentResourceName` pedido (defesa contra resposta
// cruzada da API) e existe uma in-design campaign associada.
async function resolveTreatmentCampaignForVariation(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string
): Promise<string> {
  const rows = await queryExperimentArms(token, config, experimentResourceName);
  const treatmentRows = rows.filter((row) => row.control === false);

  if (treatmentRows.length !== 1) {
    throw new Error(
      `Esperado exatamente 1 braço de tratamento (control=false) pro experimento ${experimentResourceName}, encontrado ${treatmentRows.length}.`
    );
  }

  const [treatment] = treatmentRows;
  if (treatment.experimentResourceName !== experimentResourceName) {
    throw new Error(
      `Braço de tratamento retornado pertence a "${treatment.experimentResourceName}", não ao experimento pedido "${experimentResourceName}" — abortando por segurança.`
    );
  }
  if (!treatment.inDesignCampaignResourceName) {
    throw new Error(
      `Braço de tratamento do experimento ${experimentResourceName} não tem in-design campaign associada ainda.`
    );
  }

  return treatment.inDesignCampaignResourceName;
}

export interface ApplyFinalUrlVariationResult {
  applied: boolean;
  // true quando pelo menos um anúncio precisou de mutate real (diferencia de alreadyApplied).
  changed: boolean;
  // true quando o estado já batia com a variação esperada ANTES de qualquer mutate — nenhuma
  // rede de escrita foi usada (A6, ponto 3: não confundir com verified).
  alreadyApplied: boolean;
  treatmentCampaignResourceName: string;
  adsModified: Array<{
    resourceName: string;
    finalUrlBefore: string[];
    finalUrlAfter: string[];
  }>;
  // true só quando a releitura pós-mutação confirma finalUrls == [newFinalUrl] em TODOS os
  // anúncios encontrados. É essa flag (não o HTTP 200 do mutate) que deve ser checada antes de
  // permitir schedule — Hermes review ponto 7: "uma simples resposta 200 não deve ser o único
  // critério".
  verified: boolean;
  warnings: string[];
}

// Localiza o(s) anúncio(s) do in-design treatment campaign (derivado internamente do
// experimento, nunca recebido como parâmetro solto — A6) e troca finalUrls pra newFinalUrl —
// depois RELÊ pra confirmar que a mudança vingou de verdade. Nunca toca no braço de controle.
//
// Idempotência/reconciliação (checkpoint pós-Tarefa 8, item 6): esta função SEMPRE relê o
// estado atual antes de decidir se precisa mutar. Isso significa que, se uma chamada anterior
// sofreu timeout mas a mutação na verdade foi aplicada no servidor, uma nova chamada detecta
// `alreadyApplied:true` e NÃO reenvia a mutate — reler-antes-de-repetir é a estratégia padrão,
// não uma exceção tratada à parte.
export async function applyFinalUrlVariation(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  newFinalUrl: string,
  capability: MutationCapability
): Promise<ApplyFinalUrlVariationResult> {
  if (isMockMode(config)) {
    const treatmentCampaignResourceName = `customers/${config.customerId}/campaigns/MOCK-IN-DESIGN-treatment`;
    const mockAdResourceName = `customers/${config.customerId}/adGroupAds/MOCK-AG~MOCK-AD`;
    return {
      applied: true,
      changed: true,
      alreadyApplied: false,
      treatmentCampaignResourceName,
      adsModified: [
        {
          resourceName: mockAdResourceName,
          finalUrlBefore: ['https://example.com/mock-current-url'],
          finalUrlAfter: [newFinalUrl],
        },
      ],
      verified: true,
      warnings: [],
    };
  }

  const treatmentCampaignResourceName = await resolveTreatmentCampaignForVariation(
    token,
    config,
    experimentResourceName
  );

  const adsBefore = await findAdGroupAdsInCampaign(token, config, treatmentCampaignResourceName);

  if (adsBefore.length === 0) {
    throw new Error(
      `Nenhum anúncio encontrado no in-design treatment campaign ${treatmentCampaignResourceName} — não é possível aplicar a variação.`
    );
  }

  const adsNeedingChange = adsBefore.filter(
    (ad) => !(ad.finalUrls.length === 1 && ad.finalUrls[0] === newFinalUrl)
  );

  if (adsNeedingChange.length === 0) {
    return {
      applied: false,
      changed: false,
      alreadyApplied: true,
      treatmentCampaignResourceName,
      adsModified: adsBefore.map((ad) => ({
        resourceName: ad.resourceName,
        finalUrlBefore: ad.finalUrls,
        finalUrlAfter: ad.finalUrls,
      })),
      verified: true,
      warnings: [],
    };
  }

  await updateAdFinalUrlsBatch(
    token,
    config,
    adsNeedingChange.map((ad) => ad.resourceName),
    [newFinalUrl],
    capability
  );

  // Relê depois de mutar tudo — nunca confia só na resposta HTTP 200 do mutate.
  const adsAfter = await findAdGroupAdsInCampaign(token, config, treatmentCampaignResourceName);

  const { adsModified, verified } = compareFinalUrlsAfterMutation(adsBefore, adsAfter, newFinalUrl);

  const warnings: string[] = [];
  if (!verified) {
    warnings.push(
      'Releitura pós-mutação não confirmou finalUrls igual à variação esperada em todos os anúncios — não agendar até isso ser resolvido.'
    );
  }

  return {
    applied: true,
    changed: true,
    alreadyApplied: false,
    treatmentCampaignResourceName,
    adsModified,
    verified,
    warnings,
  };
}

// Gate puro (A6, ponto 4) — schedule só deve prosseguir se a variação está com `verified:true` E
// (`changed:true` OU `alreadyApplied:true`, ambos provam que o estado atual bate com o
// esperado). Prova PERSISTIDA (não só o resultado desta chamada em memória) é responsabilidade
// da rota/DB da Tarefa 10 — esta função é o gate mínimo reutilizável, chamável tanto com o
// resultado fresco quanto com um snapshot persistido equivalente.
export function assertVariationReadyForSchedule(result: ApplyFinalUrlVariationResult): void {
  if (!result.verified || !(result.changed || result.alreadyApplied)) {
    throw new Error(
      'Variação de pré-sell não confirmada no treatment — não é seguro agendar o experimento ainda.'
    );
  }
}

// Comparação pura (sem rede) entre o estado antes/depois da mutação — é essa lógica que
// decide `verified`, o núcleo da garantia da Tarefa 7 (Hermes review ponto 7). Separada da
// orquestração acima pra ser testável direto com fixtures, sem precisar passar pelo guard.
export function compareFinalUrlsAfterMutation(
  adsBefore: AdGroupAdSummary[],
  adsAfter: AdGroupAdSummary[],
  expectedUrl: string
): {
  adsModified: ApplyFinalUrlVariationResult['adsModified'];
  verified: boolean;
} {
  const afterByResourceName = new Map(adsAfter.map((ad) => [ad.resourceName, ad]));

  const adsModified = adsBefore.map((before) => {
    const after = afterByResourceName.get(before.resourceName);
    return {
      resourceName: before.resourceName,
      finalUrlBefore: before.finalUrls,
      finalUrlAfter: after?.finalUrls ?? [],
    };
  });

  const verified = adsModified.every(
    (ad) => ad.finalUrlAfter.length === 1 && ad.finalUrlAfter[0] === expectedUrl
  );

  return { adsModified, verified };
}

// ---------------------------------------------------------------------------------------------
// Lifecycle (Tarefa 8) — schedule/promote são assíncronos (retornam uma long-running operation
// que precisa de poll); end/graduate são síncronos segundo a documentação consultada no
// handoff (ver .hermes/handoffs/2026-07-29_google-ads-experiments_claude-handoff.md, seção 3,
// pontos 11-13). Cada ação só é permitida a partir de estados específicos — checado ANTES de
// qualquer rede, mesmo padrão de validação-antes-do-fetch da Tarefa 6.
// ---------------------------------------------------------------------------------------------

const ALLOWED_ACTION_SOURCE_STATUSES: Record<ExperimentActionType, ExperimentStatus[]> = {
  END: ['SCHEDULED', 'RUNNING'],
  PROMOTE: ['RUNNING'],
  GRADUATE: ['RUNNING'],
};

// Pura — usada tanto pelas 3 funções abaixo quanto (Tarefa 10) pela rota, antes de sequer
// montar o request.
export function assertActionAllowedFromStatus(
  action: ExperimentActionType,
  currentStatus: ExperimentStatus
): void {
  const allowed = ALLOWED_ACTION_SOURCE_STATUSES[action];
  if (!allowed.includes(currentStatus)) {
    throw new Error(
      `Ação ${action} não permitida a partir do status ${currentStatus} (permitido a partir de: ${allowed.join(', ')}).`
    );
  }
}

export interface OperationHandle {
  operationName: string;
}

// Payload/parsing puros — schedule e promote devolvem a mesma forma de long-running operation.
export function parseOperationHandleResponse(data: any, methodLabel: string): OperationHandle {
  const operationName: string | undefined = data?.name ?? data?.operationName;
  if (!operationName) {
    throw new Error(
      `Google Ads API não retornou o nome da operação assíncrona pra ${methodLabel}.`
    );
  }
  return { operationName };
}

// Resource name de long-running operation é sempre FLAT (`customers/{cid}/operations/{id}`),
// nunca aninhado sob o experiment (A7) — segue o padrão google.longrunning.Operation que
// `googleAdsGetResource`/pollExperimentOperation espera (GET direto no resource name, sem
// `:método`).
function mockOperationName(config: GoogleAdsCredentials, experimentResourceName: string, label: string): string {
  const googleExperimentId = experimentResourceName.split('/').pop() ?? 'unknown';
  return `customers/${config.customerId}/operations/mock-${label}-${googleExperimentId}`;
}

function requireLifecycleCapability(
  config: GoogleAdsCredentials,
  operation: 'scheduleExperiment' | 'endExperiment' | 'promoteExperiment' | 'graduateExperiment',
  provided?: MutationCapability
): MutationCapability {
  if (provided) {
    if (provided.operation !== operation) {
      throw new Error(`Capability inválida para ${operation}`);
    }
    return provided;
  }
  const guard = assertMutationAllowed({
    operation,
    customerId: config.customerId,
    isMock: false,
    confirmed: false,
  });
  if (!guard.allowed) {
    const reason = 'reason' in guard ? guard.reason : 'capability não emitida';
    throw new Error(`Mutação bloqueada pelo guard: ${reason}`);
  }
  return guard.capability;
}

// Materializa a campanha de tratamento e pode começar a servir/gastar a partir de startDate —
// é aqui que a distinção "preparar (não veicula)" vs "agendar (pode gastar)" do plano vira
// realidade. Só permitido a partir de SETUP.
export async function scheduleExperiment(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  currentStatus: ExperimentStatus,
  capability?: MutationCapability
): Promise<OperationHandle> {
  if (currentStatus !== 'SETUP') {
    throw new Error(`Só é possível agendar um experimento em SETUP (status atual: ${currentStatus}).`);
  }

  if (isMockMode(config)) {
    return { operationName: mockOperationName(config, experimentResourceName, 'schedule') };
  }

  const mutationCapability = requireLifecycleCapability(config, 'scheduleExperiment', capability);

  const data = await googleAdsResourceMutateRequest(
    token,
    config,
    experimentResourceName,
    'scheduleExperiment',
    mutationCapability
  );
  return parseOperationHandleResponse(data, 'scheduleExperiment');
}

export type OperationStatus = 'PENDING' | 'DONE' | 'FAILED';

export interface PollOperationResult {
  status: OperationStatus;
  errors: string[];
}

// Parsing puro do shape padrão de google.longrunning.Operation ({done, error, response}).
export function parsePollOperationResponse(data: any): PollOperationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resposta da operação assíncrona inválida');
  }
  if (data.done === false) {
    return { status: 'PENDING', errors: [] };
  }
  if (data.done !== true) {
    throw new Error('Resposta da operação assíncrona inválida: done deve ser boolean');
  }
  if (data.error !== undefined && data.error !== null) {
    if (
      typeof data.error !== 'object'
      || Array.isArray(data.error)
      || typeof data.error.message !== 'string'
      || data.error.message.length < 1
      || data.error.message.length > 2_000
    ) {
      throw new Error('Resposta da operação assíncrona inválida: error malformado');
    }
    const message = data.error.message;
    return { status: 'FAILED', errors: [message] };
  }
  return { status: 'DONE', errors: [] };
}

// Só leitura (GET) — sem guard, mesmo critério de fetchGoogleCampaign/getTreatmentInDesign
// Campaign. Retry seguro (3 tentativas) porque polling é idempotente por natureza.
export async function pollExperimentOperation(
  token: string,
  config: GoogleAdsCredentials,
  operationName: string
): Promise<PollOperationResult> {
  if (isMockMode(config)) {
    return { status: 'DONE', errors: [] };
  }

  const data = await googleAdsGetResource(token, config, operationName);
  return parsePollOperationResponse(data);
}

export interface AsyncErrorsPage {
  errors: string[];
  nextPageToken?: string;
}

export function parseAsyncErrorsPage(data: any): AsyncErrorsPage {
  const rawErrors: any[] = data?.errors ?? [];
  const errors = rawErrors.map((e) => e?.message ?? JSON.stringify(e));
  return { errors, nextPageToken: data?.nextPageToken || undefined };
}

export interface AsyncErrorsResult {
  errors: string[];
  // true se atingiu o limite de páginas de segurança sem esgotar — evita loop infinito por
  // bug de paginação (nextPageToken que nunca chega a undefined).
  truncated: boolean;
}

const MAX_ASYNC_ERROR_PAGES = 20;

// Erros completos de uma operação assíncrona que falhou só saem daqui — a Operation em si
// (pollExperimentOperation) só devolve a primeira mensagem resumida.
//
// Correção A1 (checkpoint pós-Tarefa 8): `ListExperimentAsyncErrorsRequest.resource_name` é o
// resource name do EXPERIMENTO (`customers/{cid}/experiments/{id}`), não da operation — a
// versão anterior recebia `operationName` e derivava o endpoint dele, o que está errado. Além
// disso o verbo correto é GET (é uma consulta, não uma mutação) com paginação via query string
// `pageToken`, não POST com body.
export async function listExperimentAsyncErrors(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string
): Promise<AsyncErrorsResult> {
  if (isMockMode(config)) {
    return { errors: [], truncated: false };
  }

  const errors: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const data = await googleAdsResourceGetRequest(
      token,
      config,
      experimentResourceName,
      'listAsyncErrors',
      pageToken ? { pageToken } : {}
    );
    const page = parseAsyncErrorsPage(data);
    errors.push(...page.errors);
    pageToken = page.nextPageToken;
    pages += 1;
  } while (pageToken && pages < MAX_ASYNC_ERROR_PAGES);

  return { errors, truncated: Boolean(pageToken) };
}

// Síncrono (sem operation/poll) — encerra o experimento. Permitido a partir de SCHEDULED ou
// RUNNING (não faz sentido encerrar algo que nunca saiu de SETUP; use remoção/limpeza local
// pra isso, não este método).
export async function endExperiment(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  currentStatus: ExperimentStatus,
  capability?: MutationCapability
): Promise<{ success: true }> {
  assertActionAllowedFromStatus('END', currentStatus);

  if (isMockMode(config)) {
    return { success: true };
  }

  const mutationCapability = requireLifecycleCapability(config, 'endExperiment', capability);
  await googleAdsResourceMutateRequest(token, config, experimentResourceName, 'endExperiment', mutationCapability);
  return { success: true };
}

// Assíncrono — aplica as mudanças do tratamento de volta na campanha original. Só a partir de
// RUNNING (decisão de vencedor não deve ser tomada sem dados rodando — ver plano seção 6, nunca
// promover cedo demais).
export async function promoteExperiment(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  currentStatus: ExperimentStatus,
  capability?: MutationCapability
): Promise<OperationHandle> {
  assertActionAllowedFromStatus('PROMOTE', currentStatus);

  if (isMockMode(config)) {
    return { operationName: mockOperationName(config, experimentResourceName, 'promote') };
  }

  const mutationCapability = requireLifecycleCapability(config, 'promoteExperiment', capability);

  const data = await googleAdsResourceMutateRequest(
    token,
    config,
    experimentResourceName,
    'promoteExperiment',
    mutationCapability
  );
  return parseOperationHandleResponse(data, 'promoteExperiment');
}

export interface CampaignBudgetMapping {
  experimentCampaign: string;
  campaignBudget: string;
}

// Payload puro (sem rede/guard) do `GraduateExperimentRequest` v25 — corrigido (A2, checkpoint
// pós-Tarefa 8): a versão anterior enviava `{ graduatedCampaignBudget }`, que não existe no
// contrato oficial. O request real exige `experiment` + `campaignBudgetMappings[]`, cada
// mapping com `experimentCampaign` (a campanha do braço de tratamento, que vira independente) e
// `campaignBudget` (orçamento próprio pra ela) — no máximo 1 mapping no MVP (1 tratamento).
export function buildGraduateExperimentRequest(
  experimentResourceName: string,
  mapping: CampaignBudgetMapping
) {
  return {
    experiment: experimentResourceName,
    campaignBudgetMappings: [
      {
        experimentCampaign: mapping.experimentCampaign,
        campaignBudget: mapping.campaignBudget,
      },
    ],
  };
}

// Síncrono — transforma o tratamento numa campanha independente (sem afetar o controle). Exige
// a campanha do braço de tratamento (`experimentCampaignResourceName`, derivada do arm
// control=false — mesma fonte que `resolveTreatmentCampaignForVariation`) e um orçamento
// próprio pra ela; só a partir de RUNNING.
export async function graduateExperiment(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string,
  currentStatus: ExperimentStatus,
  experimentCampaignResourceName: string,
  graduatedCampaignBudgetResourceName: string,
  capability?: MutationCapability
): Promise<{ success: true }> {
  assertActionAllowedFromStatus('GRADUATE', currentStatus);

  if (isMockMode(config)) {
    return { success: true };
  }

  const mutationCapability = requireLifecycleCapability(config, 'graduateExperiment', capability);

  await googleAdsResourceMutateRequest(
    token,
    config,
    experimentResourceName,
    'graduateExperiment',
    mutationCapability,
    buildGraduateExperimentRequest(experimentResourceName, {
      experimentCampaign: experimentCampaignResourceName,
      campaignBudget: graduatedCampaignBudgetResourceName,
    })
  );
  return { success: true };
}
