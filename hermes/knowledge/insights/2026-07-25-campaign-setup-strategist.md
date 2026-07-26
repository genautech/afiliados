---
id: insight-20260725-campaign-setup-strategist
title: "Campaign Setup Strategist — autofill do Wizard a partir do dossiê do produto"
source_type: engenharia
source_path: afiliads_app/nextjs_space/app/api/wizard-autofill/route.ts
source_url: ""
projects: [afiliados]
tags: [wizard, agente, autofill, produto-pesquisado]
created: 2026-07-25
status: active
---

# Insight — Campaign Setup Strategist

## Mudança operacional (1 frase)

O Wizard de campanha agora pode ser preenchido automaticamente a partir de um produto já pesquisado (ou de uma campanha em andamento), com um agente novo que normaliza os campos, reaproveita as keywords já geradas pelo SEO Architect e explica o porquê de cada valor escolhido.

## Como funciona

- Entrada: `productResearchId` (produto novo) ou `campaignId` (campanha existente, só completa campos vazios).
- Dados reais do dossiê (payout, comissão, CVR estimada, keywords, compliance) sempre vencem estimativa do agente — o agente só decide o que não está no dossiê (geo, budget, refund%, naming no padrão `CB_WL_US_SEARCH_BRIDGE_v1`).
- Pontos de entrada: Busca de Produtos → "Criar Campanha no Wizard", seletor dentro do próprio Wizard, e "Continuar no Wizard" na página da campanha.
- Novo agente registrado: `campaign-strategist` (tier `standard`) em `lib/llm.ts` / `lib/agents.ts`.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | Autofill reduz tempo de setup do Wizard | tempo até "Lançar Campanha" | queda perceptível vs. preenchimento manual | sem diferença após 10 campanhas |
| 2 | Naming gerado pelo agente segue o padrão sem intervenção | % de campanhas com nome fora do padrão `REDE_VERTICAL_GEO_CANAL_FUNIL_vN` | <10% | >30% |

## Ângulos de copy / funil

- N/A (feature de operação interna, não de copy).

## Compliance / o que NÃO fazer

- O agente é instruído a nunca inventar `platform`/`vertical`/`geo`/`channel`/`funnel` fora das listas permitidas (validação com retry automático em `lib/wizard-autofill.ts`).
- `budgetTest` sugerido é limitado a $50–150 (1–2x a comissão) — não deixar o agente sugerir budgets de teste desproporcionais.

## O que ignorar desta fonte

- N/A.

## Próxima ação (uma só)

- Acompanhar 5–10 campanhas criadas via autofill e comparar o CPC/budget sugerido pelo agente com o que o afiliado realmente configurou no Google Ads, pra calibrar o prompt se houver desvio sistemático.
