# Opinião: Hermes + knowledge (YouTube/ebooks) nos projetos

## Veredito

**Vale a pena** — como camada de coordenação e aprendizado, não como nova infra
de deploy. No afiliados o encaixe é especialmente bom porque vocês já têm skills,
MCP e app; falta um lugar estável para **memória operacional + insights externos**.

## O que os insights anteriores acertaram

- Obsidian/Hermes/knowledge separados dos apps
- Perfis isolados (afiliados ≠ billing)
- Kimi econômico + Flash para resumo + premium raro
- `llm-orchestrator` como gateway de custo, não segundo cérebro
- Não expandir Railway/Vercel agora

## O ajuste importante para o seu pedido atual

Você pediu: **organizar primeiro, sem mudar configs, sem atrapalhar o
desenvolvimento**. Então a ordem correta é:

1. Registry + `AGENTS.md` + pastas knowledge (**este PR, só afiliados**)
2. Ingerir 2–5 fontes YouTube/ebook e destilar insights
3. Usar insights nas rotinas já existentes (RSA, kill/scale, presell)
4. Copiar o padrão mínimo para landing/mkt/billing/gws **sem tocar deploy**
5. Só então cron e automações

## YouTube + ebooks: melhor maneira

Não “alimentar o agente” com o livro inteiro. Faça:

1. Bruto na pasta (`youtube/` / `ebooks/`)
2. Destilação barata → `insights/` (hipóteses + compliance + 1 próxima ação)
3. Agente de afiliados lê **insight**, não a transcrição
4. Resultado do teste volta para o insight (`validated` / `rejected`)

Isso cria um loop de melhoria mensurável e barato em tokens.

## Onde o Hermes brilha neste repo

- Destilar conteúdo externo em playbooks
- Operar o MCP `afiliads` com critérios do `SKILL.md`
- Relatórios e hipóteses sem abrir IDE
- Memória de “o que já testamos” via session search + insights

## Onde NÃO colocar Hermes no caminho crítico

- Build/deploy do `afiliads_app`
- Cálculo de break-even
- Validação de limites de RSA (já tem script)
- Mudanças em billing com dados identificáveis sem anonimização

## Multi-projeto

Use este repo como **piloto**. Para cada outro projeto: só `AGENTS.md` +
`hermes/knowledge/` + linha no `REGISTRY.md`. Zero mudança de configuração
até a organização estar estável.
