export interface ExperimentSetupUIState {
  status: 'NONE' | 'SETUP' | 'SCHEDULED' | 'RUNNING' | 'PROMOTED' | 'GRADUATED' | 'ENDED' | 'ERROR';
  trafficSplit: number;
  treatmentUrl: string;
  hasConfirmedGadsSpend: boolean;
  operationPending?: boolean;
}

export function validateExperimentSetupForm(trafficSplit: number, treatmentUrl: string): { valid: boolean; error?: string } {
  if (trafficSplit < 10 || trafficSplit > 90) {
    return { valid: false, error: 'O split do tratamento deve estar entre 10% e 90%' };
  }
  if (!treatmentUrl || !/^https?:\/\/\S+$/i.test(treatmentUrl.trim())) {
    return { valid: false, error: 'Informe uma URL válida (https://...) para a pré-sell de tratamento' };
  }
  return { valid: true };
}

export function getExperimentStatusBadge(status: ExperimentSetupUIState['status']): { label: string; color: string; servesAds: boolean } {
  switch (status) {
    case 'NONE':
      return { label: 'Não Configurado', color: 'slate', servesAds: false };
    case 'SETUP':
      return { label: 'Preparado (Rascunho / PAUSED - Sem Custo)', color: 'blue', servesAds: false };
    case 'SCHEDULED':
      return { label: 'Agendado no Google Ads', color: 'amber', servesAds: true };
    case 'RUNNING':
      return { label: 'Em Execução (Tráfego Ativo)', color: 'emerald', servesAds: true };
    case 'PROMOTED':
      return { label: 'Tratamento Promovido (Vencedor)', color: 'green', servesAds: true };
    case 'GRADUATED':
      return { label: 'Graduado como Campanha Independente', color: 'purple', servesAds: true };
    case 'ENDED':
      return { label: 'Encerrado', color: 'gray', servesAds: false };
    case 'ERROR':
      return { label: 'Erro na Operação Remota', color: 'red', servesAds: false };
  }
}
