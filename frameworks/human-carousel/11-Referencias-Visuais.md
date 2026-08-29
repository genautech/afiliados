# 11 — Referências visuais

> **Onde colar:** Página `🖼️ Referências visuais` no Notion.
> Esta é a página que **você edita sempre que quiser mudar a estética do feed**. A R2 lê tudo aqui e usa como briefing pro GPT Image 2 (`gpt_image_2`).

---

## ⚠️ Aprendizado crítico — vision real + grids

A versão V1 do sistema rodava a R2 como Routine Web e **lia só texto** dessa página. Briefing visual saía genérico → primeiros carrosséis saíram mediocres mesmo com imagens de inspiração ricas.

Na V2.5, a R2 roda como Routine Local. **Ela baixa os bytes das imagens anexadas aqui e faz vision real** (Read tool nativo do Claude). Extrai sistema visual real (tipografia observada, hierarquia, cores secundárias, mood) e compila o briefing.

### Fidelidade tonal e de estilo — dois erros que a R2 precisa evitar

Mesmo com vision real, dois desvios apareceram no uso:

**Escurecer demais.** A R2 puxa a paleta pro escuro mesmo quando as refs são claras ou médias. Resultado: o feed fica mais sombrio que a inspiração. A R2 agora registra o **registro tonal** de cada ref e reproduz essa luminosidade — se as refs são claras, o carrossel é claro. O ritmo dark/light do Design System só vale se as refs mostrarem os dois.

**Literalidade com o assunto.** A R2 ilustra o tema da notícia ao pé da letra (notícia sobre um app → imagem de uma interface) mesmo quando as refs usam outra linguagem (pessoas, gesto, fotografia editorial). O **estilo de imagem vem das refs** — se as refs são humanizadas, as imagens do carrossel são humanizadas, e o assunto vira metáfora visual nesse estilo.

Por isso: anexe refs que representem fielmente a luminosidade E o tipo de imagem que você quer. A R2 segue o que vê.

**Implicação pra você:**
- **Anexe imagens reais — não tente descrever a estética só em texto.** Texto orienta, mas é a imagem que ensina o sistema.
- **Quantidade não é o foco — consistência é.** Pode ser 1 grid bom, ou de 3 a 7 imagens separadas. O que importa: todas precisam mostrar a MESMA linguagem visual e tipográfica. Refs divergentes geram feed divergente.

### Refs como grid (entendimento crítico)

Geralmente quando alguém salva inspiração visual no Pinterest, Behance ou Are.na, junta **vários slides numa única imagem em grid** — uma página de Behance com 9 slides montados num grid 3×3, um print da timeline do Instagram com 6 capas, uma planilha de moodboard.

**A Routine entende isso.** Quando você anexa uma imagem aqui:

- Se for **1 slide só** (uma capa, um post solto) → vale como 1 referência
- Se for um **grid** com múltiplos slides visíveis → cada região do grid vale como referência independente. Uma imagem de grid 3×3 entrega **9 referências de slide diferentes** ao sistema

A Routine olha cada imagem e decide internamente: "isso é unitário ou grid?". Se grid, mentalmente decompõe e observa cada exemplar — tipografia, hierarquia, cores, composição — como se fossem N exemplares separados.

**Implicação prática:** **uma única imagem boa em grid pode bastar.** Não force quantidade — anexe o que de fato representa a estética que você quer.

---

## Cole o conteúdo abaixo na página

(Depois de colar, **anexe suas imagens de inspiração** nas seções indicadas — arrasta imagem direto pra página do Notion.)

---

## Cor predominante

**Primary:** `{brand_color_primary}` (vem de `🏷️ Brand Identity`)

Default exemplo: `#EC5E26` — laranja quente, terroso, com leve queima — não vibrante de neon, não pastel.

A R2 deriva paleta completa a partir desta cor.

---

## Mood geral do feed

Descreva em 3-5 frases o tom visual que você quer transmitir:

> Editorial, sóbrio, magazine-like — referência de design publication europeia (Eye Magazine, Wallpaper, It's Nice That). Tipografia com presença e personalidade. Generoso de espaço negativo. Sem ornamento, sem ilustração genérica, sem gradient bonitinho de IA. Textura sutil — grão de filme, papel imperfeito. Quando aparece cor, aparece com intenção, em palavra-chave, nunca como background colorido.

> Estética que parece feita por designer, não por template.

---

## Sistema de fontes — TRAVADO

> **Esta seção é a fonte da verdade tipográfica do projeto.** A R2 usa EXATAMENTE
> estas fontes — mesma família, mesmo peso, mesmo tamanho — em todo slide de todo
> carrossel. Ela NÃO re-deriva tipografia das imagens a cada run e NÃO varia entre
> slides. Pra mudar a tipografia do feed, edite AQUI — e só aqui.

**Por que travar:** o GPT Image 2 não deve receber instrução vaga de fonte — ele renderiza
descrições. Descrição vaga ("uma bold condensada") faz o modelo escolher uma fonte
diferente a cada slide e a cada carrossel — foi exatamente o problema observado. A
solução é uma descrição única, exata, sempre idêntica, e a R2 copiando ela verbatim
em todo prompt — somada ao uso da capa e das refs visuais como referências fixas.

O projeto usa **exatamente 2 fontes**: uma DISPLAY (headlines) e uma de TEXTO (todo
o resto — body, tag, brand bar, detail signature). Duas e só duas.

> **Como escolher:** olhe suas refs visuais, identifique a fonte de headline e a de
> texto, e nomeie as duas abaixo. Na dúvida, peça pra R2 sugerir a partir das refs.
> Uma vez escolhidas, ficam travadas — não mude a cada carrossel.

### Fonte 1 — DISPLAY (headlines da capa e internas)

- **Nome:** `Druk Wide Bold` *(troque por outra se quiser — mantenha UMA só)*
- **Descrição travada** (a R2 copia esta frase exata pro prompt):
  `heavy wide grotesque display typeface, weight 900, all-caps, very tight
  letter-spacing, bold geometric letterforms with strong magazine-cover presence`

### Fonte 2 — TEXTO (body, tag, brand bar, signature)

- **Nome:** `Söhne` *(troque por outra se quiser — ex: Inter, Plus Jakarta Sans)*
- **Descrição travada:**
  `clean neutral humanist sans-serif, even stroke weight, medium x-height,
  highly legible at small sizes, no decorative details`

### Tabela de aplicação — valores EXATOS (nunca faixas)

A R2 aplica estes valores fixos. Cada papel tem UM tamanho e UM peso — nunca uma
faixa. As "fontezinhas de cima" (tag e brand bar) também ficam travadas aqui.

| Papel | Fonte | Peso | Tamanho de referência | Caixa | Tracking |
|---|---|---|---|---|---|
| Headline da capa | Display | 900 | 96px | UPPERCASE | -3px |
| Headline interna | Display | 900 | 74px | UPPERCASE | -2px |
| Body | Texto | 400 | 38px | sentence case | 0 |
| Body strong (destaque) | Texto | 700 | 38px | sentence case | 0 |
| Tag de seção | Texto | 700 | 14px | UPPERCASE | +2px |
| Brand bar / handle | Texto | 600 | 16px | como escrito | +0.4px |
| Detail signature (rodapé) | Texto | 500 | 13px | como escrito | +0.3px |

> A R2 injeta esta seção inteira — nomes, descrições e tabela — como bloco
> `TYPOGRAPHY LOCK` em TODO prompt de slide (capa e 2-9), sempre com o mesmo texto.
> É isso, somado à capa + refs visuais em todos os slides, que mantém a fonte idêntica entre slides
> e entre carrosséis.

---

## Imagens de inspiração

> **Como usar esta seção:** anexe **de 3 a 7 imagens** (arraste pra página do Notion), ou um grid. Pode ser:
> - Imagens unitárias (uma capa, um post solto) — cada uma vale como 1 referência
> - **Grids** com múltiplos slides visíveis (print do feed, página de Behance, moodboard) — cada região do grid vale como referência independente
>
> Quanto mais refs consistentes entre si, mais estável o resultado. Se tiver mais de 3 imagens, adicione seções "Referência 4", "Referência 5"… abaixo.
> Escreva 1-2 linhas ao lado explicando o que faz cada imagem funcionar — destacando, se for grid, quantos exemplares estão ali e o que observar.

### Referência 1
**[anexe imagem aqui]**

Descrição: _Exemplo unitário — "headline em condensada bold em 5 linhas, palavra-chave em laranja, fundo preto com grão. Hierarquia muito clara: headline domina, handle pequeno embaixo. É a referência do tipo de capa que quero."_

_Exemplo grid — "grid 3x3 com 9 slides de carrossel da @marca-x. Observa especialmente o slide 2 (dark com image box) e o slide 5 (tabela em fundo claro). Detalhe que aparece em todos: linha fina horizontal no rodapé com data + handle pequeno."_

### Referência 2 (opcional)
**[anexe imagem aqui]**

Descrição:

### Referência 3 (opcional)
**[anexe imagem aqui]**

Descrição:

---

## Anti-exemplos — o que NÃO queremos

Liste explicitamente. Quanto mais específico, melhor o resultado.

- Não queremos minimalismo Apple genérico (muito frio, muito limpo)
- Não queremos "gradient roxo IA" (clichê)
- Não queremos dashboard SaaS azul
- Não queremos Bauhaus básico com formas geométricas coloridas
- Não queremos textura de papel rasgado / vintage falso
- Não queremos emoji decorativo em nenhum slide
- Não queremos foto stock como background
- Não queremos efeito glow / neon / Y2K / glitch
- Não queremos 3D, holograma, render Unreal Engine
- Não queremos rostos gerados por IA
- Não queremos texto manuscrito / brush script

---

## Composição preferida

**Slides internos (light e dark):**
- Texto à esquerda, alinhado no topo ou no meio
- Mínimo 80px de margem nas laterais
- Conteúdo ocupa terço inferior e médio do slide
- Terço superior fica como respiro
- Tag pequena no topo (acima da brand bar)
- Progress bar discreta no rodapé

**Slide de capa:**
- Imagem ou fundo texturizado full-bleed
- Headline ENORME no terço inferior, alinhada à esquerda
- Handle do Instagram pequeno acima da headline
- Sem outros elementos (sem data, sem categoria, sem badge)

**Slide gradient (slide 8):**
- Gradiente diagonal da cor primária dark → cor primária → cor primária light
- Headline curta, centralizada
- Lista com setas (→) listando 3 pontos

---

## Aplicação de cor

A cor primária aparece:

- ✅ Em palavras-chave dentro de headlines e body (1-3 palavras por slide no máximo)
- ✅ Como fill da progress bar nos light slides
- ✅ Como cor da tag pequena no topo de cada slide
- ✅ Como base do gradiente no slide 8
- ✅ Como accent bar fina no topo de cada slide (6-7px)

A cor primária NÃO aparece:

- ❌ Como fundo de texto em slides internos
- ❌ Em blocos grandes de cor sólida
- ❌ Em mais de 3 palavras por slide

---

## Bloco final pra R2 (não edite — usado pela rotina)

```
INSTRUÇÃO PRA R2:

Quando você ler esta página:

1. Identifique a cor predominante (campo "Primary").
2. Derive paleta completa conforme regras de "🎨 Design system".
3. Leia o "Mood geral" inteiro — usa como descritor de atmosfera no prompt.
4. Leia a seção "Sistema de fontes — TRAVADO" inteira (nomes das 2 fontes,
   descrições travadas e a tabela de tamanhos/pesos). Copie-a VERBATIM como o
   bloco "TYPOGRAPHY LOCK" do briefing — NÃO re-derive tipografia das imagens,
   NÃO parafraseie, NÃO varie. Esse bloco vai idêntico em todo prompt de slide.
5. Para cada imagem anexada nesta página:
   a. Abra a imagem (vision nativa do Claude — Read tool).
   b. DECIDIR: é uma imagem unitária ou um GRID com múltiplos slides?
      - Sinais de grid: regularidade espacial (linhas/colunas), bordas 
        repetidas, formato quadrado ou retangular subdividido, múltiplos 
        retângulos similares lado a lado.
      - Se grid: decomponha mentalmente em N exemplares (ex: grid 3x3 
        = 9 exemplares; print de feed = 6+ exemplares). Observe cada 
        exemplar separadamente como se fossem refs independentes.
      - Se unitária: trate como 1 ref.
   c. Combine sua observação (incluindo cada exemplar do grid se houver) 
      com a descrição textual ao lado da imagem.
   d. Extraia: hierarquia, ritmo, textura, composição,
      detalhes recorrentes (rodapé, accent bar, signature) que aparecem 
      em vários exemplares — esses são os marcadores de consistência do 
      feed que você precisa replicar.
   e. REGISTRO TONAL: observe se cada exemplar é claro, médio ou escuro,
      e qual a luminosidade dominante dos fundos. NÃO escureça a paleta
      além do que as refs mostram — esse é um erro recorrente. Se as refs
      são claras, o carrossel é claro.
   f. ESTILO DE IMAGEM: observe que TIPO de imagem as refs usam —
      fotografia, pessoas/gesto humanizado, still de objeto, ilustração,
      textura abstrata. As imagens do carrossel seguem esse estilo, não
      uma ilustração literal do assunto da notícia.
6. Liste todos os anti-exemplos da seção "Anti-exemplos" — entram como 
   "DO NOT" no negative prompt.
7. Compile tudo num briefing visual decodificado, no formato definido em
   "⚙️ Render engine". SEÇÕES OBRIGATÓRIAS no briefing: "TYPOGRAPHY LOCK"
   (a seção "Sistema de fontes — TRAVADO" copiada VERBATIM — nomes das 2
   fontes, descrições travadas e tabela de tamanhos), "Tonal register /
   luminosity" (registro tonal das refs + luminosidade dos fundos + ordem de
   NÃO escurecer além das refs), "Imagery style" (tipo de imagem das refs —
   fotográfica/humana/objeto/ilustração — que manda no image_brief de cada
   slide), "Use of gradient", "Detail signature / footer" (elemento de
   consistência recorrente: linha + texto pequeno? micro-grafismo? data +
   handle?) e "Composition style".
8. Esse briefing entra como bloco fixo em TODOS os prompts (capa e 
   slides internos).
```
