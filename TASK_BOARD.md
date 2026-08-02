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
