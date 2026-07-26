# Afiliados — contexto para agentes (Hermes / Cursor / Claude Code)

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
