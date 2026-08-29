# Plano de Consolidação dos Subsídios — AfiliAds

**Data:** 2026-08-29
**Objetivo:** trazer para dentro do repositório Afiliados, com procedência e contrato verificável,
todo o corpo de subsídios hoje espalhado entre `~/afiliados` e `~/infoprod` — agentes, skills,
processos, playbooks, dados e contratos EBOOK-OS — e fazer o wizard de criação de campanhas
consumir esse corpo em vez de constantes escritas à mão.

## Decisões tomadas (2026-08-29)

| # | Decisão | Consequência |
|---|---|---|
| 1 | **`~/afiliados` vira a fonte de verdade** do corpo PROSPERA | `~/infoprod` passa a espelhar; o app lê no build |
| 2 | **Subsídios como arquivos versionados + build** | YAML/MD com procedência → Zod na CI → `lib/subsidios/generated/*.ts` |
| 3 | **`MENTORSHIP` sai da UI por ora** | Fecha a divergência UI × Prisma sem prometer trilha inexistente |

---

## 1. O que existe hoje (verificado em disco)

Quatro camadas, nenhuma com contrato entre si.

### 1.1 Corpo PROSPERA em `~/infoprod` — fora do repositório do app

| Origem | Tamanho | Conteúdo |
|---|---|---|
| `.agents/agents/` | 56 KB | 7 agentes: Analista_Mercado, Copywriter_Ebook, Designer_Visual, Estrategista_Lancamento_LowTicket, Fact_Steward, Pesquisador_Conteudo_Afiliado, Refinador_Missoes_OPERADOR |
| `.agents/skills/` | 476 KB | 27 skills (content-*, ebook-*, offers, affiliate-platform, knowledge-scout, cro-methodology, …) |
| `.agents/orchestration/` | 36 KB | 5 workflows YAML + `prospera-comercial/` (product-brief, format-decision, claim-ledger) |
| `frameworks/prospera-ebook-os/` | 548 KB | 9 schemas JSON, templates, `validate_product.py`, exemplos válidos/inválidos, 2 suítes pytest |
| `conhecimento/prospera/` | 1,4 MB | 15 playbooks, 11 referências, DNA/marca |
| `dados/` | 32 KB | **quase vazio** — ver §2.5 |
| `produtos/doce-lucro-fit/` | 36 KB | 1º produto estruturado, 6 contratos preenchidos |
| `.agents/refs/` | **78 MB** | repos externos de referência — **não migra** |

Payload real de migração: **≈ 2,5 MB** (tudo menos `refs/`).

### 1.2 App AfiliAds — `afiliads_app/nextjs_space/`

- **Wizard de 9 passos** (`app/(app)/wizard/page.tsx`) com persistência, checklists por passo e gates server-side (`lib/wizard-gates.ts`, critério B7 já aceito).
- **Passo 1** (`step-product-type.tsx`) escolhe entre AFFILIATE / PROPRIETARY_LOW_TICKET / MENTORSHIP.
- **Agentes** em `lib/agents.ts` (`AGENT_REGISTRY`: Product Hunter, SEO & Keyword Architect, Compliance Sentinel, …) com system/user prompt **inline no TypeScript**.
- **Orquestrador** `lib/agentSequence.ts` (`runAgentSequence`) existe e propaga resultado entre etapas — **mas nenhuma sequência é declarada em lugar nenhum**; hoje só `loop-engine.ts` orquestra.
- **Ad Scout / market research**: `lib/adScoutService.ts` + `app/api/search/market-scout/route.ts` + `lib/validations/market-research.ts` + model `MarketResearch`.
- **Lifecycle de experimentos Google Ads** completo (Tarefas 3–10): saga, idempotência, mutation guard default-deny, `GoogleAdsExperiment` no Prisma.

### 1.3 Subsídios do app — hoje hardcoded

| Onde | O quê |
|---|---|
| `lib/knowledge-data.ts` | `GLOSSARY` (~40 verbetes), `SYSTEM_MANUAL` |
| `lib/wizard-data.ts` | `PLATFORMS`, `VERTICALS`, `CHANNELS`, `GEOS`, `CVR_DEFAULTS`, `ANTISTRIKE_ITEMS`, `BRIDGE_CHECKLIST`, `GOOGLE_ADS_CHECKLIST`, `TRACKING_CHECKLIST_{MAXWEB,CB}`, `GOLIVE_CHECKLIST`, `KEYWORDS_BY_VERTICAL`, `NEGATIVES_BY_VERTICAL`, `BRIDGE_TEMPLATE` |
| `wizard/_components/agent-help.tsx` | `FIELD_HELP` — 24 campos com ajuda contextual |
| `app/(app)/conhecimento/page.tsx` | `KNOWLEDGE_BASE` — estratégias, Google Ads, métricas, **inline dentro do componente React** |
| `lib/agents.ts` | prompts dos agentes |

### 1.4 Conhecimento em `~/afiliados`

- `hermes/knowledge/insights/` — 18 insights datados (log append-only)
- `hermes/knowledge/playbooks/afiliados-melhoria.md`
- `docs/conhecimento-aplicado/` — 3 documentos de aplicação
- `frameworks/ebook-os/` — **cópia divergente** do `prospera-ebook-os`
- `.claude/skills/afiliads-*` — **28 skills, cópia** das 27 do infoprod

---

## 2. Divergências verificadas — a razão de o conhecimento se perder

### 2.1 `frameworks/ebook-os` × `~/infoprod/frameworks/prospera-ebook-os`
`diff -rq` acusa divergência em **praticamente todos os arquivos** (README, todos os `examples/valid` e `examples/invalid`, templates). O infoprod tem 3 relatórios a mais (`HERMES_AUDIT_REPORT.md`, `AGENT_INTEGRATION_REPORT.md`, `CURSOR_RETURN_REPORT.md`). Nenhum dos dois é declarado fonte. **Duas verdades, zero contrato.**

### 2.2 `MENTORSHIP` não persiste
`step-product-type.tsx` declara `type ProductType = 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP'`, mas:
- `prisma/schema.prisma:423` — `enum ProductType { AFFILIATE, PROPRIETARY_LOW_TICKET }`
- `lib/validations/market-research.ts:8` — `z.enum(['AFFILIATE','PROPRIETARY_LOW_TICKET'])`

Escolher "Mentoria & High-Ticket" no Passo 1 produz estado que o market-scout rejeita ou silenciosamente rebaixa para `AFFILIATE` (o Zod tem `.default('AFFILIATE')`).

### 2.3 `afiliads_app/nextjs_space/infoprod/` está vazio
Diretório criado em 2026-08-01, 0 arquivos. Placeholder de uma integração que nunca aconteceu.

### 2.4 Trilha low-ticket sem gate de evidência
A trilha `PROPRIETARY_LOW_TICKET` tem calculadora de preço, landing e geração de criativos — **e nenhum contrato EBOOK-OS no caminho**. O `Compliance Sentinel` valida claims por heurística de texto (`lib/validators/complianceValidator.ts`), sem ledger de fontes. O `claim-ledger.csv`, que existe justamente para isso, não é lido por linha nenhuma do app.

### 2.5 Correção ao inventário: `dados/` está praticamente vazio
Conteúdo real: `ORIGEM.md`, `product-brief.yaml`, `mercado/hotmart-nichos-top5.md`. As pastas `benchmark/`, `proprio/ads/`, `proprio/site/`, `proprio/vendas/` **existem vazias**. O `2026-08-10-google-ads-cpc-setores.csv` e o `2026-08-10-seguranca-pessoal-br.md` **não estão no disco**. O padrão `.origem.yaml` está documentado mas quase não tem dado para aplicar.

### 2.6 Aprendizagem é mão única
`lib/obsidianSync.ts` enfileira em `HermesOutboxEntry` → consumidor local escreve no vault Obsidian. **App → conhecimento funciona; conhecimento → app não existe.** Nada do que uma campanha aprende volta para o subsídio da próxima.

---

## 3. Arquitetura alvo

Uma fonte, um contrato, um caminho de leitura.

```
afiliados/
  subsidios/                       ← FONTE ÚNICA, versionada, com procedência
    _manifest.yaml                 ← id, tipo, origem (path+commit infoprod), data, dono, nível
    agentes/                       ← 7 PROSPERA + os do AfiliAds, um .agent.md cada
    skills/                        ← 27 skills
    workflows/                     ← 5 YAML de orquestração
    ebook-os/                      ← schemas, templates, examples, validate (reconciliado)
    playbooks/  referencias/  dna/
    dados/
      mercado/  benchmark/  proprio/    ← cada dado exige <arquivo>.origem.yaml
    catalogo/                      ← o que o app consome diretamente
      glossario.yaml
      manual-do-sistema.yaml
      checklists.yaml
      keywords-por-vertical.yaml
      negativas-por-vertical.yaml
      ajuda-de-campo.yaml
      cvr-defaults.yaml
    produtos/                      ← doce-lucro-fit e os próximos

  afiliads_app/nextjs_space/lib/subsidios/
    schema.ts                      ← Zod de catalogo/ + manifesto
    generated/                     ← saída do build, COMMITADA (build hermético em Railway)
```

**Regra estrutural:** `hermes/knowledge/insights/` continua sendo o **log datado** (append-only, nunca editado). `subsidios/` é o **corpo curado**. Um insight vira subsídio por promoção explícita em PR — nunca por cópia. Isso evita criar uma terceira verdade.

**Regra de procedência (herdada do Analista de Mercado e do Fact Steward):** número sem origem não entra. Todo arquivo em `subsidios/dados/` exige `.origem.yaml` com fonte, URL, data, método, período e limitações. A CI falha sem isso.

---

## 4. Fases

### Fase 0 — Fronteira e reconciliação *(bloqueia todo o resto)*

| # | Entrega |
|---|---|
| 0.1 | `WORKSPACE_BOUNDARIES.md` em `~/afiliados`, espelhando o do infoprod, declarando Afiliados como fonte e infoprod como espelho |
| 0.2 | Reconciliar `frameworks/ebook-os` × `prospera-ebook-os`. Método: rodar o `validate_product.py` de cada lado contra os `examples/` do outro; o lado que passa nos dois vira base. Diferenças restantes resolvidas manualmente e registradas em `referencias/Changelog_Conhecimento.md` |
| 0.3 | Reconciliar `.claude/skills/afiliads-*` (28) × `.agents/skills/` (27): identificar o extra e os divergentes |

**Aceite:** `diff -rq` limpo entre `subsidios/ebook-os` e o espelho; `pytest subsidios/ebook-os/tests` verde.

---

### Fase 1 — Migração com procedência

| # | Entrega |
|---|---|
| 1.1 | `git mv` do payload (≈2,5 MB) para `subsidios/`. **Não migrar `.agents/refs` (78 MB)** — fica no infoprod, referenciado por URL no manifesto |
| 1.2 | `subsidios/_manifest.yaml` — cada entrada com `id`, `tipo`, `origem` (path + commit SHA do infoprod), `data`, `dono`, `nivel` (PRODUTO / MARCA / AFILIADO) |
| 1.3 | Aplicar a regra `.origem.yaml` aos dados existentes; marcar as pastas vazias como vazias em vez de fingir conteúdo (§2.5) |
| 1.4 | `SOURCE.md` no infoprod apontando para cá + script de espelho read-only com verificação de hash |

**Aceite:** manifesto valida; nenhum arquivo em `dados/` sem origem; `git log --follow` preserva histórico.

---

### Fase 2 — Catálogo: constantes hardcoded viram subsídio

| # | Entrega |
|---|---|
| 2.1 | Extrair para YAML em `subsidios/catalogo/`, **sem alterar conteúdo**, tudo que está listado em §1.3 |
| 2.2 | `lib/subsidios/schema.ts` (Zod) + `scripts/build-subsidios.ts` → `lib/subsidios/generated/*.ts` |
| 2.3 | Refatorar `knowledge-data.ts`, `wizard-data.ts`, `agent-help.tsx`, `conhecimento/page.tsx` e `agents.ts` para importar do gerado |
| 2.4 | `npm run subsidios:validate` (Zod) e `npm run subsidios:check` (regenera e falha se houver diff) na CI |

**Guarda obrigatória:** teste de snapshot antes/depois em cada um dos 5 arquivos. O refactor tem de ser byte-idêntico na saída — se mudar conteúdo, mudou por engano.

**Aceite:** 575 testes atuais continuam verdes + snapshots novos; `KNOWLEDGE_BASE` não existe mais dentro de TSX.

**Por que essa fase importa:** hoje adicionar um verbete ao glossário exige editar um componente React, e nada de `hermes/knowledge/` ou dos 15 playbooks PROSPERA tem qualquer caminho até o app. É exatamente aqui que a informação se perde.

---

### Fase 3 — Fechar as divergências de contrato *(independente, curta, fazer já)*

| # | Entrega |
|---|---|
| 3.1 | Remover `MENTORSHIP` do card e da union em `step-product-type.tsx` (ou deixar `disabled` com selo "em breve") |
| 3.2 | Remover `afiliads_app/nextjs_space/infoprod/` (vazio) |
| 3.3 | Auditar demais pares UI × Prisma/Zod: `PLATFORMS_EXTENDED` × o que as rotas aceitam; `CHANNELS` × enum do Google Ads |

**Aceite:** `tsc --noEmit` limpo; nenhum valor oferecido na UI fora do enum persistível.

---

### Fase 4 — EBOOK-OS dentro do wizard *(a fase que muda o produto)*

| # | Entrega |
|---|---|
| 4.1 | Prisma: `ProductBrief`, `FormatDecision`, `ClaimLedgerEntry`, `EditorialMatrixRow`, `KnowledgeDossier`, ligados a `ProductResearch` e `Campaign`. Migration **escrita à mão e não aplicada** — mesmo padrão das Tarefas 3 e 10 |
| 4.2 | Portar `validate_product.py` → `lib/subsidios/ebook-os/validate.ts`, usando `examples/valid` e `examples/invalid` **do framework** como fixtures |
| 4.3 | Novo passo do wizard, só para `PROPRIETARY_LOW_TICKET`: **Brief & Evidência** (product-brief + format-decision + claim-ledger) |
| 4.4 | Gate server-side em `lib/wizard-gates.ts` (mesma mecânica do B7 já aceito): campanha low-ticket não avança para criativos/lançamento com claim `PENDENTE` no ledger |
| 4.5 | `Fact_Steward_PROSPERA` entra no `AGENT_REGISTRY` como quem popula e audita o ledger |

**Os 8 casos inválidos do framework viram 8 testes que devem falhar:** claim sem verificação, fonte sem limite, capítulo incompleto, formato incompatível com e-book, RACI incompleto, afiliado sem hop, dossiê sem âncora, Lottie dentro de PDF.

Isso ataca de frente o risco já registrado neste projeto de *mock inventado com a mesma premissa do código*: as fixtures vêm do framework, não foram escritas junto com o validador.

O `03-funil-lowticket.yaml` já declara a regra que o gate implementa — `unverified_claims: PENDENTE`, `publication: human_gate`.

**Aceite:** os 8 exemplos inválidos bloqueiam; `doce-lucro-fit` passa de ponta a ponta como fixture real.

---

### Fase 5 — Agentes e workflows declarativos

| # | Entrega |
|---|---|
| 5.1 | `AGENT_REGISTRY` deixa de ter prompt inline; passa a referenciar `subsidios/agentes/<id>.agent.md` (front-matter: role, nível, skills, gates; corpo: system prompt) |
| 5.2 | Os 5 workflows YAML viram `AgentSequenceStepDef[]` consumidos por `runAgentSequence` — hoje o orquestrador existe sem nenhuma sequência declarada |
| 5.3 | Entram no app os agentes PROSPERA ausentes: Analista de Mercado (hoje só parcialmente coberto pelo Ad Scout), Copywriter Ebook, Designer Visual, Estrategista de Lançamento, Pesquisador de Conteúdo Afiliado |
| 5.4 | Roteamento por agente respeita os tiers já em `lib/llm.ts` (premium / standard / light) |

**Aceite:** trocar o prompt de um agente = editar um `.agent.md`, sem tocar em TypeScript.

---

### Fase 6 — Loop de aprendizagem *(fecha o ciclo)*

| # | Entrega |
|---|---|
| 6.1 | Resultado real (teste kill/scale, CPC e CVR observados, decisão de campanha) vira arquivo em `subsidios/dados/proprio/` com `.origem.yaml` — populando as pastas hoje vazias |
| 6.2 | `experiment-card.yaml` do EBOOK-OS ↔ `GoogleAdsExperiment` (lifecycle já implementado): um experimento de e-book usa o mesmo motor de experimentos do Google Ads |
| 6.3 | `CVR_DEFAULTS` e `KEYWORDS_BY_VERTICAL` ganham camada observada ao lado da camada estimada, com origem visível |

**Aceite:** uma campanha encerrada gera um dado próprio; a campanha seguinte na mesma vertical lê esse dado.

---

### Fase 7 — Superfície: `/conhecimento` vira a vitrine

| # | Entrega |
|---|---|
| 7.1 | A página lista playbooks, agentes, dados e claims **com procedência visível** (fonte, data, limitação) |
| 7.2 | A ajuda de campo do wizard cita a fonte do número que exibe |

**Aceite:** nenhum número na UI sem origem clicável — a regra do Analista de Mercado aplicada à interface.

---

## 5. Ordem e dependências

```
0 ──> 1 ──> 2 ──> 4 ──> 5 ──> 6 ──> 7
      3 (independente, curta — fazer em paralelo já na Fase 0/1)
```

## 6. O que fica de fora

- `.agents/refs/` (78 MB de repos externos) — referenciado por URL, não copiado
- `operador-course` / OPERADOR — curso, não e-book; escopo diferente
- `prospera-plataforma`, `prospera-public*`, `prospera-intranet-dashboard` — apps próprios do infoprod
- Áudios de WhatsApp, PDFs soltos e ZIPs na raiz do infoprod

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração perde histórico | `git mv` no infoprod; commit SHA de origem registrado no manifesto |
| Espelho do infoprod fica velho | Script de espelho grava hash; CI do infoprod falha se divergir |
| Fase 2 alterar conteúdo sem querer | Snapshot antes/depois é obrigatório, não opcional |
| Fase 4 encostar em rota de mutação | Migration escrita e **não aplicada**; mutation guard plugado na primeira versão da função, nunca depois — regra já estabelecida neste repo |
| Validador e teste compartilharem a mesma premissa | Fixtures vêm dos `examples/` do framework, não são escritas junto com o validador |
