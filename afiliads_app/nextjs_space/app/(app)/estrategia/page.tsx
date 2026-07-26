'use client';

import { useState } from 'react';
import { SalesPageType } from '@/lib/salesPageAnalyzer'; // Importar SalesPageType
import { BridgePageType } from '@/lib/bridgePageRecommender'; // Importar BridgePageType
import { dispatchAgentTask } from '@/lib/agentOrchestrator'; // Importar dispatchAgentTask

type SalesPageAnalysisResult = {
  url: string;
  characteristics: any; // Ajustar o tipo conforme SalesPageCharacteristics
  salesPageType: SalesPageType;
};

type BridgePageRecommendationResult = {
  recommendedType: BridgePageType;
  reasoning: string;
  confidenceScore: number;
};

export default function EstrategiaPage() {
  const [salesPageUrl, setSalesPageUrl] = useState('');
  const [productId, setProductId] = useState(''); // Para associar a um ProductResearch existente
  const [analysisResult, setAnalysisResult] = useState<SalesPageAnalysisResult | null>(null);
  const [recommendation, setRecommendation] = useState<BridgePageRecommendationResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [loadingAgentTask, setLoadingAgentTask] = useState(false);
  const [agentTaskResult, setAgentTaskResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeSalesPage = async () => {
    setLoadingAnalysis(true);
    setError(null);
    setAnalysisResult(null);
    setRecommendation(null);

    try {
      const response = await fetch('/api/sales-page-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: salesPageUrl, productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao analisar a página de vendas.');
      }

      const data: SalesPageAnalysisResult = await response.json();
      setAnalysisResult(data);
      // Após a análise, automaticamente solicitar a recomendação da bridge page
      handleRecommendBridgePage(data.salesPageType);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido durante a análise.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleRecommendBridgePage = async (salesPageType: SalesPageType) => {
    if (!productId) {
      setError('É necessário um Product ID para gerar a recomendação da Bridge Page.');
      return;
    }

    setLoadingRecommendation(true);
    setError(null);
    setRecommendation(null);

    try {
      const response = await fetch('/api/bridge-page-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, salesPageType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao obter a recomendação da bridge page.');
      }

      const data: BridgePageRecommendationResult = await response.json();
      setRecommendation(data);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido durante a recomendação.');
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const handleDispatchAgentTask = async (
    taskType: 'generate' | 'validate',
    bridgePageType: BridgePageType,
    context: string,
  ) => {
    if (!productId) {
      setError('É necessário um Product ID para despachar tarefas do agente.');
      return;
    }
    setLoadingAgentTask(true);
    setAgentTaskResult(null);
    setError(null);

    try {
      const result = await dispatchAgentTask(
        bridgePageType,
        `${taskType === 'generate' ? 'Gerar' : 'Validar'} ${bridgePageType} para o produto. Contexto: ${context}`,
        productId,
        // campaignId, // campaignId opcional se disponível
      );
      setAgentTaskResult(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao despachar tarefa do agente.');
    } finally {
      setLoadingAgentTask(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Estratégias de Bridge Page</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Analisar Página de Vendas</h2>
        <div className="mb-4">
          <label htmlFor="salesPageUrl" className="block text-sm font-medium text-gray-700">URL da Página de Vendas</label>
          <input
            type="text"
            id="salesPageUrl"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={salesPageUrl}
            onChange={(e) => setSalesPageUrl(e.target.value)}
            placeholder="Ex: https://produto.com/vendas"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="productId" className="block text-sm font-medium text-gray-700">ID do Produto (Opcional, para salvar no BD)</label>
          <input
            type="text"
            id="productId"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="ID do ProductResearch (ex: clx9h1q6w00001f4j7n2k3m5l)"
          />
        </div>
        <button
          onClick={handleAnalyzeSalesPage}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={loadingAnalysis || !salesPageUrl}
        >
          {loadingAnalysis ? 'Analisando...' : 'Analisar Página de Vendas'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {analysisResult && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-3">Resultados da Análise da Página de Vendas</h2>
          <p><strong>URL:</strong> {analysisResult.url}</p>
          <p><strong>Tipo Detectado:</strong> {analysisResult.salesPageType}</p>
          <h3 className="text-lg font-medium mt-3">Características:</h3>
          <ul className="list-disc pl-5">
            {Object.entries(analysisResult.characteristics).map(([key, value]) => (
              <li key={key}><strong>{key}:</strong> {String(value)}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-3">Recomendação de Bridge Page</h2>
          <p><strong>Tipo Recomendado:</strong> {recommendation.recommendedType}</p>
          <p><strong>Justificativa:</strong> {recommendation.reasoning}</p>
          <p><strong>Pontuação de Confiança:</strong> {(recommendation.confidenceScore * 100).toFixed(2)}%</p>

          <h3 className="text-lg font-semibold mt-4 mb-2">Ações Sugeridas:</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleDispatchAgentTask('generate', recommendation.recommendedType, recommendation.reasoning)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={loadingAgentTask || loadingRecommendation || !productId}
            >
              {loadingAgentTask ? 'Gerando...' : `Gerar ${recommendation.recommendedType}`}
            </button>
            <button
              onClick={() => handleDispatchAgentTask('validate', recommendation.recommendedType, 'Validar copy da bridge page.')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              disabled={loadingAgentTask || loadingRecommendation || !productId}
            >
              {loadingAgentTask ? 'Validando...' : 'Validar Copy'}
            </button>
            {/* Adicionar mais botões conforme os tipos de agentes e tarefas */}
          </div>

          {agentTaskResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h4 className="font-semibold">Resultado da Tarefa do Agente:</h4>
              <p>{agentTaskResult.message}</p>
              <p>Agente Despachado: {agentTaskResult.dispatchedAgent}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
