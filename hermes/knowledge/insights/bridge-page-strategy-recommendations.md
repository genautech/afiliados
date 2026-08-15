# Lógica de Recomendação de Estratégias de Bridge Page

Este documento descreve a lógica implementada no serviço de `BridgePageRecommender` para sugerir o tipo ideal de página de ponte (bridge page) com base em diversas características da campanha, produto e análise da página de vendas (sales page).

## Modelos de Dados Envolvidos

*   `ProductResearch`: Contém informações detalhadas sobre o produto de afiliado, como nicho (`vertical`), taxas de conversão (`avgConversionRate`), EPC (`avgEpc`), e o tipo de página de vendas associada (`salesPageType`).
*   `Campaign` (Opcional): Pode fornecer contexto adicional sobre a campanha específica, embora a lógica atual se foque mais no produto e na sales page.
*   `SalesPageType` (Enum): Classificação da página de vendas (VSL, DIRECT, QUIZ, LEAD_GEN, OTHER).
*   `BridgePageType` (Enum): Tipos de páginas de ponte recomendadas (POGO, ADVERTORIAL, QUIZ_FUNNEL, LEAD_GEN_PAGE, OTHER).
*   `BridgePageStrategyRecommendation`: Modelo para armazenar as recomendações geradas, incluindo `recommendedType`, `reasoning` e `confidenceScore`.

## Lógica de Regras (`recommendBridgePage`)

A função `recommendBridgePage` avalia as entradas e aplica um conjunto de regras para determinar o tipo de bridge page mais adequado. Cada regra tem um `confidenceScore` associado, indicando a força da recomendação.

### Regras Implementadas (Ordem de Prioridade)

1.  **Pogo Page para VSLs:**
    *   **Condição:** Se `salesPageType` for `SalesPageType.VSL`.
    *   **Recomendação:** `BridgePageType.POGO`.
    *   **Justificativa:** VSLs (Video Sales Letters) são projetadas para fazer a venda principal. Uma Pogo Page aquece o tráfego rapidamente e o direciona para a VSL, maximizando o impacto do pitch principal na página final.
    *   **Confidence Score:** 0.9 (Alta).

2.  **Quiz Funnel para Nichos Personalizados:**
    *   **Condição:** Se `salesPageType` for `SalesPageType.QUIZ` OU se o `product.vertical` (nicho do produto) incluir termos como 'saúde', 'fitness' ou 'pets' (indicando necessidade de personalização).
    *   **Recomendação:** `BridgePageType.QUIZ_FUNNEL`.
    *   **Justificativa:** Páginas de vendas que já são quizzes ou produtos em nichos que se beneficiam de abordagens personalizadas são ideais para um Quiz Funnel. Este tipo de bridge page segmenta e aquece o lead com base em suas respostas, aumentando a relevância da oferta e o engajamento.
    *   **Confidence Score:** 0.85 (Média-Alta).

3.  **Lead Gen Page para Captura de Leads:**
    *   **Condição:** Se `salesPageType` for `SalesPageType.LEAD_GEN`.
    *   **Recomendação:** `BridgePageType.LEAD_GEN_PAGE`.
    *   **Justificativa:** Se a página de vendas já é uma página de captura de leads, ou se a estratégia geral visa a construção de uma lista de e-mails, uma Lead Gen Page oferece um valor gratuito em troca do contato, permitindo follow-up e nutrição do lead.
    *   **Confidence Score:** 0.8 (Média).

4.  **Advertorial para Produtos que Precisam de Contexto/Credibilidade (Direct com Baixa CVR):**
    *   **Condição:** Se `salesPageType` for `SalesPageType.DIRECT` E a taxa de conversão média esperada do produto (`product.avgConversionRate`) for baixa (e.g., menor que 2%).
    *   **Recomendação:** `BridgePageType.ADVERTORIAL`.
    *   **Justificativa:** Páginas de vendas diretas para produtos com baixa conversão podem se beneficiar de um Advertorial. Ele pré-vende o produto de forma nativa e informativa, construindo credibilidade e preparando o lead para a oferta principal, o que pode aumentar a CVR.
    *   **Confidence Score:** 0.75 (Média).

5.  **Fallback para OTHER (Genérica):**
    *   **Condição:** Se nenhuma das regras anteriores for satisfeita E `salesPageType` for `SalesPageType.DIRECT`.
    *   **Recomendação:** `BridgePageType.OTHER`.
    *   **Justificativa:** A página de vendas é direta, mas nenhuma estratégia de bridge page mais específica foi identificada como ideal. Recomenda-se uma abordagem genérica, que pode ser personalizada manualmente.
    *   **Confidence Score:** 0.6 (Baixa).

### Observações Adicionais

*   **Dados Históricos e Benchmarking:** A arquitetura prevê o ajuste do `confidenceScore` com base em dados históricos de performance de campanhas e benchmarking de mercado. Esta funcionalidade será implementada em futuras iterações, requerendo a coleta e análise desses dados.
*   **Extensibilidade:** A estrutura de regras permite adicionar novas condições e tipos de bridge pages conforme novos padrões e estratégias forem identificados.
*   **Integração com Agentes de IA:** As recomendações servem como entrada para agentes de IA (como Claude Code ou Codex CLI) que podem auxiliar na geração de conteúdo ou na estruturação da bridge page, de acordo com o `recommendedType`.

Este documento será atualizado conforme a lógica de recomendação evoluir e mais dados forem incorporados.