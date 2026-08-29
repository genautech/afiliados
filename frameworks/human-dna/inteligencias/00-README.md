# DNA Criativo V1.0

Sistema-mestre de identidade de marca para IA. Não é um arquivo de configuração — é a **constituição** que toda outra inteligência (Carrossel, Vídeo, Deck, Ads, UGC, Email, Landing) lê antes de produzir qualquer coisa.

O DNA é o `CLAUDE.md` da marca, expandido na profundidade de um manual de estúdio de branding (Pentagram, Wolff Olins, Collins, Porto Rocha, Manual). Captura propósito, estratégia, audiência, voz, visual, comportamento e anti-padrões num formato que IA lê e segue.

**White-label.** Sistema base não está atrelado a nenhuma marca. Toda variável da marca vive na página `🧬 DNA Master` no Notion. Trocar a marca = trocar o conteúdo dessa página + as referências visuais. Nada no código muda.

Exceção operacional: quando a marca **é** plataforma de e-book / afiliados, o Maestro lê também `inteligencias/20-Infoprod-Low-Ticket.md` — dois níveis (plataforma vs e-book), duas audiências, hop e conhecimento de YouTube/GitHub. O sistema continua white-label; o doutor 20 só entra se o briefing for infoprod.

---

## Por que existe

Carrossel V2.5 mostrou o padrão: agentes de IA produzem com qualidade quando recebem **contexto editorial denso e específico**. A página `🏷️ Brand Identity` do Carrossel é boa, mas é uma página. Não é suficiente quando o agente precisa decidir entre 3 vozes pra um email de crise, ou escolher entre 2 paletas pra um story de product launch, ou recusar uma pauta porque não fala com a persona primária.

Estúdios de branding entregam manuais de 200+ páginas porque é o que é necessário para que QUALQUER pessoa (designer, copy, atendimento, fundador) tome decisões coerentes sem voltar pro fundador toda vez. **O DNA Criativo é isso, em formato lido por IA.**

A diferença prática:
- **Sem DNA Criativo:** cada agente precisa de prompt enorme e ainda assim produz "ok-mas-genérico". Toda gestão de tom é manual. Cada novo agente precisa ser ensinado do zero.
- **Com DNA Criativo:** todo agente lê o DNA primeiro. Output sai com voz da marca, paleta correta, persona certa, anti-padrões respeitados. **Você plugou um cérebro de marca que vive fora dos prompts.**

---

## Arquitetura (V1.0 — Routines do Claude Desktop)

| Componente | Onde roda | Por quê |
|---|---|---|
| **R1 — Brand Scout** | Routine **Remote** (cloud Anthropic) | Coleta contínua de inspirações, monitoramento de menções, análise de concorrentes — só fala com Notion + web search, sandbox cobre |
| **R2 — DNA Routine** | Routine **Local** (Claude Code Desktop) | Geração compliante (copy, imagem, deck) + auditoria de aderência (qualquer asset existente vs. DNA) — precisa Higgsfield CLI, vision real, render |
| **Setup inicial** | Claude Code CLI + Notion Integration Token | Cria 4 databases + 14 sub-páginas via API REST em ~60s, popula com discovery |

A arquitetura espelha a do Carrossel — duas routines, working folder local, MCPs, Notion como fonte da verdade — mas o DNA é uma camada-mãe. Quando o sistema de Carrossel roda, ele lê o DNA do Notion ANTES de ler suas próprias páginas. Quando você cria um sistema novo (vídeo, ads), ele também lê o DNA.

---

## Como funciona o ciclo de uso

**1. Setup único (uma vez por marca, ~30-45 min)**
- Wizard discovery profundo (52 perguntas em 7 fases) extrai DNA bruto
- Auditoria opcional: o agente analisa Instagram/site/decks da marca pra extrair DNA observado
- Síntese: agente confronta DNA declarado (perguntas) com DNA observado (auditoria) e devolve um draft pra você refinar
- Após aprovação, popula 14 páginas no Notion + cria 4 databases + ativa 2 routines

**2. Uso passivo (toda outra inteligência)**
- Sistema Carrossel lê `🧬 DNA Master` antes de cada execução, hidrata variáveis no pipeline editorial e nos prompts de render
- Sistema Vídeo, Ads, Email — qualquer agente futuro — lê do mesmo lugar
- DNA é fonte única de verdade. Edita no Notion, próxima execução de qualquer agente já reflete

**3. Uso ativo (R2 DNA Routine)**
- **Modo gerar:** "preciso de uma copy de email de boas-vindas" → R2 lê DNA, escreve, devolve aderente
- **Modo auditar:** cola um post existente → R2 pontua aderência (0-10 por dimensão: voz, visual, persona, anti-padrões), sugere reescrita
- **Modo evoluir:** "estamos repensando posicionamento" → R2 conduz mini-discovery, propõe diff no DNA, aplica após aprovação

**4. R1 Brand Scout (cloud, contínuo)**
- Coleta inspirações relevantes pro nicho da marca em sites de design (Pinterest, Are.na, Behance, Dribbble — via web fetch)
- Monitora menções da marca + concorrentes (web search) e arquiva no database
- Sugere atualizações da `📚 Reference Library` quando encontra exemplares fortes

---

## Configuração do DNA

Tudo via Notion. A R2 e qualquer agente derivado lê estas páginas:

- `🧬 DNA Master` — variáveis canônicas + síntese executiva (1 página, leitura rápida)
- `🎯 Brand Strategy` — propósito, missão, visão, posicionamento, key insight
- `👥 Audience DNA` — persona primária + secundária + anti-persona, jobs-to-be-done
- `🗣️ Voice & Tone` — vocabulário, registros por canal, construções, anti-AI-slop expandido
- `🎨 Visual System` — logo, paleta, tipografia, grid, espaço, motion
- `📸 Photography Direction` — 7 setups de iluminação, composição, mood, anti-fotografia
- `🖼️ Image Generation Engine` — templates de prompt Higgsfield CLI por tipo, branding com IA
- `🤝 Brand Behavior` — como age em cada canal, crisis playbook, calendário comportamental
- `🚫 Anti-Patterns` — visual + verbal + comportamental + casos comparados
- `📚 Reference Library` — exemplos canônicos aprovados, refs de inspiração, biblioteca viva
- `🔍 Discovery Protocol` — roteiro de descoberta pra reuso em revisões anuais
- `🔐 Configuração` — ambiente, conectores e checklist Higgsfield CLI

Quando o output sair sem o "tom da marca", **edita a página relevante, não o prompt.** Re-roda. Itera. Mesma filosofia do Carrossel.

---

## Pré-requisitos

- **Claude Code Desktop app** (Mac ou Windows) com plano **Pro+** ativo
- Conta **Notion** com Integration Token + workspace dedicado para a marca
- Conta **Google Drive** (conectado via MCP/connector no Claude Desktop)
- Higgsfield CLI instalado e logado (`higgsfield account status`)
- **Notion + Google Drive** ativados como connectors no Claude Desktop (testados no setup)

Sem necessidade de: Homebrew, scripts atômicos, Python local, `launchd`. Mesma stack do Carrossel — se já rodou Carrossel, ambiente está pronto.

---

## Ordem de leitura

1. `02-Setup-Wizard.md` — primeiro passo (wizard de discovery)
2. `03-Notion-template.md` — como o agente cria a estrutura via API
3. `04-Discovery-Protocol.md` — as 52 perguntas em 7 fases (entender o que o wizard pede)
4. `15-R2-DNA-Routine-Local.md` — coração do sistema: prompt completo da Routine Local
5. `16-Como-usar.md` — cenários do dia-a-dia
6. `17-Troubleshooting.md` — quando algo dá errado

Os arquivos 01, 05-13 são páginas de instrução do Notion (você não lê eles linearmente, lê quando o setup referenciar). O 14 é a Routine Remote (R1).

---

## Relação com o sistema de Carrossel

O DNA Criativo **não substitui** a `🏷️ Brand Identity` do Carrossel — **alimenta**. A relação:

| Página Carrossel (`01. Carrossel`) | Origem no DNA Criativo |
|---|---|
| `🏷️ Brand Identity` (variáveis: nome, handle, cor, etc.) | Lê de `🧬 DNA Master` (single source of truth) |
| `📚 Manual editorial` (tom, palavras, anti-AI-slop) | Lê de `🗣️ Voice & Tone` (versão expandida) |
| `🎨 Design system` (princípios visuais universais) | Lê de `🎨 Visual System` (versão expandida) |
| `🖼️ Referências visuais` (anexos pra vision) | Lê de `📚 Reference Library` (curadoria viva) |

Quando você instala o DNA Criativo numa marca que já tem Carrossel rodando:
1. Setup cria estrutura DNA num workspace separado (ou na mesma)
2. R2 do Carrossel passa a ler do DNA antes de ler suas próprias páginas
3. Edits no DNA propagam pro Carrossel automaticamente

Quando você instala o DNA Criativo do zero (sem Carrossel ainda):
1. Setup cria a estrutura DNA primeiro
2. Quando depois você instalar o Carrossel, ele já encontra o DNA e usa
3. Páginas do Carrossel ficam mais simples (só os bits específicos de carrossel — espinha dorsal, engine de headlines)

---

## Estrutura final esperada

```
~/{brand-slug}/
├── docs/                          # esses 18 arquivos .md (knowledge)
├── .claude/settings.json          # allowlist de permissões (gerada pelo setup)
├── .brand.json                    # variáveis-mestre da marca
├── .dna.json                      # síntese executiva do DNA (cache rápido)
├── notion-ids.json                # IDs das páginas/databases
└── state/{YYYY-MM-DD}/            # snapshot do dia (jobs do R2)
    ├── audits/                    # auditorias de assets externos
    ├── briefs/                    # briefs processados
    ├── outputs/                   # outputs gerados (copy, imagem, deck)
    ├── refs/                      # imagens baixadas das Refs (vision)
    ├── log.txt
    └── .completed

Claude Desktop
├── Routines
│   ├── {brand_name} — Brand Scout (Remote)
│   └── {brand_name} — DNA Routine (Local)
└── Connectors
    ├── Notion
    └── Google Drive

Notion workspace
└── 🧬 {brand_name} — DNA Criativo/
    ├── 🧬 DNA Master              ← ponto de entrada, single source of truth
    ├── 🎯 Brand Strategy
    ├── 👥 Audience DNA
    ├── 🗣️  Voice & Tone
    ├── 🎨 Visual System
    ├── 📸 Photography Direction
    ├── 🖼️  Image Generation Engine
    ├── 🤝 Brand Behavior
    ├── 🚫 Anti-Patterns
    ├── 📚 Reference Library
    ├── 🔍 Discovery Protocol
    ├── 🔐 Configuração            ← Higgsfield CLI, connectors, integrations
    ├── 🗂️  Touchpoints (database) ← cada canal/aplicação da marca
    ├── 📥 Briefs (database)       ← jobs criativos rodados pela R2
    ├── 🎯 Assets (database)       ← biblioteca canônica de outputs
    └── ✅ Compliance (database)    ← histórico de auditorias

Google Drive
└── {brand-slug}/
    ├── DNA-Snapshots/{YYYY-MM-DD}/  ← snapshot trimestral do DNA inteiro
    ├── Reference-Library/           ← biblioteca de inspirações arquivada
    ├── Outputs/{YYYY-MM-DD}/        ← outputs gerados pela R2
    └── Audits/{YYYY-MM-DD}/         ← assets auditados + relatórios
```

---

## Filosofia

Três princípios que orientam todo o sistema. Vale a pena ler antes de instalar.

**1. Densidade > brevidade.** Brevidade é fácil pra IA (já é fluente em vago). Densidade é difícil — exige especificidade. Toda página deste sistema prefere uma frase concreta a três frases vagas. "A marca é jovem e moderna" não vale nada. "A marca soa como editor da Folha que largou a redação pra abrir uma agência" vale tudo.

**2. Negativa carrega tanto quanto positiva.** O que a marca NÃO é (anti-padrões, anti-persona, anti-fotografia, anti-vocabulário) é o que evita o output genérico. IA tende a gravitar pro genérico. Anti-padrão explícito é o que mantém o output específico.

**3. O DNA é vivo.** Marca evolui. O DNA evolui junto. Trimestralmente, R2 sugere atualizações baseadas em performance (que conteúdo está performando, quais decisões editoriais resultaram em alcance). A `🔍 Discovery Protocol` é re-rodada anualmente pra refresh maior. **Não é manual congelado de 2026 — é organismo vivo.**
