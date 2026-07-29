// Serviço de setup de Experimentos A/B (Tarefa 6 do plano) — cria o Experiment em SETUP e os
// 2 braços (control + treatment) na mesma mutate request, e resolve a in-design campaign do
// tratamento. Não faz schedule/promote/end (Tarefa 8) nem aplica variação de pré-sell
// (Tarefa 7) — só o setup inicial. Nenhuma chamada real foi exercida nesta sessão: todos os
// testes usam fetch mockado; o shape exato de alguns campos (ex.: `includeDrafts`) precisa
// ser conferido contra a documentação atual da API antes do primeiro teste real (Tarefa 16).

import { googleAdsRequest, isMockMode, type GoogleAdsCredentials } from './client';
import type { ExperimentStatus } from '../google-ads-experiments/types';

export interface CreateExperimentInput {
  name: string;
  // Sufixo que a API aplica ao nome da campanha de tratamento gerada automaticamente.
  suffix: string;
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

// Cria o Experiment sempre em SETUP — nesse estado não veicula nem gasta (ver plano seção 1,
// correção conceitual: SETUP != sandbox, só não serve anúncios ainda).
export async function createExperiment(
  token: string,
  config: GoogleAdsCredentials,
  input: CreateExperimentInput
): Promise<CreateExperimentResult> {
  if (isMockMode(config)) {
    const mockId = `MOCK-EXPERIMENT-${input.suffix}`;
    return {
      mock: true,
      resourceName: `customers/${config.customerId}/experiments/${mockId}`,
      googleExperimentId: mockId,
      status: 'SETUP',
    };
  }

  const data = await googleAdsRequest(token, config, 'experiments:mutate', {
    body: {
      operations: [
        {
          create: {
            name: input.name,
            suffix: input.suffix,
            type: input.type ?? 'SEARCH_CUSTOM',
            status: 'SETUP',
            startDate: input.startDate,
            endDate: input.endDate,
            syncEnabled: input.syncEnabled ?? true,
          },
        },
      ],
    },
  });

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
  input: CreateExperimentArmsInput
): Promise<ExperimentArmResult[]> {
  assertExactlyOneControlAndSum100(input.arms);

  if (isMockMode(config)) {
    return input.arms.map((arm, i) => ({
      name: arm.name,
      isControl: arm.isControl,
      trafficSplit: arm.trafficSplit,
      resourceName: `${input.experimentResourceName}/experimentArms/${i + 1}`,
      inDesignCampaignResourceName: arm.isControl
        ? null
        : `customers/${config.customerId}/campaigns/MOCK-IN-DESIGN-${i + 1}`,
      servedCampaignResourceName: arm.isControl ? arm.campaignResourceName ?? null : null,
    }));
  }

  const operations = input.arms.map((arm) => ({
    create: {
      experiment: input.experimentResourceName,
      name: arm.name,
      control: arm.isControl,
      trafficSplit: arm.trafficSplit,
      ...(arm.isControl && arm.campaignResourceName
        ? { campaigns: [arm.campaignResourceName] }
        : {}),
    },
  }));

  const data = await googleAdsRequest(token, config, 'experimentArms:mutate', {
    body: {
      operations,
      partialFailure: false,
      responseContentType: 'MUTABLE_RESOURCE',
    },
  });

  const results: any[] = data?.results ?? [];
  if (results.length !== input.arms.length) {
    throw new Error(
      `Google Ads API retornou ${results.length} resultado(s) pra ${input.arms.length} braço(s) enviados.`
    );
  }

  return results.map((result, i) => {
    const arm = input.arms[i];
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

// Fallback pra reconsultar a in-design campaign do tratamento depois da criação (ex.: se a
// resposta do mutate não veio com MUTABLE_RESOURCE por algum motivo, ou numa sync posterior).
// Drafts (recursos em design, ainda não promovidos) só aparecem em busca com includeDrafts —
// handoff seção 3, ponto 9. Shape exato desse parâmetro não foi validado contra chamada real.
export async function getTreatmentInDesignCampaign(
  token: string,
  config: GoogleAdsCredentials,
  experimentResourceName: string
): Promise<string | null> {
  if (isMockMode(config)) {
    return `customers/${config.customerId}/campaigns/MOCK-IN-DESIGN-treatment`;
  }

  const query = `
    SELECT experiment_arm.in_design_campaigns, experiment_arm.control
    FROM experiment_arm
    WHERE experiment_arm.experiment = '${experimentResourceName.replace(/'/g, "\\'")}'
  `;

  const data = await googleAdsRequest(token, config, 'googleAds:search', {
    body: { query, includeDrafts: true },
  });

  const rows: any[] = data?.results ?? [];
  const treatmentRow = rows.find((row) => row?.experimentArm?.control === false);
  const inDesignCampaigns: string[] = treatmentRow?.experimentArm?.inDesignCampaigns ?? [];
  return inDesignCampaigns[0] ?? null;
}
