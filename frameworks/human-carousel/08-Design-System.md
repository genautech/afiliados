# 08 — Design system

> **Onde colar:** Página `🎨 Design system` no Notion.

---

## Cole o conteúdo abaixo na página

---

## O que esta página faz

Define os princípios visuais universais do carrossel — hierarquia, ritmo, anti-patterns. Esses princípios **viram texto descritivo no prompt do GPT Image 2 (`gpt_image_2`)** quando a R2 gera os slides.

> **Importante:** a estética específica (fonte, paleta, mood) **não vive aqui** — vive na página `🖼️ Referências visuais`, que você edita quando quiser mudar o visual do feed. Esta página é a parte que **não muda** entre estéticas.
>
> A paleta da marca vem de `🏷️ Brand Identity` (variáveis `{brand_color_primary}`, `{brand_color_dark}`, `{brand_color_light}`) e é interpolada automaticamente nos prompts.

---

## Especificações técnicas fixas

- **Dimensão final:** o PNG original retornado pelo Higgsfield CLI. Não fazer downscale, crop, resize ou conversão para 1080×1350.
- **Dimensão de geração:** Higgsfield CLI com `--aspect_ratio "3:4"` e `--resolution "2k"`. Não usar parâmetro legado de tamanho fixo. Se o arquivo vier em dimensão alta (ex.: ~1856px na maior aresta), entregue assim.
- **Resolução:** 72 DPI
- **Formato de output:** PNG
- **Espaço de cor:** sRGB
- **Quantidade de slides padrão:** 9 (configurável: 5, 7, 9, 12)

---

## Regra dos 3 níveis de hierarquia

Todo slide tem exatamente 3 níveis de leitura. Nunca mais, nunca menos.

| Nível | O que é | Peso visual |
|-------|---------|------------|
| **1 — Âncora** | O elemento que o olho vê primeiro | Maior: headline grande, número gigante, ou imagem |
| **2 — Contexto** | O que explica a âncora | Médio: body text, parágrafos |
| **3 — Metadata** | O que organiza sem competir | Menor: tag de seção, handle, assinatura visual discreta |

**Regra de prompt:** quando a R2 monta o prompt do slide, sempre descreve explicitamente os 3 níveis ao GPT Image 2. Exemplo:

```
Hierarchy:
- Level 1 (anchor, largest visual weight): the headline "TEMA X" in bold condensed type
- Level 2 (context, medium weight): the body paragraph below
- Level 3 (metadata, smallest weight): the tag "O PROBLEMA" at top and the brand handle/detail signature at the bottom. Do not render slide numbers or counters.
```

**Se um slide tem 2 elementos de mesmo peso → hierarquia quebrada.** Reescrever o prompt.

---

## Ritmo dark / light

O carrossel alterna fundos pra manter o scroll. Sequência sugerida de 9 slides:

| Slide | Função | Background sugerido |
|-------|--------|-----------|
| 1 | Capa | Foto/imagem full-bleed com gradiente escuro pesado na base |
| 2 | Hook | **Dark** com imagem (foto fundo OU texture) |
| 3 | Mecanismo p1 | **Light** com image box |
| 4 | Mecanismo p2 | **Dark** com imagem ou textura |
| 5 | Prova | **Light** com tabela ou number gigante sobre foto lateral |
| 6 | Expansão | **Dark** com foto background |
| 7 | Aplicação | **Light** com 3 mini-imagens (cards) |
| 8 | Direção | **Dark ou Light** (depende das refs — ver abaixo) |
| 9 | CTA | **Light** com logo |

**Funcionalidade do ritmo:**
- **Dark** = tensão, revelação, mecanismo. Tom sério.
- **Light** = dados, prova, aplicação. Tom acessível.

**Regra de quebra:** nunca 3 slides consecutivos do mesmo tipo.

**Regra de densidade:** dark aguenta menos texto que light (cansa mais o olho). Max ~50 palavras em dark, ~70 em light. **Menos é mais.**

> **O ritmo dark/light é subordinado às `🖼️ Referências visuais`.** A tabela acima é o default. Se as refs da marca são predominantemente claras (ou predominantemente escuras), o carrossel acompanha o registro tonal das refs — não force slides escuros num feed cujas refs são claras. A R2 registra o registro tonal real das refs no visual brief e ele manda. Refs decidem; a tabela não sobrepõe.

### Gradiente — não é default

V2 anterior usava gradient obrigatório no slide 8. **V2.5 mudou:** o uso de gradient é decidido caso a caso, dependendo do que as `🖼️ Referências visuais` da marca sugerem.

- Se as refs visuais têm gradientes integrados ao sistema → R2 pode usar no slide 8 (ou em outros)
- Se as refs visuais NÃO têm gradient (mood editorial sóbrio, sem efeitos) → R2 mantém slide 8 em dark/light, sem gradient
- Nunca aplique gradient só "porque tem que ter um slide gradient"

R2 lê o briefing visual decodificado de `🖼️ Referências visuais` e decide.

---

## Princípio do terço inferior

Conteúdo textual ocupa **terço inferior e médio** do slide. Terço superior fica como respiro visual.

**Exceções onde topo é preenchido:**
- Slide com imagem retangular no topo
- Slide com número gigante no centro-topo (ex: "2.300%")
- Slide de capa (foto full-bleed)
- Slide com headline grande que preenche naturalmente

---

## Tipografia — princípios universais

> As fontes do projeto (as 2 famílias, pesos e tamanhos exatos) ficam **TRAVADAS** na seção "Sistema de fontes — TRAVADO" da página `🖼️ Referências visuais` — é a fonte da verdade tipográfica. O que está aqui são as **regras universais de uso**. Em caso de divergência, a tabela travada de `🖼️ Referências visuais` vence.

### Contraste tipográfico obrigatório
- **Headline** sempre em fonte de **personalidade** (condensada, serifada, ou geométrica forte), peso bold/black, uppercase, kerning negativo
- **Body** sempre em fonte de **legibilidade** (sans-serif neutra), peso regular, sentence case, kerning neutro
- **Nunca usar a mesma fonte/peso/tamanho** pra dois elementos diferentes

### Hierarquia de tamanhos (escala de referência)

> Os valores abaixo são faixas de referência. A R2 **não usa faixas** — usa os **valores exatos** da tabela travada em `🖼️ Referências visuais` → "Sistema de fontes — TRAVADO" (um tamanho e um peso por papel). Faixa gera variação de tamanho entre slides; valor exato, não.

| Elemento | Tamanho referência | Peso |
|---------|-------------------|------|
| Headline capa | 88–108px | 900 |
| Headline interna (dark) | 72–80px | 900 |
| Headline interna (light) | 64–72px | 900 |
| Headline gradient | 72–80px | 900 |
| Body | 36–40px | 400 |
| Body strong (destaque) | 36–40px | 700 |
| Tag de seção | 13px | 700, uppercase, letter-spacing alto |
| Brand bar / handle | 17px | 700 |

### Cor do texto
- **Dark slides:** body em branco com 55% opacidade, strong em branco 100%, accent na cor primária
- **Light slides:** body em preto com 60% opacidade, strong em preto 100%, accent na cor primária
- **Accent (cor primária)** aparece apenas em **palavras-chave**, nunca em frases inteiras

---

## Geração de paleta a partir de cor predominante

A paleta vem de `🏷️ Brand Identity`. O agente injeta as variáveis e a R2 deriva tons intermediários quando necessário:

```
PRIMARY        = {brand_color_primary}        (definido em Brand Identity)
PRIMARY_LIGHT  = primary clareada ~20%        (derivado pela R2)
PRIMARY_DARK   = primary escurecida ~30%      (derivado pela R2)

LIGHT_BG       = {brand_color_light}          (default warm-cream #F1ECE3)
DARK_BG        = {brand_color_dark}           (default warm-dark #1B1411)

GRADIENT       = linear-gradient(165deg, PRIMARY_DARK 0%, PRIMARY 50%, PRIMARY_LIGHT 100%)
```

Defaults atuais (Human Academy):
```
PRIMARY        = #EC5E26  (warm orange)
LIGHT_BG       = #F1ECE3  (warm cream)
DARK_BG        = #1B1411  (warm dark)
```

**Regra de contraste:** cor primária **NUNCA aparece como fundo de texto**. Sempre como accent em palavras-chave, ou em headlines da capa, ou em fill do slide gradient (slide 8).

---

## Componentes visuais — quando usar cada um

Cada slide pode usar **um componente visual** dependendo do conteúdo. A R2 descreve o componente escolhido no prompt do GPT Image 2.

### Card (slides com citação ou lista curta)
**Usar quando:** texto precisa de destaque extra, ou lista de 2-3 itens dentro do slide.
**Não usar quando:** slide já tem headline + body (card vira ruído).

### Tabela (slide de dados — slide 5 tipicamente)
**Usar quando:** 3+ itens comparáveis (indicador + valor).
**Não usar quando:** menos de 3 dados (fica desproporcional).

### Big Stat (número gigante)
**Usar quando:** um único número é o protagonista do slide (ex: "2.300%", "115k", "1.168 posts").
**Não usar quando:** slide tem múltiplos dados de peso igual.

### Image Box (retângulo de imagem no topo)
**Usar quando:** slide tem menos de 60% de preenchimento textual.
**Não usar quando:** slide já está denso.

### Arrow Rows (lista sequencial)
**Usar quando:** 2-3 pontos sequenciais (não paralelos).
**Não usar quando:** mais de 4 itens (vira lista, perde impacto).

---

## Elementos obrigatórios em todos os slides

### Accent bar (topo)
Linha fina, 6-7px, gradient da cor primária. Atravessa o slide horizontalmente.

### Brand bar (topo)
Pequena linha de texto logo abaixo da accent bar:
```
Powered by {brand_name}    |    {brand_handle}    |    2026 ®
```
- Opacidade 100% (sem transparência)
- Tamanho 13–14px
- Light slides: cor em cinza escuro 45%
- Dark slides: cor em branco 45%

### Detail signature (rodapé) — consistência do feed

Elemento pequeno, repetido em **todos os 9 slides**, que dá a "assinatura" do carrossel. **O conteúdo exato é decidido a partir das `🖼️ Referências visuais`** — a R2 observa o detalhe recorrente nas refs e replica.

Padrões comuns observados em feeds de qualidade:
- Linha fina horizontal + texto pequeno (data + handle): `2026.05.14 · @humanacademy`
- Mini-grafismo lateral (símbolo geométrico repetido em todos os slides)
- Tag de seção minúscula no canto inferior (ex: `EDITORIAL · @humanacademy`)
- Barra discreta sem numeração textual, se as referências mostrarem esse recurso

A função: **fazer o feed parecer uma coleção curada, não 9 slides avulsos**. Sem detail signature, cada slide parece isolado.

### Progress bar (rodapé)
Pequena barra horizontal embaixo do slide, mostrando progresso:
- Track 3px, border-radius 2px
- Fill proporcional ((slide_atual / total) × 100)%
- Sem counter textual. Nunca renderizar qualquer número, índice ou marcador de posição do slide.

Pode coexistir com detail signature ou substituí-lo se as refs sugerirem.

### Logo da marca (capa e CTA)

Se `brand_has_logo = true` em `🏷️ Brand Identity`:
- **Slide 1 (capa):** logo **pequena**, no canto inferior direito ou alinhada ao handle. Discreta — não compete com a headline. Tamanho ~60-80px.
- **Slide 9 (CTA):** logo **grande**, centralizada horizontalmente e opticamente entre 50% e 56% da altura. Tamanho ~320-420px, ajustado ao arquivo. É o protagonista visual do slide.
- **Slides 2-8:** **sem logo.** O feed respira.

Se `brand_has_logo = false`:
- Slide 1 e 9 usam lockup tipográfico com `{brand_name}` em fonte de capa (condensed bold), opcional monogram. No slide 9, esse lockup ocupa o lugar do logo e fica grande/central.

### Regra do CTA final

- Slide 9 tem no máximo um CTA curto, com até 8 palavras.
- O CTA fica abaixo do logo/lockup, com hierarquia menor e muito respiro.
- Não entra parágrafo, resumo, pergunta retórica nem dois blocos de texto.
- O handle pode aparecer pequeno abaixo do CTA, mas nunca competir com a marca.

### Não usar
- ❌ Setas de "swipe →" no slide (o swipe é nativo do Instagram)
- ❌ Marcas d'água do gerador
- ❌ Emojis decorativos
- ❌ Ícones genéricos de stock
- ❌ Logo da marca em slides 2-8 (atrapalha respiro)

---

## Anti-patterns visuais — nunca fazer

- ❌ Texto centralizado em slides de conteúdo (só CTA pode ter elementos centralizados)
- ❌ Dois parágrafos do mesmo tamanho e peso
- ❌ Imagem sem overlay comprometendo legibilidade
- ❌ Cor accent em mais de 3 palavras por slide
- ❌ Card dentro de card
- ❌ Tabela com menos de 3 linhas
- ❌ Headline em sentence case (sempre uppercase em condensada)
- ❌ Body text em uppercase (nunca)
- ❌ Mais de 100 palavras em slide dark
- ❌ Slide com apenas tag + 1 frase curta (parece incompleto)
- ❌ Gradientes coloridos genéricos como background de texto
- ❌ Glow effects, neon, holograma, Y2K
- ❌ Stock photo no fundo de slides internos

---

## Slide de capa — regras especiais

A capa é o slide mais importante. É ela que **fixa a estética visual** do carrossel inteiro (porque vira referência pros demais slides via image-to-image).

Requisitos:
- Imagem full-bleed (foto, fundo abstrato, ou textura forte)
- Gradiente escuro na base — forte o suficiente pra contraste 4.5:1 com texto branco
- Headline grande em fonte condensada/serif (conforme referência visual)
- Palavras-chave em cor primária (accent)
- Handle do Instagram alinhado à esquerda, no bloco da headline
- **Sem badges decorativos** (data, tipo de conteúdo, etc.) — capa é limpa: imagem + headline + handle
- Headline + handle no terço inferior do slide (bottom ~120px)

---

## Garantias de legibilidade — sempre verificar

Antes de aprovar qualquer slide:

- [ ] Contraste texto/fundo ≥ 4.5:1
- [ ] Nenhum texto sobre área clara da imagem sem gradiente de proteção
- [ ] Headline não estoura a área do slide
- [ ] Body não sobrepõe progress bar (padding-bottom mínimo 80px)
- [ ] Margens horizontais seguras (mínimo 52px)
- [ ] Palavras accent só em palavras-chave, não blocos inteiros
- [ ] Hierarquia de 3 níveis perceptível
