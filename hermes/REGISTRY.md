# Registry de projetos (controle sem tocar nos repos)

Preencha `path_local` com o caminho real na sua máquina. Status descreve só a
**organização Hermes**, não o estado de deploy do app.

| id | nome | path_local | stack (resumo) | hermes_profile | prioridade | org_status | notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| afiliados | Afiliados / AfiliAds | `/workspace` (este repo) | Next.js, Prisma, MCP, skills Ads | `profiles/afiliados.md` | alta | em_andamento | knowledge + AGENTS.md neste PR |
| landing | Landing | _preencher_ | Vercel / Next | `profiles/growth.md` | média | pendente | só indexar; não mudar config |
| mkt | Marketing | _preencher_ | conteúdo, GA4, campanhas | `profiles/growth.md` | média | pendente | compartilha perfil growth |
| billing | Billing | _preencher_ | Firebase / faturamento | `profiles/billing.md` | alta | pendente | PII: anonimizar |
| gws | GWS / Google Workspace ops | _preencher_ | scripts, admin | `profiles/ops.md` | média | pendente | |
| catalogo | Catálogo | _preencher_ | Next, Prisma, SEO | `profiles/catalogo.md` | alta | pendente | |
| yoobeme | YoobeMe | _preencher_ | produto | `profiles/produto.md` | média | pendente | |
| energiza | Energiza | _preencher_ | comercial / energia | `profiles/produto.md` | média | pendente | |
| conductor | Conductor / gifting | _preencher_ | campanhas corporativas | `profiles/produto.md` | baixa | pendente | |

## Como “organizar” um projeto irmão sem atrapalhar

Checklist mínimo (copiar padrão, zero mudança de config de deploy):

1. No repo do projeto, adicionar só `AGENTS.md` apontando o que o agente pode/não pode fazer.
2. Criar pasta `hermes/knowledge/{inbox,insights,playbooks}/` vazia.
3. Registrar `path_local` e `org_status: organizado` nesta tabela.
4. Abrir perfil Hermes / conversa dedicada com working directory naquele repo.
5. **Não** alterar `.env`, CI, Dockerfile, `vercel.json`, Firebase rules nesta etapa.

## Fontes de verdade por domínio

| Domínio | Fonte canônica | Hermes usa como |
| --- | --- | --- |
| Campanhas afiliados | App AfiliAds + planilhas xlsx | MCP + leitura pontual |
| Estratégia Ads | `SKILL.md` + `afiliado-google-ads-pro/` | skills |
| Aprendizados externos | `hermes/knowledge/` | insights destilados |
| Decisões multi-projeto | Obsidian ADR (se existir) ou notas em `insights/` | consulta sob demanda |

## Ordem sugerida de organização

1. **afiliados** (este repo) — piloto
2. **billing** — valor financeiro direto (só registry + AGENTS.md primeiro)
3. **landing + mkt** — mesmo perfil `growth`
4. **gws / ops**
5. Demais produtos quando houver capacidade
