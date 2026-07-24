# Princípios — organizar sem atrapalhar o desenvolvimento

## 1. Separação rígida

| Camada | Pode mudar agora | Não mexer sem pedido |
| --- | --- | --- |
| `hermes/` knowledge, profiles, registry | Sim | — |
| `AGENTS.md` / skills markdown | Sim (conteúdo) | — |
| App Next.js, Prisma, auth, APIs | Não | Deploy, schema, rotas |
| `.mcp.json`, secrets, `.env*` | Não | Credenciais e tokens |
| landing / mkt / billing / gws | Só índice no registry | Código e configs deles |

## 2. Isolamento de contexto

- Conversa Hermes do **afiliados** só carrega afiliados + insights de afiliados.
- Billing, GWS, landing e marketing têm memória/perfil separados.
- Nunca “ajude no billing” dentro da sessão de afiliados com o vault inteiro aberto.

## 3. Ingestão em duas camadas

1. **Bruto** (`youtube/`, `ebooks/`, `inbox/`) — arquivo completo, indexado, quase nunca no prompt.
2. **Destilado** (`insights/`, `playbooks/`) — 1–2 páginas, bullets acionáveis, isso sim entra no contexto.

Regra: se o arquivo tem > ~3k tokens, o agente lê sob demanda e escreve um insight curto.

## 4. Não competir com o desenvolvimento ativo

- PRs de organização Hermes **não** misturam refactor de UI/API.
- Se um app está em feature branch ativa, só documente no registry; não abra mudanças lá.
- Preferir arquivos novos em `hermes/` a editar código de produção.

## 5. Custo e qualidade

- Classificar/resumir fontes → modelo barato (Flash / equivalente).
- Estratégia de campanha, copy, auditoria → Kimi (ou modelo médio já em uso).
- Incidente de produção / segurança → premium sob demanda.
- Cachear destilações: a mesma transcrição não se reprocessa toda semana.

## 6. Dados sensíveis

- Afiliados: cuidado com hop links, contas Ads, postbacks.
- Billing/GWS: anonimizar antes de qualquer provedor externo.
- Nunca colar `.env` ou tokens em notas de knowledge.
