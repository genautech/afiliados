---
id: insight-20260727-auditoria-campos-lidos-nunca-escritos
title: "Auditoria: campos lidos por lógica de decisão/aprendizado mas nunca escritos por nada — 3 achados corrigidos"
source_type: engenharia
source_path: ""
source_url: ""
projects: [afiliados]
tags: [aprendizado-continuo, bug, auditoria, google-ads-sync, product-research, presell]
created: 2026-07-27
status: active
---

# Insight — Auditoria de campos "lidos mas nunca escritos"

## Mudança operacional (1 frase)

Depois de corrigir `Presell.ctaClicks` (lido por `rankPresellOutcomes()`, nunca incrementado
por nada), o usuário pediu uma auditoria geral no mesmo padrão: qualquer campo do banco que
uma lógica de decisão/aprendizado LÊ pra decidir algo, mas que NENHUM código jamais ESCREVE —
achei mais 2, corrigi os 3, e este insight documenta o padrão pra virar checklist permanente.

## Os 3 achados

1. **`Presell.ctaClicks`** — lido por `rankPresellOutcomes()` (aprendizado contínuo de
   pageType×canal), nunca incrementado. Corrigido: `generatePresell()` agora pré-gera o `id`
   da presell (`randomUUID()`, passado ao `create()`) pra poder embutir um beacon de clique
   (`navigator.sendBeacon`) no próprio HTML gerado; novo endpoint público
   `POST /api/presells/click?id=` incrementa o contador. Beacon usa URL absoluta
   (`NEXTAUTH_URL`/`RAILWAY_PUBLIC_DOMAIN`) porque a presell pode estar hospedada num domínio
   WordPress externo do afiliado.

2. **`ProductResearch.avgConversionRate`** — lido por `recommendBridgePage()`
   (`lib/bridgePageRecommender.ts`, Regra 4: recomenda ADVERTORIAL quando a sales page é
   DIRECT e a conversão esperada é baixa). O campo nunca era escrito pelo pipeline real de
   pesquisa de produto (`app/api/product-research/route.ts`) — só existia populado nos 10
   produtos do `scripts/seed-product-research.ts` (dados de demo). Resultado: pra QUALQUER
   produto pesquisado de verdade pela IA, essa regra nunca disparava (o valor era sempre
   `null`, e `null && ...` é sempre falso) — caía sempre no fallback genérico "OTHER".
   Corrigido: `HUNTER_PROMPT` agora pede `"conversao_esperada_pct"` (a IA estima com base em
   vertical/ticket/tipo de página quando não sabe o valor real), e o upsert grava tanto
   `conversionRate` (string, exibição) quanto `avgConversionRate` (float 0-1, decisão) a
   partir desse valor. Testado ao vivo: LLM retorna o campo de forma confiável, e
   `recommendBridgePage()` agora recomenda ADVERTORIAL corretamente quando a conversão é
   baixa (antes sempre caía em OTHER).

3. **`Keyword.clicks` / `Keyword.cpcReal` / `Keyword.conversions`** — exibidos na tabela de
   `/planilhas` (spreadsheet), sempre zerados: nenhum código, nem manual (não existe UI de
   edição, só um PATCH genérico `/api/keywords/[id]` que a UI nunca chama) nem automático,
   jamais escrevia esses campos. `google-ads/sync` (pull) só sincronizava dados de nível de
   CAMPANHA (status/orçamento/lance), nunca de keyword. Corrigido: nova função
   `fetchGoogleAdsKeywordMetrics()` em `lib/google-ads.ts` (GAQL em `keyword_view`, últimos 30
   dias, mesmo padrão de mock mode de `fetchGoogleCampaign`), chamada em `google-ads/sync`
   logo após o pull de campanha — faz upsert nas `Keyword` locais (`isSelected: true`) que
   baterem por texto (case-insensitive) com `clicks`, `cpcReal` (custo/cliques) e
   `conversions` reais. Falha nessa parte não derruba o sync de campanha (try/catch isolado,
   é um extra).

## Por que isso acontece neste projeto (causa raiz comum aos 3)

Em todos os 3 casos, o campo foi adicionado ao `schema.prisma` e a LÓGICA DE LEITURA foi
escrita primeiro (geralmente por um agente projetando a feature de decisão/aprendizado) —
mas o WRITER (a parte chata: endpoint, sync, ou prompt de IA que realmente popula o dado no
mundo real) ficou como trabalho futuro implícito e nunca voltou a ser feito. TypeScript e
`prisma db push` não acusam esse tipo de bug — o campo existe, tipa certo, só fica sempre no
valor default (`0`, `''`, `null`), então a lógica de decisão "funciona" silenciosamente errado
(sempre cai no mesmo branch/fallback) sem nenhum erro visível.

## Checklist pra não repetir (aplicar em qualquer feature nova de decisão/aprendizado)

Antes de considerar uma feature de "aprendizado contínuo" / decisão automática pronta:
1. Todo campo que a lógica de decisão LÊ — grep pelo nome do campo em `create(`/`update(`/
   `upsert(`/`increment` no repo inteiro. Se não aparecer nenhum writer real (só o schema e a
   leitura), a feature está incompleta, mesmo que compile e não dê erro.
2. Diferencie "requer ação manual do usuário" (ex.: `DailyLog` via página `/diario` — tem UI
   real, é um design válido) de "não tem NENHUM jeito de ser escrito" (bug real, como os 3
   acima).
3. Ao terminar de implementar o writer, teste-o de ponta a ponta (não só typecheck) — nos 3
   casos acima, rodei geração real e chequei o valor final no banco antes de considerar
   corrigido.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | `recommendBridgePage()` agora recomenda ADVERTORIAL com frequência real (não 0%) pra produtos DIRECT de baixa conversão | % de recomendações ADVERTORIAL vs OTHER nos próximos 10 produtos DIRECT pesquisados | >0% ADVERTORIAL quando aplicável | continua sempre OTHER |
| 2 | `ctaClicks`/`Keyword.clicks` deixam de ficar zerados em campanhas reais ativas | valores >0 depois de tráfego real + `google-ads/sync` rodado | valores reais aparecem | continuam zerados após sync manual |

## O que ignorar desta fonte

- N/A — os 3 fixes já estão em produção (commit `1459e34` + o commit desta auditoria).

## Próxima ação (uma só)

- Rodar `google-ads/sync` (pull) manualmente na campanha real da FemiCore depois que ela tiver
  tráfego de verdade, e conferir se `Keyword.clicks`/`cpcReal`/`conversions` batem com o
  Google Ads UI — é o primeiro teste de ponta a ponta com dados reais (o teste desta sessão
  usou mock mode, sem credencial real configurada pro usuário de teste).
