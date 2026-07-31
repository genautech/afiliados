export interface ExperimentDashboardReport {
  outcome: 'UNDERPOWERED' | 'NOT_SIGNIFICANT' | 'SIGNIFICANT_WINNER' | 'SIGNIFICANT_LOSER';
  controlClicks: number;
  treatmentClicks: number;
  targetClicks: number;
  conversionsUplift?: number;
  pValue?: number;
}

export function getExperimentActionFeasibility(report?: ExperimentDashboardReport | null): {
  canPromote: boolean;
  canGraduate: boolean;
  reason?: string;
} {
  if (!report) {
    return { canPromote: false, canGraduate: false, reason: 'Nenhum relatório de métricas disponível ainda' };
  }

  if (report.outcome === 'UNDERPOWERED') {
    return {
      canPromote: false,
      canGraduate: false,
      reason: `Amostra insuficiente (${report.controlClicks + report.treatmentClicks} cliques acumulados vs ${report.targetClicks} cliques alvo necessários)`,
    };
  }

  if (report.outcome === 'NOT_SIGNIFICANT') {
    return {
      canPromote: false,
      canGraduate: false,
      reason: 'Diferença entre controle e tratamento não atingiu significância estatística (p-value >= 0.05)',
    };
  }

  return { canPromote: true, canGraduate: true };
}

export function getDetailedStatusVocabulary(opts: {
  status: string;
  hasGoogleCampaignId: boolean;
  isLroPending?: boolean;
}): { label: string; badgeColor: string; servesAds: boolean; description: string } {
  const { status, hasGoogleCampaignId, isLroPending } = opts;

  if (isLroPending) {
    return {
      label: 'Operação LRO Pendente (Em Processamento)',
      badgeColor: 'amber',
      servesAds: false,
      description: 'O Google Ads está processando a operação assíncrona. Aguarde o término.',
    };
  }

  switch (status) {
    case 'SETUP':
      return {
        label: 'Experimento A/B Preparado (SETUP / PAUSED - Sem Custo)',
        badgeColor: 'blue',
        servesAds: false,
        description: 'Campanha de tratamento criada no Google Ads em modo PAUSED. Nenhum custo gerado.',
      };
    case 'SCHEDULED':
      return {
        label: 'Ativação Solicitada (Agendado no Google Ads)',
        badgeColor: 'amber',
        servesAds: true,
        description: 'Experimento agendado. Anúncios serão veiculados conforme o orçamento configurado.',
      };
    case 'RUNNING':
      return {
        label: 'Ativo e Verificado Remotamente (Tráfego Ativo)',
        badgeColor: 'emerald',
        servesAds: true,
        description: 'Experimento em execução no Google Ads com divisão de tráfego ativa.',
      };
    case 'PROMOTED':
    case 'GRADUATED':
      return {
        label: 'Concluído (Tratamento Promovido / Graduado)',
        badgeColor: 'purple',
        servesAds: true,
        description: 'O experimento foi encerrado e a variação vencedora foi promovida.',
      };
    case 'ENDED':
      return {
        label: 'Encerrado sem Mudanças',
        badgeColor: 'gray',
        servesAds: false,
        description: 'O experimento foi encerrado mantendo a campanha de controle original.',
      };
    default:
      if (hasGoogleCampaignId) {
        return {
          label: 'Campanha Remota Criada (PAUSED - Sem Custo)',
          badgeColor: 'blue',
          servesAds: false,
          description: 'Campanha criada no Google Ads em modo PAUSED. Aguardando configuração/agendamento.',
        };
      }
      return {
        label: 'Configuração Local Concluída (Rascunho)',
        badgeColor: 'slate',
        servesAds: false,
        description: 'Campanha gravada localmente no AfiliAds. Não existe recurso criado no Google Ads ainda.',
      };
  }
}
