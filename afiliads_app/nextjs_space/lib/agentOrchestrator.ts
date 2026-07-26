import { BridgePageType } from "./bridgePageRecommender";

export async function dispatchAgentTask(
  bridgePageType: BridgePageType,
  context: string,
  productId: string,
  campaignId?: string,
): Promise<any> {
  console.log(`Dispatching agent task for Bridge Page Type: ${bridgePageType}`);
  console.log(`Context: ${context}`);
  console.log(`Product ID: ${productId}`);
  if (campaignId) console.log(`Campaign ID: ${campaignId}`);

  // Simular uma chamada a um endpoint de orquestração de LLM
  // Na implementação real, isso chamaria um endpoint como /api/llm-routing
  // que por sua vez usaria delegate_task ou outra lógica de agente.
  try {
    const response = await fetch('/api/orchestrate-agent-task', { // Novo endpoint, a ser criado ou usar llm-routing
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bridgePageType,
        context,
        productId,
        campaignId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao despachar tarefa do agente.');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Erro ao despachar tarefa do agente:', error);
    throw error;
  }
}
