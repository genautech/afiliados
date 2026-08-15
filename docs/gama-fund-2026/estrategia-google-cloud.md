# AfiliAds — estratégia Google Cloud e uso responsável dos créditos

## Princípio

Google Cloud não entra como lista de logos. Cada serviço precisa remover um risco ou habilitar uma métrica. O orçamento é liberado por marcos e todo custo é acompanhado em duas visões: faturado e **shadow cost sem créditos**.

## Arquitetura-alvo

```text
Aplicação / API
  → orquestração de agentes (Vertex AI / Gemini; Agent Engine quando maduro)
  → funções determinísticas de readiness, orçamento e autorização
  → Google Ads API v25 / publicação / tracking
  → eventos em Pub/Sub
  → BigQuery: decisões, custos, versões, métricas e experimentos
  → Vertex AI Evaluation: qualidade, segurança, latência e revisão humana
```

### Camada de raciocínio

- Gemini no Vertex AI para interpretação, geração estruturada e revisão independente.
- Model Garden/MaaS para modelos alternativos quando uma tarefa exigir custo, formato ou independência diferentes.
- Vertex AI Evaluation para datasets reproduzíveis de vendor terms, compliance, estratégia, copy e páginas.
- Agent Engine somente quando sessões, memória, observabilidade e escala gerenciada justificarem a migração; não por moda arquitetural.

### Camada de dados

- BigQuery como warehouse de eventos e resultados entre campanhas.
- Vector Search/embeddings para recuperar campanhas, regras e correções semanticamente semelhantes.
- Cloud SQL/AlloyDB para estado transacional conforme necessidade real do produto.
- Cloud Storage para artefatos versionados e evidência de auditoria.

### Execução e governança

- Cloud Run para workloads stateless e workers escaláveis.
- Pub/Sub para desacoplar coleta, avaliação e sincronização.
- Secret Manager, IAM mínimo e logs redigidos para credenciais.
- Budget alerts, quotas por tenant e kill switches por provider.

Fontes técnicas: [Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/overview), [Vertex AI model evaluation](https://docs.cloud.google.com/vertex-ai/docs/evaluation/using-model-evaluation), [BigQuery vector search](https://docs.cloud.google.com/bigquery/docs/vector-search-intro), [Google Ads experiments](https://developers.google.com/google-ads/api/docs/experiments/overview) e [reporting de experimentos](https://developers.google.com/google-ads/api/docs/experiments/reporting).

## Plano de uso de até US$ 350 mil em créditos

Valores são tetos de planejamento, não compromisso de gasto.

| Envelope | % | Teto | Resultado exigido |
| --- | ---: | ---: | --- |
| inferência e evals Vertex AI | 35% | US$ 122,5k | benchmark por tarefa e custo/qualidade |
| dados, BigQuery e memória | 20% | US$ 70k | dataset multi-campanha e consultas operacionais |
| compute/orquestração | 18% | US$ 63k | SLO e custo por workflow em escala |
| ambientes seguros e observabilidade | 12% | US$ 42k | auditoria, alertas e incident response |
| multimodal/ativos controlados | 8% | US$ 28k | experimentos com ganho medido, não volume de assets |
| contingência técnica | 7% | US$ 24,5k | usada só mediante milestone aprovado |

## Liberação por marcos

### Marco 1 — 0 a 90 dias

- 5 design partners;
- benchmark mínimo com 200 exemplos revisados;
- custo por tarefa e campanha;
- três campanhas `PAUSED` produzidas em piloto;
- shadow billing ativo.

Teto indicativo: 10% dos créditos.

### Marco 2 — 3 a 6 meses

- onboarding repetível;
- clientes pagantes ou LOIs convertidas;
- dataset de decisões/resultados no BigQuery;
- avaliação automática + amostragem humana;
- margem projetada sem créditos dentro da faixa-alvo.

Teto acumulado: 30%.

### Marco 3 — 6 a 12 meses

- retenção e expansão observáveis;
- automação segura de workflows assíncronos;
- SLOs, alertas e isolamento por tenant;
- primeira expansão de canal/geo baseada em demanda.

Teto acumulado: 65%.

### Marco 4 — 12 a 24 meses

- escala comprovada e unit economics sustentáveis;
- migração seletiva para serviços gerenciados onde reduz TCO;
- restante liberado contra receita, retenção e confiabilidade.

## Métricas de IA para o comitê

- taxa de saída válida por schema;
- precisão/recall em extração de restrições;
- falso negativo em regras críticas;
- concordância entre gerador e revisor independente;
- taxa de override humano;
- latência p50/p95;
- custo por tarefa e por campanha;
- regressões por versão de modelo/prompt;
- incidentes de mutação indevida: meta zero.

## Guardrails financeiros

1. Nenhum plano é precificado usando custo líquido após crédito.
2. Cada tenant tem quota, budget e rate limit.
3. Tarefas simples usam modelo light; premium exige ganho medido.
4. Cache, deduplicação e reuso de análise precedem aumento de tokens.
5. BYOK pode existir como opção, não como remendo para unit economics ruins.
6. Custo de inferência vira COGS no modelo financeiro.

## O pedido ao Google

O recurso mais valioso não é apenas crédito. É colaboração com Vertex AI/DeepMind para construir um benchmark proprietário de agent reliability em operações com impacto financeiro e acesso aos times de Ads/Cloud para revisar padrões de execução, avaliação e governança.

