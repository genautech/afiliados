# 👋 Começa por aqui

Sistema pra construir o **DNA Criativo** das suas marcas — estilo visual, tom de voz, ferramentas — em dois entregáveis: `DNA.md`, que toda IA (Claude, ChatGPT, Gemini) lê pra produzir conteúdo já com a identidade da marca, e `DNA.pdf`, um material editorial diagramado para apresentar e compartilhar. O projeto também gera um `CLAUDE.md` para o Claude Code usar esse DNA automaticamente.

---

## 3 passos pra começar

### 1. Instale o Claude Code (só na primeira vez)

Abre o Terminal (**Mac:** `Cmd + Espaço` → digita `Terminal` → enter. **Windows:** tecla Windows → `PowerShell` → enter) e cola:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Já tem Claude Code instalado? Pula pro passo 2.

### 2. Entre nesta pasta pelo Terminal

No Terminal:

1. Digita `cd ` (com **espaço no final**)
2. **Arrasta esta pasta** do Finder/Explorer pra dentro da janela do Terminal (o caminho completo preenche sozinho)
3. `Enter`
4. Digita `claude` e `Enter`

### 3. Manda `oi`

A IA assume. Vai listar projetos existentes (se tiver algum) ou criar um novo com você. Projeto novo nasce com `referencias/` e `resultado/`: primeiro você coloca materiais em `referencias/`, depois o Maestro lê tudo e gera o DNA.

---

## Travou ou tá perdido?

No Claude Code, digita `ajuda`. O sistema te orienta.

---

## O que vai sair no fim

Pra cada projeto, saem três arquivos principais:

- `projetos/[sua-marca]/resultado/DNA.md` — o manual completo da marca;
- `projetos/[sua-marca]/resultado/DNA.pdf` — o documento editorial diagramado, com paleta, referências, imagens e instruções de uso;
- `projetos/[sua-marca]/CLAUDE.md` — o arquivo que orienta o Claude Code a ler e seguir esse DNA.

Você usa o DNA de 3 formas:

1. **Cola em qualquer IA** no início da conversa — ela produz já na sua voz e visual
2. **Abre o projeto no Claude Code** — o `CLAUDE.md` manda a IA ler o DNA antes de produzir
3. **Compartilha o PDF com colaboradores** (designer, copy, agência) — todos trabalham com a mesma referência visual e estratégica

No final do bloco, o Maestro também testa uma peça pequena e usa seu feedback para refinar o DNA em tempo real.

Múltiplas marcas? Cada uma vira sub-pasta dentro de `projetos/`. Sem limite.

---

## Estrutura desta pasta

```
02. DNA Criativo/
├── 👋 COMECE-AQUI.md      ← este arquivo
├── CLAUDE.md              ← cérebro do sistema (não mexa)
├── inteligencias/         ← kernel (não mexa)
└── projetos/              ← suas marcas vivem aqui
    └── [sua-marca]/
        ├── CLAUDE.md      ← orientação do Claude Code para esta marca
        ├── referencias/   ← você joga matéria-prima aqui
        └── resultado/     ← DNA.md e DNA.pdf saem aqui
```

Você só mexe em `projetos/`. O resto é técnico — o Maestro cuida.

---

## Custos

- **Claude Code** — plano Pro+ da Anthropic (necessário)
- **Notion** — opcional, conector ativado no Claude Desktop
- **Higgsfield CLI** — opcional, só se for gerar imagem/video

Pra construir o DNA em si, só precisa do Claude Code.
