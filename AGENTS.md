# Afiliados — contexto para agentes (Hermes / Cursor / Claude Code / Anti-Gravity)

**Estado em 2026-07-29 (~04h) — Sessão Claude Code, Experimentos A/B Google Ads (Tarefas 1–3
de 16 concluídas):** plano completo em
`.hermes/plans/2026-07-29_023051-google-ads-experiments-wizard.md` (gitignored, local).
Revisão crítica do Hermes (`.hermes/handoffs/..._hermes-review.md`) incorporada ao plano —
concordâncias/discordâncias documentadas na seção 1.1. Feito nesta sessão, sem tocar Railway
em nenhum momento (`DATABASE_URL` confirmado mascarado antes de cada edição de schema):
Tarefa 1 (`adabc6f`, harness Vitest), Tarefa 2 (`c86004a`+`a8fb6cb`, mutation guard
default-deny integrado em `mutateGoogleCampaign`/`createGoogleCampaign` — **toda mutação real
fica bloqueada até alguma rota passar `confirmed: true`, o que ainda não acontece**), Tarefa 3
(`b085007`, 4 models Prisma dedicados — `GoogleAdsExperiment`/`Arm`/`Operation`/
`MetricSnapshot` — + `migration.sql` escrito à mão em `prisma/migrations/` **não aplicado a
nenhum banco** + backfill idempotente em `scripts/backfill-google-ads-experiments.ts`, dry-run
por padrão, **nunca executado**). 28 testes novos, todos offline. Campos-protótipo legado em
`Campaign` (`isExperiment`/`experimentId`/...) preservados intocados.

**Atualização mesma sessão (~09h) — Tarefa 4 concluída (`258a5f9`):** `lib/google-ads/client.ts`
(versão da API centralizada via env, headers/MCC, OAuth2, `isMockMode`, `toAmountMicros`) +
`lib/google-ads/errors.ts` (erro tipado com redação de segredo) extraídos de
`lib/google-ads.ts`, que agora só importa — mesmo comportamento público, `npm run build`
limpo. Os 4 `fetch()` diretos dentro de `mutateGoogleCampaign`/`createGoogleCampaign`/
`fetchGoogleCampaign`/`fetchGoogleAdsKeywordMetrics` continuam como estavam (não migrados pro
`googleAdsRequest()` novo — decisão deliberada, ver seção 1.2 do plano). 50 testes no total.

**Atualização mesma sessão (~10h) — Tarefa 5 concluída (`6ffa292`):**
`lib/google-ads-experiments/types.ts` (status/variação/feasibility/ação canônicos, `as const`)
+ `schemas.ts` (7 contratos Zod — draft, arms com split derivado 100-treatment, aplicar
variação, schedule exigindo `treatmentModified: true`, ações END/PROMOTE/GRADUATE, sync
result, report) + `lib/experiment-budget.ts` (`calculateExperimentBudget()` determinístico,
LLM nunca decide o valor). 86 testes no total. Próxima: Tarefa 6 (criar Experiment + arms na
API real, mock primeiro) — se for continuar, ler a seção 1.2 do plano antes (decisões de
nomenclatura/schema já tomadas, não redecidir).

**Atualização mesma sessão (~10h) — Tarefa 6 concluída (`b331c77`):**
`lib/google-ads/experiments.ts` — `createExperiment()` (SETUP), `createExperimentArms()`
(control+treatment na mesma mutate request, `MUTABLE_RESOURCE`, valida invariantes antes de
qualquer fetch), `getTreatmentInDesignCampaign()` (fallback GAQL `includeDrafts`). **Aviso:**
shape de alguns campos da API nunca foi validado contra resposta real, só contra mocks
próprios — conferir documentação atual antes do primeiro teste real (Tarefa 16). 100 testes
no total.

**Atualização mesma sessão (~11h) — Tarefa 7 concluída (`bef5844`):**
`lib/google-ads/ads.ts` (`findAdGroupAdsInCampaign`, `updateAdFinalUrls`) +
`applyFinalUrlVariation()` em `experiments.ts` — acha o RSA do in-design treatment, muta
`finalUrls` e **relê pra confirmar** antes de reportar sucesso (`verified: boolean`, nunca
confia só no HTTP 200). 113 testes no total.

**Atualização mesma sessão (~13h) — fix de segurança pós-revisão (`521ada6`):** revisão do
conjunto Tarefas 6-7 achou que `createExperiment`/`createExperimentArms`/`updateAdFinalUrls`
mutavam de verdade na API mas **não chamavam o mutation guard da Tarefa 2**. Sem risco em
produção hoje (nada roteava pra essas funções ainda), mas era armadilha pra Tarefa 10.
Corrigido: guard plugado nas 3, `confirmed: false` hardcoded (mesmo padrão das funções
antigas, `TODO(Tarefa 10)`). Request-building/response-parsing extraídos como funções puras
(`buildXxxOperation`/`parseXxxResponse`/`compareFinalUrlsAfterMutation`) pra manter a
cobertura de teste sem precisar passar pelo guard. 120 testes no total. **Regra pra Tarefa 8
em diante: plugar o guard já na primeira versão de qualquer função que mute, não depois.**

**Atualização mesma sessão (~13h) — Tarefa 8 concluída (`ea4394a`):**
`scheduleExperiment`/`promoteExperiment` (assíncronos, LRO via novo `googleAdsResourceRequest()`),
`pollExperimentOperation` (GET via novo `googleAdsGetResource()`, leitura, sem guard),
`listExperimentAsyncErrors` (paginado, limite de 20 páginas), `endExperiment`/
`graduateExperiment` (síncronos). `assertActionAllowedFromStatus` valida a máquina de estados
antes de qualquer rede. Guard plugado desde a primeira versão nas 4 que mutam (lição
aplicada). 148 testes no total. Próxima: Tarefa 9 (reporting oficial — uplift/p-value via
recurso `experiment`) — se for continuar, ler a seção 1.2 do plano antes.

**Atualização mesma sessão (~14h) — Tarefa 8R concluída (checkpoint de auditoria transversal
via Kimi/Hermes, `.hermes/handoffs/2026-07-29_task8-cross-flow-quality-gate.md`):** gate
reprovou o lifecycle da Tarefa 8 apesar dos 148 testes verdes — mocks reproduziam contratos
Google Ads v25 **incorretos** e havia bypass estrutural do mutation guard. Corrigido antes de
avançar pra Tarefa 9: **A1** `listExperimentAsyncErrors` agora usa GET no resource name do
EXPERIMENTO (não da operation) com paginação por query string; **A2** `graduateExperiment` usa
o payload oficial `campaignBudgetMappings`; **A3** `includeDrafts` removido de todo
`SearchGoogleAdsRequest` (campo não existe em v25); **A4** status remoto v25
(`GoogleExperimentRemoteStatus`) separado do workflow local, mapper puro que nunca cai em SETUP
por default; **A5** fechado o bypass do guard — `googleAdsRequest`/`googleAdsResourceRequest`
genéricos agora rejeitam `:mutate` em runtime, mutação real exige `MutationCapability` (branded,
só emitido por `assertMutationAllowed`); **A6** `applyFinalUrlVariation` reescrita pra derivar o
treatment campaign sempre do `experiment_arm.control=false` (nunca aceita resource name solto),
distinguir `alreadyApplied`/`changed`/`verified`, e mutar tudo numa única request; **A7**
resource names dos mocks corrigidos pro shape real (composto com til, nunca aninhado). Também
corrigidos 2 bugs de segurança achados no mesmo checkpoint, fora do escopo de Experiments:
**B3** `checklists/fix/route.ts` fabricava `googleCampaignId` com `Date.now()` sem recurso
remoto — bloco removido; **B5** `checklists/route.ts` e `decisions/route.ts` não checavam
ownership de `campaignId` (IDOR — `decisions` podia disparar mutate real de budget na conta de
outro usuário) — `assertCampaignOwnership()` adicionado nos 2. B1/B2/B4/B6/B7 (deadlock de
keywords no Passo 5, contrato de confirmação, semântica de "campanha lançada", PATCH sem
schema, gates dos passos 7/8) **registrados como critério de aceite explícito** nas Tarefas
10/12/13/14 do plano — não implementados agora porque exigiriam editar Wizard/rotas em produção
sem revisão dedicada nesta sessão. 174/174 testes (26 novos), `tsc`/`build` limpos. Nenhuma
mutação real, migration, backfill ou smoke test — 100% mock. Campanha FemiCore não tocada.
Próxima: Tarefa 9 (reporting oficial).

**Estado em 2026-07-28 (~03:45h) — Sessão Anti-Gravity (Pair Programming & Multi-Agent Protocol):**
Iniciada nova sessão dedicada com o Anti-Gravity para desenvolvimentos paralelos enquanto os agentes em cloud continuam atuando no projeto Afiliados.
Revisão do codebase concluída: Presell da FemiCore publicada em `orangepeelmorning.com`, suporte a FTP/Static via `publishToFtp()`, Wizard 9 passos 100% operacional com `ChecklistLearning` e "Corrigir com agente", motor `deriveCampaignStrategy` ativo e auditoria de escrita de métricas no Postgres finalizada.
Integrações mapeadas e ativas: (1) **Obsidian Sync** via `lib/obsidianSync.ts` (escrevendo notas de execução em `~/Vaults/notes/Conhecimento/Execucoes/afiliados/`); (2) **Hermes / Airmines Ops** em `hermes/REGISTRY.md` e `hermes/knowledge/insights/`.
Regras de isolamento ativas para o Anti-Gravity: checar `git status --short` e `git log` antes de editar arquivos de app, realizar commits atômicos, validar se o `.env` local aponta para Postgres local ou Railway (Produção) antes de `prisma db push`, e registrar lições no Obsidian ao final da sessão. Insight registrado em `hermes/knowledge/insights/2026-07-28-antigravity-sessao-e-compatibilidade-agentes.md`.

**Estado em 2026-07-27 (~15h) — presell da FemiCore publicada de verdade em
orangepeelmorning.com + fix de falso-positivo em compliance:** durante o teste do
"Corrigir com agente" no item SSL, achamos que `generatePresellHtml()` nunca persistia
`presellUrl` (corrigido) e que o diagnóstico genérico sugeria hospedagem de terceiro
(Netlify) que o usuário não usa. Investigando a hospedagem real: **a API pública da
Hostinger só expõe upload de arquivo pra contas Agency Hosting**, não pra hospedagem
regular — implementei `publishToFtp()` (`lib/presell.ts`, `basic-ftp`) como caminho pra
domínios estáticos, mas antes de usá-lo testei (leitura, sem custo) se `WP_SITES_JSON` já
tinha algo configurado pra `orangepeelmorning.com` — tinha, de uma sessão anterior, e a
Application Password ainda era válida (`GET /wp-json/wp/v2/users/me` → 200). O domínio roda
WordPress de verdade. Publicado via o pipeline WordPress já existente:
`https://orangepeelmorning.com/femicore-advertorial-advertorial-3/` (real, HTTP 200).
Publicando de verdade, achamos mais um falso positivo de compliance: `sem_claims` reprovava
qualquer variação de fraseado do disclaimer de saúde que usasse "cure"/"eliminate" — corrigido
tratando esses termos por checagem de negação (igual "garantido"/"guaranteed"), não por
allowlist de frase exata (que quebra a cada variação de texto da IA). Checklist da Bridge da
FemiCore: 7/7. Detalhes completos em
`hermes/knowledge/insights/2026-07-27-wizard-orquestracao-checklists.md` ("Achado extra 2" e
"3"). `publishToFtp()`/`FTP_SITES_JSON` seguem disponíveis pra qualquer domínio futuro que
seja hospedagem estática de verdade (não WordPress) — endpoint
`/api/presells/[id]/promote` aceita `destino='ftp'`, botão "Publicar em domínio próprio" no
Passo 4 do wizard.

**Estado em 2026-07-27 (~14h) — Fase 3 do wizard completa (ChecklistLearning + "Corrigir com
agente"):** fecha o plano de 3 fases da orquestração do wizard. Novo modelo
`ChecklistLearning` (problema+correção por item de checklist, escopado por vertical/canal/
plataforma/pageType). Novo endpoint `app/api/campaigns/[id]/checklists/fix/route.ts`
("Corrigir com agente", botão nos Passos 4/7/8/9): pra itens que mapeiam num campo real
(`postbackUrl`/`clickidToken`) o agente sugere e a rota já aplica + re-verifica de verdade
(reaproveitando `runFullChecklistVerify()`, extraído de `checklists/verify/route.ts` pra
`lib/complianceVerifier.ts`); pra itens de conteúdo de presell ou sistema externo (a maioria
— disclaimer, sem_claims, ga4, etc.) gera diagnóstico+correção concretos e só grava a lição,
sem tentar aplicar cegamente num campo que não existe. `ChecklistLearning` é injetado no
dossiê do `wizard-autofill` e no prompt do Compliance Sentinel (`product-research`) — a
próxima campanha da mesma vertical/canal já nasce ciente dos problemas resolvidos antes.
Botão "Regenerar com correções" no Passo 4 reaplica essas lições como contexto extra na
regeneração da pré-sell (via `GET .../checklists/learnings`). Testado ao vivo (não só
typecheck): os dois caminhos do endpoint de fix confirmados end-to-end contra a campanha de
teste, incluindo o ciclo completo aplicar→re-verificar→passou→gravar lição. Detalhes em
`hermes/knowledge/insights/2026-07-27-wizard-orquestracao-checklists.md` (seção "Fase 3").

**Estado em 2026-07-27 (~13h) — Fases 1+2 revisadas ao vivo no wizard, 2 bugs novos achados
e corrigidos:** testando as Fases 1+2 no wizard de verdade (browser, não só typecheck),
achei 2 bugs de persistência que faziam TODO autosave do wizard falhar silenciosamente
depois do Passo 1 — a UI avançava normal (estado local do React), mas nada ia pro banco.
(1) `PATCH /api/campaigns/[id]` espalhava o body cru direto em
`prisma.campaign.update({data: {...body}})` — `productResearchId` é FK e o Prisma Client
rejeita como scalar num update (`update()` só aceita a forma de relação
`productResearch: {connect/disconnect}`, diferente de `create()`, que aceitava o mesmo body
sem problema). (2) `saveCampaign()` do wizard sempre mandava `pageType`/`popupGate`/
`videoUrl`, mas essas 3 colunas nunca existiam no model `Campaign` (só em `Presell`) —
toda vez que o payload continha esses campos o Prisma dava 500, e como o código não checava
`res.ok` no fetch do PATCH, o erro nunca aparecia pro usuário. Fix: (1) rota converte
`productResearchId` pra sintaxe de relação antes do update; (2) 3 colunas novas em
`Campaign` (`pageType`, `popupGate`, `videoUrl`) via `prisma db push`, já que era o intuito
original (`hydrateFromCampaign()` já lia esses campos de volta, só nunca persistiam).
**Regra pra próximos agentes:** depois de QUALQUER `prisma db push` local, reiniciar o
`next dev` — o processo do dev server mantém o `@prisma/client` antigo em memória mesmo
depois do client ser regenerado em disco, então erros "Unknown argument" somem do código
mas continuam aparecendo em runtime até reiniciar. Doc completo em
`hermes/knowledge/insights/2026-07-27-wizard-orquestracao-checklists.md` (seção "Fase 2 —
revisão ao vivo"). Fase 3 (`ChecklistLearning` + "Corrigir com agente") segue pendente,
plano em `~/.claude/plans/velvet-finding-cherny.md`.

**Estado em 2026-07-27 (~11h) — Wizard destravado (Fase 1 de 3):** o wizard
(`app/(app)/wizard/page.tsx`) tinha 3 travas estruturais reais que impediam QUALQUER campanha
nova de terminar do Passo 1 ao 9 (deadlock Passo 3 vs 4 no checklist Anti-strike/Bridge,
gerador de presell mockado desconectado do pipeline real, criação do Google Ads fora do
wizard) — todas corrigidas, mais 2 bugs de compliance achados testando a correção
(`lib/complianceVerifier.ts` só reconhecia português; falso positivo em "guaranteed"/
"garantido" reprovando disclaimers corretos). Detalhes completos, achados e um aviso
importante sobre testar `createGoogleCampaign()` (pode mutar conta real do Google Ads sem
querer) em `hermes/knowledge/insights/2026-07-27-wizard-orquestracao-checklists.md`. Plano
das 3 fases (Fase 1 feita; Fase 2 = validação fresca por etapa com loading + staleness;
Fase 3 = base de conhecimento `ChecklistLearning` + botão "Corrigir com agente") em
`~/.claude/plans/velvet-finding-cherny.md` — se for continuar, comece lendo esses dois
arquivos antes de mexer no wizard de novo.

**Estado em 2026-07-27 (~04h):** gerador de presell (`lib/presell.ts` +
`lib/presell-template*.html`) corrigido e enriquecido na mesma sessão que corrigiu o caso
FemiCore acima: bug real de i18n (textos fixos do template — footer, cookie banner, FAQ
heading, disclaimer de saúde, `<html lang>` — ficavam sempre em pt-BR mesmo pedindo inglês,
corrigido via `pickLocale()`), pros/contras estruturado, segunda imagem de produto, CTA com
pulse, sticky CTA mobile, cookie de atribuição de 30 dias (`afp_track`, mais robusto que o
mecanismo equivalente da FlowPages, pesquisado ao vivo), suporte a GTM opcional
(`gtm_container_id` em Integrations) e bloco de código customizado (`Presell.customCode`,
ainda sem UI no Wizard). Detalhes completos, incluindo o que foi avaliado e descartado de
propósito (contadores de urgência, exit pop-up com desconto, botões WhatsApp/pagamento,
formulário+CRM — não se aplicam ao nosso modelo ClickBank+Google Search) em
`hermes/knowledge/insights/2026-07-27-flowpages-guia-gerador-presell.md`.

**Estado em 2026-07-27 (~09h) — auditoria de campos "lidos mas nunca escritos":** achado
sistêmico depois de corrigir `ctaClicks`: mais 2 campos existiam no schema e eram LIDOS por
lógica de decisão (`recommendBridgePage()`, `/planilhas`) mas NUNCA escritos por nenhum
código (nem manual, nem automático) — `ProductResearch.avgConversionRate` (Regra 4 do
recomendador de bridge page nunca disparava, sempre caía em OTHER) e
`Keyword.clicks`/`cpcReal`/`conversions` (sempre zerados em `/planilhas`, `google-ads/sync`
só sincronizava nível de campanha). Ambos corrigidos com writer real (Hunter agora estima
`conversao_esperada_pct`; `google-ads/sync` agora também puxa métricas por keyword via GAQL
em `keyword_view`). **Regra de processo daqui pra frente:** antes de considerar pronta
qualquer feature de decisão/aprendizado automático, grep pelo campo que ela lê em
`create(`/`update(`/`upsert(`/`increment` — se não tiver writer real em lugar nenhum, a
feature está incompleta mesmo compilando sem erro (TypeScript/`prisma db push` não acusam
isso). Detalhes e checklist completo em
`hermes/knowledge/insights/2026-07-27-auditoria-campos-lidos-nunca-escritos.md`.

## Coordenação entre sessões simultâneas (leia antes de começar)

Mais de um agente/CLI trabalha neste repo às vezes na mesma janela de tempo (Claude Code,
Codex CLI, Cursor, Hermes CLI). Antes de editar arquivos de app (não docs/knowledge),
rode `git log origin/main..HEAD --oneline` e `git status --short` pra ver se há trabalho
local de outra sessão em andamento — se houver, evite os mesmos arquivos até a outra
sessão commitar, e prefira commits pequenos e frequentes (mais fácil de mesclar sem
conflito do que uma leva grande no final).

**Estado em 2026-07-26 (~00h):** as duas mudanças de schema Prisma commitadas em 2026-07-25
(`Campaign.productResearchId` e `Presell.pageType`/`popupGate`/`videoUrl`) já foram
aplicadas ao banco via `prisma db push` e `npm run build` passou limpo — item resolvido,
sem ação pendente. Comandos executados pelo Hermes.

Teste ponta-a-ponta da criação de campanha real (PAUSED) na conta Yoobe via Google Ads API
encontrou e corrigiu um bug: a API v25 passou a exigir `containsEuPoliticalAdvertising` na
criação de campanha (regra da UE, obrigatório desde set/2025, bloqueia mutate calls sem
declaração a partir de abr/2026) — `lib/google-ads.ts` não enviava o campo. Corrigido
(sempre `DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING`, produto não roda ads políticos).
Fluxo completo validado (orçamento → campanha PAUSED → geo/idioma → ad group → keyword →
RSA) e objetos de teste já removidos da conta. Detalhes:
`hermes/knowledge/insights/2026-07-26-google-ads-eu-political-ads-field.md`.

**Estado em 2026-07-26 (~01h):** novo `lib/campaign-strategy.ts` (`deriveCampaignStrategy`)
— motor determinístico que decide `channel`/`funnel`/budget do Wizard a partir do que o
pipeline de pesquisa de produto já sabe (camada de keyword dominante A–D, gate de canal do
Affiliate Page Analyst, recomendação do Compliance Sentinel), em vez de cada um desses
sinais ficar solto no dossiê. Ligado em `app/api/wizard-autofill/route.ts` (bloqueio de
canal é validado **server-side**, não só no prompt) e no Wizard (aviso se o humano escolher
canal bloqueado manualmente). Testado contra os produtos reais do banco.

**Correção em 2026-07-27:** o incidente original do FemiCore estava mal diagnosticado — o
vendor NÃO proíbe o canal Google Search inteiro, só proíbe brand bidding (usar/dar bid no
termo "FemiCore" em keywords/copy). O registro em `ProductResearch.affiliateInsights` e o
`compliance.alertas` da FemiCore foram corrigidos no banco (`googleSearchAllowed: true`,
`brandBiddingAllowed: false`, `forbiddenTerms: ["FemiCore", ...]`). `deriveBlockedChannels`
em `lib/campaign-strategy.ts` tinha um bug de nome de campo (lia `googleSearchPermitido`,
um campo que nunca era escrito — o campo real é `campaignValidation.googleSearchAllowed`),
o que bloqueava `SEARCH` por omissão pra QUALQUER produto, não só FemiCore; corrigido, e
agora existe `forbiddenAdTerms` (separado de `blockedChannels`) pra brand bidding: exige
negativa exata do termo, não bloqueia o canal. Prompts do Compliance Sentinel
(`app/api/product-research/route.ts`) e `SKILL.md` regra #1 atualizados pra nunca mais
confundir "vendor proíbe o canal inteiro" com "vendor proíbe só o termo de marca". Detalhes
e próximos passos (loop-engine, MCP, `SKILL.md` regra #12) em
`hermes/knowledge/insights/2026-07-26-strategy-engine-funil-budget.md` — se for continuar
essa frente, comece lendo esse insight antes de reimplementar algo parecido.

Divisão de trabalho que emergiu hoje (não é regra fixa, só o que aconteceu):
- **Claude Code**: Wizard (Campaign Setup Strategist / autofill, agora com o Strategy
  Engine acima), conexão real com a Google Ads API (OAuth, MCC, criação de campanha),
  blindagem de compliance genérica do Presell Builder (claims sensíveis, disclaimers
  garantidos no template).
- **Codex CLI**: variantes estruturais de presell (pogo/vsl além de advertorial), pop-up
  de retenção sem cloaking, integração Gmail read-only no MCP, correções de bugs no
  Trend Lab (trackingId, listagem de campanhas com presell, botão de regenerar), Sales Page
  Analyzer + Bridge Page Recommender (`/estrategia`), reescrita do `SKILL.md` em formato
  "8 Fluxos + 11 regras de negócio".

Ambos escrevem em `hermes/knowledge/insights/` ao concluir algo relevante — é a memória
compartilhada entre sessões que não se veem em tempo real. Ler os insights mais recentes
lá antes de assumir que uma feature não existe ainda.

## Regra de ouro

Este repositório é o **projeto afiliados**. Organize conhecimento e orquestração aqui.
**Não altere** deploy, env, Railway, Vercel, Firebase, Prisma, NextAuth nem `.mcp.json`
salvo pedido explícito do usuário. Desenvolvimento ativo dos apps não deve ser
interromido por mudanças de infraestrutura.

## O que existe neste repo

| Caminho | Função |
| --- | --- |
| `afiliads_app/nextjs_space/` | App Next.js (dashboard, wizard, RSA, auditoria) |
| `afiliado-google-ads-pro/` | Skill + referências + scripts de afiliados/Google Ads |
| `mcp-afiliads/` | MCP server (Postgres + APIs do app + Gmail de genaujunior@gmail.com só-leitura/rascunho) |
| `SKILL.md` | Skill raiz de estratégias multi-rede |
| `hermes/` | Camada de organização Hermes (registry, knowledge, ingestão) |

## Como o Hermes deve trabalhar aqui

1. Ler `hermes/REGISTRY.md` para saber escopo e projetos irmãos.
2. Carregar só o conhecimento da tarefa em `hermes/knowledge/` + skills relevantes.
3. Preferir skills/scripts determinísticos (`afiliado-google-ads-pro/scripts/`) para métricas e validação de copy.
4. Usar LLM para análise, hipóteses, síntese de insights e geração de conteúdo — não para cálculos.
5. Sessão/conversa isolada por projeto. Nunca misturar contexto de billing/landing neste chat.

## Prioridade de fontes

1. Dados reais do app/MCP/planilhas do usuário
2. Skills e referências versionadas neste repo
3. Insights destilados em `hermes/knowledge/insights/`
4. Transcrições/ebooks brutos em `hermes/knowledge/` (só sob demanda)
5. Web search para políticas/CPCs/comissões que envelhecem

## O que NÃO fazer sem pedido explícito

- Mudar `package.json`, env, secrets, schema Prisma, rotas de produção
- Refatorar o app "por organização"
- Enviar dados financeiros/PII de outros projetos para provedores externos
- Carregar o vault/knowledge inteiro no prompt

## Comandos úteis (quando o ambiente local tiver deps)

```bash
# Validar copy RSA
python afiliado-google-ads-pro/scripts/validar_copy.py

# Ingerir fonte (transcrição/ebook) para o knowledge do Hermes
python hermes/scripts/ingest_source.py --help
```

## Projetos irmãos (somente índice)

Ver `hermes/REGISTRY.md`. Landing, mkt, billing, gws e demais **não são editados daqui**
salvo workspace multi-repo explícito. Aqui só mapeamos e coordenamos.

## Ambiente de desenvolvimento (Cursor Cloud)

### O que é este repo
O app principal é o Next.js 14 em `afiliads_app/nextjs_space` ("AfiliAds — Central de Campanhas"), um gerenciador de campanhas de afiliados em PT-BR. Usa Prisma + PostgreSQL, NextAuth (credentials email/senha) e Tailwind. Ver `afiliads_app/.project_instructions.md` para o mapa de páginas/features.

As outras duas pastas de topo não são serviços de longa duração:
- `afiliado-google-ads-pro/` — bundle de skill com scripts Python + docs (sem servidor).
- `mcp-afiliads/` — MCP server stdio que fala com o banco de **produção** no Railway; não faz parte do dev local.

Todos os comandos abaixo rodam dentro de `afiliads_app/nextjs_space`, salvo indicação contrária.

### Serviços locais / como rodar
- PostgreSQL instalado localmente (v16), mas não sobe sozinho no boot. Inicie a cada sessão:
  `sudo pg_ctlcluster 16 main start`
- Servidor dev (porta 3000): `npm run dev` (definido no `package.json`; roda `rm -rf .next && next dev`).
- O banco de dev local é `afiliads` em `localhost:5432` (user/senha `postgres`/`postgres`). Connection string e secrets de auth ficam em `afiliads_app/nextjs_space/.env` (git-ignored, persistido no snapshot da VM, não commitado). Se sumir, recrie com `DATABASE_URL`, `NEXTAUTH_URL=http://localhost:3000` e qualquer `NEXTAUTH_SECRET` não vazio.

### Banco de dados
- Schema gerenciado via Prisma com `npx prisma db push` (não há migration files no repo).
- Seed com `npx prisma db seed` (autocontido, não precisa de APIs externas). Login seedado: `john@doe.com` / `johndoe123` (dados de demo completos). Existe também `demo@afiliads.dev` / `demo1234`.
- O seed passa por `scripts/safe-seed.ts`, que recusa rodar se `scripts/seed.ts` contiver `delete`/`deleteMany` (proteção contra apagar dados compartilhados de produção) — não adicione deletes lá.
- **Atenção:** o `.env` usado nas sessões de Claude Code neste Mac aponta para o banco de **produção** no Railway, não para o Postgres local acima — `npx prisma db push` ali aplica direto em produção (mudanças aditivas, sempre com confirmação do usuário antes de rodar). Confirme qual `DATABASE_URL` está ativo antes de rodar qualquer comando de schema.

### Pegadinhas não óbvias
- `npm install` falha com conflito `ERESOLVE`; sempre use `npm install --legacy-peer-deps`.
- `npm run lint` está quebrado: `eslint@9` + `eslint-config-next@15` são incompatíveis com o `next lint` do `next@14` (Invalid Options / removed keys). É um mismatch de versão pré-existente, não é problema de ambiente. Builds não são afetados porque `next.config.js` define `eslint.ignoreDuringBuilds: true`.
- Todas as integrações LLM / Google Ads / ClickBank / AnswerThePublic são opcionais (`process.env.*`). O app roda completo com dados manuais e sem chaves externas; só as features de geração via IA precisam de chaves.
- `instrumentation.ts` só inicia o loop scheduler em background quando `LOOP_SCHEDULER=on`; fica desligado por padrão.
