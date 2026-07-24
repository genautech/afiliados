# Cron — sugerido, desligado por padrão

Só ative no Hermes **depois** do registry preenchido e da primeira destilação de knowledge.
Não configure cron que escreva em produção dos apps.

## Filas recomendadas (afiliados)

| Frequência | Job | Entrega |
| --- | --- | --- |
| Diário | Resumo kill/scale a partir de métricas/MCP | Telegram/Slack |
| Semanal | Destilar inbox + atualizar insights | Nota em `knowledge/insights/` |
| Semanal | Relatório de aprendizados vs campanhas | Doc curto |

## Filas futuras (outros projetos)

| Projeto | Job | Nota |
| --- | --- | --- |
| mkt/landing | GA4 + hipóteses | só leitura de exports |
| billing | Auditoria pré-envio | dados anonimizados |
| gws | Checklist ops | sem mudar IAM |

## Ativação

Quando for ligar no Hermes, use conversa/perfil do projeto e limite `max_turns`.
Documente o cron no perfil correspondente em `hermes/profiles/`.
