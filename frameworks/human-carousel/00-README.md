# News-to-Carrossel V2.5

Sistema de geração de carrosséis Instagram em duas frentes: carrossel sob demanda a partir de tema ou conteúdo próprio, e geração diária automatizada a partir de notícias. O pipeline editorial faz pesquisa, triagem, headline, arquitetura narrativa, validação e render visual coerente via referência fixa no Higgsfield CLI: capa gerada primeiro, depois slides internos em paralelo usando capa + referências visuais da marca.

**White-label.** Sistema base não está atrelado a nenhuma marca. Identidade visual e editorial vêm da página `🏷️ Brand Identity` no Notion (cor, handle, nicho, audiência, veículo editorial de referência). Trocar a marca = trocar o conteúdo dessa página + as referências visuais.

---

## Arquitetura (V2.5 — Routines do Claude Desktop)

| Componente | Onde roda | Por quê |
|---|---|---|
| **R1 — News Scout** | Routine **Remote** (cloud Anthropic) | Só fala com Notion, Drive, web search — sandbox cobre, Mac pode estar fechado |
| **R2 — Carousel Creator** | Routine **Local** (Claude Code Desktop, Mac/Windows) | Precisa Higgsfield CLI, vision real nas refs, render paralelo — Routine Local tem rede aberta + filesystem + MCPs |
| **Setup inicial** | Claude Code CLI + Notion Integration Token | Cria 2 databases + 10 sub-páginas via API REST em ~30s |

A V2.5 substitui o aparato V2 de scripts + `launchd` + Homebrew (jq/imagemagick/rclone/python local) por **uma única Routine Local** dentro do Claude Desktop. Schedule + catch-up built-in, sem dependências externas.

---

## Como funciona o ciclo diário

**1. Durante o dia** (9h / 13h / 17h, configurável)
- R1 (Routine **Remote**) varre fontes de notícia via `web_search` + `web_fetch`, deduplica, escreve título/resumo/relevância/link no database `🗞️ News Feed`
- R1 não baixa imagens (o sandbox Remote bloqueia HTTP direto) — faz só best-effort pra descobrir a URL da imagem e escreve uma **Dica visual** textual. A extração de imagem de verdade fica com o R2 (Local)

**2. De manhã** (Schedule `*/30 8-22`, alvo 08:00)
- A Routine **Local** R2 dispara no primeiro tick `*/30` do dia em que o Claude Desktop estiver aberto
- Ticks subsequentes detectam `.completed` e fazem soft exit em ~2s (custo desprezível)
- Catch-up automático: se o app estava fechado por horas, dispara 1 run perdida ao abrir
- R2 lê Brand Identity, escolhe notícia, executa pipeline editorial inteiro como **uma session do Claude** com Bash + MCPs
- **Extrai a foto da notícia escolhida** (Etapa 1.5 — cascata local, rede aberta); se não houver foto boa, gera a partir da Dica visual do R1
- Decodifica referências visuais com **vision nativa** (detecta grids automaticamente)
- Gera capa via Higgsfield CLI + GPT Image 2 (`higgsfield upload create` + `higgsfield generate create gpt_image_2`)
- Gera slides 2-9 **em paralelo** com **capa + refs visuais da marca + foto da notícia** como UUIDs de referencia (coerência slide-a-slide)
- Aplica a logo via composição Pillow (slides 1 e 9) sem alterar proporção/tamanho, salva os 9 slides na pasta local e no Drive, registra no Notion

**3. Manhã seguinte**
- Você abre Notion, vê o carrossel pronto, baixa, posta no Instagram
- Se o visual veio fraco: manda `--re-render` na session da Routine (re-roda só visual, aproveita pipeline editorial já feito — barato)
- Se a notícia escolhida não foi boa: override via `--news=N` na primeira mensagem da próxima Run now

---

## Como funciona por tema ou conteúdo próprio

Quando a pessoa pede algo simples como:

```text
/carrossel quero um carrossel sobre bicicletas elétricas em São Paulo
```

o sistema não espera um briefing perfeito. Ele assume a pesquisa e a estratégia:

1. interpreta o tema;
2. pesquisa contexto, dados recentes e sinais de comportamento;
3. escolhe um ângulo editorial específico;
4. cria headline e arquitetura narrativa de 9 slides;
5. gera legenda e direção visual;
6. renderiza quando a marca já está configurada, ou entrega o plano completo para render.

Esse modo está em `14-Input-Proprio.md` e usa a mesma inteligência editorial do fluxo automatizado. A diferença é a origem da pauta: em vez de sair do News Feed, sai de uma ideia, frase, texto ou briefing colado pelo usuário.

---

## Configuração editorial

Tudo via Notion. A R2 lê estas páginas TODA vez que roda:

- `🏷️ Brand Identity` — variáveis da marca (nome, handle, cor, nicho, audiência, voz)
- `📚 Manual editorial` — 7 parâmetros, anti-AI-slop, tom Folha
- `🎯 Engine de headlines` — famílias de ganchos, banco de outliers, veredito interno
- `🧭 Arquitetura narrativa` — estrutura 18 campos / 9 slides
- `🎨 Design system` — princípios visuais universais
- `📐 Referências de qualidade` — 2 carrosséis-âncora
- `🖼️ Referências visuais` — imagens reais de inspiração (vision real local)
- `📋 Fontes de notícia` — tabela estruturada de fontes monitoradas

Quando o sistema sair com carrossel mediano, **edita a página, não o prompt da Routine.** Re-roda. Itera.

---

## Pré-requisitos

- **Claude Code Desktop app** (Mac ou Windows) com plano **Pro+** ativo
- Conta **Notion** com Integration Token + workspace dedicado
- Conta **Google Drive** (conectado via MCP/connector no Claude Desktop)
- Higgsfield CLI instalado e logado (`higgsfield account status`)
- **Notion + Google Drive** ativados como connectors no Claude Desktop (testados no setup)

Sem necessidade de: Homebrew, `jq`, `imagemagick`, `rclone`, Python local, `launchd`, `.plist`, Higgs MCP ou chave externa de geração. Tudo o que precisa roda via Claude Desktop + Higgsfield CLI.

---

## Ordem de leitura

1. `02-Setup-Wizard.md` — primeiro passo (wizard de identidade da marca)
2. `03-Notion-template.md` — como o agente cria a estrutura via API
3. `13-R2-Routine-Local.md` — coração do sistema: prompt completo da Routine Local
4. `14-Input-Proprio.md` — carrossel sob demanda a partir de tema simples ou conteúdo colado
5. `15-Como-usar.md` — cenários do dia-a-dia
6. `16-Troubleshooting.md` — quando algo dá errado

Os arquivos 01, 04-11 são páginas de instrução do Notion (você não lê eles linearmente, lê quando o setup referenciar). O 12 é a Routine Remote (R1).

---

## Estrutura final esperada

```
~/{brand-slug}/
├── docs/                       # esses 17 arquivos .md (knowledge)
├── .brand.json                 # variáveis da marca (gerado pelo setup)
├── notion-ids.json             # IDs das páginas/databases (gerado pelo setup)
└── state/{YYYY-MM-DD}/         # snapshot do dia
    ├── news.json
    ├── narrativa.json
    ├── visual-plan.json
    ├── visual-brief.txt
    ├── refs/
    ├── logo.png                # logo baixada do Notion (se brand_has_logo)
    ├── slides/                 # slide-01.png … slide-09.png (fonte da verdade)
    ├── cover-url.txt
    ├── url-2.txt … url-9.txt
    ├── drive-urls.json
    ├── log.txt
    └── .completed

Claude Desktop
├── Routines
│   ├── {brand_name} — News Scout (Remote)
│   └── {brand_name} — Carousel Creator (Local)
└── Connectors
    ├── Notion
    └── Google Drive

Notion workspace
└── 🚀 {brand_name} — News-to-Carrossel/
    ├── 🗞️  News Feed (database)
    ├── 🎨 Carrosséis (database)
    ├── 🏷️  Brand Identity        ← logo PNG anexada aqui
    ├── 🔐 Configuração           ← checklist Higgsfield CLI
    ├── 📋 Fontes de notícia
    ├── 📚 Manual editorial
    ├── 🎯 Engine de headlines
    ├── 🧭 Arquitetura narrativa
    ├── 🎨 Design system
    ├── ⚙️  Render engine
    ├── 📐 Referências de qualidade
    └── 🖼️  Referências visuais

Google Drive
└── {brand-slug}/
    ├── Noticias/{YYYY-MM-DD}/
    └── Carrosseis/{YYYY-MM-DD}/slide-NN.png
```
