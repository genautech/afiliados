# Retomar o projeto — estado em 2026-08-10

Cole este arquivo no chat quando voltar a trabalhar no AfiliAds.

## Atualização mais recente — Gama Fund

Foi criado o pacote completo de candidatura e captação do AfiliAds em `docs/gama-fund-2026/`: pesquisa do programa/formulário, análise de mercado, respostas, tese de investimento, defesa do CEO, pitch com roteiro, estratégia Google Cloud, landing e modelo financeiro de 12 meses.

Decisões confirmadas:

- AfiliAds será uma **newco independente**;
- Genau dedicará **50 horas por semana**, com transição imediata;
- rodada inicial: **R$ 2 milhões**;
- runway mínimo: **12 meses**;
- cenário-base de trabalho: 245 clientes e R$ 244 mil de MRR no mês 12, como meta condicionada — não promessa;
- pricing de validação: R$ 297 Starter, R$ 997 Pro, R$ 2.997 Agency e R$ 39 de overage.

Handoff canônico: `hermes/knowledge/insights/2026-08-10-gama-fund-afiliads-captacao.md`.

Próxima ação: cinco pilotos e dez campanhas completas instrumentadas antes de recalibrar o modelo, gerar o Slides final e submeter o Airtable. Nada foi submetido ou deployado.

## Estado atual

- Diretório do projeto: `~/afiliados` — **única** pasta do projeto. As pastas `afiliados-*` que existiam no home eram git worktrees, não cópias; foram removidas.
- Branch em que o diretório está: `feature/kimi-code-integration`, com **104 arquivos modificados não commitados**. Não troquei de branch ali — seu trabalho está intacto.
- `~/worktrees/` existe e está vazia. É onde worktrees novas devem morar.
- `node_modules` foi reinstalado em `afiliads_app/nextjs_space` durante a preparação da landing. Ainda assim, confira `git status` antes de rodar qualquer instalação, pois há trabalho paralelo não commitado.

## O que foi feito hoje

1. **Merge do `feat/task-11-sync-id-fix` em `main`** (commit de merge `3795e09`), feito numa worktree temporária para não tocar no diretório principal. Sem conflitos. O branch foi apagado depois de confirmado dentro de `main`.
   O fix: `loop-engine.ts` passa a usar `campaign.googleCampaignId` (ID estável do Prisma) em vez de `googleCampaignName`, nos **dois** blocos de sync (linhas ~158 e ~185), com fallback para buscar na API do Google Ads e persistir o ID. Inclui o ajuste no `app/api/google-ads/sync/route.ts` e o teste `route-sync-id.test.ts`.

2. **`feat/campaign-guard-llm` NÃO foi mergeado — de propósito.** A pasta da worktree foi removida, **o branch continua existindo**. Motivo: mergear seria regressão. O diff `main → branch` é `+34 / −173`. O que `main` já tem e o branch desfaria:
   - `campaign-guard.ts` de 119 linhas (`assertCampaignLlmAllowed`, `CampaignGuardError`, tipos, injeção de dependências) viraria um `checkCampaignAccess` de 18 linhas;
   - o guard deixaria de valer para chamadas sem `campaignId` (hoje cobre inclusive `kind: 'non-campaign'`);
   - a cadeia de fallback de modelo Anthropic sumiria;
   - `AGENT_MODEL_LOCKS` (`{provider, model}` tipado) viraria `AGENT_MODELS` (string solta).

   O commit de sync desse branch (`088604b`) era uma versão pior do mesmo fix do task-11: corrigia só 1 dos 2 blocos e deixava o `prisma.update` sem `catch`, então uma falha de escrita derrubava a ação inteira.

## Pendências

### 1. `main` tem 2 commits locais não enviados
```
git -C ~/afiliados log --oneline origin/main..main
git -C ~/afiliados push origin main
```

### 2. Decidir o destino do `feat/campaign-guard-llm`
Está 2 commits à frente de `main`, mas ambos obsoletos (análise acima). Quando tiver certeza:
```
git -C ~/afiliados branch -D feat/campaign-guard-llm
git -C ~/afiliados branch -D feat/campaign-guard-llm-clean   # idem, 2 commits, mesma origem
```
`-D` maiúsculo porque não estão mergeados. Depois disso só o reflog guarda (~90 dias).

### 3. Branches com 1 commit ainda fora de `main`
Cada um tem trabalho real não integrado:

| Branch | commits fora de main |
|---|---|
| `feat/task-12-wizard-refactor` | 1 |
| `feat/task-13-wizard-experiment-ui` | 1 |
| `feat/task-14-experiment-dashboard` | 1 |
| `feat/task-15-experiment-sync-worker` | 1 |
| `feat/task-16-rollout-checklist` | 1 |
| `feature/address-challenges` | 1 |

Antes de mergear qualquer um, rode a simulação — ela não altera nada:
```
git -C ~/afiliados merge-tree --write-tree --name-only main <branch>; echo "exit=$?"
```
`exit=0` significa merge limpo.

### 4. Branches que já podem sumir (0 commits fora de `main`)
```
feat/campaign-guard-enforcement
feat/task-11-sync-remediation
fix/10b-claude-recovery
integrate/guard-tasks-11-16
```
Apagáveis com `git branch -d` (minúsculo — o git recusa se sobrar algo não mergeado).
Os três `backup/*` (`10b-antigravity-772cadb`, `pre-10c-44db7ea`, `pre-lote-d-de56b6a`) deixei intocados, é você quem sabe se ainda servem.

## Convenção de worktrees

Worktree nova nasce fora do home:
```
git -C ~/afiliados worktree add ~/worktrees/<nome> -b <branch>
```
Ao terminar: `git -C ~/afiliados worktree remove ~/worktrees/<nome>`.
Ver o que existe: `git -C ~/afiliados worktree list`.

Nunca apague a pasta de uma worktree com `rm -rf` — o git fica com ponteiro órfão. Use `worktree remove`, ou `git worktree prune` se já apagou.
