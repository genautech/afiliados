        // afiads_app/nextjs_space/lib/logger.ts
        import { fetcher } from './utils'; // Supondo que existe um utilitário para chamadas fetch

        interface LogContextIds {
          presellId?: string;
          campaignId?: string;
          productResearchId?: string;
          agentRunId?: string;
          // Adicionar outros IDs relevantes
        }

        interface LogEntry {
          timestamp: string;
          log_level: 'ERROR' | 'INFO' | 'WARNING' | 'DEBUG' | 'DECISION';
          agent_id: string; // Ex: "presell-master-strategist"
          skill_invoked?: string; // Nome da skill que invocou
          operation: string; // Ação específica (e.g., "gerar_copy", "auditar_compliance")
          context_ids: LogContextIds;
          message?: string; // Mensagem descritiva
          payload?: any; // Dados adicionais relevantes (inputs, outputs resumidos)
          error_details?: {
            type: string;
            message: string;
            stack?: string;
            http_status?: number;
            api_response?: any;
          };
          decision_justification?: string; // Para logs de DECISION
          duration_ms?: number;
        }

        const DAILY_LOGS_API_URL = '/api/daily-logs'; // Endpoint da API do Afiliados

        export async function logToDailyLogs(entry: LogEntry): Promise<void> {
          try {
            await fetcher(DAILY_LOGS_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
            });
          } catch (error) {
            console.error('Failed to send log to daily-logs API:', error);
            // Considerar fallback para logar localmente se a API estiver indisponível
          }
        }

        export async function logInfo(
          agent_id: string,
          operation: string,
          context_ids: LogContextIds,
          message: string,
          payload?: any,
          skill_invoked?: string
        ): Promise<void> {
          await logToDailyLogs({
            timestamp: new Date().toISOString(),
            log_level: 'INFO',
            agent_id,
            skill_invoked,
            operation,
            context_ids,
            message,
            payload,
          });
        }

        export async function logError(
          agent_id: string,
          operation: string,
          context_ids: LogContextIds,
          error: Error | any,
          skill_invoked?: string
        ): Promise<void> {
          await logToDailyLogs({
            timestamp: new Date().toISOString(),
            log_level: 'ERROR',
            agent_id,
            skill_invoked,
            operation,
            context_ids,
            message: error.message || 'Unknown error',
            error_details: {
              type: error.name || 'Error',
              message: error.message || 'Unknown error',
              stack: error.stack,
              http_status: error.response?.status, // Se for um erro de fetch
              api_response: error.response?.data,
            },
          });
        }

        export async function logDecision(
            agent_id: string,
            operation: string,
            context_ids: LogContextIds,
            decision_justification: string,
            payload?: any,
            skill_invoked?: string
        ): Promise<void> {
            await logToDailyLogs({
                timestamp: new Date().toISOString(),
                log_level: 'DECISION',
                agent_id,
                skill_invoked,
                operation,
                context_ids,
                message: `Decisão tomada: ${decision_justification}`,
                payload,
                decision_justification
            });
        }
