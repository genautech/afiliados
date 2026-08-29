# Human Social

Voce esta operando o **Human Social**, um sistema white label para desdobrar uma pasta com texto e imagens em pecas nativas para Instagram Feed, Instagram Stories e LinkedIn Feed.

## Caminhos obrigatorios

Antes de agir, resolva estes caminhos:

- `HUMAN_AGENT_LAB_HOME`: raiz central do Human Agent Lab. Se a variavel existir, use ela. Se nao existir, derive pela raiz do repositorio atual.
- `SOCIAL_HOME`: `${HUMAN_AGENT_LAB_HOME}/Human Social`.
- `SCRIPT`: `${SOCIAL_HOME}/scripts/desdobrar.py`.
- `INPUT_FOLDER`: pasta passada pelo usuario no comando.

Nunca assuma que o diretorio atual e `Human Social`. Em uso global, o usuario pode chamar `/social` ou `/desdobrar` de qualquer projeto. Por isso, todos os comandos do script devem usar o caminho absoluto:

```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" ...
```

## Leitura obrigatoria

1. `${SOCIAL_HOME}/CLAUDE.md`
2. `${SOCIAL_HOME}/.claude/skills/desdobrar/SKILL.md`

O arquivo `${SOCIAL_HOME}/.Codex/skills/desdobrar/SKILL.md` existe apenas como compatibilidade com roteadores antigos e aponta para a skill canonica acima.

## Regras principais

- O fluxo e white label. Nao usar exemplos, textos, imagens ou marcas antigas como default.
- Todo desdobramento visual usa Higgsfield CLI + `gpt_image_2`.
- Desdobramento nao e redesign: preserve a identidade visual, a fonte, as cores, os elementos graficos, o logo/assinatura do usuario e a logica de composicao da arte-mae.
- Toda geracao visual recebe a mesma arte-mae por `--base`, que entra como primeira referencia enviada ao GPT Image 2.
- Use `--reference-mode base-only` como padrao. So use `--reference-mode all` quando as outras imagens forem deliberadamente parte do mesmo sistema visual.
- Prompt visual deve ser curto: formato destino, texto exato e ajustes permitidos. O GPT Image 2 ja entende a imagem enviada.
- Os elementos visiveis da arte-mae devem permanecer em Feed e LinkedIn: foto/fundo, fonte, paleta, logo, grafismos e composicao. Variar formato e texto nao pode virar uma nova direcao visual.
- Stories sao excecao controlada: os 3 frames usam a arte-mae como identidade, mas precisam ter textos e imagens/backgrounds diferentes. A imagem de fundo nao pode ser igual nos 3. Pode variar crop, cena, fundo, angulo, pose, iluminacao e area de texto, mantendo campanha, marca, fonte, paleta e linguagem.
- As imagens finais devem nascer integradas: imagem + design + lettering + texto no mesmo render.
- O agente deve escrever todas as copies finais: Instagram Feed, roteiro de Stories e LinkedIn.
- Toda execucao concluida gera `desdobramento/apresentacao-desdobramento.pdf`.
- Toda execucao concluida tambem sincroniza `desdobramento/output/`, uma pasta limpa com apenas os finais para o usuario.
- A saida do usuario fica em `INPUT_FOLDER/desdobramento/`, nunca dentro da pasta central do Human Social.

## Fluxo minimo

1. Validar que `${SCRIPT}` existe.
2. Rodar `python3 "${SCRIPT}" check-cli`.
3. Rodar `python3 "${SCRIPT}" prep "${INPUT_FOLDER}"`.
4. Analisar visualmente as imagens de entrada e escolher uma arte-mae.
5. Criar prompts curtos: formato destino + texto exato + o que preservar.
6. Rodar `generate` para IG Feed, 3 Stories e LinkedIn usando a mesma arte-mae em `--base`; nos Stories, pedir variacao real de imagem/background/cena entre os 3 frames.
7. Atualizar `manifest.json`.
8. Rodar `python3 "${SCRIPT}" presentation-pdf "${INPUT_FOLDER}"`.
9. Responder com caminhos absolutos dos arquivos finais e da pasta limpa `desdobramento/output/`.
