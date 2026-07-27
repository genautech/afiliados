---
id: insight-20260726-strategy-engine-funil-budget
title: "Strategy Engine: budget/funil/canal derivados dos dados do produto (não mais texto solto no dossiê)"
source_type: outro
source_path: ""
source_url: ""
projects: [afiliados]
tags: [wizard, campaign-setup-strategist, compliance, funil, budget]
created: 2026-07-26
status: validated
---

# Insight — Strategy Engine unifica funil/canal/budget a partir do dossiê do produto

## Mudança operacional (1 frase)

Novo `lib/campaign-strategy.ts` (`deriveCampaignStrategy`) — função determinística, sem
LLM — normaliza `strategy.campanha.tipo`/`strategy.presell.tipo` (texto livre do
Compliance Sentinel) e `affiliateInsights.forbiddenChannels`/`googleSearchPermitido`
(gate do Affiliate Page Analyst, o fix do caso FemiCore) em enums reais do app
(`CHANNELS`/`FUNNELS`), classifica `funnelStage` (FUNDO/MEIO/TOPO) pela camada de keyword
dominante (A–D) das keywords selecionadas, e devolve `budgetGuidance`
(testDurationDays/multiplicadores de budgetTest e budgetScale) variando por estágio de
funil. `app/api/wizard-autofill/route.ts` agora chama isso ANTES do LLM e injeta o
resultado no dossiê como `estrategia_derivada` — autoritativo (mesmo padrão de
`commission`), com `blockedChannels` validado **server-side** em `validate()` (rejeita a
sugestão do LLM se vier um canal bloqueado, não depende só do prompt). Wizard UI mostra
aviso se o humano escolher manualmente um canal bloqueado.

Testado contra os `ProductResearch` reais do banco.

> **Correção 2026-07-27:** a frase original aqui dizia "FemiCore agora bloqueia SEARCH
> corretamente" — isso estava errado na raiz, não só na implementação. O incidente original
> não era um bloqueio de canal: a cláusula 10a do Advertising Rules da FemiCore proíbe
> apenas fazer bid/usar o termo "FemiCore" (brand bidding); Google Search em si é permitido.
> `deriveBlockedChannels()` também tinha um bug real de nome de campo (lia
> `insights.googleSearchPermitido`, que nunca existe — o campo gravado é
> `campaignValidation.googleSearchAllowed`), então na prática bloqueava `SEARCH` por omissão
> pra todo produto, não só FemiCore. Ambos corrigidos: o registro da FemiCore no banco
> (`googleSearchAllowed: true`, `brandBiddingAllowed: false`) e o código (bug de campo
> corrigido + novo `forbiddenAdTerms` pra brand bidding, que não bloqueia canal). Ver
> AGENTS.md 2026-07-27 e `hermes/knowledge/femicore-approval-details.md`.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | budgetGuidance por funnelStage evita KILL prematuro em campanhas topo de funil | % de campanhas KILL antes de 7 dias quando dominantLayer é C/D | queda vs. histórico | sem diferença após 10 campanhas |
| 2 | blockedChannels no autofill elimina sugestão de canal proibido | nº de campanhas criadas com canal que violava affiliateInsights | 0 | qualquer ocorrência |

## Compliance / o que NÃO fazer

- `blockedChannels` nunca deve ser ignorado silenciosamente — está em `validate()` da rota,
  não só no prompt do LLM.
- Nunca usar `DIRECT` como funil padrão por omissão — só quando o dossiê recomendar
  explicitamente (regra de ouro do SKILL.md: link direto nunca é URL final).

## O que ignorar desta fonte

- N/A.

## Próxima ação (uma só)

- Fases 3–5 do plano original (`~/.claude/plans/whimsical-plotting-rabin.md` na máquina do
  Claude Code, resumo abaixo) ficaram de seguimento — quem pegar primeiro, avisa aqui:
  - Fase 3: passar `funnelStage` pro prompt do Paid Ads Auditor (`lib/loop-engine.ts`) —
    decisão KILL/SCALE/PAUSAR hoje usa regra única pra toda campanha, devia considerar
    "precisa de mais amostra" (topo) vs. "converte rápido" (fundo).
  - Fase 4: `mcp-afiliads/index.mjs` — `dossie_produto` deveria expor o resultado de
    `deriveCampaignStrategy()`; `gerar_presell` deveria sugerir `tipo_pagina` a partir de
    `recommendedBridgeType`.
  - Fase 5: nova regra de negócio #12 em `SKILL.md` + `references/estrategia-por-funil.md`
    documentando o modelo (o `SKILL.md` já foi reescrito hoje em "8 Fluxos + 11 regras" —
    encaixar nesse formato, não recriar a estrutura antiga).
