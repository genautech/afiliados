---
id: insight-20260727-wizard-orquestracao-checklists
title: "Wizard: 3 travas estruturais que impediam completar a campanha do início ao fim (Fase 1 corrigida)"
source_type: engenharia
source_path: ""
source_url: ""
projects: [afiliados]
tags: [wizard, checklist, orquestracao, presell, google-ads, compliance-verifier]
created: 2026-07-27
status: active
---

# Insight — Orquestração do Wizard: 3 travas + 2 achados de compliance

## Mudança operacional (1 frase)

O usuário pediu uma avaliação da orquestração de agentes na construção de campanha
(`app/(app)/wizard/page.tsx`) — investigação confirmou **3 travas estruturais reais que
impediam qualquer campanha nova de terminar o wizard do início ao fim**, mais 2 bugs de
compliance descobertos só ao testar a correção com conteúdo real. Plano completo em
`~/.claude/plans/velvet-finding-cherny.md` (Fase 1 implementada e testada; Fases 2-3
pendentes). Ver também [[2026-07-27-auditoria-campos-lidos-nunca-escritos]] — mesmo tema de
"lógica de decisão que nunca teve o writer real por trás", mas dessa vez em ORDEM/FLUXO, não
em campo do banco.

## As 3 travas (Fase 1, corrigidas)

**Trava A — deadlock Passo 3 (Anti-strike) vs Passo 4 (Pré-sell).** `ANTISTRIKE_ITEMS` tinha
3 itens críticos `auto` (`sem_claims`, `disclaimer_afiliado`, `privacy_policy`) que dependiam
de HTML de presell — mas a presell só existe a partir do Passo 4. Itens `auto` nunca aceitam
autoatestação. Resultado: nenhuma campanha nova passava do Passo 3. **Fix:** esses 3 itens
(+ `ga4_configurado`/`ssl_ativo`, que tinham o mesmo problema mas não-críticos) migraram de
`ANTISTRIKE_ITEMS` pra `BRIDGE_CHECKLIST` (dedupe com `disclaimer`/`ssl` que já existiam lá).
`ANTISTRIKE_ITEMS` agora só tem itens self_attested sem dependência de presell.

**Trava B — gerador de presell do wizard era mock, nunca criava `Presell` vinculado.**
`generatePresellHtml()` no Passo 4 era um preenchimento de string local
(`BRIDGE_TEMPLATE.replace(...)`), nunca chamava o pipeline real
(`generatePresell()`/`lib/presell.ts`) nem criava um `Presell` vinculado à campanha — então
mesmo destravando A, `getPresellHtml()` (usado por todo o checklist `auto`) nunca achava
conteúdo pra verificar. **Fix:** `generatePresellHtml()` agora chama `POST /api/presells` de
verdade, com `campaignId`, e atualiza `presellHtml`/`presellUrl` no sucesso. Loading
(`generatingPresell`) durante a chamada.

**Trava C — criação real no Google Ads vivia fora do wizard.** O Passo 9 (Go-live) exige
`googleCampaignId` real (`GOLIVE_CHECKLIST.google_ads_ok`), mas o único botão que chama
`POST /api/google-ads/create` ficava em `app/(app)/campanhas/[id]/page.tsx`, fora do wizard —
sem ação nenhuma disponível no Passo 7 (Google Ads) pra resolver isso. **Fix:** botão "Criar
no Google Ads (PAUSED)" adicionado ao Passo 7, reaproveitando o mesmo endpoint e o mesmo gate
de checklist crítico que já existia.

## 2 achados de compliance (só apareceram testando a correção com conteúdo real)

**Achado 1 — `lib/complianceVerifier.ts` só reconhecia português.** `generatePresell()` já
gera em inglês por padrão pra `geo != 'BR'` (`pickLocale()`, corrigido numa sessão anterior),
mas os regex de `disclaimer`/`faq`/`resultados_variam`/`sem_claims` só tinham o texto em
português. Resultado: TODA presell em inglês (a maioria — campanhas US) reprovava o Passo 4
mesmo com o conteúdo certo. Corrigido: regex bilíngues.

**Achado 2 — falso positivo em "guaranteed"/"garantido".** Esse termo aparece o tempo todo
em disclaimers CORRETOS ("results are not typical or guaranteed" / "resultados não são
garantidos") — um regex simples reprovava a presell por ter o disclaimer certo. Corrigido:
`findBannedClaim()` olha os ~40 caracteres antes do termo procurando negação
(não/nunca/not/never/no/sem) antes de reprovar; termos sempre-ruins (cura/elimina/perca Xkg)
continuam reprovando direto, sem essa checagem. Testado com 7 casos de sanidade (positivos e
negativos) — todos corretos.

## Achado à parte — cuidado ao testar `createGoogleCampaign()`

Testando a Trava C descobri que o usuário `genaujunior@gmail.com` tem credenciais REAIS do
Google Ads conectadas (`isMockMode()` retorna false) — um script de teste chamando
`createGoogleCampaign()` direto criou uma campanha de teste de verdade (PAUSED, zero gasto)
na conta real, removida manualmente logo em seguida via `campaigns:mutate` com `remove`
(não `update: {status: 'REMOVED'}` — a API v25 rejeita REMOVED como update, exige operação
`remove` com só o `resourceName`). **Regra pra próximos agentes:** sempre chamar
`getGoogleAdsConfig()` + `isMockMode()` ANTES de testar qualquer função de
`lib/google-ads.ts` que faça mutate — não assumir que é mock só por estar rodando um
script de teste.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | Campanhas novas conseguem passar do Passo 3 sem presell existente | testar criação de campanha nova end-to-end | Passo 3 libera sem erro | continua travado |
| 2 | Presells em inglês passam no checklist automático do Passo 4 | % de presells EN aprovadas nos itens auto | 100% dos itens que o conteúdo realmente satisfaz | qualquer falso negativo por idioma |

## O que ignorar desta fonte

- N/A — Fase 1 já está em produção.

## Próxima ação (uma só)

- Implementar Fase 2 (validação fresca por etapa com loading + aviso de presell
  desatualizada cross-step) e Fase 3 (base de conhecimento `ChecklistLearning` + botão
  "Corrigir com agente" nos itens de checklist) — plano completo já escrito, só falta
  executar. Ver `~/.claude/plans/velvet-finding-cherny.md`.
