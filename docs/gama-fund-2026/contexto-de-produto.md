# AfiliAds — contexto de produto e posicionamento

Status: documento de referência para manter landing, candidatura, pitch e entrevistas consistentes.

## Categoria

AfiliAds é um **sistema operacional AI-native para performance commerce**. O primeiro mercado é a operação de afiliados em Google Search; a expansão natural é para equipes e agências que precisam pesquisar, construir, publicar, controlar e aprender com muitas campanhas sem multiplicar headcount e risco na mesma proporção.

Não posicionar como:

- gerador de anúncios;
- builder de landing pages;
- tracker genérico;
- “ChatGPT para afiliados”;
- promessa de lucro automático.

## One-liner

> AfiliAds transforma uma oferta em uma campanha Google Ads verificável e continuamente aprendível, combinando agentes de IA com controles determinísticos para proteger orçamento, compliance e conta.

## Cliente ideal e ordem de entrada

1. Afiliado profissional ou pequena equipe operando 10–100 campanhas em paralelo.
2. Agência que precisa padronizar qualidade, governança e aprendizado entre operadores.
3. Iniciante sério, atendido por um caminho guiado, mas não usado como principal tese de receita.

## Dor principal

O operador hoje alterna entre rede/oferta, páginas do produtor, planilhas, chats de IA, WordPress, trackers e Google Ads. As ferramentas não compartilham contexto. Erros pequenos — brand bidding proibido, claim incompatível, CPC acima do payout, tracking quebrado — geram reprovação, desperdício ou risco de conta.

## Promessa central

Reduzir o tempo entre escolher uma oferta e produzir uma campanha `PAUSED`, pronta para revisão, sem remover o humano das decisões com impacto financeiro.

Esta é uma hipótese mensurável, não um resultado já comprovado. Métricas dos pilotos:

- tempo até primeira campanha pronta;
- percentual de checklists aprovado na primeira revisão;
- número de intervenções humanas;
- custo de IA por campanha;
- campanhas por operador;
- retenção e expansão por campanhas/contas.

## Como funciona

`oferta + regras + mercado → agentes → decisões estruturadas → guards → ativos/campanha → experimento → memória`

- IA interpreta páginas, políticas, intenção, copy e sinais heterogêneos.
- Código calcula economia, valida estados e bloqueia ações fora do contrato.
- Confirmação humana permanece no caminho de mutações com risco financeiro.
- Google Ads API é a superfície de execução e reporting.
- Cada campanha devolve dados e correções à memória operacional.

## Vantagem defendível

A vantagem não é um modelo exclusivo. É a combinação de:

1. workflow vertical completo;
2. dados conectando oferta, restrição, keyword, página, configuração e resultado;
3. avaliações e schemas por tarefa;
4. controles de autorização, readiness e lifecycle;
5. distribuição e aprendizado acumulados junto a operadores.

Modelos melhores reduzem custo e aumentam qualidade do AfiliAds; não eliminam o workflow nem os dados que a empresa acumula.

## Prova existente

- fluxo de nove etapas em produto;
- 14 agentes especializados;
- 58 rotas de produto e uma suíte automatizada ampla; a contagem final será congelada em um commit verde;
- publicação real de presell;
- criação ponta a ponta de campanha `PAUSED` pela Google Ads API v25, testada em conta real e removida após validação;
- experimentos com controle/tratamento, lifecycle e leitura de significância reportada pela API;
- Vertex AI/Gemini e roteamento multi-provider por tarefa, custo e independência.

Isso prova execução técnica. Ainda não prova product-market fit, receita ou retenção.

## Modelo de negócio a validar

- Starter: orientação e baixo volume;
- Pro: múltiplas ofertas/campanhas, experimentos e memória;
- Agency: assentos, contas, governança e reporting;
- uso variável: acima da franquia de IA/campanhas;
- enterprise futuro: políticas, permissões e deployment dedicado.

Créditos Google financiam velocidade de aprendizado e infraestrutura durante a validação. A empresa só considera o modelo saudável se a margem continuar atraente após os créditos.

## Tom de comunicação

Austero, técnico e didático. Demonstrar controle, não “mágica”. Nunca prometer aprovação, rentabilidade ou automação sem supervisão. Diferenciar explicitamente prova técnica, hipótese comercial e resultado comercial.
