# 📦 dna-criativo/ — onde sai o seu entregável

Esta pasta é o **destino do seu DNA Criativo**. Quando o Maestro terminar o briefing, vai criar aqui dentro um arquivo chamado `DNA.md` — o entregável central do processo. Ele também cria um `CLAUDE.md` na raiz do projeto para o Claude Code usar esse DNA automaticamente.

---

## O que é o `DNA.md`

É **o arquivo-mestre da sua marca**. Toda IA (Claude, ChatGPT, Gemini, qualquer uma) que for criar conteúdo da marca lê esse arquivo PRIMEIRO e produz já com a sua identidade.

Você usa ele de 3 formas:

### 1. Cole no início de qualquer conversa com IA

Abre o ChatGPT, Claude, Gemini. Cola o conteúdo do `DNA.md`. Pede o que quer ("escreve um email de boas-vindas", "ideia de carrossel sobre X"). A IA já produz na sua voz/visual.

### 2. Abra o projeto no Claude Code

O `CLAUDE.md` do projeto manda o Claude Code ler este `DNA.md` antes de criar, auditar ou editar qualquer peça da marca.

### 3. Compartilhe com colaboradores

Designer freela, copy, agência, novo membro do time — todos leem o `DNA.md` antes de tocar em qualquer coisa. Ponto único de verdade.

---

## E o Notion?

Se você tinha o conector Notion ativo no Claude Desktop quando rodou o briefing, o Maestro também replicou tudo lá numa estrutura organizada (página principal + sub-páginas + databases). É o mesmo conteúdo do `DNA.md`, só que navegável e editável colaborativamente.

Se não tinha o Notion ativo, sem problema — o `DNA.md` aqui funciona sozinho. Dá pra ativar o Notion depois e pedir pro Maestro replicar.

---

## O que é o `CLAUDE.md` do projeto

O `CLAUDE.md` fica um nível acima desta pasta, em:

```text
projetos/[sua-marca]/CLAUDE.md
```

Ele diz ao Claude Code para ler `dna-criativo/DNA.md` antes de criar, auditar ou editar qualquer peça da marca. O `CLAUDE.md` não substitui o DNA; ele é a camada operacional para o Claude Code.

---

## E se eu editar o DNA depois?

Você pode editar o `DNA.md` direto neste arquivo (qualquer editor de texto serve). Quando rodar o Maestro de novo, ele lê o que está aqui — então sua edição já vai pegar nas próximas peças que ele gerar.

Se também tem o Notion sincronizado, edita lá ou aqui — o Maestro mantém os dois alinhados (com confirmação antes).

---

## Outros arquivos que podem aparecer aqui

Conforme você usar o sistema, esta pasta pode ganhar:

- `DNA.md` — o entregável central (sempre)
- `../CLAUDE.md` — orientação do Claude Code para usar o DNA
- `dna-snapshot-{data}.md` — versões antigas do DNA pra histórico (quando você evoluir o DNA)
- `manifesto.md` — opcional, texto público que sintetiza propósito + posicionamento (gerado se você pedir)
- `sample-pack/` — opcional, pasta com peças de exemplo geradas com o DNA (caption, email, post, etc.) pra você ter referência

Tudo aqui é seu — pode mover, copiar, versionar no Git, mandar pra equipe.
