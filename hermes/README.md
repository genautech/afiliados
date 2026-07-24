# Hermes no projeto Afiliados

Camada de organização e conhecimento para o Hermes Agent — **sem alterar configs dos apps**.

## Vale a pena usar?

**Sim, com escopo certo.** Para afiliados (e depois para landing/mkt/billing/gws), o Hermes
vale a pena se for a **central de coordenação + memória + ingestão de conhecimento**, não um
segundo orquestrador de deploy nem um substituto do app.

| Usar Hermes para | Não usar Hermes para |
| --- | --- |
| Sintetizar YouTube/ebooks em playbooks | Recalcular EPC/CPC (use scripts/planilha) |
| Cron de relatório semanal de campanhas | Hospedar o Next.js / trocar Railway |
| Skills reutilizáveis (RSA, kill/scale, compliance) | Duplicar o `llm-orchestrator` |
| Memória por perfil (afiliados ≠ billing) | Mandar vault inteiro no prompt |
| Coordenar MCP `afiliads` + filesystem | Mudar secrets/env sem pedido |

O app (`afiliads_app`) continua dono do produto. O Hermes fica **ao lado**: lê skills,
knowledge e MCP; sugere melhorias; gera artefatos; não reescreve a infra.

## Arquitetura recomendada (fase 1)

```text
Obsidian / hermes/knowledge   →  fatos e playbooks
              ↓
         Hermes Agent         →  memória, skills, cron, MCP
              ↓
     modelo barato → Kimi → premium (só exceção)
              ↓
   afiliados | landing | mkt | billing | gws   (apps intocados)
```

Nesta fase **não muda** Vercel/Railway/Firebase/GCP dos projetos. Só organizamos
contexto e knowledge.

## Estrutura

```text
hermes/
├── README.md                 ← este arquivo
├── REGISTRY.md               ← mapa de todos os projetos (sem editar os repos)
├── PRINCIPIOS.md             ← regras para não atrapalhar o desenvolvimento
├── profiles/                 ← perfis lógicos Hermes por área
├── knowledge/                ← YouTube, ebooks, insights destilados
├── skills/                   ← ponte para skills já existentes no repo
├── cron/                     ← rotinas sugeridas (ainda manuais / futuras)
└── scripts/                  ← ingestão de fontes → notas estruturadas
```

## Como usar da melhor forma

1. **Um perfil / uma conversa por projeto** — evita misturar tokens de billing com afiliados.
2. **Knowledge bruto ≠ contexto do modelo** — transcrições e ebooks entram em `knowledge/`,
   depois um passo de destilação gera `insights/` curtos (o que o agente carrega).
3. **Skills > prompts longos** — reutilize `SKILL.md` e `afiliado-google-ads-pro/`.
4. **Código para números, LLM para julgamento** — break-even, validação de copy e scoring
   ficam em scripts; Hermes interpreta e recomenda.
5. **max_turns baixo** (30–50) em tarefas normais; premium só para bugs/arquitetura crítica.
6. **Cron só depois** do registry e da ingestão estáveis — primeiro organizar, depois automatizar.

## Próximos passos seguros

1. Preencher `REGISTRY.md` com paths reais da sua máquina.
2. Dropar 1–3 transcrições/ebooks em `knowledge/inbox/` e rodar o ingest.
3. Pedir ao Hermes: “destile as fontes da inbox em insights acionáveis para afiliados”.
4. Só então copiar o padrão `AGENTS.md` + `hermes/` para landing/mkt/billing/gws
   **sem tocar nas configs de cada um**.
