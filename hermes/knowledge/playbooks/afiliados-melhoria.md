---
id: afiliados-melhoria
project: afiliados
updated: 2026-07-24
---

# Playbook — melhorar afiliados com knowledge externo

## Objetivo

Transformar vídeos/ebooks em testes mensuráveis sem poluir o contexto do agente
nem alterar o app.

## Passos

1. **Coletar** — colocar fonte em `knowledge/inbox/`.
2. **Normalizar** — `python hermes/scripts/ingest_source.py ...`.
3. **Destilar** — Hermes gera insight em `knowledge/insights/` com:
   - 3 hipóteses de teste
   - ângulos de RSA/presell
   - alertas de compliance Google/rede
   - o que *não* se aplica ao seu geo/vertical
4. **Cruzar com dados** — MCP `listar_produtos` / campanhas / planilha diária.
5. **Uma mudança por vez** — aplicar 1 hipótese por campanha (regra do skill).
6. **Registrar** — resultado em Testes_KillScale ou no app; atualizar o insight com “validado/invalidado”.

## Anti-padrões

- Colar a transcrição inteira em toda conversa
- Mudar keywords + bridge + lance no mesmo dia
- Tratar conselho de YouTube como verdade sem sample size
- Misturar aprendizado de nutra US com lançamento BR sem adaptação
