# Afiliados — contexto para agentes (Hermes / Cursor)

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
| `mcp-afiliads/` | MCP server (Postgres + APIs do app) |
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
- Refatorar o app “por organização”
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
