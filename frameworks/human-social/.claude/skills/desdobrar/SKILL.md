---
name: desdobrar
description: Desdobra uma pasta com texto + imagens em peças nativas para Instagram Feed, Instagram Stories e LinkedIn Feed via Higgsfield CLI + GPT Image 2 com chain de referência. Pre-flight conversacional para CLI/login (usuário nunca toca arquivo). Use quando o usuário digitar `/desdobrar <pasta>` ou pedir para "desdobrar carrossel" / "criar versões pra cada plataforma" a partir de um material local.
---

# /desdobrar — Pipeline com onboarding zero-técnico

Uso:
```
/desdobrar /caminho/da/pasta
```

**Importante:** o usuário deste sistema NÃO É TÉCNICO. É fotógrafo/diretor de arte. Ele não sabe o que é `.env`, "chave de API", "endpoint" ou "variável de ambiente". Toda interação com ele é em linguagem 100% humana. Erros técnicos viram conversa de WhatsApp, não stack trace.

---

## Passo 0 — Pre-flight Higgsfield CLI (CONVERSACIONAL — antes de qualquer outra coisa)

Resolva `HUMAN_AGENT_LAB_HOME` antes de rodar qualquer comando. O script nao fica no projeto atual do usuario; fica dentro da instalacao central:

```bash
SOCIAL_SCRIPT="$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py"
test -f "$SOCIAL_SCRIPT"
```

Roda:
```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" check-cli
```

A saída é JSON com `status`. Trate cada caso:

### `status: "ok"`
O Higgsfield CLI existe e está logado. Não alonga. Pula direto pro Passo 1.

### `status: "missing"`
O Higgsfield CLI não está instalado. Manda no chat (texto humano, copie e adapte):

> Antes de começar, preciso conectar o Higgsfield aqui no Claude Code — é ele que vai gerar as imagens novas pra cada rede.
>
> Vou instalar o CLI com `npm install -g @higgsfield/cli`. Se faltar Node.js, eu te aviso e paro.
>
> Depois eu faço o login com você.

Depois da instalação, rode `higgsfield auth login` e peça para o usuário concluir o login no navegador.

### `status: "login_required"`
O CLI existe, mas precisa login. Manda:

> O Higgsfield está instalado, só falta conectar a conta. Vou abrir o login com `higgsfield auth login`; conclui no navegador e me avisa.

Use o comando real:

```bash
higgsfield auth login
```

Depois roda:

```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" check-cli
```

- Se voltar `ok`: responde **"Higgsfield conectado. Vamos seguir."** e segue pro Passo 1.
- Se continuar `login_required`: pede para refazer o login.

---

## Passo 1 — Prep

Roda:
```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" prep "<pasta>"
```

Saída em JSON com:
- `texto_arquivo` — path do `.txt` encontrado
- `texto_conteudo` — conteúdo lido
- `imagens` — paths absolutos das imagens
- `saida` — path de `desdobramento/`
- `output` — pasta limpa de entrega em `desdobramento/output/`
- `manifest` — path do `manifest.json`

Se faltar `.txt` ou imagens, o script aborta com mensagem clara — repassa pro usuário com tom amigável.

---

## Passo 2 — Escolher a arte-mãe

Use o **Read tool** nas imagens originais e escolha UMA arte-mãe.

Prioridade:
1. imagem já diagramada com foto/visual + lettering;
2. imagem que mais parece peça final;
3. imagem principal mais forte, se ainda não existir arte com lettering.

Essa mesma arte-mãe vai para IG Feed, Stories e LinkedIn. Não escolha uma base diferente por rede, porque isso cria peças com mundos visuais diferentes.

Anote só o essencial:
- foto/visual principal;
- estilo da fonte;
- cores;
- elementos gráficos;
- logo/assinatura;
- composição e hierarquia.

Regra operacional: toda geração visual usa `gpt_image_2` e recebe a arte-mãe por `--base`. O script usa `--reference-mode base-only` por padrão para não deixar outras imagens confundirem o modelo. Use `--reference-mode all` só se o usuário pedir ou se as outras imagens forem claramente parte do mesmo sistema visual.

Prompt bom aqui é curto. O GPT Image 2 já vê a arte. Não escreva briefing longo nem descreva tudo que está na imagem: diga só o formato destino, o texto que entra e o que pode mudar. Em geral, 4 a 7 linhas bastam. Reforce que os elementos visíveis da arte-mãe continuam: foto, fundo, fonte, logo, grafismos, cores e composição. Para Stories, o foco muda: preserve identidade e personagem/produto, mas peça variação real de background/cena entre os frames.

Para ajuste pontual em uma peça já gerada, use a própria peça como `--base` e peça só a troca:

```
Use the attached artwork.
Keep everything the same.
Only replace the headline with: "{NOVA_HEADLINE}"
Preserve photo, background, font style, colors, logo and layout.
```

---

## Passo 3 — Gerar Instagram Feed (1 imagem, 3:4)

Escreve um prompt curto em `<pasta>/desdobramento/_prompts/ig-feed.txt`. Use a arte-mãe e peça só a transformação:

```
Use the attached master artwork.
Convert it to Instagram Feed portrait 3:4 (1080x1440).
Keep the same photo/background, font style, colors, graphic elements, logo and composition.
Change only crop, spacing, hierarchy and text. Keep all important visual elements.
Text: "{HEADLINE_CURTA}" / "{SUPORTE_CURTO opcional}"
No redesign. No new photo. No new style.
```

Depois roda:
```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" generate "<pasta>" ig-feed "<pasta>/desdobramento/_prompts/ig-feed.txt" --base <arte-mae.png>
```

O script sobe as imagens com `higgsfield upload create`, chama `higgsfield generate create gpt_image_2`, espera com `higgsfield generate wait`, baixa o PNG resultante pra `<pasta>/desdobramento/instagram-feed.png`. Retorna JSON com `output_path`, `higgsfield_url`, `base_reference` e `reference_files`.

Depois do render, compare com a arte-mãe. Se a foto, fonte, paleta ou linguagem mudaram demais, reprove e regenere com prompt ainda mais direto: "make it much closer to the attached master artwork; only change the format and text".

---

## Passo 4 — Gerar Instagram Stories (sempre 3 frames, 1080×1920)

Stories também nascem da mesma arte-mãe. Gere sempre 3 frames. Não use uma imagem-base diferente por story, a não ser que o usuário peça uma sequência baseada em várias imagens.

Cada story precisa trazer uma informação diferente e uma imagem/background diferente. O problema a evitar é xerox com texto trocado. A imagem por trás do texto não pode permanecer igual nos três frames. Pode variar crop, fundo estendido, área sólida para texto, respiro de layout, ângulo, pose, iluminação, situação próxima, cenário derivado ou personagem/produto em outro enquadramento; não pode trocar marca, fonte, logo, paleta nem linguagem principal.

Antes de escrever os prompts, defina um plano de variação:

- Story 01: frame mais próximo da arte-mãe, mas com crop, profundidade, extensão de fundo ou iluminação ajustada. Não pode ser só a mesma foto com texto novo.
- Story 02: variação visual mais clara do trio: outro ângulo, pose, cenário derivado, background diferente ou área sólida forte com cor da marca.
- Story 03: fechamento/CTA com outro background, composição diferente, iluminação diferente ou área de texto sólida; ainda dentro da mesma campanha.

Escreva `<pasta>/desdobramento/_prompts/story-NN.txt` com prompt curto:

```
Use the attached master artwork.
Convert it to Instagram Stories 9:16 (1080x1920).
Keep the same campaign identity: brand/logo, font style, colors and graphic language.
Create a derivative variation, not a copy. The background/image must be visibly different from the other Stories.
Change vertical crop/extension, safe area, text placement, background/image and text.
Use one: alternate angle, pose, related setting, changed lighting, background extension or solid brand-color field.
Text: "{HEADLINE_DO_STORY}" / "{MICROCOPY opcional}"
No unrelated new objects. No new brand style. Do not keep the exact same background photo with only new text.
```

Roda em paralelo para cada story, sempre com a mesma arte-mãe:
```bash
# em paralelo
for N in 01 02 03; do
  python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" generate "<pasta>" ig-stories "<pasta>/desdobramento/_prompts/story-$N.txt" --base "<arte-mae.png>" --output "story-$N.png" &
done
wait
```

Se algum falhar, segue com os outros — registra no manifest.

---

## Passo 5 — Gerar LinkedIn Feed (1 imagem, 16:9)

LinkedIn não ganha outra direção visual. Ele é uma adaptação da mesma arte-mãe para um registro mais editorial/sóbrio, mantendo foto, fonte, cores e elementos reconhecíveis. Escreve o prompt em `<pasta>/desdobramento/_prompts/linkedin-feed.txt`:

```
Use the attached master artwork.
Convert it to LinkedIn Feed landscape 16:9 (1920x1080).
Keep the same photo/background, font style, colors, graphic elements, logo and composition.
Change only crop, horizontal canvas, spacing, readability and text. Keep all important visual elements.
Text: "{TAG opcional}" / "{HEADLINE_LINKEDIN}" / "{SUPORTE_LINKEDIN opcional}"
No redesign. No new photo. No new style.
```

Roda:
```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" generate "<pasta>" linkedin-feed "<pasta>/desdobramento/_prompts/linkedin-feed.txt" --base <arte-mae.png>
```

Salva em `<pasta>/desdobramento/linkedin-feed.png`.

---

## Passo 6 — Escrever todas as copies finais

Leia o `texto_conteudo` original (do Passo 1). Escreva **todos os textos finais da entrega**, não só imagens:

### `<pasta>/desdobramento/instagram-feed.txt`
- Gancho nas 2 primeiras linhas (antes do "...ver mais")
- Frases curtas, parágrafos curtos, espaço entre eles
- 60-120 palavras
- CTA leve (1 linha)
- 3-7 hashtags no final, depois de linha em branco
- Tom oral, rítmico, social

### `<pasta>/desdobramento/instagram-stories/roteiro.txt`
Exatamente 3 seções, uma por story, com copy de tela, sticker sugerido e micro-CTA:
```
STORY 01 — story-01.png
Headline na imagem: "QUEM PRECISA DE PERFEIÇÃO MORRE"
Sticker sugerido: caixa de pergunta
Micro-CTA: "responde aqui ↓"

STORY 02 — story-02.png
Headline: "Eles pararam de ter ideias em 2018"
Sticker: (nenhum)

... etc

STORY {N} — story-NN.png  (último)
Headline: "Carrossel completo no feed →"
Sticker: link sticker apontando pro post do feed
```

### `<pasta>/desdobramento/linkedin-feed.txt`
- Insight substantivo na primeira linha (NÃO gancho-clickbait)
- 1ª pessoa ou voz declarativa direta
- 160-320 palavras
- Parágrafos articulados (3-5 linhas cada)
- Inclui pelo menos 1 número / citação / exemplo concreto
- CTA editorial (pergunta aberta) ou nenhum
- 2-4 hashtags no final
- Tom editorial-substantivo

**Crítico:** depois de escrever as 3, compare. As copies podem ter registros diferentes, mas as imagens precisam continuar parecendo desdobramentos da mesma arte-mãe.

---

## Passo 7 — Atualizar manifest

Lê `<pasta>/desdobramento/manifest.json`, preenche `outputs` com paths e URLs do Higgsfield (que vieram do JSON do `generate`), marca `status: "pronto"` ou `"parcial"`. Salva.

---

## Passo 8 — Gerar PDF de apresentação

Depois de gerar imagens e copies, rode:

```bash
python3 "$HUMAN_AGENT_LAB_HOME/Human Social/scripts/desdobrar.py" presentation-pdf "<pasta>"
```

O arquivo final fica em:

```text
<pasta>/desdobramento/apresentacao-desdobramento.pdf
```

O PDF precisa mostrar:
- texto-base recebido;
- imagens-base usadas como referência;
- Instagram Feed gerado + legenda;
- Stories gerados + roteiro;
- LinkedIn Feed gerado + legenda;
- modelo usado (`gpt_image_2`) e referências enviadas.

O PDF não deve listar nomes de arquivo na página. Ele deve parecer uma apresentação simples e bonita: layout 16:9, imagens grandes, respiro, hierarquia tipográfica, acentos corretos e textos legíveis. Cada página precisa deixar claro se é Base, Instagram Feed, Instagram Stories, roteiro dos Stories, LinkedIn ou entrega limpa.

O script também cria/sincroniza:

```text
<pasta>/desdobramento/output/
```

Essa é a pasta amigável para o usuário: ela reúne só arquivos finais, sem logs, prompts ou manifest técnico.

Se uma peça falhou, o PDF ainda deve ser gerado com o que existe e o manifest fica `parcial`.

---

## Passo 9 — Resumo no chat

```
✅ Desdobramento pronto. Tá tudo em:
   <pasta>/desdobramento/

📱 Instagram Feed:    instagram-feed.png + instagram-feed.txt
📲 Instagram Stories: 3 frames em instagram-stories/ + roteiro.txt
💼 LinkedIn Feed:     linkedin-feed.png + linkedin-feed.txt
📄 PDF apresentação:  apresentacao-desdobramento.pdf
📦 Entrega limpa:      output/

Custo: conferir créditos no Higgsfield.
```

Mostra paths absolutos pra usuário poder copiar/abrir no Finder.

---

## Regras invioláveis

- **Pre-flight de CLI/login conversa, não bloqueia.** Nunca diga ao usuário "edite arquivo Y". Conduza instalação/login com linguagem humana.
- **Usuário nunca vê o termo `.env`, "API key", "endpoint" ou "FAL_KEY".** Para ele: "Higgsfield conectado".
- **Vision SEMPRE nas imagens originais.** Nunca adivinhe paleta/mood — abre o arquivo e olha.
- **GPT Image 2 SEMPRE.** Desdobramentos visuais são `higgsfield generate create gpt_image_2`.
- **Desdobramento, não redesign.** Se Feed ou LinkedIn parecem uma arte nova inspirada na original, está errado.
- **Imagem-base SEMPRE junto.** Cada `generate` precisa usar `--base <arte-mae>`; o script sobe essa imagem como primeira referência e passa junto por `--image`.
- **Base-only como padrão.** Não mande todas as imagens se elas não forem necessárias. Várias refs competindo causam deriva visual.
- **Prompt curto.** O GPT Image 2 já lê a arte. Peça transformação, formato, copy exata e só o que precisa trocar.
- **Stories sempre em 3.** Gere três variações da mesma arte-mãe, com textos e imagens/backgrounds diferentes. O trio precisa variar cena/crop/fundo/iluminação sem inventar uma nova direção visual.
- **Chain de referência é o `generate`.** Ele já sobe a arte-mãe e usa o UUID do Higgsfield. Não tente fazer chain manualmente.
- **Cada formato é independente.** Stories falhar não para Feed/LinkedIn.
- **Copies completas, do zero.** Instagram Feed, roteiro de Stories e LinkedIn precisam ter textos finais próprios. Nada de adaptação preguiçosa.
- **PDF final obrigatório.** Toda execução termina com `presentation-pdf`.
- **Output limpo obrigatório.** Toda execução finalizada precisa deixar `desdobramento/output/` organizado para o usuário.
- **Stateless.** Cada `/desdobrar` é uma execução fresca. Sem cache, sem state.
