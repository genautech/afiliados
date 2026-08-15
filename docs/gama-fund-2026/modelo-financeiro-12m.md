# AfiliAds — modelo financeiro de 12 meses

Data-base: 10 de agosto de 2026. Moeda: reais, salvo indicação contrária.

> Modelo gerencial para candidatura e planejamento, não demonstração contábil nem recomendação financeira. AfiliAds ainda não possui histórico comercial suficiente; portanto, aquisição, churn e consumo por campanha são hipóteses explícitas a validar.

## Decisões confirmadas pelo founder

- estrutura: newco independente;
- dedicação: 50 horas por semana;
- transição: imediata;
- captação pretendida: R$ 2 milhões;
- runway mínimo: 12 meses;
- estágio: produto funcional, ainda sem escala e sem série confiável de custo real por campanha.

## Resumo executivo

O pedido de R$ 2 milhões é defensável como um plano de 12 meses que **não depende de receita para sobreviver**. A receita estende o runway ou financia escala; não é usada para esconder uma necessidade maior de capital.

No cenário-base, a empresa termina o mês 12 com:

- 245 clientes ativos líquidos;
- MRR de R$ 244 mil;
- ARR run-rate de R$ 2,93 milhões;
- receita reconhecida no ano de R$ 1,02 milhão;
- margem bruta média modelada de 75%;
- aproximadamente R$ 762 mil gerados pela contribuição bruta, além do runway financiado.

O cenário-base é uma meta operacional, não forecast comprometido. Sem sinais de conversão dos primeiros pilotos, o cenário conservador deve orientar caixa e contratações.

## Como dados históricos foram usados

### O que existe

- O produto já registra tokens e `costUsd` por `AgentRun` no schema e possui painel agregado.
- A tabela de referência do código contém preços por modelo/provedor.
- O deck histórico da Yoobe registra capacidade anterior de comercialização e escala do founder.
- Concorrentes adjacentes provam willingness-to-pay: RedTrack publica planos de US$ 79, US$ 499 e US$ 999/mês; ClickFunnels publica US$ 97, US$ 197 e US$ 297/mês.

### O que ainda não existe

- coorte pagante do AfiliAds;
- churn, expansão ou CAC observado;
- distribuição real de tokens por campanha completa;
- taxa de retry, grounding e revisão humana em produção;
- custo de suporte por perfil.

Os números históricos da Yoobe **não foram usados para fabricar crescimento do AfiliAds**. Eles provam capacidade do founder, mas são negócios e mercados diferentes.

## Pricing para validação

| Plano | Preço mensal | Franquia sugerida | Cliente principal |
| --- | ---: | ---: | --- |
| Starter | R$ 297 | 3 campanhas/mês | iniciante sério |
| Pro | R$ 997 | 15 campanhas/mês | operador profissional |
| Agency | R$ 2.997 | 50 campanhas/mês | agência/equipe |
| Overage | R$ 39 | por campanha adicional | todos os planos |

Contratos anuais podem receber até dois meses de desconto somente após validar retenção. BYOK pode reduzir COGS, mas não deve ser obrigatório para o produto funcionar.

### Referência de mercado

- [RedTrack](https://www.redtrack.io/pricing/): US$ 79 a US$ 999/mês, conforme escala e recursos.
- [ClickFunnels](https://support.clickfunnels.com/en/articles/12734340-clickfunnels-2-0-pricing): US$ 97, US$ 197 e US$ 297/mês em 2026.
- [Optmyzr](https://www.optmyzr.com/pricing/): precificação por gasto gerenciado, com enterprise customizado.

AfiliAds não copia esses preços: usa-os para demonstrar que operadores já pagam por tracking, páginas e automação separadamente.

## Economia de IA por campanha

### Premissa de workload

Uma campanha completa consumiria, antes de otimização:

- 600 mil tokens de entrada;
- 120 mil tokens de saída;
- 85% do volume em Flash;
- 15% em Pro/revisão crítica;
- retries, avaliações e grounding como multiplicadores adicionais.

Preços oficiais de referência no Vertex AI:

- Gemini 2.5 Flash: US$ 0,15/1M tokens de entrada; US$ 0,60 de saída sem thinking ou US$ 3,50 com thinking;
- Gemini 2.5 Pro: US$ 1,25/1M de entrada e US$ 10/1M de saída, para contexto até 200 mil tokens;
- grounding acima da franquia: US$ 35 por mil prompts grounded.

Fonte: [Generative AI on Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing).

Com câmbio gerencial de R$ 5,50/US$:

| Faixa | Custo de IA/campanha | Uso no modelo |
| --- | ---: | --- |
| token puro, sem overhead | R$ 2,50–R$ 5,00 | piso técnico |
| pipeline com retry/eval/grounding | R$ 8–R$ 15 | faixa provável inicial |
| stress | R$ 30 | teste de margem |

O modelo-base usa **R$ 12 por campanha** no início e prevê R$ 6 após cache, deduplicação, batch, roteamento e redução de retries. Até existir telemetria, nenhum contrato pode oferecer uso ilimitado.

### Atenção ao código atual

`lib/llm-pricing.ts` ainda usa algumas referências diferentes das tarifas oficiais atuais — por exemplo, Gemini 2.5 Pro com saída a US$ 12 e o fallback Gemini a US$ 0,30/US$ 1,20. Isso é conservador em alguns casos, mas não substitui sincronização periódica de preços.

## Margem bruta

O ano foi modelado com 75% de margem bruta média:

- meses iniciais: aproximadamente 68%–72%;
- mês 12: meta de 78%;
- stress com IA a R$ 30/campanha: 60%–68%, exigindo overage ou redução de franquia.

COGS inclui:

- inferência, grounding e APIs de pesquisa;
- compute/data variáveis;
- processamento de pagamentos;
- suporte diretamente associado ao uso;
- impostos sobre receita como aproximação gerencial.

Custos de P&D, vendas, jurídico e infraestrutura de desenvolvimento ficam em OPEX.

## Cenários de receita

As contagens são clientes ativos líquidos no fim de cada mês, já depois de churn. O mix implícito aumenta a presença de Pro/Agency conforme o cenário melhora.

| Indicador no mês 12 | Conservador | Base | Escala |
| --- | ---: | ---: | ---: |
| clientes ativos | 78 | 245 | 600 |
| ARPA mensal | R$ 658 | R$ 997 | R$ 1.172 |
| MRR | R$ 51.324 | R$ 244.265 | R$ 703.200 |
| ARR run-rate | R$ 615.888 | R$ 2.931.180 | R$ 8.438.400 |
| receita reconhecida no ano | R$ 238.854 | R$ 1.015.943 | R$ 2.828.036 |
| contribuição bruta a 75% | R$ 179.141 | R$ 761.957 | R$ 2.121.027 |

### Trajetória mensal de clientes ativos

| Mês | Conservador | Base | Escala |
| ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 |
| 2 | 3 | 5 | 8 |
| 3 | 6 | 12 | 20 |
| 4 | 10 | 22 | 40 |
| 5 | 15 | 35 | 70 |
| 6 | 21 | 50 | 110 |
| 7 | 28 | 70 | 160 |
| 8 | 36 | 95 | 225 |
| 9 | 45 | 125 | 300 |
| 10 | 55 | 160 | 390 |
| 11 | 66 | 200 | 490 |
| 12 | 78 | 245 | 600 |

## Uso dos R$ 2 milhões

| Área | Valor | % | Resultado financiado |
| --- | ---: | ---: | --- |
| produto, engenharia e P&D | R$ 900 mil | 45% | produto, evals, dados e segurança |
| go-to-market | R$ 360 mil | 18% | pilotos, growth, comunidade e vendas |
| Google Cloud, IA e dados | R$ 220 mil | 11% | shadow budget sem depender dos créditos |
| customer success e operações | R$ 180 mil | 9% | onboarding e suporte dos design partners |
| jurídico, segurança e administração | R$ 160 mil | 8% | newco, IP, contratos, LGPD e controles |
| contingência | R$ 180 mil | 9% | câmbio, contratação e consumo acima do plano |
| **Total** | **R$ 2 milhões** | **100%** | **12 meses sem depender de receita** |

### Composição indicativa de P&D

- pró-labore do founder: R$ 15 mil/mês;
- dois engenheiros full-stack/AI: aproximadamente R$ 22 mil/mês cada, custo carregado;
- ML/data engineer a partir da validação dos pilotos;
- product design e segurança por projeto;
- nenhum headcount antecipado sem milestone comercial.

## Curva de gasto fixo

| Trimestre | Gasto | Média mensal | Lógica |
| --- | ---: | ---: | --- |
| Q1 | R$ 330 mil | R$ 110 mil | founder, produto e pilotos |
| Q2 | R$ 450 mil | R$ 150 mil | engenharia e primeira contratação GTM |
| Q3 | R$ 540 mil | R$ 180 mil | dados/evals, CS e aquisição |
| Q4 | R$ 680 mil | R$ 227 mil | escala condicionada às métricas |
| **Total** | **R$ 2 milhões** | **R$ 167 mil** | |

O gasto do Q4 não é automático. Se o cenário ficar abaixo do conservador, congelam-se contratações e preserva-se runway.

## Milestones de liberação de caixa

### Gate 1 — até o mês 3

- 20 entrevistas;
- 5 design partners;
- pelo menos 2 pilotos pagos ou LOIs com preço;
- telemetria de tokens e custo por campanha completa.

### Gate 2 — até o mês 6

- 50 clientes ativos no cenário-base;
- MRR próximo de R$ 50 mil;
- margem bruta observada acima de 65%;
- ativação e retenção medidas por coorte.

### Gate 3 — até o mês 9

- 125 clientes ativos no cenário-base;
- MRR próximo de R$ 125 mil;
- payback de CAC menor que seis meses;
- expansão em campanhas/contas observável.

### Gate 4 — mês 12

- cenário-base: 245 clientes e R$ 244 mil de MRR;
- margem bruta próxima de 78%;
- posição para seed/continuação baseada em retenção, não apenas aquisição.

## Unit economics que precisam ser provados

| Métrica | Base de planejamento | Stress/gatilho |
| --- | ---: | --- |
| margem bruta | 75% média | <65% por 2 meses exige repricing |
| CAC blended | R$ 1.300 | >R$ 3.000 desacelera mídia paga |
| payback | <4 meses | máximo aceitável inicial: 6 meses |
| churn logo mensal | 3% | >5% bloqueia escala de GTM |
| custo IA/campanha | R$ 12 → R$ 6 | >R$ 20 exige overage/redução de franquia |
| ativação | campanha `PAUSED` em até 7 dias | >14 dias exige correção de onboarding |

O CAC de R$ 1.300 pressupõe founder-led sales, comunidades e parcerias. Não é razoável assumir esse CAC se a aquisição depender de mídia paga ampla desde o início.

## Efeito dos créditos Google

Créditos não entram em margem nem reduzem o shadow COGS. Se concedidos, permitem:

- aumentar o número de evals e pilotos;
- preservar até R$ 220 mil do orçamento de Cloud/IA;
- estender runway ou financiar produto/dados após os gates;
- testar cargas de escala sem contratar infraestrutura antecipadamente.

## O que precisamos medir nas próximas quatro semanas

1. Tokens de entrada/saída por agente e campanha completa.
2. Custo de retries, falhas e revisão independente.
3. Número de campanhas mensais por perfil.
4. Disposição a pagar nos três preços propostos.
5. Tempo manual anterior e tempo no AfiliAds.
6. Custo de onboarding e suporte.
7. Conversão da waitlist para entrevista, piloto e pagamento.

Após 10 campanhas completas e cinco pilotos, este modelo deve ser recalibrado com percentis p50/p90, não apenas médias.

## Riscos do modelo

- 245 clientes em 12 meses é agressivo sem canal de distribuição comprovado.
- suporte concierge pode consumir a margem da fase inicial.
- políticas do Google Ads podem limitar certos clientes/verticais.
- câmbio afeta APIs cobradas em dólar.
- o mix pode ficar concentrado em Starter e reduzir ARPA.
- créditos podem criar comportamento de uso que não sobrevive ao preço de tabela.

Por isso, a narrativa para investidores deve apresentar o cenário conservador como proteção de caixa e o cenário-base como plano de execução condicionado a milestones.

