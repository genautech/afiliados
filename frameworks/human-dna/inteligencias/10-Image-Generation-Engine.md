# 10 — Image Generation Engine

> **Documento mestre da disciplina de geração de imagem por IA.** Escrito com autoridade de um engenheiro de prompt sênior + diretor de arte de IA. No Human Agent Lab, geração real de imagem usa Higgsfield CLI + Nano Banana 2 (`nano_banana_2`); outras referências servem apenas como repertório conceitual e histórico.
>
> Este arquivo é a referência de geração de imagem de TODO o sistema. O Maestro consulta antes de gerar qualquer peça via IA, antes de auditar imagem gerada, antes de decidir entre engines.

---

## Sumário

0. **Doutrina** — autoridade e premissa
1. **Literatura de referência** — papers, repositórios, blogs
2. **Os 12 princípios fundadores**
3. **Stack de geração** — escolha de engine por contexto
4. **Os 5 princípios do image brief** (estrutura de prompt)
5. **Templates canônicos por tipo de peça**
6. **Branding com IA** (logo placements, consistência de personagem/produto)
7. **Pipeline de 3 etapas** (Visual Intent → Geração → Polish)
8. **O que é imagem IA BOA vs RUIM**
9. **O que é geração RÁPIDA vs LENTA** (custo + tempo)
10. **O que FUNCIONA vs NÃO FUNCIONA** em produção
11. **O que VENDE vs AFASTA** (aplicação comercial)
12. **Anti-padrões de IA generativa**
13. **Custos e quality tiers**
14. **Tratamento de erro**
15. **Quando o Maestro deve me chamar**
16. **Checklist operacional**

---

## 0. Doutrina

A geração de imagem por IA é a maior virada técnica da produção visual desde o digital substituiu o analógico nos anos 90. Em 2026, marca pequena pode produzir imagem de qualidade premium em minutos, com custo de centavos. Mas a curva é traidora: **ferramentas baratas geram imagem genérica facilmente; gerar imagem que parece intencional, profissional e única exige direção tão específica quanto fotografia tradicional.**

A maior diferença entre marca que usa IA bem e marca que usa IA mal não é ferramenta — é direção. Higgsfield CLI pode renderizar imagem e vídeo de alto nível, mas se o brief é "uma cena bonita de natureza", saída é stock genérico. Se o brief é "luz dourada das 17h em Toscana, terraço de pedra antiga, taça de vinho meio cheia em primeiro plano, livro aberto deitado, página dobrada na ponta, ondas de oliveiras desfocadas no fundo, ar quente com partículas suspensas, color grade naturalista warm" — saída pode ser editorial.

Toda decisão deste documento parte de uma premissa: **prompt é direção criativa, não comando**. Engineering de prompt = engineering de instrução clara, completa, hierarquizada, com referências reais. Quem escreve prompt como quem escreve briefing de fotógrafo profissional, gera imagem profissional. Quem escreve "make a beautiful image of X" obtém o que pediu: beleza genérica.

---

## 1. Literatura de referência

### Papers acadêmicos fundamentais

- **Ramesh et al.** — *Hierarchical Text-Conditional Image Generation with CLIP Latents* (2022). Paper historico sobre CLIP e geração.
- **Saharia et al.** — *Photorealistic Text-to-Image Diffusion Models with Deep Language Understanding* (2022). Imagen paper.
- **Rombach et al.** — *High-Resolution Image Synthesis with Latent Diffusion Models* (2022). Stable Diffusion paper.
- **Podell et al.** — *SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis* (2023).
- **Relatórios técnicos de modelos de imagem** — usados apenas como repertório conceitual.

### Prompt engineering (textos vivos, atualizados frequentemente)

- **Anthropic Prompt Engineering Guide** (docs.anthropic.com). Princípios universais de prompting de LLMs aplicáveis a image-gen.
- **Riley Goodside** (@goodside no X) — referência viva em prompt engineering.
- **Simon Willison** (simonwillison.net) — blog técnico contínuo sobre LLMs e geração.
- **Ethan Mollick** (oneusefulthing.org) — aplicação prática de IA criativa.
- **Lex Fridman** podcast (entrevistas com pesquisadores OpenAI, Anthropic, DeepMind).
- **Andrej Karpathy** — palestras "Intro to LLMs" e "Tokens".

### Comunidades e galerias referência

- **Galerias de prompts e showcases visuais** — usadas apenas para repertório, nunca como engine operacional.
- **Civitai** — comunidade Stable Diffusion + LoRAs.
- **Promptbase** — marketplace de prompts (curiosidade, não fonte definitiva).
- **r/midjourney**, **r/StableDiffusion**, **r/ChatGPT** — comunidades vivas.
- **Comunidades de geração visual** — fonte de repertório e padrões de qualidade.

### Documentação oficial das engines (referência absoluta)

- **Higgsfield CLI docs/manual interno** — modelos, parâmetros, upload de refs, generate/wait
- **Higgsfield CLI docs/manual interno** — modelos, parâmetros, upload de refs, generate/wait
- **Stability AI** — SDXL, SD 3.5
- **Documentação de ferramentas visuais externas** — apenas repertório e comparação histórica
- **Runway** (runwayml.com/docs) — Gen-3 Alpha vídeo
- **Sora API** (sora.openai.com) — vídeo OpenAI
- **Kling AI** — vídeo chinês de alta qualidade
- **Luma Dream Machine** — vídeo
- **Higgsfield AI** — vídeo com controle de câmera

### Blogs técnicos referência

- **fxguide.com** — técnica de VFX + IA
- **AI Filmmaking** (Caleb Ward, Curious Refuge)
- **AndrewMayneblog** — OpenAI insider
- **Replicate blog** (replicate.com/blog)

### Brasileiros referência em IA criativa

- **Felipe Ueno** — engenheiro brasileiro publicando sobre infraestrutura de IA generativa
- **Comunidade Stormy AI** — agentes criativos brasileiros
- **Renan Vieira** — design + IA
- Workshops Human Academy, AI Video Lab, Agent Lab

> Quem usa engine de IA sem ter lido a documentação oficial da própria engine está adivinhando. Cada modelo tem parâmetros específicos, anti-prompts específicos, comportamentos conhecidos.

---

## 2. Os 12 princípios fundadores

### Princípio 1 — Prompt é briefing, não comando

A diferença entre prompt amador e prompt profissional está em quantidade de **direção específica embutida**. Prompt amador: "make a beautiful sunset". Prompt profissional: "Editorial photograph, golden hour 35mm, 17:30 light angle, Mediterranean coastal town, terracotta rooftops in foreground out-of-focus, sea horizon middle ground, distant mountains backdrop, color grade warm naturalistic, slight haze, shot on Leica Q with 28mm Summilux".

A diferença não está no modelo — está na riqueza do briefing. Mesmo modelo gera os dois.

### Princípio 2 — Especificidade > volume

Prompt longo nem sempre é melhor. Prompt **denso** sempre é. Cada palavra do prompt deveria carregar direção. Adjetivos vagos ("beautiful", "amazing", "stunning") são desperdício de tokens — ocupam espaço sem dar instrução.

Prompt de 50 palavras densas vence prompt de 200 palavras com 80% de adjetivos vazios.

### Princípio 3 — Referências reais ancoram saída

Modelos de imagem foram treinados em milhões de fotos catalogadas. Citar referências reais (fotógrafos, filmes, revistas, locais) ativa associações ricas que adjetivos genéricos não conseguem.

> Vago: "moody portrait"
> Ancorado: "portrait in style of Peter Lindbergh, black-and-white, 35mm Tri-X grain, environmental light from window left, subject contemplative not posed, reminiscent of Vogue Italia editorial 1990s"

### Princípio 4 — Estrutura hierárquica de prompt

Modelos respondem a hierarquia. Prompt bem estruturado tem ordem:

1. **Tipo de peça** (photograph / illustration / 3D render / poster)
2. **Subject principal** (o que está em foco)
3. **Ação/momento** (o que está acontecendo)
4. **Cenário** (onde)
5. **Iluminação** (como está iluminado)
6. **Composição** (enquadramento, ângulo, plano)
7. **Style/treatment** (estética, color grade, grain)
8. **Referências** (artist/photographer/film)
9. **Technical** (camera, lens, aspect ratio, quality)
10. **Negative prompt** (o que NÃO incluir)

Inversão dessa ordem confunde o modelo. Coloque o mais importante primeiro.

### Princípio 5 — Negative prompt é tão importante quanto positive

O que NÃO aparece define imagem tanto quanto o que aparece. Negative prompt afasta o modelo dos defaults genéricos:

> Negative: "stock photo aesthetic, generic smiling, corporate handshake, lens flare without intent, AI faces with uncanny features, hands with extra fingers, text on signs, watermarks"

Sem negative prompt, modelo tende ao genérico médio.

### Princípio 6 — Referência visual (image-to-image) trumps texto sozinho

Quando há imagem de referência, **suba com `higgsfield upload create` e passe o UUID como `--image`**. Modelo entende contexto visual com precisão que texto sozinho não alcança. Cor, composição, mood capturados visualmente, não verbalizados.

Use 3-7 referências como base quando houver material suficiente.

### Princípio 7 — Iteração é parte do processo

Quase nunca a primeira geração é a final. Pipeline real:
1. Geração inicial (4 variations, baixa qualidade pra explorar) — $0.05-0.10 total
2. Selecionar a melhor direção
3. Gerar 4 variations da escolhida (média qualidade) — $0.20-0.30
4. Selecionar a final
5. Gerar em alta qualidade + upscale + polish — $0.50-1.00

Custo total ~$1-1.50 por imagem final excelente. Comparar com fotógrafo: R$2.000-15.000 por sessão.

### Princípio 8 — Consistência de personagem é problema técnico

Manter o mesmo personagem (modelo, mascote, fundador) em múltiplas imagens é o problema mais difícil em IA generativa. Soluções:

- **Master shot + image-to-image:** gera 1 master excelente, usa como reference em todas as próximas
- **Higgsfield CLI + Nano Banana 2:** usar 1-3 imagens-âncora como `--image` em todas as próximas gerações
- **Anchor sheet:** criar uma folha mestre de personagem/produto e reutilizar como referência
- **Controle de variação:** mudar uma variável por iteração para não perder identidade

### Princípio 9 — Texto dentro da imagem é traiçoeiro

Texto dentro da imagem ainda exige revisão. Mesmo com Nano Banana 2, confira cada caractere. Estratégias:

- **Render texto separado em design tool** (Figma, depois compor)
- **Manter texto curto** quando precisar vir no render
- **Inpaint/re-render** o texto correto em segundo passe
- **Logo via Pillow** (nunca deixar IA "desenhar" logo — distorce)

### Princípio 10 — Engine oficial de imagem

No Human Agent Lab, toda geração real de imagem usa **Higgsfield CLI + Nano Banana 2 (`nano_banana_2`)**. Outras ferramentas podem aparecer como referência conceitual ou comparação histórica, mas não como fluxo operacional do treinamento.

### Princípio 11 — Polish é metade do trabalho

Geração inicial é raw. Polish profissional inclui:
- **Upscale** (clarity-upscaler, Topaz Photo AI) — 2x-4x resolução
- **Inpainting** (corrigir mãos, faces, detalhes)
- **Color correction** (LUTs, ajustes finos no Lightroom/Photoshop)
- **Composição final** (logo, texto, layout em design tool)

Imagem IA bem feita passa por 3-5 etapas de polish, não 1.

### Princípio 12 — Anti-padrões de IA são detectáveis

Comunidade de design treinou olho pra detectar IA mal feita. Sinais:
- Mãos com 6 dedos ou anatomia errada
- Olhos vidrados, simetria estranha
- Texto incoerente em placas/cartazes
- Sombras inconsistentes (luz em direção contraditória)
- Reflexos físicamente impossíveis
- Pele muito plástica
- Background com objetos derretendo

Imagem IA boa esconde que é IA. Marca que publica IA óbvia perde credibilidade.

---

## 3. Stack de geração — engine oficial por contexto

### 3.1 — Decisão por tipo de peça

| Tipo de peça | Engine recomendada | Por quê |
|---|---|---|
| **Hero shot fotorealista** | Higgsfield CLI + Nano Banana 2 | Fotorrealismo + atmosfera com refs |
| **Capa de carrossel com texto** | Higgsfield CLI + Nano Banana 2 | Composição + texto curto revisável |
| **Slide com texto + foto** | Higgsfield CLI + Nano Banana 2 | Layout visual com refs da marca |
| **Pessoa em contexto realista** | Higgsfield CLI + Nano Banana 2 | Consistência via image refs |
| **Personagem consistente em série** | Higgsfield CLI + Nano Banana 2 | Anchor sheet + refs recorrentes |
| **Ilustração / vetor visual** | Higgsfield CLI + Nano Banana 2 | Direção de arte visual; vetor final pode ser redesenhado se necessário |
| **Ícone / símbolo** | Higgsfield CLI + Nano Banana 2 | Conceito visual; produção vetorial final se necessário |
| **Poster com tipografia forte** | Higgsfield CLI + Nano Banana 2 | Texto curto + QA obrigatório |
| **Product shot premium** | Higgsfield CLI + Nano Banana 2 | Visual Intent + refs + polish |
| **Fashion editorial** | Higgsfield CLI + Nano Banana 2 | Atmosfera + estilo por prompt físico |
| **Lifestyle natural** | Higgsfield CLI + Nano Banana 2 | Realismo + composição |
| **Abstract / artístico** | Higgsfield CLI + Nano Banana 2 | Versatilidade artística |
| **Frame de vídeo / motion** | Higgsfield CLI + Nano Banana 2 | Frames still; motion usa produto de vídeo quando aplicável |

### 3.2 — Decisão por orçamento (custo por geração)

| Tier | Custo por imagem | Engines |
|---|---|---|
| **Low** | Nano Banana 2 em `1k` | Iteração rápida, exploração |
| **Mid** | Nano Banana 2 em `2k` | Aprovação interna e padrão premium |
| **High** | Nano Banana 2 em `4k` quando pedido | Versão final quando detalhe extremo for necessário |
| **Premium** ($0.10-0.50) | Upscale + iteração múltipla + polish | Hero campaign, capa importante |

Vídeo:
- **Runway Gen-3** — ~$0.05/segundo
- **Sora** — ~$0.10-0.30/segundo
- **Kling** — ~$0.05-0.15/segundo

### 3.3 — Decisão por velocidade

| Velocidade | Configuracao | Use caso |
|---|---|---|
| **Rápido** | Nano Banana 2 em `1k` | Iteração ao vivo |
| **Médio** | Nano Banana 2 em `2k` | Produção padrão |
| **Lento** | Nano Banana 2 em `4k` + polish | Versão final quando necessário |

---

## 4. Os 5 princípios do image brief

Toda imagem gerada via IA precisa de um **image brief** estruturado. Os 5 princípios:

### 4.1 — Especificidade visual (não adjetivos vagos)

Não escreve "imagem bonita de tecnologia". Escreve:
- **Cores específicas** (terracotta saturado contra azul-petróleo dessaturado; ou monocromático cinza-quente com 1 ponto de cor primária)
- **Estilo identificável** (fotografia editorial 35mm, ilustração risograph 2 cores, render 3D matte fosco, collage analógico)
- **Iluminação definida** (luz rasante do lado direito criando sombra dura; rim light dourado contra fundo escuro; difusa neutra de catálogo)
- **Ângulo de câmera** (close-up frontal, plano-detalhe, overhead, low-angle dramático)
- **Elementos concretos** no quadro (não "uma cena", mas "um par de mãos digitando em laptop antigo prata sobre mesa de madeira escura com xícara de café à esquerda")

### 4.2 — Propósito conectado à narrativa

Cada imagem serve a uma função narrativa. Brief explicita o sentimento:

- Hero / capa → tensão narrativa, urgência
- Mecanismo → revelação, "olhar por dentro", contraste antes/depois
- Prova → autoridade, materialidade dos dados (papel, gráfico físico, tela)
- Expansão → escala, contexto maior, panorâmica
- Aplicação → humanidade, gesto, momento ordinário
- CTA / fechamento → símbolo condensado, fechamento simbólico

### 4.3 — Sem ambiguidade — metáforas visuais claras

Metáfora explícita > metáfora vaga. Em vez de "ideia abstrata de criatividade", escreve "uma mão segurando um pincel com tinta laranja escorrendo, encostando em tela cinza". A IA renderiza o que é descrito; não infere bem o abstrato.

### 4.4 — Reinterpretação fiel quando há referência

Quando há foto-referência, brief precisa **descrever fielmente o conteúdo da referência** + **indicar o estilo de reinterpretação**. R2 olha a referência (vision real), descreve textualmente, e injeta essa descrição + diretriz de estilo.

### 4.5 — Capa SEMPRE muito chamativa

A capa é o slide/peça que para o scroll. Regras adicionais:

- **Composição cinemática** (regra dos terços, leading lines, profundidade)
- **Iluminação dramática** (chiaroscuro, rim light, golden hour, harsh side light) — nunca difusa neutra
- **Elemento focal único e forte** (um rosto, um objeto, um símbolo)
- **Saturação seletiva** — fundo dessaturado, ponto focal saturado
- **Tensão narrativa** — algo está acontecendo no instante
- **Anti-stock photo absoluto**

---

## 5. Schema do image brief (JSON estruturado)

Toda peça produzida via IA gera primeiro um JSON estruturado:

```json
{
  "engine": "higgsfield_cli/nano_banana_2",
  "purpose": "tensão narrativa de urgência geracional",
  "subject": "um celular antigo Nokia 3310 caído numa mesa de café junto a um cappuccino derramado",
  "composition": "overhead 90°, objetos no terço inferior, espaço negativo no superior",
  "lighting": "luz natural lateral, sombras duras, ~10h da manhã",
  "color_treatment": "predominante cinza-quente + 1 ponto laranja-terracota no líquido derramado",
  "style": "fotografia editorial 35mm, grão fino, profundidade média",
  "mood": "abandono, ruptura silenciosa, pausa",
  "metaphor": "geração que desliga o telefone moderno e tropeça no analógico",
  "avoid": "sem mãos no quadro, sem rosto, sem texto sobre a imagem",
  "reference_images": ["url1", "url2"],
  "dimensions": {"width": 1088, "height": 1360},
  "resolution": "2k"
}
```

Esse JSON é construído pela R2 e injetado no prompt final.

---

## 6. Templates canônicos de prompt

### 6.1 — Hero / Capa (full-bleed, dramática)

```
A {dimensions.width}x{dimensions.height} {format_descriptor} hero/cover image.

{VISUAL_BRIEF_DECODED}

This is a HERO image. It MUST be visually arresting — magazine cover quality, the kind of image that stops the scroll.

═══ EMBEDDED IMAGE (full-bleed background) ═══
{image_brief.subject}

Composition: {image_brief.composition} — strong focal point, rule of thirds, leading lines if applicable, foreground/background separated by focus

Lighting: {image_brief.lighting} — dramatic (chiaroscuro, rim light, golden hour, or harsh side light). NEVER flat catalog lighting.

Color: {image_brief.color_treatment} — selective saturation: muted backdrop, saturated focal point ideally in {brand_color_primary}

Style: {image_brief.style} — never generic AI gloss

Mood: {image_brief.mood} — narrative tension. Something is happening or about to.

Metaphor: {image_brief.metaphor}

═══ COMPOSITION ═══
- Full-bleed image background as described above
- Heavy dark gradient overlay at the bottom 55-60% to ensure 4.5:1 contrast against headline
- Thin accent bar (6px) at the very top in {brand_color_primary}
- {LOGO_INSTRUCTION_IF_HAS_LOGO}
- Headline anchored in lower 35% of canvas, left-aligned, generous left margin (~80px)
- Handle "{brand_handle}" small, above the headline block

═══ TEXT CONTENT ═══
- Brand bar (very top, small, low opacity): "POR {brand_name}  |  {brand_handle}  |  {year}"
- Handle: "{brand_handle}"
- Headline (largest element, bold condensed uppercase, tight kerning): "{HEADLINE_DA_CAPA}"
- Highlight in {brand_color_primary}: {LISTA_DE_PALAVRAS_CHAVE}

═══ TYPOGRAPHY ═══
- Headline: bold condensed sans-serif, weight 900, 88-108px, uppercase, letter-spacing -3px, line-height 0.95 (similar in feel to: {brand_font_display})
- Handle: clean sans-serif, weight 600, 18px

═══ DETAIL SIGNATURE ═══
{DETAIL_SIGNATURE_DESCRITO_NO_VISUAL_BRIEF}
(footer consistency element repeated across all peças of this batch)

═══ ABSOLUTE NO-GO ═══
{image_brief.avoid}
+ universal no-go from brand:
Do NOT include: emojis, decorative icons, stock photo aesthetic, 3D glossy effects, lens flares (unless cinematic intent), generic gradients, AI-rendered faces with uncanny features, corporate handshakes, smiling group photos to camera, hands typing generically on laptop, lightbulb-as-idea cliché, gears-as-strategy cliché.

═══ MOOD TARGET ═══
This image should look like it was art-directed by a design magazine ({brand_aesthetic_anchor}) — not generated by AI. Confidence. Sharpness. Specificity. Tension.
```

### 6.2 — Slide interno / Post body

```
A {dimensions.width}x{dimensions.height} {format_descriptor} content image.

{VISUAL_BRIEF_DECODED}

This is slide [N] of [TOTAL] — the {section_function}. NOT a cover.

Match the visual STYLE (palette, typography, composition, footer detail signature) of the cover and brand reference images, but show DIFFERENT content. Use reference for visual consistency, not for copying content.

═══ EMBEDDED IMAGE ═══
[bloco image_brief específico — ver schema acima]

═══ COMPOSITION ═══
- Background: {dark|light|gradient}
- Tag at top: "{tag_text}" in mono, weight 700, 13px, uppercase, letter-spacing 3px, color {tag_color}
- Body text in {body_position} third of canvas, left-aligned
- Brand bar at very top: handle + 0X/0Y counter

═══ TEXT CONTENT (KEEP MINIMAL — 2 short blocks max) ═══
texto A: "{text_block_a}"
texto B: "{text_block_b}"

═══ ABSOLUTE NO-GO ═══
{universal_no_go} + slide-specific {avoid_list}
```

### 6.3 — Branding placement (logo em contexto)

```
A photograph showing the {brand_name} logo / product naturally integrated into an unexpected real-world context.

═══ THE PLACEMENT ═══
Context: {unexpected_context}
   (Examples: 
    - "logo painted on the side of an old delivery truck stopped at a traffic light in São Paulo's Vila Madalena, 1998 morning light"
    - "logo as a tattoo on a man's forearm, holding an espresso cup, café table in Lisbon, golden hour"
    - "logo printed on a vintage book cover, lying on a wooden desk with a pair of tortoise-shell glasses on top")

═══ THE BRAND ELEMENT ═══
Logo / element: {brand_logo_description}
Position in frame: {composition_placement}
Imperfections: include realistic wear, fade, lighting interaction with surface texture. The logo should feel like it has BEEN there for a while — not photoshopped onto the scene yesterday.

═══ COMPOSITION ═══
- Lighting: {chosen_setup_from_7}
- Camera angle: {angle}
- Color treatment: {color_treatment}
- Grain: subtle film grain, {iso_equivalent}

═══ ABSOLUTE NO-GO ═══
- Pristine logo placement (looks fake)
- Logo bigger than would be realistic
- Logo as the SUBJECT of the image (subject is the context; logo is a presence)
- Generic "branded mockup" template aesthetic
```

---

## 7. Pipeline de 3 etapas

### Etapa A — Visual Intent (Claude extrai direção criativa do briefing)

```
Você é um diretor de arte de marca {brand_aesthetic_anchor}. Recebeu este briefing do cliente:

[BRIEFING DO CLIENTE]

Sua tarefa é extrair a direção visual em 6 dimensões:

1. SUBJECT (o produto + contexto): descreva visualmente o que aparecerá no quadro.
2. LIGHTING: qual dos 7 setups (Golden Hour, Low Key, Spotlight, Chiaroscuro, Cutter Lights, Hard Flash, Silhouette) melhor serve o mood?
3. COMPOSITION: ângulo, plano, posição do produto no quadro.
4. COLOR_TREATMENT: paleta, saturação, onde aparece a cor primária.
5. STYLE: editorial 35mm? Still life clássico? Render 3D matte? Risograph?
6. MOOD + METAFORA: sentimento + metáfora visual

Devolva em JSON do schema image_brief.
```

### Etapa B — Geração + iteração

R2 chama Higgsfield CLI com image_brief + 3-5 referências:

```bash
UUID_1=$(higgsfield upload create "ref-1.png" | grep -oiE '[0-9a-f-]{36}' | head -1)
UUID_2=$(higgsfield upload create "ref-2.png" | grep -oiE '[0-9a-f-]{36}' | head -1)
JOB_ID=$(higgsfield generate create nano_banana_2 \
  --prompt "[image_brief estruturado]" \
  --image "$UUID_1" \
  --image "$UUID_2" \
  --aspect_ratio "4:5" \
  --json | grep -oiE '[0-9a-f-]{36}' | head -1)
higgsfield generate wait "$JOB_ID" --wait-timeout 30m --json
```

Gera a variação necessária. Se não servir, ajusta image_brief e roda de novo registrando tentativa, modelo, UUIDs e job_id.

### Etapa C — Polish final (upscale + micro-refinamentos)

```bash
# Refinamento via nova geração referenciada
REFINED_JOB=$(higgsfield generate create nano_banana_2 \
  --prompt "[descricao do refinamento localizado]" \
  --image "$CHOSEN_UUID" \
  --aspect_ratio "4:5" \
  --json | grep -oiE '[0-9a-f-]{36}' | head -1)
higgsfield generate wait "$REFINED_JOB" --wait-timeout 30m --json
```

Output final: PNG 2176×2720, qualidade entrega final, custo total ~$0.80-1.50 por shot final.

---

## 8. O que é imagem IA BOA vs RUIM

### 8.1 — IA BOA (estudar)

**Marcas que usam IA bem:**
- Marcas editoriais que usam IA pra ilustração conceitual (sem fingir ser foto)
- Marcas tech que usam IA pra hero abstrato (geometria, paisagem digital)
- Marcas que usam IA pra moodboards e exploração inicial (não final)
- Marcas que combinam IA + pós-produção humana (color grading, inpaint)

**Características:**
- Direção específica visível
- Estilo coerente com a marca
- Sem sinais óbvios de IA (mãos OK, faces naturais)
- Texto embutido legível e correto
- Composição intencional (não default do modelo)

### 8.2 — IA RUIM (evitar)

**Anti-padrões saturados:**
- Hero óbvio de "stable diffusion default" (rosto perfeito, olhos vidrados, fundo blur genérico)
- Pessoa com 6 dedos ou anatomia errada publicada (dispara desconfiança)
- Texto inventado em placas/cartazes (lorem ipsum visual)
- "Estilo 3D Pixar" genérico (saturado em 2023-2024)
- "Selfie de fundador IA" — perigosíssimo (detectável e desconfia)
- IA imitando fotografia sem direção (parece foto qualquer)
- Logo desenhado por IA (sempre distorcido, NUNCA fazer)

**Marcas pra estudar como NÃO fazer** (anônimo, mas reconhecível):
- "Coach de IA" com avatares IA + texto motivacional
- E-commerce com fotos de produto IA visivelmente derretendo
- "Influencer" com fotos IA de "ambientes aspiracionais" sem direção

---

## 9. O que é geração RÁPIDA vs LENTA (custo + tempo)

### 9.1 — RÁPIDA (escalável)

- **Iteração em low quality** ($0.005-0.02 por imagem) — exploração rápida
- **Templates de prompt reutilizáveis** — não escrever do zero
- **Batch generation** (4-8 variações por prompt) — escolher a melhor
- **Mesmo modelo, prompts especializados por tarefa** (Nano Banana 2 com refs e constraints)
- **API direta + script** vs. interface manual

### 9.2 — LENTA (justificável em casos específicos)

- **High quality + upscale + polish** — vale em hero campaign
- **Iteração 10+ vezes** — quando direção exata é crítica
- **LoRA training pra personagem consistente** — investimento upfront, retorno em escala
- **Vídeo longo (>15s)** — sempre lento

### 9.3 — Eficiência: regra de ouro

> Imagem comum (story, post, slide secundário): low quality, 1-2 iterações, $0.05 total
> Imagem importante (capa de carrossel, hero): medium quality, 3-5 iterações, $0.30
> Imagem hero campaign (capa de site, anúncio principal): high quality + upscale + polish, 10+ iterações, $1.50-3.00

---

## 10. O que FUNCIONA vs NÃO FUNCIONA em produção

### 10.1 — FUNCIONA

- **Image-to-image** com referência clara > text-to-image puro
- **Negative prompt explícito** afasta defaults genéricos
- **Aspect ratio múltiplo de 16** (1088×1360 pra 4:5) — modelos otimizados
- **Iteração com seed fixo** quando quer variação controlada
- **Prompt em inglês** (modelos treinados majoritariamente em inglês)
- **Referências reais nominais** (artist names, film references)
- **Composição descrita por elementos concretos** (não "uma cena")

### 10.2 — NÃO FUNCIONA

- **Prompt vago** ("beautiful sunset", "professional logo") — sai genérico
- **Texto longo dentro de imagem** (>30 caracteres errados frequentemente)
- **Múltiplas pessoas em composição complexa** (anatomia se confunde)
- **Mãos em destaque** (ainda problema em 2026, melhor evitar primeiro plano)
- **Logos famosos solicitados** (modelos podem recusar ou distorcer)
- **Style transfer extremo** sem referência visual (resultados imprevisíveis)
- **Concept abstrato sem metáfora visual** (modelo não infere)

---

## 11. O que VENDE vs AFASTA (aplicação comercial)

### 11.1 — VENDE

- Hero shots fotorealistas bem direcionados (prêmio, atmosfera)
- Product shots conceituais (impossíveis de capturar fisicamente: produto flutuando, dimensão extra)
- Lifestyle aspiracional (locais e momentos custosos de produzir fisicamente)
- Editorial conceitual pra blog, capa de newsletter, anúncio
- Mockups de embalagem, cartões, papelaria
- Variações infinitas de mesmo produto em contextos diferentes

### 11.2 — AFASTA

- Pessoas IA óbvias em hero (perda de credibilidade imediata)
- "Foto de fundador IA" (detectado, gera desconfiança comercial)
- Produto com distorções (mãos erradas, anatomia estranha)
- Texto IA mal renderizado em peça publicada (amador absoluto)
- IA imitando fotografia documental (lê falso)
- Vídeo IA com pessoas em movimento estranho (uncanny valley)

### 11.3 — Princípio comercial central

IA é ótima pra **conceitual, abstract, contextos impossíveis de fotografar**. Ruim pra **imitação de fotografia documental, retratos de pessoas reais, produtos com detalhe técnico crítico**. Use no campo onde brilha; contrate fotógrafo no campo onde a IA falha.

---

## 12. Anti-padrões de IA generativa

### 12.1 — Anti-padrões técnicos

- ❌ Mãos com 6 dedos ou anatomia anormal
- ❌ Olhos vidrados, simetria estranha, expressão "morta"
- ❌ Texto incoerente em placas/cartazes/livros
- ❌ Sombras inconsistentes (luz em direção contraditória)
- ❌ Reflexos físicamente impossíveis
- ❌ Pele plástica supersuavizada
- ❌ Background com objetos derretendo
- ❌ Logo "desenhado" pela IA (sempre distorce)
- ❌ Marca d'água do gerador na peça final

### 12.2 — Anti-padrões estéticos saturados

- ❌ "Estilo 3D Pixar" genérico (saturado 2023-2024)
- ❌ "Cyberpunk neon" sem propósito (cliché)
- ❌ Avatar IA "estilo Notion ilustrado" (saturado)
- ❌ Mulher genérica "perfeita" como influencer IA
- ❌ Hero com gradient roxo-azul + figura humana flutuando

### 12.3 — Anti-padrões éticos

- ❌ Imitação de fotógrafo vivo sem consentimento (legal cinza)
- ❌ Imitação de pessoa real (deepfake — ilegal em vários contextos)
- ❌ Apropriação de estilo de artista vivo sem crédito
- ❌ Geração de conteúdo enganoso (foto "real" que não é)

---

## 13. Custos e quality tiers

### 13.1 — Custos

Custos dependem do modelo, da fila e dos créditos da conta Higgsfield ativa. Antes de render real:

```bash
higgsfield account status
```

Registre modelo, job_id, tentativa e decisão.

### 13.2 — Recomendação de spending limit

| Volume mensal | Spending limit |
|---|---|
| Iniciante (5-15 peças/mês) | $10/mês |
| Operacional (30-60 peças/mês) | $40/mês |
| Intensivo (100-200 peças/mês) | $100/mês |
| Profissional/agência (500+/mês) | $300/mês |

### 13.3 — Quality tiers — quando usar cada

| Tier | Uso |
|---|---|
| **Low** | Iteração de composição, validar layout |
| **Medium** | Pré-aprovação interna, mood board |
| **High** | Final pra publicação |

**Regra:** itera em low, valida em medium, finaliza em high. Não custa nada testar 4 versões em low, escolher 1, finalizar em high.

---

## 14. Tratamento de erro

| Erro | Ação |
|---|---|
| `higgsfield: command not found` | Instalar `@higgsfield/cli` |
| Login ausente | Rodar `higgsfield login` |
| `429 Too Many Requests` | `sleep 5` entre chamadas |
| `Insufficient credits` | Recarregar no Higgsfield |
| Aspect ratio errado | Corrigir `--aspect_ratio` |
| `500 / 502` | Retry até 2x. Se persistir, marca peça como falha |
| Timeout >60s | Cancela, retry uma vez |

---

## 15. Quando o Maestro deve me chamar

### 15.1 — Sempre me chame em:

- Geração de QUALQUER imagem via IA (escolha de engine, prompt, iteração)
- Auditoria de imagem gerada por IA
- Decisão de upscale, inpainting, composição final
- Otimização de custo (quando usar low/medium/high)
- Logo placement em foto via IA (técnica específica)
- Consistência de personagem em série (técnica avançada)

### 15.2 — Posso ser consultado em:

- Decisão de aspect ratio
- Negative prompt customizado
- Comparação entre engines pra task específica
- Pipeline de polish

### 15.3 — Não me chame pra:

- Direção fotográfica humana (chamar `09-Photography-Direction.md`)
- Sistema visual / paleta (chamar `08-Visual-System.md`)
- Copy / tom de voz (chamar `07-Voice-and-Tone.md`)

---

## 16. Checklist operacional

### Antes de gerar imagem

1. Lê este arquivo (foco em seções 4, 5, 6)
2. Lê DNA.md (seção 3 — Estilo visual + 3.8 — Direção fotográfica)
3. Constrói image_brief estruturado (JSON)
4. Escolhe engine apropriada (seção 3)
5. Define quality tier (low/medium/high) baseado no contexto
6. Gera 4 variações
7. Auditoria (anti-padrões seção 12)
8. Polish (upscale, inpaint se necessário)

### Antes de auditar imagem IA

1. Verifica anti-padrões técnicos (mãos, olhos, texto, sombras)
2. Verifica aderência ao estilo da marca
3. Diagnóstico em prosa + sugestão concreta

---

## Resumo em uma linha

**Direcione como diretor de arte sênior, prompte como engenheiro de instrução, escolha engine como estrategista, polish como retocador editorial.**
