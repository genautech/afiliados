---
id: insight-20260810-gama-fund-afiliads-captacao
title: "Gama Fund — candidatura, tese de investimento e modelo financeiro do AfiliAds"
source_type: outro
source_path: "docs/gama-fund-2026/"
source_url: "https://gamafund.com/"
projects: [afiliados]
tags:
  - fundraising
  - gama-fund
  - google-cloud
  - vertex-ai
  - pitch
  - financial-model
created: 2026-08-10
status: active
---

# Gama Fund — handoff completo para o Hermes

> [!success] Estado
> Pesquisa do programa, formulário, tese, pitch, landing e projeção financeira concluídos. Nenhuma candidatura foi submetida e nenhum deploy foi feito.

## Decisões confirmadas pelo founder

- AfiliAds será uma **newco independente**.
- Genau dedicará **50 horas por semana** ao AfiliAds.
- Transição: **imediata**.
- Captação inicial pretendida: **R$ 2 milhões**.
- Runway mínimo: **12 meses**.
- O uso de créditos Google não entra na margem nem substitui shadow cost.

## Tese central

AfiliAds não deve ser apresentado como “mais uma ferramenta de afiliados”. O posicionamento aprovado é:

> AfiliAds é o sistema operacional AI-native para performance commerce. Começa por afiliados em Google Search e transforma oferta, regras e mercado em uma campanha verificável; agentes interpretam contexto, software determinístico controla risco, a Google Ads API executa e cada resultado alimenta a próxima decisão.

O wedge inicial são afiliados profissionais e agências que operam muitas campanhas. Iniciantes são atendidos por um caminho guiado, mas não ditam a tese econômica.

## Founder-market fit

- Genau fundou a Yoobe e conduziu seu pivot B2C → B2B.
- A Yoobe foi selecionada/investida pelo Google for Startups Black Founders Fund em 2022.
- Formulação permitida: “Yoobe foi uma startup investida/selecionada pelo Google for Startups”.
- Não dizer que Google é sócio do AfiliAds ou que investiu no AfiliAds.
- Métricas históricas do deck Yoobe 2023 só entram no pitch após autorização explícita e sempre com o ano.

## Prova técnica do AfiliAds

- 14 agentes especializados;
- 58 rotas de produto;
- 474 casos de teste contados em agosto de 2026;
- publicação real de presell;
- Google Ads API v25 com campanha ponta a ponta criada como `PAUSED` em teste real e depois removida;
- readiness, mutation guards e confirmação humana;
- lifecycle de experimentos e reporting oficial;
- Gemini/Vertex AI e roteamento multi-provider.

Esses números são prova de execução técnica, não clientes, receita ou PMF.

## Modelo financeiro aprovado para trabalho

### Pricing a validar

| Plano | Preço | Franquia |
| --- | ---: | ---: |
| Starter | R$ 297/mês | 3 campanhas |
| Pro | R$ 997/mês | 15 campanhas |
| Agency | R$ 2.997/mês | 50 campanhas |
| Overage | R$ 39 | campanha adicional |

### Cenários no mês 12

| Indicador | Conservador | Base | Escala |
| --- | ---: | ---: | ---: |
| clientes ativos | 78 | 245 | 600 |
| MRR | R$ 51 mil | R$ 244 mil | R$ 703 mil |
| ARR run-rate | R$ 616 mil | R$ 2,93 milhões | R$ 8,44 milhões |
| receita reconhecida no ano | R$ 239 mil | R$ 1,02 milhão | R$ 2,83 milhões |

O cenário-base é meta condicionada, nunca promessa. O caixa deve ser administrado pelo cenário conservador até existir retenção.

### Custo de IA

- premissa de token puro: R$ 2,50–R$ 5 por campanha;
- pipeline inicial com retries/evals/grounding: R$ 8–R$ 15;
- base do modelo: R$ 12 por campanha;
- meta otimizada: R$ 6;
- stress: R$ 30;
- margem bruta média modelada: 75%, começando perto de 70% e buscando 78%.

Não existe ainda série confiável de consumo real por campanha completa. A próxima calibração exige pelo menos 10 campanhas e cinco pilotos.

### Uso dos R$ 2 milhões

| Área | Valor | % |
| --- | ---: | ---: |
| produto, engenharia e P&D | R$ 900 mil | 45% |
| go-to-market | R$ 360 mil | 18% |
| Cloud, IA e dados | R$ 220 mil | 11% |
| customer success e operações | R$ 180 mil | 9% |
| jurídico, segurança e administração | R$ 160 mil | 8% |
| contingência | R$ 180 mil | 9% |

O runway de 12 meses não depende de receita. Receita e créditos estendem runway ou financiam escala contra milestones.

## Documentos canônicos

- [Plano-mestre](../../../docs/gama-fund-2026/plano-mestre.md)
- [Programa e formulário](../../../docs/gama-fund-2026/programa-e-formulario.md)
- [Rascunho da aplicação](../../../docs/gama-fund-2026/rascunho-aplicacao.md)
- [Tese de investimento e defesa](../../../docs/gama-fund-2026/tese-de-investimento.md)
- [Pitch deck e roteiro](../../../docs/gama-fund-2026/pitch-deck-vencedor.md)
- [Modelo financeiro](../../../docs/gama-fund-2026/modelo-financeiro-12m.md)
- [Modelo financeiro mensal CSV](../../../docs/gama-fund-2026/modelo-financeiro-mensal.csv)
- [Estratégia Google Cloud](../../../docs/gama-fund-2026/estrategia-google-cloud.md)
- [Análise de mercado](../../../docs/gama-fund-2026/analise-de-mercado.md)
- [Contexto de produto](../../../docs/gama-fund-2026/contexto-de-produto.md)

## Landing

- Código: `afiliads_app/nextjs_space/app/afiliads/`
- Rota: `/afiliads`
- Inclui founder proof com fontes oficiais do Google e disclaimer de separação Yoobe/AfiliAds.
- ESLint direcionado e build Next isolado passaram.
- Revisão visual desktop/mobile realizada.
- Não houve deploy.

## Pendências que o Hermes deve perguntar antes da submissão

1. AfiliAds é solo founder ou existe cofounder?
2. Qual será o instrumento da rodada e valuation/cap?
3. Qual papel residual de Genau na Yoobe após a transição?
4. A newco e a cessão de IP já foram formalizadas?
5. Quais métricas históricas da Yoobe podem ser divulgadas?
6. Quais duas referências de founders entrarão no formulário?
7. Qual o telefone, LinkedIn, cidade, entidade e headcount definitivos?
8. O canal de descoberta foi o e-mail de Maurício Martiniano/Google Campus?

## Próxima ação única

> [!todo]
> Rodar cinco pilotos e dez campanhas completas instrumentando tokens, custo, ativação, revisão humana, margem e disposição a pagar; depois recalibrar `modelo-financeiro-12m.md` antes de gerar o Google Slides final e submeter o Airtable.

