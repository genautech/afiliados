# 08 — Visual System

> **Documento mestre da disciplina de design visual e identidade gráfica.** Escrito com autoridade de um diretor de arte sênior — PhD em design visual, formado nas escolas que vão de Ulm a Basel a Cooper Union, com experiência em estúdios como Pentagram, Wolff Olins, Collins, Porto Rocha, Manual, Berger&Föhr, Mucho, e referência ativa em Vignelli, Müller-Brockmann, Tschichold, Bringhurst, Lupton, Itten, Albers, Rams, Frutiger.
>
> Este arquivo é a referência de identidade visual de TODO o sistema. O Maestro consulta antes de gerar peça gráfica, antes de auditar layout, antes de propor sistema visual. Para geração real de imagem, os trechos entram no Higgsfield CLI com Nano Banana 2 (`nano_banana_2`).

---

## Sumário

0. **Doutrina** — autoridade e premissa
1. **Literatura de referência** — bibliografia canônica
2. **Os 12 princípios fundadores**
3. **Frameworks consolidados** (Vignelli Canon, Sistema Suíço, Atomic Design, Design Tokens, Carbon, Material)
4. **Sistema de cor** (paleta, neutros, semânticas, derivados, harmonia, contraste)
5. **Sistema tipográfico** (hierarquia, escala modular, proporções)
6. **Sistema de grid e espaçamento** (modular, baseline, breakpoints)
7. **Logo e marca gráfica** (variantes, clear space, anti-uso)
8. **Componentes universais** (cards, botões, divisores)
9. **Motion** (princípios, easings, durations)
10. **O que é design BOM vs RUIM** (casos canônicos)
11. **O que é design RÁPIDO vs LENTO** (eficiência de produção)
12. **O que FUNCIONA vs NÃO FUNCIONA** (eficácia em escala)
13. **O que VENDE vs AFASTA** (conversão visual)
14. **O que ENVELHECE BEM vs DATA RÁPIDO**
15. **Anti-patterns visuais exaustivos**
16. **Critérios de qualidade** (como julgar trabalho)
17. **Quando o Maestro deve me chamar** (roteamento)
18. **Checklist operacional**

---

## 0. Doutrina

Design não é decoração. Design é **comunicação aplicada com restrição**. Toda decisão visual é, em última instância, uma decisão de hierarquia: o que vem primeiro pra leitura, o que vem depois, o que sai. Forma serve função; e função forte gera forma duradoura.

Marca medíocre em 2026 é fácil de identificar: usa template Bootstrap, tem hero com CTA azul-roxo gradient, fotografia stock de pessoas sorrindo, tipografia genérica do Google Fonts (Inter ou Poppins) sem hierarquia, e uma paleta de 7 cores que ninguém saberia diferenciar de 10 mil outras marcas. Marca distinta em 2026 é igualmente fácil de identificar: tem uma decisão difícil tomada com convicção em cada dimensão. Geralmente tem MENOS, não mais. Geralmente tem REGRA, não improviso.

O canon central do design moderno (de Bauhaus a Apple a Aesop) é: **restrição libera**. Sistema bem definido produz mais, mais rápido, com mais consistência, do que improviso. A frase mais perigosa numa reunião de design é "vamos fazer especial dessa vez" — porque sistema é o que **defende a marca de cada momento de tentação**.

Toda decisão deste documento parte de uma premissa: **design é disciplina técnica com fundação centenária**. Há 100 anos de teoria e prática. Quem ignora esse repertório repete os erros que os anos 70 e 80 já corrigiram.

---

## 1. Literatura de referência

Toda decisão deste documento se ancora em obras canônicas. Em caso de dúvida, consulte primeiro estas fontes — elas são a corte de apelação.

### Fundamentos teóricos do design moderno

- **Massimo Vignelli** — *The Vignelli Canon* (2010, gratuito em PDF). Manifesto do design responsável. Princípios fundamentais em 100 páginas.
- **Paul Rand** — *Thoughts on Design* (1947). O começo do design moderno americano. Logos de IBM, ABC, UPS, Westinghouse.
- **Josef Müller-Brockmann** — *Grid Systems in Graphic Design* (1981). A bíblia do sistema modular suíço. Aplicável a qualquer mídia.
- **Jan Tschichold** — *The New Typography* (1928). Manifesto da tipografia moderna sem-serifa, alinhamento à esquerda, hierarquia funcional.
- **Karl Gerstner** — *Designing Programmes* (1964). Sistema como programa (anterior ao design generativo).
- **Emil Ruder** — *Typographie: A Manual of Design* (1967). Escola Suíça de Basel.
- **Wolfgang Weingart** — *My Way to Typography* (2000). Pós-Suíço, anti-rigidez.

### Tipografia (canon obrigatório)

- **Robert Bringhurst** — *The Elements of Typographic Style* (1992). A bíblia. Lê-se 1x por ano. Versão portuguesa: *Elementos do Estilo Tipográfico* (Cosac Naify).
- **Ellen Lupton** — *Thinking with Type* (2004). Acessível, contemporâneo, perfeito pra início.
- **Karen Cheng** — *Designing Type* (2005). Anatomia da letra.
- **Adrian Frutiger** — *The Type and the Eye* (1998). Memórias do criador de Univers, Frutiger, Avenir.
- **Hermann Zapf** — *Manuale Typographicum* (1968). Sobre Zapfino, Optima, Palatino.
- **Erik Spiekermann** — *Stop Stealing Sheep & Find Out How Type Works* (1993). Tipografia pra não-designers.
- **Peter Bilak** (Typotheque) — ensaios online sobre tipografia contemporânea.

### Cor

- **Johannes Itten** — *The Art of Color* (1961). Curso fundamental de Bauhaus. Disco de cor, harmonias, contrastes.
- **Josef Albers** — *Interaction of Color* (1963). Cor não é absoluta — é relacional.
- **David Hornung** — *Color: A Workshop for Artists and Designers* (2005). Aplicação prática contemporânea.
- **Patrick Baty** — *Anatomy of Colour* (2017). História cultural das cores.

### Brand identity e sistema visual

- **Wally Olins** — *On Brand* (2003) e *Brand New: The Shape of Brands to Come* (2014). Estratégia + identidade.
- **Marty Neumeier** — *The Brand Gap* (2003). Conexão entre estratégia e expressão.
- **Michael Bierut** — *How to* (2015). Casos do Pentagram explicados pelo próprio.
- **Steven Heller & Veronique Vienne** — *100 Ideas that Changed Graphic Design* (2012).
- **Per Mollerup** — *Marks of Excellence: The Function and Variety of Trademarks* (1997). Estudo definitivo de logos.
- **Kevin Murphy & Brian Collins** (Collins) — ensaios e palestras.
- **Stefan Sagmeister** — *Things I Have Learned in My Life So Far* (2008). Provocação criativa.
- **Pentagram Papers** (publicação periódica, 50+ edições). Estudo de caso autoral.

### Princípios universais e dieter rams

- **Dieter Rams** — *10 Principles of Good Design* (manifesto, ~1980). Leitura obrigatória de 1 página.
- **Naoto Fukasawa** — *Without Thought*. Design como ausência de obstáculo.
- **Jonathan Ive** — entrevistas e palestras sobre Apple design.
- **Hartmut Esslinger** — *A Fine Line: How Design Strategies Are Shaping the Future of Business* (2009). Frog Design.

### Web e digital design

- **Brad Frost** — *Atomic Design* (2016, gratuito online). Sistema componente-átomo-molécula-organismo.
- **Jared Spool** — UIE essays. UX que pensa visualmente.
- **Erik Kennedy** — *Refactoring UI* (2018, com Adam Wathan, criador do Tailwind). UI prático pra programadores.
- **Steve Krug** — *Don't Make Me Think* (2000, rev 2014). UX clássico.
- **Refactoring UI**, **Material Design**, **IBM Carbon**, **Apple HIG**, **Shopify Polaris**, **GOV.UK Design System**, **GitLab Pajamas** — design systems públicos referência.

### História e crítica

- **Steven Heller** — *Graphic Style: From Victorian to Hipster* (3ª ed, 2017). História visual contextual.
- **Philip B. Meggs** — *Meggs' History of Graphic Design* (1983, rev 2016). A história do campo, em volume.
- **Richard Hollis** — *Swiss Graphic Design* (2006). Movimento Suíço em contexto.
- **Adrian Shaughnessy** — *How to Be a Graphic Designer Without Losing Your Soul* (2005, rev 2010). Profissional + ético.

### Brasileiros

- **Aloisio Magalhães** — fundador do design moderno brasileiro. Logo da Petrobras, do BNDES.
- **Cauduro Martino** — referência institucional brasileira.
- **Alexandre Wollner** — pioneiro Bauhaus no Brasil.
- **Rico Lins** — design editorial brasileiro contemporâneo.
- **Estúdios brasileiros referência**: Ana Couto Branding, Greco Design, Tátil Design, Crama Design Estratégico, Luminous Design, Veracidade.

### Design systems e tokens (digital, contemporâneo)

- **Material Design** (Google) — design tokens em escala massiva.
- **IBM Carbon** — design system enterprise sério.
- **Apple Human Interface Guidelines** — referência de iOS/macOS.
- **Shopify Polaris** — e-commerce.
- **GitLab Pajamas** — open-source.
- **Atlassian Design** — produtividade.
- **Tailwind CSS / Catalyst** (Adam Wathan) — utility-first contemporâneo.

> Quem chega ao design sem ter lido Vignelli Canon, Bringhurst Elements e Müller-Brockmann Grid Systems é como fazer arquitetura sem ter lido Le Corbusier, Frank Lloyd Wright, Louis Kahn. Possível. Não recomendado.

---

## 2. Os 12 princípios fundadores

Doutrina não-negociável. Toda peça visual passa por eles.

### Princípio 1 — Hierarquia decide tudo

A primeira pergunta diante de qualquer composição: **o que vem primeiro pra leitura?** Hierarquia não é decoração — é instrução de leitura. Sem hierarquia clara, o olho não sabe pra onde ir, e a peça falha em comunicar mesmo se cada elemento for individualmente bonito.

Toda peça tem 3 níveis de hierarquia:
- **Anchor (nível 1)** — o que o olho vê primeiro (headline, número grande, ou imagem dominante)
- **Context (nível 2)** — o que explica o anchor (body, sub-headline)
- **Metadata (nível 3)** — o que organiza sem competir (tag, número de slide, handle)

Quando dois elementos têm peso visual igual, hierarquia quebrou. Reescreva o prompt, refaça o layout.

Ancoragem teórica: Müller-Brockmann (cap. 4); Bringhurst (cap. 8); Lupton (parte 3).

### Princípio 2 — Restrição libera

Sistema visual com 3 cores produz mais que sistema com 9. Sistema com 2 fontes produz mais que com 5. A restrição força criatividade, sustenta consistência, acelera produção.

Marcas que vivem disso: Aesop (paleta off-white + verde-oliva profundo, fim), Apple (Helvetica + branco + cinza, por 30 anos), MUJI (ausência cromática deliberada), Patagonia (paleta de 4 cores em 50 anos).

Marcas que sofrem do contrário: a maioria das marcas brasileiras pequenas que tentam ter 8 cores, 4 fontes, 12 ícones — e ficam sem identidade nenhuma.

Vignelli: *"Design is one"*. Sistema único, expressão múltipla.

### Princípio 3 — Espaço negativo é conteúdo, não vazio

Espaço em branco não é "espaço sobrando" — é elemento ativo. Espaço respira composição, separa hierarquia, dá importância ao que sobra.

Marcas que dominam: Aesop (50%+ dos layouts é espaço negativo), MUJI, Apple, The New Yorker, Wallpaper Magazine.

Anti-padrão brasileiro: medo de espaço vazio. Designers iniciantes preenchem tudo "pra não parecer incompleto". Resultado: peça sufocante, leitura pesada, marca esquecida.

Regra prática: hierarquia 3:1. Espaço entre seções principais é 3× espaço entre subseções. Terço superior livre em peças editoriais (slide, post longo, página).

### Princípio 4 — Tipografia primeira, tudo depois

Antes de cor, antes de imagem, antes de layout: **tipografia certa**. Tipografia carrega 80% da personalidade visual da marca. Cor pode mudar (Coca-Cola passou de várias paletas), mas Spencerian script da Coca permanece desde 1885.

Erro frequente: tratar tipografia como decisão técnica ("vou usar Inter porque é grátis"). Fonte é decisão estratégica primeira. Stripe escolheu Söhne (~$1.500 USD pra licença) porque carrega autoridade técnica + frescor; Apple desenhou San Francisco custom; Aesop usa Garamond porque carrega tradição apothecary.

Decisão de fonte = decisão de personalidade. Não é "qual é bonita". É "qual carrega o que somos".

### Princípio 5 — Cor é relacional, nunca absoluta

Albers: cor não existe sozinha — só existe em relação a outras cores. Vermelho ao lado de verde é vibrante; ao lado de outro vermelho, é sutil. Off-white sobre preto é luminoso; sobre branco é sujo.

Implicação: nunca decida uma cor olhando ela sozinha. Sempre teste em contexto: sobre qual fundo, ao lado de qual outra cor, em qual tamanho.

Erro frequente: escolher hex isolado no Coolors ou no Adobe Color, sem testar em uso. Resultado: paleta que parece bonita no swatch e queima em aplicação.

### Princípio 6 — Contraste é função, não estilo

Contraste tipográfico (peso, tamanho, estilo) cria hierarquia. Contraste de cor cria atenção. Contraste de espaço cria respiração. Contraste é o motor que faz design comunicar.

Toda peça precisa de **3 níveis de contraste** mínimos:
- Macro (entre seções principais)
- Médio (entre headline e body)
- Micro (entre body strong e body regular)

Sem contraste = leitura plana, sem hierarquia, design morto.

### Princípio 7 — Grid é liberdade, não prisão

Grid não restringe criatividade — libera atenção mental pra decisões importantes. Designer que improvisa cada margem, cada espaçamento, cada alinhamento, gasta 80% da energia em micro-decisões e 20% no que importa.

Müller-Brockmann: o grid é **andaime invisível**. Permite criação consistente em escala. Permite outros designers continuarem o trabalho. Permite a marca crescer sem perder identidade.

Marcas sem grid: cada peça parece avulsa. Marcas com grid: o feed parece coleção curada.

### Princípio 8 — Detalhe define qualidade percebida

A diferença entre design bom e design ótimo está em micro-decisões: kerning de 1px, line-height de 0.05, contraste de 5%, alinhamento de baseline. Usuário não detecta conscientemente — mas sente.

Apple investe meses ajustando 1px no ícone. Aesop revisa cada caractere de cada label. The New Yorker tem fact-checker pra cada vírgula.

Implicação: design bom é editado obsessivamente. Primeira versão é rascunho. Segunda começa a ser design. Décima começa a ser excelente.

### Princípio 9 — Performance é parte do design

Site lento = design ruim, mesmo se o layout for lindo. Imagem 5MB sem compressão = design ruim, mesmo se a foto for boa. Carregamento bloqueante = design ruim, mesmo se a animação for criativa.

Performance digital é função de design — não decisão técnica posterior. Imagens otimizadas, fontes pré-carregadas (font-display: swap), CSS crítico inline, lazy-load fora do viewport, transições GPU-accelerated.

Em 2026, **Google Core Web Vitals** (LCP, FID, CLS) são parte de SEO. Performance ruim = invisível no buscador.

### Princípio 10 — Acessibilidade é não-negociável

WCAG AA mínimo:
- Contraste texto ≥ 4.5:1 (texto normal), ≥ 3:1 (texto grande)
- Tamanho mínimo de toque 44×44 px (mobile)
- Foco visível em todos elementos interativos
- Alt text em toda imagem com função
- Hierarquia de heading correta (H1 → H2 → H3, sem pular)
- Cor não como único marcador (sempre + ícone ou texto)

15% da população tem alguma deficiência visual; 30% dos usuários de mobile estão em condições adversas (sol forte, mãos sujas, cansaço). Acessibilidade serve a todos.

### Princípio 11 — Atomic é inevitável em escala

Em sistema com mais de 5-10 telas, design improvisado quebra. Atomic Design (Brad Frost): construir do átomo (botão, ícone, label) → molécula (barra de busca = input + botão + ícone) → organismo (header, footer, card de produto) → template → página.

Token-first design: cores, tipografia, espaçamento, radius — todos como variáveis (`--color-primary`, `--space-4`, `--radius-md`). Mudança no token propaga em todo o sistema.

Sem atomic + tokens, redesign de marca leva meses. Com, leva semanas.

### Princípio 12 — Anti-padrão explícito vence intuição

Listar o que NÃO fazer é tão importante quanto listar o que fazer. Designer iniciante caí em armadilhas que designer sênior já reconhece. Lista de anti-padrões explícita acelera maturidade.

Por isso este documento tem seção 15 inteira dedicada a anti-padrões. Por isso o DNA.md tem seção 3.5 e 12 dedicadas a anti-referências. Não é negativismo — é repertório.

---

## 3. Frameworks consolidados (com atribuição)

### 3.1 — Vignelli Canon (Massimo Vignelli, 2010)

Manifesto de 100 páginas com princípios universais de design responsável. Núcleo:

- **Semantics** — design tem significado, não é decoração
- **Syntax** — disciplina, ordem, sistema
- **Pragmatics** — funciona, é compreensível
- **Discipline** — restrição auto-imposta
- **Appropriateness** — design certo pra contexto certo
- **Ambiguity** — evite — design comunica claro
- **Design is one** — gráfico, produto, ambiente seguem mesma lógica

### 3.2 — Sistema Suíço / Estilo Internacional (Müller-Brockmann)

Características:
- Grid modular como base
- Tipografia sans-serif (Helvetica, Univers, Akzidenz-Grotesk)
- Alinhamento à esquerda (não justificado)
- Hierarquia através de tamanho, peso, espaço
- Fotografia objetiva (não ilustração decorativa)
- Cor reduzida (preto, branco, vermelho ou primary única)

Marcas contemporâneas que herdam: Stripe, Linear, Vercel, Apple, Lufthansa, Knoll.

### 3.3 — Atomic Design (Brad Frost, 2016)

Hierarquia de componentes:
- **Átomo** — elemento base (botão, label, input)
- **Molécula** — combinação de átomos com função (search bar = input + botão)
- **Organismo** — combinação de moléculas com função maior (header completo)
- **Template** — esqueleto de página (sem conteúdo real)
- **Página** — template com conteúdo real

Vantagem: facilita design system, documentação, manutenção em escala.

### 3.4 — Design Tokens (Salesforce 2014, popularizado por Material/Carbon/Tailwind)

Variáveis nomeadas pra valores de design:

```css
--color-primary: #...;
--color-text-on-light: #...;
--space-4: 16px;
--radius-md: 8px;
--font-display: 'Söhne', sans-serif;
```

Vantagens:
- Mudança no token propaga em todo sistema
- Times distintos consomem mesma fonte de verdade
- Facilita modo escuro, modo high-contrast, internacionalização

### 3.5 — Material Design (Google, 2014, contínuo)

Design system mais usado do mundo. Princípios:
- Material como metáfora física (camadas com elevação real)
- Movement provides meaning
- Bold, graphic, intentional
- Cross-platform (web, Android, iOS, watchOS)

Ideal pra: produtos digitais com volume de funcionalidade. Excessivo pra: marca editorial, produto premium artesanal.

### 3.6 — IBM Carbon (open-source)

Enterprise-grade. Princípios:
- Carbon white + IBM blue
- Plex (família tipográfica custom)
- Grid 16 colunas
- Componentes acessíveis por padrão
- Multi-platform

Ideal pra: enterprise, B2B sério, dashboard.

### 3.7 — Apple Human Interface Guidelines

Referência de iOS/macOS. Princípios:
- Clarity, deferral, depth
- Padrões nativos da plataforma
- Animação como linguagem (não decoração)
- SF Symbols como sistema unificado de ícones

Ideal pra: app nativo iOS/macOS. Inadequado pra: web, marca não-tech.

### 3.8 — Refactoring UI / Tailwind (Adam Wathan, 2018+)

Utility-first design. Princípios:
- Compose UI a partir de utilities pequenas
- Color scale 50-950 (não primary/secondary)
- Spacing scale baseada em rem (4px steps)
- Tipografia escala major-third ou minor-second

Ideal pra: web app, produto digital ágil. Catalyst e shadcn/ui são extensões modernas.

---

## 4. Sistema de cor

### 4.1 — Estrutura mínima de paleta de marca

| Categoria | Tokens necessários |
|---|---|
| **Identidade** | `primary`, `secondary` (opcional) |
| **Neutros** | `bg-light`, `bg-dark`, `text-on-light`, `text-on-dark`, `border`, `surface` |
| **Semânticas** (UI) | `success`, `warning`, `error`, `info` |
| **Derivados** | `primary-light` (~20% lighter), `primary-dark` (~30% darker), alphas (5%, 15%, 30%) |

Total mínimo: ~14 tokens. Marca operacional precisa disso.

### 4.2 — Harmonia cromática (Itten)

5 esquemas clássicos:

1. **Monocromática** — variações da mesma matiz (Aesop)
2. **Análoga** — cores adjacentes no disco (calor: laranja+vermelho+amarelo)
3. **Complementar** — opostas no disco (azul+laranja, vermelho+verde)
4. **Tríade** — 3 cores equidistantes (vermelho+amarelo+azul)
5. **Split-complementar** — base + 2 vizinhas da complementar

Marcas brasileiras erram frequentemente em "sem esquema" — cores escolhidas por gosto sem relação harmônica. Resultado: paleta caótica, leitura cansativa.

### 4.3 — Contraste (WCAG e Itten)

Itten descreve 7 contrastes fundamentais:
1. Contraste de tom (escuro vs. claro)
2. Contraste de matiz (cores puras opostas)
3. Contraste de saturação (vivo vs. sutil)
4. Contraste de temperatura (quente vs. frio)
5. Contraste complementar
6. Contraste simultâneo (cor muda em contexto)
7. Contraste de extensão (1 cor pequena saturada + 1 grande sutil)

WCAG AA é mínimo legal. WCAG AAA é mínimo de marcas premium (≥ 7:1).

Ferramentas: contrast-ratio.com, WebAIM Contrast Checker, Stark plugin.

### 4.4 — Aplicação de cor: bom vs ruim

| ✅ Bom | ❌ Ruim |
|---|---|
| Primary em **palavras-chave** (1-3 por peça) | Primary em **frases inteiras** ou backgrounds grandes |
| Primary como **CTA principal único** por tela | 3+ CTAs primary competindo |
| Cor secundária pra **hover**, gráficos | Cor secundária aleatória em headlines |
| Saturação seletiva (1 ponto vivo, resto sutil) | Tudo saturado (cansaço visual) |
| Contraste WCAG AA respeitado | Texto cinza claro sobre fundo branco (acessibilidade quebrada) |
| Neutros warm OU cool consistentes | Neutros mistos (branco puro + warm-cream juntos) |

---

## 5. Sistema tipográfico

### 5.1 — Escolha de fontes (3 famílias máximo)

| Função | Características | Exemplos |
|---|---|---|
| **Display** | Personalidade forte, peso bold/black, kerning negativo, uppercase OK | Söhne Breit, NaN Holo, Druk, Suisse Int'l Bold |
| **Body** | Legibilidade alta, peso 400-500, x-height generosa | Inter, Söhne Buch, Plus Jakarta, Geist |
| **Mono** | Caracteres mono-largura, uso em metadados/código | JetBrains Mono, Söhne Mono, Geist Mono, IBM Plex Mono |

Marcas premium frequentemente custom: SF Pro (Apple), Google Sans, Spotify Circular, Netflix Sans, IBM Plex.
Marcas custo-zero: Inter, Plus Jakarta, Manrope, Geist (Vercel), JetBrains Mono.

### 5.2 — Escala modular tipográfica

Razão modular comum: **1.250 (major third)** ou **1.125 (major second)**.

Exemplo escala 1.250 partindo de 16px:
- 16, 20, 25, 31, 39, 49, 61, 76 (px)

Escala dá hierarquia consistente. Sem escala, tamanhos aleatórios criam ruído visual.

### 5.3 — Anatomia de hierarquia

| Token | Tamanho | Line-height | Letter-spacing | Peso | Uso |
|---|---|---|---|---|---|
| `display-xl` | 96-108px | 0.95 | -3px | 900 | Capa de carrossel, hero forte |
| `display-l` | 72-80px | 1.0 | -2px | 900 | Headline interna dark |
| `display-m` | 56-64px | 1.1 | -1.5px | 800 | Subtítulos de seção |
| `body-l` | 20-24px | 1.5 | 0 | 400 | Body forte, hero text |
| `body-m` | 16-18px | 1.6 | 0 | 400 | Body padrão |
| `body-s` | 14px | 1.5 | 0.2px | 400 | Caption, helper text |
| `tag` | 12-13px | 1.4 | 3px | 700 | Tags uppercase |
| `mono-s` | 12-13px | 1.4 | 0.5px | 600 | Metadados |

### 5.4 — Tipografia: bom vs ruim

| ✅ Bom | ❌ Ruim |
|---|---|
| Headline em display, body em body, tag em mono — 3 famílias máximo | 4-5 fontes diferentes (Comic Sans + Times + Arial + script) |
| Hierarquia clara (3+ níveis distintos) | Tudo no mesmo tamanho/peso |
| Line-height generoso em body (1.5-1.6) | Body com line-height 1.0-1.2 (cansa) |
| Letter-spacing negativo em headline grande | Letter-spacing positivo em body (datado, irritante) |
| Uppercase apenas em tag/headline curta | Uppercase em parágrafo body (ilegível) |
| Italic raro, intencional | Italic constante (perde efeito) |

---

## 6. Sistema de grid e espaçamento

### 6.1 — Baseline grid

Toda peça segue baseline de 4 ou 8px. Spacing scale derivada:

```
4, 8, 12, 16, 24, 32, 48, 64, 96, 128
```

Margem mínima entre elementos = baseline. Margem entre seções = múltiplo (3-4× baseline).

### 6.2 — Grid de coluna

| Mídia | Colunas | Gutter | Margem |
|---|---|---|---|
| Web desktop | 12 | 24px | 80-96px |
| Web tablet | 8 | 24px | 48-64px |
| Web mobile | 4 | 16px | 16-24px |
| Slide (1080×1350) | 4-8 modular | 16px | 80px |
| Email | 1-2 | n/a | 32-40px |

### 6.3 — Border radius

| Token | Valor | Uso |
|---|---|---|
| `radius-none` | 0 | Editorial, brutalist |
| `radius-sm` | 4px | Inputs, botões pequenos |
| `radius-md` | 8px | Cards, botões padrão |
| `radius-lg` | 12-16px | Cards grandes, modais |
| `radius-xl` | 24px | Hero cards |
| `radius-full` | 9999px | Avatars, badges, botões pill |

Marca conservadora: 0-4px. Marca contemporânea: 8-12px. Marca tech moderna: 8-16px. Marca lúdica: 16-24px+.

### 6.4 — Elevation/shadow

| Nível | Uso |
|---|---|
| `shadow-none` | Editorial sóbrio (Aesop, MUJI, Apartamento) |
| `shadow-sm` | Cards sutis |
| `shadow-md` | Modais, dropdowns |
| `shadow-lg` | Hero cards, elementos elevados |
| `shadow-xl` | Quase nunca — só pra peças muito específicas |

Tendência 2024-2026: **shadow sutil ou ausente**. Skeumorfismo de 2010 voltou nostálgico em alguns nichos, mas geralmente datado.

---

## 7. Logo e marca gráfica

### 7.1 — Variantes mínimas necessárias

| Variante | Uso |
|---|---|
| Logotipo principal (horizontal) | Headers, footers, hero, decks |
| Logotipo vertical | Espaços quadrados, perfis sociais |
| Monogram (símbolo isolado) | Favicon, app icon, watermark, contextos pequenos |
| Lockup com tagline | Apresentações institucionais |
| Mono preto | Sobre fundos claros sem cor da marca |
| Mono branco | Sobre fundos escuros sem cor da marca |
| Cor invertida (se aplicável) | Sobre cor primária forte |

Total: 5-7 variantes. Menos = falta flexibilidade. Mais = inflação visual.

### 7.2 — Clear space e tamanho mínimo

Clear space mínimo = **0.5 × altura do "x"** (ou unidade equivalente do logo). Nada (texto, imagem, cor sólida) pode invadir essa área.

Tamanho mínimo digital: 80px de largura. Abaixo disso, usar monogram. Tamanho mínimo impresso: 25mm.

### 7.3 — Anti-uso da logo

- ❌ Logo girada (rotação ≠ 0°)
- ❌ Logo distorcida (proporção alterada, "esticada" pra caber)
- ❌ Logo com filtro forte (drop shadow grande, glow, blur, gradient overlay)
- ❌ Logo dentro de outro logo (composição pesada)
- ❌ Logo em cor não aprovada (vermelho aleatório porque ficou bonito)
- ❌ Logo sobre imagem de baixo contraste sem proteção (gradient ou área reservada)
- ❌ Logo abaixo do tamanho mínimo
- ❌ Logo sem clear space respeitado
- ❌ Logo "sangrando" pra fora do canvas em corte mal calculado

### 7.4 — Casos de logo: bom vs ruim

| ✅ Bom | ❌ Ruim |
|---|---|
| Forma simples, reconhecível em silhueta (Nike swoosh, Apple maçã, Twitter pássaro) | Detalhes finos que somem em tamanho pequeno |
| Funciona mono e em cor | Só funciona com gradient ou cor específica |
| Tem versão monogram | Só existe a versão completa (problema em favicon) |
| Atemporal — Paul Rand IBM (1972) ainda funciona | Tendência datada (efeito 3D anos 2000, gradient roxo-azul tech) |
| Carrega significado conceitual | Pictograma literal sem profundidade (logo de pão pra padaria) |

---

## 8. Componentes universais

### 8.1 — Cards

- Border-radius: `radius-md` (8px) padrão
- Padding interno: 24-32px
- Background: contrasta levemente com fundo da página
- Border: 1px sólido em token `border` OU shadow sutil — escolha um, não ambos
- Spacing interno: respeitar baseline scale

### 8.2 — Botões

| Tipo | Uso |
|---|---|
| **Primary** | 1 por tela. Ação principal. Cor `primary`. |
| **Secondary** | Ação alternativa. Border + transparent OU `surface` |
| **Tertiary / Ghost** | Ação terciária. Texto only, sem fundo |
| **Destructive** | Apaga, remove. Cor `error` |
| **Disabled** | Estado bloqueado. Opacity reduzida |

Tamanhos: sm (32px), md (40px), lg (48px). Touch target mínimo mobile: 44×44px.

### 8.3 — Forms

- Label sempre acima do input (não placeholder-only — perde-se ao começar a digitar)
- Helper text abaixo (cinza médio)
- Error state em `error` + ícone + mensagem clara
- Success state minimal (check verde, sem celebração exagerada)
- Required marker explícito (asterisco ou texto)

### 8.4 — Tabelas

- Header com peso maior (600-700)
- Linhas alternadas com background sutil (zebra) — opcional
- Padding vertical 12-16px, horizontal 16-24px
- Alinhamento numérico à direita, texto à esquerda
- Border ou shadow sutil entre linhas

---

## 9. Motion

### 9.1 — Princípios de movimento

Material Design Motion: *"Movement provides meaning."*

- Movimento serve função (transição, feedback, hierarquia)
- Não decoração
- Performance > beleza (60fps mínimo)
- Respeitar `prefers-reduced-motion`

### 9.2 — Curvas de easing aprovadas

| Token | CSS | Uso |
|---|---|---|
| `ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Aparições, entradas |
| `ease-in` | `cubic-bezier(0.4, 0.0, 1, 1)` | Saídas, desaparecimentos |
| `ease-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Mudanças de estado |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Microinterações lúdicas (raro) |

### 9.3 — Durações padrão

| Tipo | Duração | Easing |
|---|---|---|
| Microinteração (hover, click, focus) | 150-200ms | ease-out |
| Aparição (modal, tooltip) | 250-350ms | ease-out + fade |
| Mudança de tela | 300-450ms | ease-in-out + slide sutil |

### 9.4 — Anti-padrões de motion

- ❌ Bounce/elastic em transições principais (parece frágil)
- ❌ Fade > 500ms (sensação de lentidão)
- ❌ Parallax forte (rotação 3D, scale grande) — datado, distrai
- ❌ Animação por animação (sem propósito)
- ❌ Loading spinner fake (não indica progresso real)
- ❌ Auto-playing video com som
- ❌ Confetti em interação corriqueira

---

## 10. O que é design BOM vs RUIM (casos canônicos)

### 10.1 — Design BOM (estudar)

**Marcas referência globais:**
- **Aesop** (aesop.com) — apothecary minimalismo, Garamond + paleta off-white + verde-oliva profundo, fotografia still-life cirúrgica
- **MUJI** (muji.com) — utilitarismo japonês, ausência cromática deliberada, tipografia Akzidenz-Grotesk
- **Stripe** (stripe.com) — tech-clear, Söhne, gradients sutis, cor primária bem dosada
- **Linear** (linear.app) — software premium, dark-first, micro-interações cirúrgicas
- **Vercel** (vercel.com) — geometria, Geist (custom), preto+branco+1 cor
- **Apple** (apple.com) — espaço negativo extremo, fotografia de produto absoluta, SF Pro
- **Patagonia** (patagonia.com) — outdoor sério, tipografia robusta, paleta natural
- **Hermès** (hermes.com) — luxo francês, Helvetica + laranja, espaço negativo
- **The Gentlewoman** (thegentlewoman.co.uk) — editorial sóbrio, tipografia hardcover
- **Apartamento** (apartamentomagazine.com) — interior magazine, fotografia 35mm, layout editorial denso

**Marcas referência brasileiras:**
- **Granado** — heritage farmacêutico bem trabalhado
- **Havaianas** — pop brasileiro consistente em décadas
- **Osklen** — lifestyle brasileiro com substância
- **Farm** — pop colorido brasileiro, identidade reconhecível

**Estúdios referência:**
- Pentagram, Wolff Olins, Collins, Porto Rocha, Manual, Berger&Föhr, Mucho, Mast, Sagmeister & Walsh, Dia Studio, Order, Other Means

### 10.2 — Design RUIM (evitar)

**Anti-padrões visuais saturados:**
- Hero com gradient roxo-azul tech (estética SaaS B2B 2018-2022 datada)
- "Corporate Memphis" — ilustrações flat com proporções estranhas, paleta saturada
- Stock photo de equipe sorrindo na sala de reunião
- Header com 6 itens de menu + busca + login + idioma + carrinho — confusão
- Badges de "AI-powered", "Award-winning", "#1 in market" sem prova
- Tipografia Lobster, Pacifico, Comic Sans em qualquer contexto profissional
- Drop shadow forte de 20px+ blur (datado)
- Border radius grande em peças editoriais sérias
- Background pattern decorativo (datado, distrai)
- 5+ gradientes diferentes na mesma página

**Marcas pra estudar como NÃO fazer** (sem nomear publicamente, mas reconhecíveis):
- Maioria de SaaS B2B brasileiro com identidade copiada de Stripe mas mal executada
- Marcas pessoais de "consultor de IA" com gradient roxo + foto de fundador sorrindo + 3 CTAs concorrentes
- E-commerce de moda média com 8 cores na home, 4 carousels, banner promocional fixo

---

## 11. O que é design RÁPIDO vs LENTO (eficiência)

### 11.1 — RÁPIDO (escalável, eficiente)

- **Design tokens** — mudança propaga em todo sistema
- **Componentes reutilizáveis** — Atomic design, biblioteca de componentes
- **Templates por touchpoint** — slide, post, email, landing pré-estruturados
- **Sistema de grid consistente** — não improvisar margem cada peça
- **Bibliotecas de UI** (shadcn, Radix, MUI, Carbon) — não reinventar botão
- **Figma com Variables + Auto Layout** — mudança em um lugar, aplica em centenas
- **Naming convention clara** — `button-primary-md` é encontrável

### 11.2 — LENTO (artesanal, manual)

- **Custom pixel-perfect cada peça** — válido pra hero, inválido pra tudo
- **Sem tokens** — toda mudança é manual em N arquivos
- **Sem grid** — cada peça é decisão zero
- **Re-criar componente toda vez** — 100% custom é 100% retrabalho
- **Naming inconsistente** — "btn1", "novo botão", "BUTTON_FINAL_v3.fig" — ninguém acha
- **Aprovação em série lenta** (múltiplas pessoas, sem critério claro)
- **Refazer logos/ilustrações pra cada peça** em vez de ter biblioteca

### 11.3 — Eficiência: regra de ouro

> Designer sênior gasta 80% do tempo construindo SISTEMA. 20% aplicando.
> Designer iniciante gasta 80% aplicando. 20% no sistema (ou zero).

Marcas que crescem mantém razão sênior. Marcas que travam mantêm razão iniciante.

---

## 12. O que FUNCIONA vs NÃO FUNCIONA (eficácia)

### 12.1 — FUNCIONA (testado em escala)

- **Hierarquia clara** — usuário sabe pra onde olhar primeiro
- **Contraste WCAG AA** — leitura confortável em qualquer condição
- **Mobile-first** — 70%+ do tráfego brasileiro é mobile
- **Touch target 44×44px** — clicável sem frustração
- **Loading rápido** (LCP < 2.5s) — usuário não abandona
- **Forms simples** (mínimo de campos necessários)
- **Estado vazio orientativo** ("Nada por aqui ainda. Comece criando X.")
- **Confirmação clara** após ação ("Salvo")
- **Botão de ação primary visualmente distinto** (1 por tela)
- **Breadcrumbs ou navegação contextual** clara em sites grandes

### 12.2 — NÃO FUNCIONA (testado em escala)

- **3+ CTAs primários competindo** — usuário paralisado
- **Forms longos com tudo "obrigatório"** — abandono massivo
- **Pop-ups intrusivos no carregamento** — bounce alto
- **Auto-play video com som** — usuário fecha aba
- **Hover states em mobile** — não existe hover em touch
- **Cor como único marcador** (verde = bom, vermelho = ruim) — daltônicos perdidos
- **Letras minúsculas demais (12px ou menos) em mobile** — ilegível
- **Slider/carousel automático** — usuário pega meta-info no meio
- **Mega-menu com 50 itens** — paralisia
- **Modal sobre modal sobre modal** — usuário perdido no contexto

---

## 13. O que VENDE vs AFASTA (conversão visual)

### 13.1 — VENDE (testado em landing pages, e-commerce, anúncios)

**Princípios de conversão visual** (Brian Balfour, ConversionXL, Joanna Wiebe):

- **Hero com 1 mensagem clara + 1 CTA único** (acima da dobra)
- **Foto de produto realista, alta qualidade, múltiplos ângulos** (e-commerce)
- **Vídeo demo curto < 60s** com legenda (autoplay sem som OK)
- **Prova social específica** (logos de clientes reais, depoimentos com nome+rosto+empresa)
- **Preço transparente** — esconder preço atrita
- **Garantia explícita** (devolução em 7-30 dias)
- **Urgência real** (estoque limitado verdadeiro, prazo concreto)
- **Friction reduzida no checkout** (1-clique se possível, formas de pagamento múltiplas)
- **Trust badges** legítimos (SSL, formas de pagamento, certificações reconhecíveis)
- **FAQ visível** respondendo objeções comuns

**Estética que vende em e-commerce de moda:**
- Foto de produto em fundo neutro (branco/off-white)
- Modelo em movimento natural, não pose rígida
- Detalhes de tecido, costura, acabamento (close-ups)
- Lifestyle context (produto em uso real)
- Vídeo de 5-15s mostrando produto vestido

### 13.2 — AFASTA (testado, derruba conversão)

- **Pop-up de email no segundo 0** — bounce
- **Hero genérico** ("a melhor solução pra você") sem especificidade
- **Stock photo de "diversidade"** óbvia (catálogo Getty)
- **CTAs vagos** ("Saiba mais", "Confira", "Clique aqui")
- **Preço sob consulta** sem justificativa B2B clara
- **Forms longos pra trial gratuito** (5+ campos = abandono)
- **Vídeo autoplay com som** — usuário fecha
- **Testimonials anônimos** ("Maria, cliente satisfeita")
- **Trust badges falsos ou exagerados** ("#1 no mundo", sem fonte)
- **Carousel com 8+ slides** — ninguém vê depois do 2
- **Texto cinza claro sobre fundo branco** — ilegível, não-acessível
- **Carrossel auto-rotativo** — frustra leitura

### 13.3 — Princípio comercial central

Conversão visual não é "ser bonito". É **remover atrito + criar clareza + entregar prova + facilitar ação**. Marca premium que falha nisso vende menos que marca média que executa esses 4 fundamentos.

---

## 14. O que ENVELHECE BEM vs DATA RÁPIDO

### 14.1 — ENVELHECE BEM (escolher quando possível)

- **Tipografia clássica bem desenhada** — Garamond, Caslon, Helvetica, Univers, Times: décadas
- **Sistema modular Suíço** — 70 anos, ainda contemporâneo
- **Paleta restrita (2-3 cores)** — Hermès laranja-marrom, Tiffany azul, Ferrari vermelho
- **Geometria simples** — círculo, quadrado, triângulo (logos clássicos)
- **Espaço negativo abundante** — Apple há 20 anos, ainda atual
- **Fotografia editorial documental** — Magnum dos anos 60 ainda emociona
- **Preto e branco** — atemporal por design

### 14.2 — DATA RÁPIDO (cuidado ao escolher)

- **Tendência de cor da temporada** (Pantone Color of the Year geralmente data em 2-3 anos)
- **Estilo "Y2K"** (cromado, glitter, holograma) — durou 2020-2022
- **"Corporate Memphis"** ilustrações flat — datou de 2018-2022
- **Gradient roxo-azul tech** (SaaS 2018-2022) — datado
- **Border radius extremo** (>32px em quase tudo) — moda 2020-2022
- **Glassmorphism** (vidro fosco translúcido) — moda 2020-2022
- **Neumorphism** (relevo soft) — durou 6 meses
- **Brutalism deliberado** (default browser styles) — perigoso, fácil ficar amador
- **Ilustração 3D estilo Notion** — saturado em 2024-2025

### 14.3 — Princípio de longevidade

> "If you make something timeless, you only have to make it once."
>
> — Massimo Vignelli

Marca que persegue tendência precisa redesenhar a cada 2-3 anos. Marca que persegue clássico atualiza a cada 10-15 anos. Custo de oportunidade massivo.

Quando vale arriscar tendência: marca jovem que precisa fazer barulho rápido, com plano explícito de redesign em 2-3 anos.
Quando NÃO vale: marca que quer construir patrimônio. Toda decisão de tendência é dívida visual.

---

## 15. Anti-patterns visuais exaustivos

Lista de TUDO que NUNCA aparece em design bem feito. Maestro audita ativamente cada peça contra esta lista.

### 15.1 Composição
- ❌ Texto centralizado em peça de conteúdo (só CTA pode centralizar)
- ❌ 2 elementos do mesmo peso visual competindo (hierarquia quebrada)
- ❌ Imagem sem overlay sobre texto (contraste ruim)
- ❌ Card dentro de card (composição pesada)
- ❌ Tabela com menos de 3 linhas (desproporcional)
- ❌ Slide só com 1 frase + tag (parece incompleto)

### 15.2 Cor
- ❌ Cor primária em background de bloco grande de texto
- ❌ 4+ cores em uma peça (sobrecarga)
- ❌ Cor neon ou Y2K (década errada)
- ❌ Color grading "Hollywood teal & orange" genérico
- ❌ Filtros Instagram saturados (Lo-fi, Valencia)
- ❌ HDR exagerado
- ❌ 5+ gradientes diferentes por página

### 15.3 Tipografia
- ❌ Sentence case em headline (sem peso)
- ❌ Uppercase em parágrafo body (ilegível)
- ❌ 4-5 fontes diferentes
- ❌ Texto manuscrito/brush script em peça profissional
- ❌ Italic em parágrafo inteiro
- ❌ Letter-spacing positivo em body
- ❌ Texto justificado (cria rios brancos)
- ❌ Font-size < 14px em body mobile

### 15.4 Imagem
- ❌ Stock photo identificável
- ❌ Sorriso de catálogo
- ❌ Aperto de mão corporativo
- ❌ Pessoa "pensativa" com mão no queixo
- ❌ Lampada acesa como metáfora de ideia (cliché terminal)
- ❌ Engrenagens como metáfora de estratégia
- ❌ Quebra-cabeça com peça faltando
- ❌ Faces de IA com olhos vidrados

### 15.5 Motion / Interação
- ❌ Bounce/elastic em transições principais
- ❌ Parallax forte (datado)
- ❌ Carousel auto-rotativo
- ❌ Auto-playing video com som
- ❌ Loading spinner fake
- ❌ Confetti em interação
- ❌ Glitch transitions

### 15.6 Identidade
- ❌ Logo girada, distorcida, com filtro forte
- ❌ Marca d'água do gerador na peça final
- ❌ Setas de "swipe →" (swipe é nativo)
- ❌ Emoji decorativo aleatório
- ❌ Ícones genéricos de stock

---

## 16. Critérios de qualidade

Como julgar trabalho de design (próprio ou de terceiro):

### 16.1 — Os 7 critérios

1. **Hierarquia clara** — olho sabe pra onde ir primeiro? (sim/não)
2. **Contraste suficiente** — WCAG AA mínimo? (sim/não)
3. **Sistema visível** — peça parece parte de um todo coerente? (sim/não)
4. **Espaço respira** — composição não está sufocada? (sim/não)
5. **Detalhe cuidado** — alinhamentos, kerning, micro-decisões corretas? (sim/não)
6. **Performance OK** — carrega rápido, funciona em mobile? (sim/não)
7. **Memória** — peça é distintiva? Lembraria daqui a 1 mês? (sim/não)

5+ "sim" = design competente. 7/7 "sim" = design excelente.

### 16.2 — Teste do feed

Coloque a peça num grid 3×3 ao lado de 8 outras peças aleatórias da categoria. Sua peça é distinguível? Se some, falhou. Se chama atenção positivamente, funcionou.

### 16.3 — Teste do thumbnail

Reduza a peça pra 100×100px. Se ainda comunica a mensagem central, hierarquia funciona. Se vira mancha confusa, hierarquia falhou.

### 16.4 — Teste da memória 24h

Mostre a peça pra alguém. 24h depois, pergunte o que lembra. Memória ruim = peça esquecível, mesmo se "tecnicamente correta".

---

## 17. Quando o Maestro deve me chamar

Roteamento explícito pra interface com CLAUDE.md:

### 17.1 — Sempre me chame em:

- **Geração de paleta de cor** completa (primary + neutros + semânticas + derivados)
- **Decisão tipográfica** (escolha de display, body, mono — sistema)
- **Auditoria de peça gráfica** (post, slide, página, anúncio)
- **Definição de sistema de grid** e spacing
- **Decisão de logo** (variantes, clear space, anti-uso)
- **Geração de design tokens** pra DNA.md
- **Resposta a perguntas tipo "isso é bom design?"** ou "isso vai funcionar?"
- **Análise de referências visuais** que a pessoa jogou em `materiais/3-referencias-visuais/`

### 17.2 — Posso ser consultado pontualmente em:

- Decisão de border radius, shadow, motion
- Componente específico (botão, card, form)
- Estado de hover, focus, active
- Animação ou micro-interação
- Iconografia (estilo, peso, tamanho)

### 17.3 — Não me chame pra:

- Direção fotográfica (chamar `09-Photography-Direction.md`)
- Geração de imagem por IA (chamar `10-Image-Generation-Engine.md`)
- Copy ou tom de voz (chamar `07-Voice-and-Tone.md`)
- Estratégia de marca (chamar `05-Brand-Strategy.md`)

---

## 18. Checklist operacional (interface com Maestro)

### Antes de propor sistema visual

1. Ler este arquivo (foco em seções 2, 3, 4, 5, 6)
2. Ler DNA.md atual (seção 3 — Estilo visual)
3. Ler referências visuais em `materiais/3-referencias-visuais/`
4. Aplicar Vignelli Canon como filtro mental
5. Propor sistema completo (não pontual)

### Antes de auditar peça gráfica

1. Aplicar 7 critérios de qualidade (seção 16.1)
2. Rodar testes do feed, thumbnail, memória (seções 16.2-16.4)
3. Scan ativo de anti-patterns (seção 15)
4. Diagnóstico em prosa + sugestão concreta

### Antes de gerar design tokens pro DNA.md

1. Definir paleta completa (seção 4)
2. Definir sistema tipográfico completo (seção 5)
3. Definir grid + spacing scale (seção 6)
4. Documentar regras de aplicação (quando usar cada token, quando NÃO usar)
5. Justificativa pra cada decisão importante

---

## Resumo em uma linha

**Pense como Vignelli, sistematize como Müller-Brockmann, edite como Apple, valide como WCAG, durabilize como Hermès.**
