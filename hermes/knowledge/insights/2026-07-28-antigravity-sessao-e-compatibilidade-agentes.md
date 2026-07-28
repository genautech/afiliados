---
id: insight-20260728-antigravity-sessao-e-compatibilidade-agentes
title: "Sessão Anti-Gravity & Protocolo de Compatibilidade Multi-Agente (Cloud + Local)"
source_type: outro
source_path: "AGENTS.md"
source_url: ""
projects: [afiliados]
tags: [antigravity, hermes, multi-agente, obsidian, airmines, compatibilidade]
created: 2026-07-28
status: active
---

# Insight — Sessão Anti-Gravity & Protocolo de Compatibilidade Multi-Agente

## Mudança operacional (1 frase)
Estabelecido o isolamento e protocolo de sincronização para execuções simultâneas entre Anti-Gravity (local/pareamento) e agentes em cloud (Claude Code, Hermes, Codex CLI) garantindo zero colisão de código e sincronia via Obsidian.

## Estado Atual do Codebase & Agentes Cloud (~28-07-2026)

1. **Presell FemiCore publicado ao vivo**: `https://orangepeelmorning.com/femicore-advertorial-advertorial-3/` via REST API do WordPress (`orangepeelmorning.com` tem WordPress real).
2. **Suporte FTP/Static**: Implementado `publishToFtp()` (`lib/presell.ts`, `basic-ftp`) para domínios estáticos sem WP via endpoint `/api/presells/[id]/promote?destino=ftp`.
3. **Wizard 9 Passos (Orquestração Completa)**:
   - **Fase 1**: Wizard destravado, Google Ads API adaptada para regra UE (`containsEuPoliticalAdvertising`).
   - **Fase 2**: Correção de persistência no Prisma (conversão de `productResearchId` para relação e colunas `pageType`, `popupGate`, `videoUrl` em `Campaign`).
   - **Fase 3**: Modelo `ChecklistLearning` + endpoint `app/api/campaigns/[id]/checklists/fix/route.ts` ("Corrigir com agente").
4. **Strategy Engine**: `lib/campaign-strategy.ts` (`deriveCampaignStrategy`) que deriva `channel`/`funnel`/`budget` automaticamente a partir dos dados do dossiê.
5. **Auditoria de Escrita**: Métricas por keyword em `google-ads/sync` e estimativa de conversão no Hunter corrigidas.

## Integrações Mantidas & Sincronia

- **Obsidian Sync**: `lib/obsidianSync.ts` grava registros em `~/Vaults/notes/Conhecimento/Execucoes/afiliados/` (frontmatter YAML + tags).
- **Hermes / Airmines Ops**: `hermes/REGISTRY.md` e `hermes/knowledge/insights/` servem como central de conhecimentos compartilhados entre sessões que não se enxergam em tempo real.

## Regras de Ouro de Compatibilidade para Anti-Gravity

1. **Checagem Pré-Commit**: Antes de editar qualquer arquivo fora de docs/knowledge, rodar `git status --short` e `git log origin/main..HEAD --oneline` para checar alterações concomitantes dos agentes cloud.
2. **Commit por Funcionalidade**: Fazer commits pequenos e atômicos.
3. **Banco de Dados Local vs Produção**: Nunca rodar `npx prisma db push` sem checar se `.env` aponta para local ou Railway (Produção).
4. **Re-starter Dev Server**: Após `prisma db push`, reiniciar `npm run dev` se estiver ativo.
5. **Log de Aprendizado no Obsidian**: Ao concluir refatorações ou novos módulos, invocar `logLearningToObsidian()` ou salvar a nota em `~/Vaults/notes/Conhecimento/Execucoes/afiliados/`.

## Próxima ação (uma só)

- Iniciar desenvolvimentos paralelos via Anti-Gravity mantendo registro no Obsidian e respeitando o isolamento do projeto Afiliados.
