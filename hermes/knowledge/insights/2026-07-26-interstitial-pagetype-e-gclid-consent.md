---
id: insight-20260726-interstitial-pagetype-e-gclid-consent
title: "pageType 'interstitial' (estilo FlowPages honesto) + fix de Consent Mode v2 no GCLID"
source_type: outro
source_path: "conversa Claude Code — sessão 2026-07-26, análise do padrão do FlowPages (popup+screenshot+redirect)"
source_url: ""
projects: [afiliados]
tags: [presell, bridge-page, compliance, consent-mode, pageType, google-ads]
created: 2026-07-26
status: active
---

# Insight — pageType 'interstitial' + fix de consentimento no GCLID

## Mudança operacional (1 frase)

O FlowPages usa "screenshot da sales page + popup de segmentação/cookies + redirect" pra
Native/Display/social — isso NÃO deve virar o padrão de bridge page do AfiliAds (que existe pra
passar revisão de Search), mas vale como pageType adicional e explícito, restrito por código a
canais fora de Search/PMax; de quebra, a auditoria encontrou um bug real de Consent Mode v2 já
em produção nas 3 templates existentes.

## Achado de compliance (bug real, não hipotético)

Nas 3 templates de presell (`presell-template.html`, `-pogo.html`, `-vsl.html`), o script que
anexa `gclid`+`sck` ao hoplink rodava incondicionalmente no load da página, ignorando o estado
do banner de Consent Mode v2 (`cc_consent` em localStorage). Ou seja: mesmo um visitante que
clicasse "Recusar" no banner de cookies tinha o gclid repassado ao vendor do mesmo jeito.
Corrigido: o anexo de gclid só roda se `cc_consent === 'granted'`, e é reprocessado quando o
usuário aceita depois (`window.__attachTracking()`, chamado pelo handler do botão "Aceitar").
Sem consentimento, o CTA mantém o hoplink limpo por padrão — sem sobrescrita nenhuma.

## Ângulos de copy / funil

- **pageType 'interstitial'** (novo, `lib/presell-template-interstitial.html`): screenshot real
  da sales page do vendor (via microlink.io, capturado na geração — não por visitante) como
  fundo, com overlay escuro; popup honesto de segmentação (país/gênero/idade, sem captcha
  simulado) que roteia pra um `hopLink`/headline/CTA diferente por regra (`SegmentRoute[]`),
  com fallback pro conteúdo padrão se nada bater ou se nenhuma rota for configurada.
- Reaproveita a mesma lógica de Consent Mode v2 + gclid gating das outras templates (banner +
  `window.__attachTracking`).

## Compliance / o que NÃO fazer

- **Restrito por código, não só por prompt**: `INTERSTITIAL_BLOCKED_CHANNELS` em `lib/presell.ts`
  bloqueia geração (`generatePresell` lança erro) quando `channel` é `SEARCH` ou `PMAX` — Performance
  Max inclui inventário de Search. Só `YOUTUBE`/`DEMAND_GEN` são liberados (equivalente do app a
  Native/Display/YouTube/social).
  - Defesa em profundidade: bloqueio também no gerador de variantes automáticas
    (`/api/presells/variants`, só oferece a variante interstitial quando o canal permite), no
    motor determinístico (`lib/campaign-strategy.ts`, nunca recomenda interstitial fora de
    YOUTUBE/DEMAND_GEN) e no field-check advisory do Compliance Sentinel (`pageType` em
    `wizard-field-check`).
- **Sem captcha simulado**: o popup de segmentação é uma pré-qualificação real (país/gênero/
  idade), nunca finge ser verificação do Google/reCAPTCHA — isso seria impersonation.
- **Sem cloaking/clonagem**: o screenshot é só fundo visual atrás do nosso próprio gate+CTA,
  com disclosure de afiliado e branding próprio visíveis — não é servir a página do vendor como
  se fosse nossa (ver também [[2026-07-26-tipos-de-presell-e-popup-gate]], que já veta clonagem
  de página e "presell de cookies com clique escondido").

## O que ignorar desta fonte

- Qualquer coisa do FlowPages que dependa de captcha simulado ou de clique escondido dentro do
  banner de cookies — dark pattern, não replicar (mesmo veto já registrado no insight anterior).

## Próxima ação (uma só)

Quando o usuário tiver uma campanha real em YOUTUBE/DEMAND_GEN com vendor de sales page forte
(DIRECT ou VSL), testar o pageType interstitial de ponta a ponta em produção e registrar CTR do
CTA vs. advertorial/pogo pra alimentar `getPresellReferencia()` (já existe, ranking por pageType).
