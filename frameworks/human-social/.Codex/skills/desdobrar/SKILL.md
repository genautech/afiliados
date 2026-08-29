---
name: desdobrar
description: Compatibilidade Codex para o Human Social. Desdobra uma pasta com texto + imagens em Instagram Feed, Instagram Stories e LinkedIn Feed usando Higgsfield CLI + GPT Image 2, imagem-base por referencia e PDF final.
---

# /desdobrar — Human Social

Este arquivo existe para roteadores que procuram a skill em `.Codex/skills/desdobrar/SKILL.md`.

A skill canonica fica em:

```text
${HUMAN_AGENT_LAB_HOME}/Human Social/.claude/skills/desdobrar/SKILL.md
```

Antes de executar, leia:

1. `${HUMAN_AGENT_LAB_HOME}/Human Social/AGENTS.md`
2. `${HUMAN_AGENT_LAB_HOME}/Human Social/CLAUDE.md`
3. `${HUMAN_AGENT_LAB_HOME}/Human Social/.claude/skills/desdobrar/SKILL.md`

## Regras de compatibilidade

- Nunca procure `scripts/desdobrar.py` relativo ao projeto atual do usuario.
- Use sempre o caminho absoluto:

```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" ...
```

- Todo render visual usa `gpt_image_2`.
- Toda chamada `generate` precisa receber `--base <arte-mae>`.
- O padrao e `--reference-mode base-only`, para manter todos os formatos muito perto da arte-mae.
- Desdobramento nao e redesign: preservar identidade, fonte, paleta, elementos, logo/assinatura e hierarquia da imagem enviada.
- Feed e LinkedIn ficam muito fieis a foto/fundo da arte-mae. Stories precisam variar imagem/background/crop/cena/iluminacao entre os 3 frames, mantendo campanha, marca, fonte, paleta e linguagem.
- Toda execucao concluida termina com:

```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" presentation-pdf "<pasta>"
```

A saida final fica em `<pasta>/desdobramento/`; a pasta amigavel para o usuario fica em `<pasta>/desdobramento/output/`.
