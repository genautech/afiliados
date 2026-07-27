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

## Fase 2 (implementada no mesmo dia)

**2a — validação fresca por etapa.** `next()` e `launch()` agora rodam
`runChecklistVerify()` de verdade (não confiam em estado local potencialmente velho) antes
de decidir se pode avançar/lançar, nos passos 3/4/7/8/9. Loading (`advancing`) no botão
durante isso. Achado corrigindo isso: `runChecklistVerify()` só atualizava estado React via
`setXChecks(...)` (assíncrono) — quem chamasse e tentasse ler o estado *logo em seguida*,
no mesmo fluxo síncrono, pegava o valor VELHO (mesma classe de bug do `saveCampaign()`/
`generatePresellHtml()` corrigida antes, commit `c90bafc`). Corrigido fazendo
`runChecklistVerify()` **retornar** o `byStep` fresco, e `canAdvance()` aceitar um override
opcional com esse resultado em vez de só ler o estado.

**2b — staleness cross-step.** Novo campo `Campaign.presellGeneratedAt`. Snapshot
client-side (`presellSnapshot`) dos campos que afetam a presell (`channel`/`pageType`/
`videoUrl`/`name`) tirado no momento da geração — se algum divergir depois (passo 5+), um
banner amarelo aparece com atalho "Regenerar agora". Não é o gate real (isso continua sendo
`bridge_ok`/`GOLIVE_CHECKLIST`), é só aviso antecipado pro usuário não descobrir só no
Passo 9 que mudou o canal depois de gerar a presell.

## Fase 2 — revisão ao vivo no wizard (mesmo dia, achou 2 bugs novos)

Testando as Fases 1+2 no browser de verdade (não só typecheck) contra a campanha de teste
`TESTE_REVISAO_WIZARD_v1`, andando Passo 1→4: os Passos 1-3 confirmaram visualmente as
correções da Fase 1 (Anti-strike 7/7 self_attested sem trava; botão "Próximo" mostrando
"Validando..." — a Fase 2a rodando de verdade). Mas ao chegar no Passo 4 e gerar a presell,
o log do dev server mostrou que **o autosave do wizard vinha falhando com 500 silencioso
desde antes desta sessão**, sem nenhum toast de erro pro usuário:

**Bug 1 — `productResearchId` como scalar num update().** `saveCampaign()`
(`wizard/page.tsx`) manda `productResearchId: sourceProductResearchId` no payload do PATCH.
A rota `app/api/campaigns/[id]/route.ts` fazia `prisma.campaign.update({data: {...body}})`
— espalhando o body cru sem tratamento. Erro: `Unknown argument productResearchId. Did you
mean productResearch?`. Achado curioso: a MESMA coisa funciona sem erro em
`prisma.campaign.create()` (`app/api/campaigns/route.ts`) — `create()` aceita o FK scalar
direto, `update()` não (exige a sintaxe de relação `productResearch: {connect: {id}}` ou
`{disconnect: true}` quando null). Fix na rota: extrai `productResearchId` do body antes do
update e converte pra relação.

**Bug 2 — 3 campos do wizard sem coluna no banco.** `saveCampaign()` também manda
`pageType`, `popupGate`, `videoUrl` — mas essas colunas só existem no model `Presell`,
NUNCA existiram em `Campaign` (confirmado lendo o schema linha por linha). Erro: `Unknown
argument pageType`. Isso quer dizer que **toda vez que o payload de `saveCampaign()` incluía
esses 3 campos** (ou seja, desde que o Passo 4 do wizard existe com esses controles), o
PATCH inteiro falhava com 500 — e como `saveCampaign()` não checa `res.ok` no branch do
PATCH, o erro nunca virou toast, nunca foi percebido. Confirmado o efeito real: a campanha
de teste ficou com `wizardStep: 1` no banco mesmo depois de eu ter navegado visualmente até
o Passo 4 — só o estado React local avançava. Fix: como `hydrateFromCampaign()` já lia
esses 3 campos de volta do `campaign` (intenção original claramente era persistir), a
correção certa foi adicionar as 3 colunas em `Campaign` via `prisma db push`, não remover do
payload do wizard.

**Achado de processo — Prisma Client fica em cache no processo do `next dev`.** Depois de
rodar `prisma db push` + `prisma generate` com o dev server já rodando, o MESMO erro
"Unknown argument pageType" continuou aparecendo — o processo Node já tinha carregado o
`@prisma/client` antigo em memória; regenerar o pacote em disco não afeta um processo já
rodando. Só resolveu depois de matar e reiniciar o `next dev`. **Regra pra próximos
agentes:** sempre reiniciar o dev server depois de qualquer `prisma db push`/`generate`,
não só rodar `tsc`/`build` (que usa um processo novo e não sofre esse problema).

Depois dos 2 fixes + restart, o fluxo completo Passo 1→4 foi re-testado do zero: PATCH
retornando 200 em cada "Próximo", e o botão "Gerar com Presell Builder (IA)" criou um
`Presell` real (POST /api/presells 201) com conteúdo gerado de verdade (artigo advertorial
completo, não mock), confirmando as Fases 1+2 funcionam ponta a ponta depois da correção.

## Fase 3 — base de conhecimento ChecklistLearning + "Corrigir com agente" (mesmo dia)

**3a — modelo `ChecklistLearning`.** Campos: `itemKey`, `scope` (nome da etapa: antistrike/
bridge/google_ads/tracking/golive), `vertical`/`channel`/`platform`/`pageType` (todos
opcionais, usados como filtro de escopo), `problem` (o `note` real da falha),
`correction` (texto concreto do que foi feito/deveria ser feito), `appliesGlobally`.

**3b — endpoint `checklists/fix`, dois caminhos bem diferentes.** A maioria dos itens `auto`
verifica CONTEÚDO da presell (HTML) ou estado de sistema externo (Google Ads, GTM) — não têm
um campo único e seguro pra "aplicar" a correção automaticamente. Só 2 itens (`postback_url`→
`Campaign.postbackUrl`, `clickid_token`→`Campaign.clickidToken`) mapeiam 1:1 num campo real
editável — só esses passam pelo ciclo completo "agente sugere → aplica no campo → roda
`runFullChecklistVerify()` de novo → se passou, grava `ChecklistLearning`". Pra todos os
outros itens (a maioria: `disclaimer`, `sem_claims`, `faq`, `ga4_configurado`, `lance_manual`,
`budget_diario` etc.), a rota só gera diagnóstico+correção via LLM e grava a lição direto —
sem fingir que "aplicou" algo que não tem onde ser aplicado. Isso é intencional, não uma
limitação a corrigir: a correção de conteúdo de verdade acontece via "Regenerar com
correções" (3d), que passa a lição como contexto pro gerador de presell reescrever o HTML.

**`runFullChecklistVerify()` extraído pra `lib/complianceVerifier.ts`.** Era lógica só de
`checklists/verify/route.ts`; o endpoint de fix precisa rodar a MESMA verificação completa
depois de aplicar um campo (GOLIVE depende do agregado dos outros checklists) — extraído em
vez de duplicado.

**3c — injeção em `wizard-autofill` e `product-research`.** Nova função
`getChecklistLearningReferencia(userId, vertical, channel, platform)` em
`lib/complianceVerifier.ts` (mesmo padrão de `getMarketIntelReferencia`) — lookup frouxo por
OR (vertical+channel, ou só vertical, ou só platform), até 8 lições mais recentes. Injetada
no dossiê do `wizard-autofill` (`licoes_aprendidas`) e no prompt do Compliance Sentinel em
`product-research` (antes da chamada, usando `hunter?.vertical` + `netTitle` como plataforma).

**3d — "Regenerar com correções".** Novo `GET .../checklists/learnings` devolve o texto
formatado de `getChecklistLearningReferencia()` pra vertical/canal/plataforma da campanha.
Novo botão no Passo 4 busca isso e chama `generatePresellHtml(extraContext)` — precisou
mudar a assinatura de `generatePresellHtml()` pra aceitar um parâmetro opcional; **cuidado**:
isso quebra qualquer `onClick={generatePresellHtml}` direto (o evento do click vira o
argumento `extraContext`) — todos os call sites tiveram que virar `onClick={() =>
generatePresellHtml()}` explícito.

**Testado ao vivo, não só typecheck.** Via `fetch()` direto no console do browser (sessão
autenticada): (1) caminho de conteúdo — `fix` em `lance_manual` (Google Ads) gerou
diagnóstico+correção reais e a lição apareceu certinha no `GET .../learnings` logo depois;
(2) caminho de campo real — trocando temporariamente `platform` da campanha de teste pra
MaxWeb, `fix` em `postback_url` sugeriu uma URL válida, aplicou em `Campaign.postbackUrl`,
re-verificou, e `passouAVerificar: true` voltou — confirmando o ciclo completo
aplicar→re-verificar→passou. Campanha de teste restaurada pro estado original (`platform:
'ClickBank'`, `postbackUrl: ''`) depois do teste.

## Achado extra — presellUrl nunca persistido logo após gerar (mesmo dia, testando Fase 3)

Testando "Corrigir com agente" no item "SSL ativo" pra valer, o agente sugeriu hospedar a
presell no Netlify — errado, o usuário hospeda no Hostinger (API key já configurada) e/ou
usa a própria hospedagem do AfiliAds (`/p/<slug>`, HTTPS automático via Railway). A causa
raiz real: `generatePresellHtml()` só fazia `PATCH {presellGeneratedAt}` depois de gerar,
nunca `presellUrl` — então `checkSsl(campaign.presellUrl)` sempre lia vazio até o próximo
`saveCampaign()` completo (avançar de passo). Corrigido: o PATCH pós-geração agora inclui
`presellUrl` também. Além disso, o prompt genérico de `checklists/fix` agora recebe
`presell_gerada_pelo_afiliads` (URL real da Presell vinculada) e
`hostinger_domain_configurado` como contexto, com instrução explícita de NUNCA sugerir
hospedagem de terceiro — ver [[feedback_hostinger_hosting_not_thirdparty]] na memória.

Também adicionado: link "Ver no Google Ads" (`https://ads.google.com/aw/campaigns?campaignId=
<id>`) no Passo 7 do wizard e na página de detalhes da campanha, quando `googleCampaignId`
existe — funciona se a conta ativa no navegador já for a certa; senão o Google Ads pede pra
trocar de conta, sem risco de nada quebrar.

**Regra de processo confirmada de novo:** rodar `npm run build` enquanto o `next dev` está
ativo na mesma pasta corrompe o `.next` compartilhado (erro `MODULE_NOT_FOUND` no dev
server) — sempre rodar build isolado ou reiniciar o dev depois.

## Próxima ação (uma só)

- Nenhuma pendente das 3 fases planejadas — plano completo (`~/.claude/plans/velvet-finding-
  cherny.md`) implementado e testado. Próximo trabalho no wizard, se houver, é escopo novo, não
  continuação deste plano.
