# Hermes Agent Task Board

This board tracks high-level tasks and coordination points between various agents (Hermes, Claude Code, Codex, etc.) working on the Afiliads project.

## Current Focus (As of 2026-08-02)

- **Challenge: Complexidade da Orquestração de Agentes**
    - **Status:** In Progress
    - **Assigned:** Hermes Agent
    - **Goal:** Improve agent coordination, formalize handoffs, minimize conflicts.
    - **Incident:** A tarefa `20260801_085211_b9504a` substituiu `lib/llm.ts` por um protótipo conceitual enquanto `20260802_151042_9b104d` mantinha a integração estável. O arquivo foi reconciliado e validado novamente.
    - **Ownership atual:** `afiliads_app/nextjs_space/lib/llm.ts` pertence à tarefa `20260802_151042_9b104d` até handoff explícito. Outras tarefas devem tratá-lo como somente leitura.

### Estratégia de Orquestração de LLMs e Kimi Code

- **Status:** Implementação offline concluída; smoke real adiado
- **Assigned:** Hermes Agent
- **Goal:** Integrar Kimi Code para roteamento inteligente de modelos, otimizando custo, latência e qualidade, com robustos mecanismos de fallback.
- **Provedores Chave:** Anthropic, OpenAI, Google (Gemini), Grok (xAI), Ollama, Kimi.
- **Tiering:** Premium, Standard, Light, com roteamento específico por agente.
- **Fallback:** Provedores alternativos tentados em cadeia em caso de falha.
- **Validação atual:** TypeScript sem erros, 401/401 testes e build Next.js completo com 29/29 páginas.
- **Pendente:** smoke real de baixo custo com a API Kimi, somente após autorização explícita de cobrança.

## Tasks in Progress

### [TASK-10] Rotas e gates de mutação (2026-08-25)

- **Status:** Concluída
- **Escopo:** B2 (confirmação explícita por operação/revisão, ownership, mutation guard e idempotência) e B6 (PATCH com schema/allowlist e transições de status).
- **Rotas aceitas:** campanhas, Google Ads create/sync e Experiments setup/detail/schedule/actions/sync.
- **Validação:** 522 testes, TypeScript e build aprovados; desenvolvimento e testes sem chamadas reais ao Google Ads ou mutações reais no banco.
- **Próximo foco:** PAGES-1, seguido de PAGES-3.

### [TASK-12/13/14] Critérios B1, B4 e B7 (2026-08-25)

- **Status:** Concluídas
- **B1:** Passo 5 reconcilia keywords selecionadas e desmarcadas sem deixar seleção stale no banco.
- **B4:** estado de lançamento diferencia configuração, campanha remota PAUSED, PAUSED local e ACTIVE confirmado.
- **B7:** gates server-side, com ownership e revalidação dos checklists, controlam o avanço dos Passos 7/8.
- **Validação:** 533 testes, TypeScript e build aprovados; sem chamadas reais ao Google Ads ou mutações reais no banco.

### [TASK-15] Motor de Geração de Criativos & Compliance Sentinel (2026-08-29)

- **Status:** Concluído (Fase 3 completa)
- **Assigned:** Codex (Backend) + Claude (UI) + Hermes (Orquestração)
- **Goal:** Implementar o motor de inteligência artificial de criativos, prompt engineering cruzando dados de dores/Autocomplete e o validador heurístico rígido de conformidade (Compliance Sentinel).
- **Entregas:**
    - `lib/validators/complianceValidator.ts` (Score de 0-100%, classificação de claims em LOW/MEDIUM/HIGH, auto-fix instantâneo).
    - `app/api/creatives/generate/route.ts` (API resiliente com loop de auto-regeneração de conformidade).
    - `app/(app)/wizard/_components/step-creative-gen.tsx` (Componente de UI Originkit, Grid de Ângulos, Facebook Feed Mockup e Google Search Ads Mockup em tempo real).
- **Validação:** Adicionados testes unitários e de integração de rotas; **575/575 testes passando** com 100% de sucesso; TypeScript compilando limpo (exit 0) sem erros.

### [CHALLENGE-1.1] Formalizar Handoffs de Tarefas

- **Status:** In Progress (protocolo mínimo ativo)
- **Description:** Establish a clearer protocol for task delegation and acceptance among agents.
- **Protocolo mínimo:**
    - Antes de editar, registrar tarefa, arquivos sob ownership e estado esperado.
    - Uma tarefa não proprietária pode entregar achado, teste ou patch sugerido fora da árvore, mas não pode aplicá-lo ao arquivo sob ownership até um handoff explícito ser registrado.
    - Handoff exige diff revisável, testes executados, blockers e lista explícita de arquivos modificados.
    - Arquivos críticos (`lib/llm.ts`, schemas, auth, Prisma e rotas de mutação) nunca são substituídos integralmente por conteúdo de chat.
- **Next Steps:** automatizar a checagem de ownership antes de tarefas concorrentes editarem o mesmo arquivo.

### [CHALLENGE-1.2] Rastreamento Centralizado de Estado

- **Status:** In Progress (board reconciliado manualmente)
- **Description:** Implement a central board to track tasks, progress, and blockers.
- **Current Action:** `TASK_BOARD.md` é o índice humano de coordenação; evidência de execução continua sendo Git + testes + build.
- **Next Steps:**
    - Define structure for task entries (ID, Agent, Status, Description, Next Steps).
    - Integrate updates from agents (potentially automated).

---

## Completed Tasks (From `feature/address-challenges` branch)

### [CHALLENGE-3] Gerenciamento de Dependências (2026-08-01)

- **Problem:** `ERESOLVE` conflicts with `npm install` due to `eslint@9`, `eslint-config-next@15`, and `next@14` incompatibility. `npm run lint` is broken.
- **Solution:** Accepted temporary workaround (`npm install --legacy-peer-deps`). A permanent fix requires Next.js version upgrade or linting setup refactoring.
- **Status:** Completed (with known limitation)
- **Agent:** Hermes Agent

### [CHALLENGE-4] Sincronização de Schema Prisma (2026-08-01)

- **Problem:** Risk of `prisma db push` to production, and `next dev` server stale state after `db push`.
- **Solution:** Implemented `npm run prisma:sync` script.
    - Confirms `DATABASE_URL` before push.
    - Gracefully shuts down and restarts `next dev`.
- **Documentation:** Created `prisma-sync-workflow` skill.
- **Status:** Completed
- **Agent:** Hermes Agent

---

## Open Issues / Blockers

- **Smoke Kimi real:** adiado por decisão do usuário; exige autorização explícita por consumir API paga.
- **Workspace concorrente:** existem modificações e arquivos não rastreados de outras tarefas. Classificar antes de qualquer commit; não apagar em massa.

### Backlog — Aplicação: Páginas para Afiliados (Thiago Laprovitera, 2026-08-19)

Fonte: `docs/conhecimento-aplicado/2026-08-19-paginas-para-afiliados-thiago-laprovitera.md`

### [PAGES-1] ⭐ Próximo prioritário — Seletor de tipo de página no wizard (Passo 4 — Pré-sell)
- **Status:** Concluído (Frente de UI do Claude modularizou o Wizard, extraiu os componentes para `_components/step-landing-page.tsx` e `step-product-type.tsx`, integrando de forma nativa layouts de design Originkit baseados em enums do Prisma)
- **Assigned:** Hermes Agent
- **Goal:** Permitir que o usuário escolha entre VSL, TSL, Cookie/Popup e Review/Robusta no momento de construir a pré-sell.
- **Impacto:** Alinha o wizard com a classificação do mercado internacional ensinada na fonte.
- **Dependências:** Nenhuma (campo `pageType` já existe; precisa expandir enum e UI).
- **Notas:** Ver wireframe em `docs/conhecimento-aplicado/wireframe-seletor-tipo-pagina.md`.

### [PAGES-2] Validador de link de afiliado (HopLink) no wizard
- **Status:** Concluído (validador criado em `lib/affiliate-link-validator.ts`, integrado ao campo `offerUrl` no wizard e no endpoint `/api/presells`)
- **Assigned:** Hermes Agent
- **Goal:** Detectar se o usuário colou o link da página final do produtor em vez do HopLink/Smartlink de afiliado.
- **Impacto:** Evita perda de comissão por erro comum destacado na fonte.
- **Dependências:** Nenhuma.
- **Notas:** Regra por plataforma (ClickBank, BuyGoods, MaxWeb, etc.) + verificação heurística de domínio hop.

### [PAGES-3] Templates de Cookie/Popup e Review no builder de pré-sell
- **Status:** Concluído (Seletor integrado de template de pré-sell e editor de landing pages no Passo 5, com suporte nativo aos novos fluxos condicionais de produtos `AFFILIATE`, `PROPRIETARY_LOW_TICKET` e `MENTORSHIP` de forma modular)
- **Assigned:** Hermes Agent
- **Goal:** Oferecer templates prontos além do advertorial/pogo/vsl/authority/interstitial já existentes.
- **Impacto:** Acelera criação das páginas mais usadas por afiliados no mercado internacional.
- **Dependências:** [PAGES-1].
- **Notas:** Template Cookie/Popup é simples e leve; Review reutiliza template authority; TSL reutiliza advertorial.

### [PAGES-4] Alerta contra "Maximizar conversões" na estratégia de lance
- **Status:** Proposto
- **Assigned:** a definir
- **Goal:** Quando o usuário selecionar "Maximizar conversões" como bid strategy, explicar o risco e sugerir CPA desejado/manual CPC.
- **Impacto:** Previne queima de budget por estratégia avançada usada indevidamente.
- **Dependências:** Nenhuma.
- **Notas:** Alinhar com o FIELD_HELP já existente no wizard.

### [PAGES-5] Checklist semanal de revisão de link de afiliado
- **Status:** Proposto
- **Assigned:** a definir
- **Goal:** Adicionar lembrete/verificação no dashboard ou página de campanhas para revisar o HopLink semanalmente.
- **Impacto:** Reduz perda de receita por link errado ou desatualizado.
- **Dependências:** Nenhuma.
- **Notas:** Pode nascer como indicador visual na listagem de campanhas.
- **`lib/logger.ts` órfão:** protótipo não rastreado, sem consumidores, criado pela tarefa `20260801_085211_b9504a`; não deve entrar em commit sem redesign e auditoria de sanitização.
- **Lint:** incompatibilidade conhecida entre Next.js 14 e `eslint-config-next` 15; não bloqueia TypeScript, testes ou build.
- **Prisma:** warning conhecido sobre `generator.output`; não atualizar para Prisma 7 nem alterar schema/ambiente nesta frente.
- **Seed legado:** `scripts/seed.ts` ainda contém credencial demo fixa. Não executar fora de banco local descartável; parametrização e geração aleatória ficam para hardening separado.

## Workspace Classification (2026-08-02)

- **Kimi/reporting — revisar em blocos atômicos:** `lib/llm.ts`, testes/preços de LLM e correção dos placeholders de `experiment-reporting`.
- **Bridge pages — frente independente, ainda não aceita:** alterações em `validar_copy.py`, referências/insights e HTMLs de demonstração. O relatório dessa frente declara orquestração simulada e E2E pendente.
- **Protótipos órfãos — não incluir em commit:** `lib/logger.ts`, acréscimos sem consumidores em `lib/utils.ts`, `test-debug.js` e scripts avulsos de status/Telegram.
- **Downloads gerados — não incluir em commit:** `google_ads_api_campaign_doc.html` e `google_ads_api_experiment_doc.html` (aproximadamente 10 MB combinados).
- **Credencial local:** `hermes_skillclaw_config.yaml` contém configuração sensível e foi adicionado ao `.gitignore`; nunca exibir ou versionar seu valor.
- **Artefato de build:** `tsconfig.tsbuildinfo` permanece removido no workspace e não deve ser confundido com código-fonte.
