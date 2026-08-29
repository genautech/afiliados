# 09 — Render engine (V3 — Higgsfield CLI)

> **Onde colar:** Página `⚙️ Render engine` no Notion (sem API key, só método).
> A execução real acontece **dentro da session da Routine Local** (`13-R2-Routine-Local.md`) — Claude usa Bash + Read + Higgsfield CLI pra orquestrar tudo.

---

## O que mudou de V1 → V2 → V2.5 → V3

**V1 (Routine Web — quebrou):** R2 chamava uma API externa de imagem direto do sandbox. Allowlist do sandbox não permitia esse caminho → render impossível.

**V2 (script local):** R2 virou `~/{brand-slug}/r2/run.sh` agendado por `launchd`. Roda como processo Mac normal: tem rede aberta, ImageMagick, Python, vision real via `claude` CLI subprocess, rclone.

**V2.5 (Routine Local):** R2 vira **uma Routine Local** do Claude Desktop. Roda dentro de uma session do Claude, com Bash + Read/Write + WebFetch + MCP Notion + MCP Drive nativos. Sem scripts atômicos, sem launchd, sem Homebrew. Mesmo método de render, mas orquestrado pelo prompt.

**V3 (Higgsfield CLI):** R2 mantém Routine Local, mas troca qualquer chamada antiga de API direta, Flow AI, script legado ou Higgs MCP por Higgsfield CLI. O fluxo visual passa a ser: `higgsfield upload create` para refs locais, `higgsfield generate create` para render e `higgsfield generate wait` para coleta. Não usar Higgs MCP.

Resto do método permanece: referência visual via CLI, geração 3:4 e entrega do PNG original baixado do Higgsfield. Não há normalização final para 1080×1350, downscale, crop ou mudança de aspect ratio.

Render dos slides 2-9 é **paralelo**: a capa é gerada primeiro; depois todos os slides internos usam a capa + as referências visuais da marca como UUIDs de referência. Isso mantém a estética ancorada na capa e nas refs, evita depender do slide anterior e reduz o tempo total da entrega.

---

## Provedor e modelo

- **Provedor:** Higgsfield CLI
- **Modelo obrigatório de imagem:** GPT Image 2 (`gpt_image_2`)
- **Qualidade obrigatória:** `--quality high`
- **Comandos:** `higgsfield upload create`, `higgsfield generate create`, `higgsfield generate wait`
- **Referências:** imagens locais viram UUIDs Higgsfield e entram como `--image`
- **Fallback text-to-image:** mesma CLI, sem `--image`, apenas quando a marca não tiver nenhuma ref anexada

### Características do Higgsfield CLI que importam
- Referências ficam mais estáveis quando cada imagem local é enviada antes com `higgsfield upload create`
- Render final precisa registrar UUIDs, prompt, modelo, job_id e URL de saída
- Para o carrossel Instagram, gerar com `--aspect_ratio "3:4"`, `--resolution "2k"` e `--quality high` porque essa é a opção retrato aceita pela CLI atual.
- A saída final é o PNG baixado do Higgsfield no tamanho original retornado. Se vier 1856px ou outra dimensão 3:4 de alta resolução, mantenha assim.

---

## Autenticação

O Higgsfield CLI deve estar instalado e logado localmente.

Na Etapa 0 do prompt da Routine, o R2 roda:

```bash
higgsfield account status
```

Se falhar, orientar:

```bash
npm install -g @higgsfield/cli
higgsfield auth login
```

> Detalhes da página de ambiente em `03-Notion-template.md` (seção "Página 🔐 Configuração").

---

## Estratégia de imagens — quando usar foto da notícia, gerar nova, ou ficar sem

Imagem é o que para o scroll. **Capa sem imagem boa não viraliza.**

> **De onde vem a foto da notícia:** o R1 (Remote) não baixa imagens — o sandbox dele bloqueia HTTP direto. Quem extrai a foto real é o R2, na **Etapa 1.5** (`13-R2-Routine-Local.md`), que roda Local com rede aberta. O R2 baixa a hero pra `state/{TODAY}/news-hero.jpg` e sobe pra uma URL pública (`hero_url`). Se a extração falhar, o R2 usa a `Dica visual` que o R1 escreveu pra gerar uma imagem coerente (Caminho B).

### Filtro de decisão

Toda imagem que entra no carrossel passa por 3 perguntas:

1. A Etapa 1.5 conseguiu extrair a hero real da notícia (`news-hero.jpg`)?
2. Se sim, ela é boa visualmente (resolução, composição, ao tema)?
3. Casa com a estética definida em `🖼️ Referências visuais` ou pode ser re-estilizada via overlay/treatment?

| Cenário | Ação |
|---------|------|
| Tem imagem boa + casa com estética | Usa direto como referência de conteúdo (Caminho A) |
| Tem imagem boa + não casa com estética | Usa como referência mas com instrução de re-estilização (Caminho C) |
| Tem imagem mas é fraca (logo, screenshot ruim, baixa res) | Gera nova com direção textual (Caminho B) |
| Não tem imagem nenhuma | Gera nova com direção textual editorial (Caminho B) |

### Regra base por slide (default V2.5 — mais imagens)

| Slide | Função | Imagem? | Tipo |
|-------|--------|---------|------|
| 1 Capa | Capa | **Sempre** | Full-bleed background + logo pequena se `brand_has_logo` |
| 2 Hook | Tensão inicial | **Frequente** | Image box no topo OU foto background com overlay escuro |
| 3 Contexto | O que dados mostram | **Sempre** | Image box retangular no topo |
| 4 Mecanismo p1 | Como funciona | **Frequente** | Tipografia grande + foto de apoio em metade do slide |
| 5 Prova | Dados / tabela | Frequente | Tabela ou big stat ao lado de foto contextual |
| 6 Expansão | A virada | **Sempre** | Foto de fundo com overlay escuro |
| 7 Aplicação | Casos práticos | **Sempre** | 3 cards horizontais com mini-imagens |
| 8 Direção | Direção pivotal | **Frequente** | Foto + overlay OU dark/light sólido com tipografia hero. **Gradient só se refs visuais sugerem.** |
| 9 CTA | Assinatura | Pode ter bg | **Logo/lockup grande centralizado** + CTA curto |

Tipicamente **7-8 slides com imagem** de 9 totais (vs 5 na V2 anterior). Carrossel é mais visual, com texto enxuto.

**Gradient**: deixou de ser obrigatório no slide 8. Só usa se o briefing visual decodificado de `🖼️ Referências visuais` mencionar gradient como parte do sistema. Senão, slide 8 fica em dark/light sólido com headline forte.

---

## Direção criativa das imagens dentro do slide

> O slide é uma composição: **design (tipografia, hierarquia, paleta) + imagem impactante embutida**. A qualidade do carrossel é decidida tanto pelo design quanto pela imagem. Imagem genérica = carrossel genérico, por melhor que seja o design.

Cada slide com imagem precisa de um **image brief** que a Routine constrói antes do render. O brief é injetado no prompt do Higgsfield CLI como bloco descritivo da imagem que deve aparecer dentro do slide.

### Os 5 princípios do image brief

**1. Especificidade visual (não adjetivos vagos)**
Não escreve "imagem bonita de tecnologia". Escreve:
- **Cores** específicas (terracotta saturado contra azul-petróleo dessaturado; ou monocromático cinza-quente com 1 ponto de cor primária)
- **Estilo** identificável (fotografia editorial 35mm, ilustração risograph 2 cores, render 3D matte fosco, collage analógico, etc.)
- **Iluminação** definida (luz rasante do lado direito criando sombra dura; rim light dourado contra fundo escuro; difusa neutra de catálogo)
- **Ângulo de câmera** (close-up frontal, plano-detalhe, overhead, low-angle dramático)
- **Elementos** concretos no quadro (não "uma cena", mas "um par de mãos digitando em laptop antigo prata sobre mesa de madeira escura com xícara de café à esquerda")

**2. Propósito conectado à narrativa**
Cada imagem serve a função do slide. Brief explicita o sentimento que a imagem precisa transmitir:
- Slide de hook → tensão, contradição visual, urgência
- Slide de mecanismo → revelação, "olhar por dentro", contraste antes/depois
- Slide de prova → autoridade, materialidade dos dados (papel, gráfico físico, tela)
- Slide de expansão → escala, contexto maior, panorâmica
- Slide de aplicação → humanidade, gesto, momento ordinário
- Slide de CTA → assinatura de marca, espaço negativo, CTA curto

**3. Sem ambiguidade — metáforas visuais claras**
Metáfora explícita > metáfora vaga. Em vez de "ideia abstrata de criatividade", escreve "uma mão segurando um pincel com tinta laranja escorrendo, encostando em tela cinza". A IA renderiza o que é descrito; não infere bem o abstrato.

**4. Reinterpretação fiel quando há hero da notícia**
Quando a notícia traz hero image e o caminho é A ou C, o image brief precisa **descrever fielmente o conteúdo da hero** (o que está nela, o que importa, o que tem que ser preservado) + **indicar o estilo de reinterpretação** (re-renderizar como editorial 35mm, manter mas com overlay de cor primária, recortar e isolar o assunto principal contra novo fundo, etc.). 

A Routine olha a hero (vision real), descreve textualmente, envia a hero e as refs ao Higgsfield com `higgsfield upload create`, e injeta os UUIDs com `--image` junto do prompt — combinando os dois, gera uma versão estilizada coerente com o sistema visual da marca.

**5. Capa SEMPRE muito chamativa**
A capa é o slide que para o scroll. Regras adicionais pra ela:
- **Composição cinemática** (regra dos terços, leading lines, profundidade, foreground/background separados por foco)
- **Iluminação dramática** (chiaroscuro, rim light, golden hour, harsh side light) — nunca difusa neutra de catálogo
- **Elemento focal único e forte** (um rosto, um objeto, um símbolo) — não cena dispersa
- **Saturação seletiva** — fundo dessaturado, ponto focal saturado na cor primária da marca
- **Tensão narrativa** — algo está acontecendo no instante capturado (movimento, gesto, prestes a, na iminência de) — nunca posa estática
- **Anti-stock photo absoluto** — sem aperto de mão corporativo, sem laptop com gráfico brilhando, sem grupo sorrindo pra câmera, sem mãos digitando genericamente

### Regra-mãe do image_brief — refs mandam, assunto obedece

Acima dos 5 princípios, vale o princípio que manda em todos: **cada campo do image_brief é preenchido a partir do "Imagery style" e do "Tonal register" do visual brief decodificado, não a partir de uma leitura literal da notícia.**

- `style` → copia o tipo de imagem das refs (fotográfico editorial / humano / still de objeto / ilustração). Nunca um estilo que as refs não têm.
- `color_treatment` e `lighting` → respeitam o registro tonal das refs. Refs claras → iluminação e tratamento de cor claros. Não escurece.
- `subject` e `metaphor` → traduzem o assunto da notícia PARA a linguagem das refs. Refs com pessoas → o subject tem pessoas. Refs editoriais → o subject não é screenshot nem diagrama.
- `avoid` → inclui sempre "qualquer estilo, paleta ou luminosidade que contradiga as imagens de referência da marca".

Quando a notícia é sobre software/IA e as refs são humanizadas, o conflito se resolve SEMPRE a favor das refs: a imagem mostra a cena humana que representa o impacto da notícia, não a interface do produto.

### Schema do image_brief por slide

A Etapa 3 do prompt da Routine (Plano visual por slide) produz, para cada slide com imagem:

```json
{
  "slide_N": {
    "caminho": "A | B | C",
    "hero_url": "...|null",
    "image_brief": {
      "purpose": "tensão narrativa de urgência geracional",
      "subject": "um celular antigo Nokia 3310 caído numa mesa de café junto a um cappuccino derramado",
      "composition": "overhead 90°, objetos no terço inferior, espaço negativo no superior",
      "lighting": "luz natural lateral, sombras duras, ~10h da manhã",
      "color_treatment": "predominante cinza-quente + 1 ponto laranja-terracota no líquido derramado",
      "style": "fotografia editorial 35mm, grão fino, profundidade média",
      "mood": "abandono, ruptura silenciosa, pausa",
      "metaphor": "geração que desliga o telefone moderno e tropeça no analógico",
      "avoid": "sem mãos no quadro, sem rosto, sem texto sobre a imagem"
    }
  }
}
```

Esse JSON entra no prompt do slide N como descrição textual estruturada.

### Variação por tipo de slide

| Slide | Tipo de imagem ideal | Mood-base |
|---|---|---|
| 1 Capa | Cinemática, focal forte, dramática | Tensão narrativa máxima |
| 2 Hook | Detalhe carregado de conflito | Inquietação |
| 3 Mecanismo p1 | Diagrama-objeto / setup / revelação | Atenção, foco analítico |
| 4 Mecanismo p2 | Contraste antes/depois OU close-up de processo | Mostrar como |
| 5 Prova | Materialidade dos dados (papel, tela, gráfico físico, número impresso) | Autoridade, peso |
| 6 Expansão | Panorâmica, escala, contexto cultural amplo | Significância |
| 7 Aplicação | Humano, gesto, momento ordinário em nicho diverso | Aplicabilidade |
| 8 Direção | Símbolo condensado, frase visual | Foco direcional |
| 9 CTA | Logo/lockup grande centralizado, CTA curto abaixo, composição quieta | Assinatura |

### Bloco do image_brief dentro do prompt final do slide

Quando a Routine monta o prompt da chamada `higgsfield generate create`, o bloco fica assim:

```
[bloco visual_brief decodificado das refs — já existe]

[NOVO — bloco image_brief específico deste slide:]
Image embedded in this slide:
- Subject: {subject}
- Composition: {composition}
- Lighting: {lighting}
- Color treatment: {color_treatment}
- Style: {style}
- Mood: {mood}
- Metaphor: {metaphor}
- AVOID in the image: {avoid}

The image occupies {image_box_or_fullbleed_or_background}. The image is 
NOT generic stock — it is a specific, intentional visual that carries 
the slide's narrative function.

[resto do prompt — composição do slide, hierarquia, brand bar, etc.]
```

Resultado: o Higgsfield CLI não recebe "uma imagem genérica de IA" no campo background do slide. Recebe uma direção visual específica e intencional.

---

## Decodificar referências visuais — vision real + detecção de grids

Antes de gerar a capa, a Routine lê `🖼️ Referências visuais` via MCP Notion, baixa **todas** as imagens anexadas (tipicamente 3 a 7, ou um grid), e processa com **vision nativa da session do Claude**.

**Detecção de grids:** cada imagem é avaliada — é unitária ou é um grid com múltiplos slides? Se grid (sinais: regularidade espacial, bordas repetidas, retângulos similares lado a lado), a Routine mentalmente decompõe em N exemplares (grid 3×3 = 9 refs; print de feed = 6+ refs) e observa cada um separadamente. **Uma única imagem em grid bom basta** — não precisa exigir 5 imagens separadas.

**Detail signature:** a Routine identifica explicitamente qual é o **elemento de consistência repetido** nos exemplares observados (linha fina no rodapé com data, micro-grafismo lateral, tag minúscula, assinatura tipográfica). Esse detail signature entra no briefing como seção dedicada e é replicado em TODOS os 9 slides do carrossel gerado, sem número de slide.

```bash
# Dentro da session da Routine — Bash via tool:
mkdir -p ./state/$TODAY/refs/

# Pra cada URL de imagem extraída via MCP Notion:
curl -fsS "$IMG_URL" -o "./state/$TODAY/refs/ref-01.jpg"
curl -fsS "$IMG_URL_2" -o "./state/$TODAY/refs/ref-02.jpg"
# ... etc
```

Depois a session usa o **Read tool** em cada arquivo de imagem baixado. Claude tem vision nativa — vê a imagem direto, sem precisar de subprocess `claude --print --files`.

O briefing é compilado pela própria session (Claude descreve o que viu) e salvo em `./state/$TODAY/visual-brief.txt`.

### Fidelidade às referências — erros recorrentes a corrigir

Dois erros aparecem com frequência quando a R2 decodifica as refs. O briefing precisa neutralizar os dois explicitamente:

**Erro 1 — escurecer o que não é escuro.** A R2 tende a puxar a paleta pro escuro mesmo quando as refs são claras, médias ou coloridas. Isso muda a identidade do feed. Correção:
- Ao observar cada ref, registre o **registro tonal real**: a imagem é predominantemente clara, média ou escura? Qual a luminosidade dominante do fundo?
- Se as refs são claras/médias, o carrossel é claro/médio. **O ritmo dark/light do Design System é subordinado às refs** — se as refs não têm slides escuros, não invente slides escuros.
- Os fundos (background) dos slides reproduzem a luminosidade observada nas refs, não um default escuro.
- O briefing declara explicitamente o brilho aproximado dos fundos (ex: "light slides background ~#F1ECE3, near-white; refs show no dark slides, keep the whole carousel light/mid").

**Erro 2 — ilustrar o assunto ao pé da letra.** A R2 tende a gerar imagem literal do tema da notícia (notícia sobre um app → screenshot do app) mesmo quando as refs mostram outra linguagem visual (pessoas, gesto, cena humana, fotografia editorial). Correção:
- O **estilo de imagem vem das refs**, não do assunto. Se as refs são humanizadas (pessoas, mãos, rostos, cenas reais), as imagens do carrossel são humanizadas — ainda que a notícia seja sobre software.
- O assunto da notícia entra como **metáfora visual no estilo das refs**, não como ilustração literal.
- O briefing tem uma seção "Imagery style" descrevendo o tipo de imagem das refs — e essa seção manda no image_brief de cada slide.

### Estrutura do briefing decodificado

```
VISUAL BRIEF (decoded from references):

Color palette:
- Primary: {brand_color_primary} (warm orange, terracotta-leaning, slightly burnt)
- Background dark: {brand_color_dark}
- Background light: {brand_color_light}
- Accent secondary: [observado nas referências]

Tonal register / luminosity (CRITICAL — do not drift darker than the refs):
- Dominant register of the references: [light / mid / dark] — [describe]
- Background luminosity observed: [e.g. "backgrounds are near-white warm
  cream, ~90% luminance; NO dark slides present in refs"]
- Slide backgrounds for this carousel must match this register. If the refs
  are light/mid, the carousel is light/mid. Do NOT default to dark backgrounds.
- The dark/light rhythm from the Design System applies ONLY if the refs
  actually show both. Refs decide; the rhythm table does not override them.

TYPOGRAPHY LOCK (verbatim from 🖼️ Referências visuais — NOT re-derived):
- Display font (headlines): exact locked name + locked description
- Text font (body, tag, brand bar, signature): exact locked
  name + locked description
- The exact size/weight table — one fixed value per role, never a range.
This whole block is copied verbatim into EVERY slide prompt — same fonts,
weights and sizes on every slide of every carousel. Never paraphrase,
substitute or vary between slides.

Mood and atmosphere:
- Editorial, magazine-like, sober. References European design publications
  (Eye Magazine, Wallpaper, It's Nice That). Subtle film grain texture.

Imagery style (what KIND of image the refs use — overrides literal subject):
- Type of imagery in the refs: [editorial photography / humans & gesture /
  object stills / illustration / abstract texture / mixed — describe]
- If the refs are human/photographic, the carousel images are human/
  photographic too — even when the news is about software or an abstract
  topic. The news subject becomes a visual metaphor IN THIS STYLE, never a
  literal screenshot/diagram that contradicts the refs.
- Level of literalness observed: [literal depiction / metaphorical / editorial]

Composition style:
- Left-aligned text, generous negative space in upper portion,
  content anchored to lower two-thirds.
- Higher image-to-text ratio observed — 7 of 9 slides feature an image
  element. Text is concise — short headlines + 1-2 lines of body max.

Texture and finish:
- Subtle paper grain. No glossy or 3D elements.

Use of gradient:
- [Observed in refs / NOT observed in refs] — apply accordingly.
  If NOT observed, slide 8 stays dark or light solid with hero typography.

Detail signature / footer:
- Consistent element repeated across all 9 slides — [describe what was 
  observed in refs: e.g. "thin horizontal line at the very bottom with 
  date + handle text, e.g. '2026.05.14 · @humanacademy', font-size ~12px, 
  opacity 55%"]. This makes the feed feel curated.

What to AVOID:
- No emojis, no decorative icons, no stock photo aesthetic,
  no 3D effects, no glossy reflections, no generic gradients,
  no AI faces, no random abstract shapes, no Y2K, no neon glow.
```

Briefing fica salvo em `state/{TODAY}/visual-brief.txt` e é injetado como bloco fixo em **todos** os prompts (capa e slides internos) daquela run.

---

## Regra absoluta — todo o texto do slide vai renderizado DENTRO da imagem

O carrossel é gerado como **imagem com o texto já integrado** — não é imagem de fundo pra receber texto depois. O GPT Image 2 renderiza texto dentro da imagem; por isso, o prompt precisa ser direto, integrado e fiel às referências. Toda chamada ao render — capa e slides 2-9 — **precisa** conter, no prompt, os blocos de copy exatos daquele slide, transcritos literalmente.

**Nunca** gere um slide só com o briefing visual e o image_brief sem o texto. Isso produz uma imagem bonita e vazia, que depois não tem como receber a copy sem retrabalho.

### O que entra no prompt de cada slide, sempre

Para cada slide N, o prompt do render carrega um bloco `═══ TEXT CONTENT (render this text inside the image) ═══` com:
- A **tag** do slide (uppercase, pequena) — slides 2-8
- A **headline / título interno** do slide, transcrita exatamente como está no `narrativa.json`
- **Todos os blocos de body** daquele slide (texto 3+4, 5+6, etc.), transcritos exatamente
- As **palavras-chave** que recebem accent na cor primária
- Brand bar, handle e detail signature

No slide 9, a regra muda: o bloco de texto contém apenas o CTA curto (`texto 17`) e, se não houver logo, o lockup textual/handle (`texto 18`). Não renderizar tag, número de slide, parágrafo, resumo, pergunta final nem body adicional. O logo ou `{brand_name}` precisa dominar a composição, com o CTA abaixo em hierarquia menor.

**Proibido em qualquer slide:** número visível do carrossel, counter, índice, bolinhas numeradas, marcador de posição ou qualquer paginação textual. O número do slide existe apenas no arquivo/prompt interno, nunca na arte final.

O prompt instrui explicitamente: *"Render ALL the text below as crisp, legible, correctly-spelled typography composed into the slide. The text is the primary content of this slide — not decoration. Do not paraphrase, do not omit any block, do not invent text that is not listed."*

### Verificação obrigatória pós-render

Depois de baixar cada slide, a Routine **abre o PNG com o Read tool (vision)** e confere:
- [ ] Todos os blocos de copy do slide aparecem na imagem
- [ ] O texto está legível e sem erro de ortografia
- [ ] Nenhum texto foi cortado pela borda

Se um slide voltou **sem o texto** ou com texto ilegível/cortado/trocado → conta como **falha de render** → re-roda aquele slide (até 2x). Slide sem a copy integrada nunca é aceito como final.

---

## Regra absoluta — dimensão do slide via Higgsfield CLI

O Higgsfield pode devolver arquivos maiores que 1080px (ex.: ~1856px). Isso é bom. O carrossel entrega o PNG original baixado do Higgsfield, sem downscale, crop, resize ou conversão para 1080×1350.

**1. Toda chamada ao render — capa e slides 2-9 — passa flags explícitas da CLI.**

```bash
--aspect_ratio "3:4" --resolution "2k" --quality high
```

Nunca omita essas flags. Nunca confie no default. Nunca use parâmetro legado de tamanho fixo: isso era instrução de provider antigo, não do Higgsfield CLI atual.

**2. Por que 3:4 e não 4:5 direto.** A CLI atual não aceita `4:5` como `--aspect_ratio`. Use `3:4` e mantenha o arquivo retornado. Não converta para 4:5 depois.

**3. O prompt reforça o formato.** A primeira linha de todo prompt de slide declara: *"A portrait Instagram carousel slide, aspect ratio 3:4."* Isso impede o modelo de derivar pra quadrado ou paisagem sem sugerir crop posterior.

**4. Validação pós-download — sem squish.** Depois de baixar cada PNG, leia as dimensões (Pillow):
- Voltou com proporção **3:4** → ok, segue.
- Voltou com proporção diferente de **3:4** (quadrado, paisagem, recortado) → é **falha de render**. Re-roda o slide (até 2x). **NUNCA force um PNG de proporção errada para outro tamanho — isso espreme a imagem e distorce.**

**5. Composição de logo sem alterar dimensão.** Quando precisar aplicar logo nos slides 1 e 9, use Pillow apenas para compor a logo sobre o PNG original, mantendo largura, altura e aspect ratio do arquivo baixado.

---

## Etapa 1 — Geração da capa (slide 1)

### Qual comando

A capa SEMPRE vai com as refs da marca como UUIDs `--image` — é o que ancora estética e fonte. Use Higgsfield CLI nos dois caminhos:

| Caminho | Comando | Referencias |
|---------|----------|--------------|
| B — sem foto da notícia | `higgsfield generate create gpt_image_2` | refs da marca |
| A ou C — com foto da notícia | `higgsfield generate create gpt_image_2` | foto da notícia + refs da marca |

Fallback raro: se a marca não tiver NENHUMA ref anexada, use o mesmo comando sem `--image`.

### Chamada Caminho B (Bash dentro da Routine)

Caminho B = sem foto da notícia. Mas a capa SEMPRE recebe as refs da marca como UUIDs:

```bash
REF_FLAGS=$(cat ./state/$TODAY/higgsfield-ref-flags.txt)
COVER_JOB=$(higgsfield generate create gpt_image_2 \
  --prompt "$PROMPT_CAPA" \
  $REF_FLAGS \
  --aspect_ratio "3:4" \
  --resolution "2k" \
  --quality high \
  --json | grep -oiE '[0-9a-f-]{36}' | head -1)

COVER_JSON=$(higgsfield generate wait "$COVER_JOB" --timeout 30m --json)
COVER_URL=$(echo "$COVER_JSON" | grep -oE 'https://[^ "]+\\.(png|jpg|jpeg|webp)' | head -1)
echo "$COVER_URL" > ./state/$TODAY/cover-url.txt
```

### Chamada Caminho A/C (com foto da notícia)

A foto da notícia entra primeiro como UUID, seguida das refs da marca:

```bash
NEWS_UUID=$(higgsfield upload create "./state/$TODAY/news-hero.jpg" | grep -oiE '[0-9a-f-]{36}' | head -1)
REF_FLAGS="--image $NEWS_UUID $(cat ./state/$TODAY/higgsfield-ref-flags.txt)"
COVER_JOB=$(higgsfield generate create gpt_image_2 \
  --prompt "$PROMPT_CAPA" \
  $REF_FLAGS \
  --aspect_ratio "3:4" \
  --resolution "2k" \
  --quality high \
  --json | grep -oiE '[0-9a-f-]{36}' | head -1)
```

### Template do prompt da capa

```
A portrait Instagram carousel cover slide, aspect ratio 3:4.

{VISUAL_BRIEF_DECODED}

Internal role: COVER. Do not draw any page index, carousel counter, sequence marker or visible slide number.
It establishes the visual identity for the entire carousel. The cover MUST be visually arresting — magazine
cover quality, the kind of image that stops the scroll.

═══ EMBEDDED IMAGE (full-bleed background) ═══
{IMAGE_BRIEF_DA_CAPA}

The embedded image carries the cover. Treat it with cinematic care:
- Composition: {composition} — strong focal point, rule of thirds,
  leading lines if applicable, foreground/background separated by focus
- Lighting: {lighting} — dramatic (chiaroscuro, rim light, golden hour, 
  or harsh side light). NEVER flat catalog lighting.
- Color: {color_treatment} — selective saturation: muted backdrop, 
  saturated focal point ideally in {brand_color_primary}
- Style: {style} (editorial 35mm photo / risograph illustration / 
  matte 3D render / analog collage / etc — never generic AI gloss)
- Mood: {mood} — narrative tension. Something is happening or about to.
- Metaphor: {metaphor}

═══ COVER COMPOSITION ═══
- Full-bleed image background as described above
- Heavy dark gradient overlay at the bottom 55-60% to ensure 4.5:1 
  contrast against headline
- Thin accent bar (6px) at the very top in {brand_color_primary}
- {LOGO_INSTRUCTION_IF_HAS_LOGO}
- Headline anchored in lower 35% of canvas, left-aligned, generous 
  left margin (~80px)
- Handle "{brand_handle}" small, above the headline block

═══ TEXT CONTENT — render ALL of this text inside the image ═══
This text is the primary content of the cover, not decoration. Render it
as crisp, legible, correctly-spelled typography. Do not omit, paraphrase
or invent text.
- Brand bar (very top, small, low opacity): 
  "POR {brand_name}  |  {brand_handle}  |  2026"
- Handle: "{brand_handle}"
- Headline (largest element, bold condensed uppercase, tight kerning):
  "{HEADLINE_DA_CAPA}"
- Highlight in {brand_color_primary}: {LISTA_DE_PALAVRAS_CHAVE}

═══ TYPOGRAPHY LOCK — use EXACTLY these fonts, verbatim ═══
{TYPOGRAPHY_LOCK_BLOCK}
(copied verbatim from the locked font system in 🖼️ Referências visuais:
the 2 fonts and the exact size/weight table. Same fonts, weights and sizes
on every slide of every carousel — never substitute, never vary.)

═══ DETAIL SIGNATURE ═══
{DETAIL_SIGNATURE_DESCRITO_NO_VISUAL_BRIEF}
(footer consistency element repeated across all 9 slides)

═══ ABSOLUTE NO-GO ═══
Do NOT include: emojis, decorative icons, stock photo aesthetic, 
3D glossy effects, lens flares (unless cinematic intent), generic 
gradients, AI-rendered faces with uncanny features, corporate 
handshakes, smiling group photos to camera, hands typing generically 
on laptop, lightbulb-as-idea cliché, gears-as-strategy cliché.

═══ MOOD TARGET ═══
This cover should look like it was art-directed by a design magazine —
not generated by AI. Confidence. Sharpness. Specificity. Tension.
```

Baixar PNG local e manter o tamanho original retornado pelo Higgsfield:

```bash
curl -fsS "$COVER_URL" -o ./state/$TODAY/slides/slide-01-raw.png
uv run --with pillow python3 -c "
from PIL import Image
img = Image.open('./state/$TODAY/slides/slide-01-raw.png').convert('RGBA')
w, h = img.size
ratio = round(w / h, 3)
# 3:4 = 0.75. Qualquer outra proporcao e falha de render — re-rodar a capa.
assert abs(ratio - 0.75) < 0.01, f'PROPORCAO ERRADA {w}x{h} (ratio {ratio}) — re-rodar a capa, NAO forcar resize'
# Se brand_has_logo=true, aplique a logo numa copia final sem alterar w/h.
# A capa sem logo fica em slide-01-raw.png e sera usada como referencia dos internos.
img.convert('RGB').save('./state/$TODAY/slides/slide-01.png', quality=95)
"
```

Se o `assert` disparar, a capa voltou com proporção errada → re-roda a capa (não segue pros slides 2-9 com uma capa distorcida). Não faça crop, resize ou downscale. A cópia `slide-01-raw.png` deve permanecer, porque ela vira a referência de capa sem logo para os slides internos.

> **Bug clássico:** capturar URL do filesystem em vez do response do render. **Sempre grave `cover-url.txt` IMEDIATAMENTE** após capturar o response do `generate wait`. Slides 2-9 dependem dela.

---

## Etapa 2 — Slides 2-9 (paralelo com capa + refs)

Os slides 2-9 são gerados em **paralelo**. Cada slide referencia a capa gerada e todas as referências visuais da marca. Não use o slide anterior como referência: isso deixa a tarefa lenta e faz o visual depender de um elo que pode ter saído fraco.

Todos usam `higgsfield generate create gpt_image_2`. As referencias entram como UUIDs `--image`.

**Referências de cada slide interno (`--image`):**
- **Slides 2-9** → `[capa sem logo]` + **todas as refs da marca**.
- Qualquer slide que use a foto da notícia (Caminho A/C) acrescenta `hero_url` ao final.
- Logo nunca entra como `--image` (entra via Pillow no slide 9).

**Por que capa + refs em todos:** a capa dá a direção final já gerada; as refs visuais trazem repertório de imagem, tipografia e composição que a capa sozinha não carrega. Assim os slides internos podem rodar juntos e ainda manter a estética.

As refs do Notion sao baixadas localmente e enviadas ao Higgsfield com `higgsfield upload create`. Os slides já prontos vêm dos `url-N.txt` retornados pelo Higgsfield.

```bash
COVER_UUID=$(higgsfield upload create "./state/$TODAY/slides/slide-01-raw.png" | grep -oiE '[0-9a-f-]{36}' | head -1)
BASE_REF_FLAGS="--image $COVER_UUID $(cat ./state/$TODAY/higgsfield-ref-flags.txt)"

for N in 2 3 4 5 6 7 8 9; do
  (
  PROMPT_FILE="./state/$TODAY/prompts/slide-$N.txt"
  REF_FLAGS="$BASE_REF_FLAGS"
  # Se o visual-plan marcar Caminho A/C, acrescente o UUID da hero da noticia aqui.

  JOB=$(higgsfield generate create gpt_image_2 \
    --prompt "$(cat "$PROMPT_FILE")" \
    $REF_FLAGS \
    --aspect_ratio "3:4" \
    --resolution "2k" \
    --quality high \
    --json | grep -oiE '[0-9a-f-]{36}' | head -1)

  RESP=$(higgsfield generate wait "$JOB" --timeout 30m --json)
  SLIDE_URL=$(echo "$RESP" | grep -oE 'https://[^ "]+\\.(png|jpg|jpeg|webp)' | head -1)
  echo "$SLIDE_URL" > "./state/$TODAY/url-$N.txt"

  # baixa e valida proporção 3:4; mantém o tamanho original do Higgsfield
  curl -fsS "$SLIDE_URL" -o "./state/$TODAY/slides/slide-0$N.png"
  uv run --with pillow python3 - <<PY
from PIL import Image
img = Image.open("./state/$TODAY/slides/slide-0$N.png")
w, h = img.size
assert abs(w/h - 0.75) < 0.01, f"PROPORCAO ERRADA {w}x{h} — re-rodar slide $N, NAO forcar resize"
PY
  ) &
done
wait
```

**Robustez do paralelo:** se um slide falhar mesmo após os retries (500/502), marca apenas aquele slide como falha. Os outros não dependem dele e continuam.

Tempo total esperado: **1-3 min** para os 8 slides internos em paralelo, dependendo da fila/modelo.

---

## Tratamento de erro

| Erro | Ação |
|---|---|
| `higgsfield: command not found` | Instalar `@higgsfield/cli` e parar a run |
| Login ausente | Rodar `higgsfield auth login`, depois `higgsfield account status` |
| Rate limit | `sleep 5` entre chamadas |
| Créditos insuficientes | Recarregar a conta Higgsfield |
| Aspect ratio inválido | Usar `--aspect_ratio "3:4"` e baixar o PNG original; se vier em outra proporção, re-renderizar |
| Erro 5xx/timeout | Retry até 2x. Se persistir, marca slide como falha; não bloqueia outros |
| Timeout >60s | Cancela, retry uma vez |
| Sem URL no output do `generate wait` | Loga output cru pra debug, marca slide como falha |

**Paralelo:** os slides 2-9 não dependem entre si. Cada um usa capa + refs visuais. Se um slide falhar após os retries, os demais continuam e a caption final lista quais slides falharam.

---

## Custo

Custos dependem do modelo e dos créditos da conta Higgsfield ativa. Antes de render real, rode:

```bash
higgsfield account status
```

Recomendação:
- iterar pouco antes de render;
- gerar apenas variações necessárias;
- registrar modelo, job_id e tentativa;
- parar se a conta indicar créditos insuficientes.

---

## Anexar slides ao Notion via arquivos/URLs retornadas pelo Higgsfield

A Routine pode passar a URL retornada pelo Higgsfield como `external.url` no PATCH da entry via MCP Notion, e tambem deve salvar backup local + Drive:

```python
# Conceitual — a Routine usa MCP Notion tools nativos:
notion.pages.update(carousel_page_id, properties={
  "Slides": {
    "files": [
      {
        "name": f"slide-{i:02d}.png",
        "type": "external",
        "external": {"url": cover_url if i == 1 else slide_urls[i-2]}
      }
      for i in range(1, 10)
    ]
  }
})
```

Vantagens:
- Aparece **imediatamente** no Notion (sem upload)
- Não estoura contexto da session (sem base64)
- URLs externas aparecem rapido no Notion
- Drive vira backup independente via MCP (paralelo, não bloqueia Notion)

---

## Re-render — fluxo barato

Quando o pipeline editorial está OK mas o visual veio fraco:

**Opção A — na session ativa:**
```
> --re-render
```

**Opção B — Run now no painel:**
```
[Routine] → Run now → "--re-render"
```

A Routine:
1. Lê `state/$TODAY/narrativa.json` (arquitetura narrativa já validada; se só houver snapshot antigo, migrar para o nome novo antes de seguir)
2. Lê `state/$TODAY/visual-plan.json`
3. Re-roda visual brief (re-faz vision das refs, pode capturar mudanças)
4. Re-roda render (capa primeiro; slides 2-9 em paralelo com capa + refs)
5. PATCH na entry existente do Notion (mesma página, substitui Slides)
6. Incrementa `Render attempts` na entry

Custo: conferir créditos Higgsfield antes de re-render. Tempo: depende da fila/modelo.

Quando usar `--re-render`:
- Visual ficou genérico → editou `🖼️ Referências visuais`, regenera
- Cor saiu errada → ajustou `🏷️ Brand Identity`, regenera
- Slides 2-9 não coerentes com capa → refaz com prompts/refs mais restritos

Quando NÃO usar `--re-render` (use nova run):
- Copy ficou fraca → ajusta `📚 Manual editorial`, roda full
- Notícia escolhida foi ruim → `--news=N` pra override

---

## Ordem de execução pela Routine (resumo)

```
1. Lê 🏷️ Brand Identity → hidrata variáveis
2. Lê 🖼️ Referências visuais (via MCP Notion) → URLs das imagens
3. Bash curl baixa imagens em state/$TODAY/refs/
4. Read tool das imagens (vision nativa) → compila visual brief em texto
5. Salva state/$TODAY/visual-brief.txt
6. Lê arquitetura narrativa validada (`state/$TODAY/narrativa.json`; se só houver snapshot antigo, migrar para o nome novo antes de seguir)
7. Lê plano visual (state/$TODAY/visual-plan.json)
8. Gera capa via Higgsfield CLI com as refs da marca como UUIDs `--image`
9. Captura cover URL do output, salva em state/$TODAY/cover-url.txt
10. Baixa PNG, valida proporção 3:4 e mantém o tamanho original retornado pelo Higgsfield
11. Slides 2-9 em PARALELO:
    - Higgsfield CLI; todos usam [capa sem logo] + refs visuais da marca (+ hero quando aplicável)
    - Cada um salva url-N.txt e slide-0N.png de forma independente
12. PATCH na entry do Notion via MCP com external URLs (não upload)
13. MCP Google Drive upload paralelo (não bloqueia)
14. Marca .completed em state/$TODAY/
```

**Tempo médio:** 6-10 min total (2-4 min pipeline editorial + 1-2 min vision brief + 30s capa + 1-3 min slides internos em paralelo + 30s Notion patch + 30s Drive backup).
