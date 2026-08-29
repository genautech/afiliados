---
name: product-ad-cinema
description: Transforma uma foto amadora de celular de um produto num anúncio vertical (9:16) de 15 segundos com cara de cinema — look IMAX, luz cinematográfica e realismo. O fluxo é HERO-FIRST: primeiro a skill propõe 3 caminhos criativos, gera UMA imagem hero (a principal da campanha), você aprova, e só então ela deriva 4 variações ancoradas nessa hero (mesma cena, luz, paleta e textura, ângulos diferentes), formando uma sequência de 5 frames que viram 5 takes de 3s no Kling 3.0 e são montados em ffmpeg sem perda. Use SEMPRE que o usuário pedir um "anúncio de produto cinematográfico", "ad com cara de cinema", "vídeo IMAX do meu produto", "transformar foto de produto em anúncio premium", "campanha em vídeo a partir de uma hero", "product ad cinematic", "vídeo vertical premium de produto", ou colar uma foto de produto e pedir um ad/vídeo com estética de cinema. Use também quando o usuário só disser "tenho uma foto feia do meu produto, quero um anúncio top" ou "transforma isso num ad premium" — esse é o caminho default pra ad vertical cinematográfico saindo de uma foto, com aprovação da hero antes de gerar o resto.
---

# Product Ad Cinema — Foto de produto → Ad vertical cinematográfico de 15s (hero-first)

O usuário joga uma foto de celular de um produto numa pasta. Você devolve um anúncio vertical 9:16 de 15 segundos com cara de cinema. O diferencial deste fluxo é a **hero-first**: você trava o look gerando primeiro a imagem principal (hero), o usuário aprova, e as 4 variações nascem **a partir dessa hero aprovada** — é o que garante que os 5 frames pareçam saídos do mesmo filme.

## A ideia central: a hero é a âncora

Gerar 5 imagens soltas de uma vez quase sempre dá 5 universos diferentes. Aqui é diferente:

1. Você gera **1 hero** a partir da foto original → o usuário aprova.
2. As **4 variações** são geradas usando a **própria hero como imagem de referência** (`--image hero.png`). Elas herdam cena, luz, paleta, grade e textura — só muda o ângulo de câmera.

Resultado: consistência travada de verdade, não na esperança. **O produto é o rei** — em todos os 5 frames ele aparece nítido, fiel ao original (mesma forma, logo, cor, rótulo) e dominante no quadro.

## Pré-requisitos (cheque antes de começar)

```bash
which higgsfield && higgsfield account status   # CLI logada (deve mostrar um email + créditos)
which ffmpeg && which jq                          # ffmpeg e jq disponíveis
```

Se `higgsfield account status` não responder com email/créditos, peça pro usuário rodar `higgsfield auth login`. Sem isso, nada gera.

## Pasta de trabalho

Estrutura esperada na pasta atual (`pwd`):

```
./
├── input/                      ← usuário coloca 1 foto do produto aqui
└── output/
    ├── 01-direcoes.md          ← as 3 direções criativas
    ├── prompts/                ← os prompts que você escreve (hero, variações, movimento)
    ├── 02-hero/hero.png        ← a hero (Checkpoint 2)
    ├── 03-sequencia/           ← 01-hook 02-reveal 03-detail 04-action 05-hero (Checkpoint 3)
    ├── 04-takes/               ← 5 clipes de 3s do Kling
    └── 05-final/ad-15s.mp4     ← entrega final
```

Crie `input/` e `output/` se não existirem. Se houver mais de uma foto em `input/`, pergunte qual usar.

---

## O fluxo — 6 etapas, 3 checkpoints

### Etapa 1 — Análise + 3 direções criativas  ·  **Checkpoint 1**

Leia a foto em `input/` com a tool Read (você enxerga imagens). Analise **em silêncio**: tipo de produto, material, categoria, formato, paleta, contexto de uso, persona de marca provável, potencial de campanha. Não despeje a análise no chat — é insumo.

Escreva 3 direções em `output/01-direcoes.md`. Cada uma com:
- **Nome** curto e evocativo (1–3 palavras)
- **Mood** em 1 frase (o que o espectador sente)
- **Paleta + atmosfera** (luz, cores dominantes, textura)
- **Cenário** (onde/contra o quê o produto está)
- **Por que combina** com esse produto (1 frase)

As 3 têm que ser **realmente distintas** — não 3 variações do mesmo studio shot. Eixos pra diversificar: ambiente (studio fechado / locação real / surreal), paleta (mono escuro / saturado vibrante / natural quente), energia (estática contemplativa / dinâmica / ritualística), estilo (editorial fashion / tech-minimal / artesanal documental).

Mostre as 3 de forma concisa no chat e **pare**. Pergunte qual o usuário quer (ou se quer ajustar). **Não decida sozinho** — o controle criativo é dele.

### Etapa 2 — Gerar a HERO  ·  **Checkpoint 2**

A hero é a imagem principal da campanha e a âncora visual de tudo que vem depois. Capriche.

1. Leia **[references/cinematic_prompts.md](references/cinematic_prompts.md)** — é a fonte da verdade da gramática de prompt (look IMAX/cinematográfico, realismo, produto-é-rei, e o **LOOK SPINE** que você vai repetir em todos os frames). Leia antes de escrever o primeiro prompt.
2. Defina o **LOOK SPINE** da campanha (paleta + motivação de luz + film stock + grão + "ângulo em comum") com base na direção escolhida. Esse bloco é fixo e vai **verbatim** em todos os 5 prompts — é o que dá unidade de filme.
3. Escreva o prompt da hero em `output/prompts/hero.txt` seguindo o esqueleto da referência.
4. Gere:

```bash
bash ~/.claude/skills/product-ad-cinema/scripts/gen_hero.sh \
  input/<foto> output/prompts/hero.txt output/02-hero/hero.png
```

Mostre a hero no chat (Read) e **pare**. O usuário aprova ou pede pra regerar. Só siga com hero aprovada — tudo depende dela.

### Etapa 3 — Derivar as 4 variações da hero  ·  **Checkpoint 3**

Copie a hero pra dentro da sequência como o frame de fechamento, e gere as 4 variações ancoradas nela:

```bash
cp output/02-hero/hero.png output/03-sequencia/05-hero.png
```

Escreva 4 prompts de variação em `output/prompts/variacoes.txt` (ordem: hook, reveal, detail, action — uma linha por prompt, `#` é comentário). Cada prompt segue o **esqueleto de variação** da referência: "use a imagem anexada como referência exata de cena/luz/paleta/grade/textura; muda SÓ o ângulo de câmera". Veja os papéis de cada shot em **[references/sequencia_e_movimento.md](references/sequencia_e_movimento.md)**.

```bash
bash ~/.claude/skills/product-ad-cinema/scripts/gen_variations.sh \
  output/02-hero/hero.png output/prompts/variacoes.txt output/03-sequencia
```

Agora `output/03-sequencia/` tem os 5 frames (`01-hook` … `04-action` + `05-hero`). Mostre os 5 no chat, na ordem da timeline, e **pare**. O usuário aprova ou pede pra regerar frames específicos.

> **Regeração:** se ele pedir pra mexer num frame só, regere só aquele (mesmo comando, isolando o prompt). Se pedir pra mudar o look todo, volte pra hero (Etapa 2) — mudar a hero muda a âncora de todos.

### Etapa 4 — Animar os 5 frames (Kling 3.0, takes de 3s)

Escreva os prompts de **movimento** em `output/prompts/movimento.txt` (5 linhas, ordem `01-hook … 05-hero`). Cada linha descreve só o **movimento** daquele take — a cena já está no frame. Pegue as direções de movimento por take em [references/sequencia_e_movimento.md](references/sequencia_e_movimento.md).

```bash
bash ~/.claude/skills/product-ad-cinema/scripts/gen_takes.sh \
  output/03-sequencia output/prompts/movimento.txt output/04-takes
```

Roda os 5 em paralelo, cada um 3s, 1080p (`--mode pro`), sem som. Pensa como vídeo: os frames foram feitos pra animar, então o movimento deve manter o produto nítido e dominante o tempo todo.

### Etapa 5 — Montar o ad final (ffmpeg, sem perda)

```bash
bash ~/.claude/skills/product-ad-cinema/scripts/stitch.sh output/04-takes output/05-final/ad-15s.mp4
```

Concatena na ordem `01-hook → 02-reveal → 03-detail → 04-action → 05-hero` com `-c copy` (zero re-encode, qualidade idêntica). Se os codecs não baterem, faz fallback pra H.264 CRF 16 (visualmente sem perda).

### Etapa 6 — Entrega

Reporte no chat, curto:
- Caminho do `ad-15s.mp4`
- Duração (deve dar ~15.0s), resolução e codec (o script já roda `ffprobe`)
- Tamanho do arquivo

Não escreva um resumo do processo — o usuário acabou de vivê-lo.

---

## Princípios pra não quebrar

1. **O produto é o rei.** Em todos os frames ele é fiel ao original (forma, logo, cor, rótulo, proporção) e o elemento mais nítido e dominante. Nunca deixe o Nano Banana "redesenhar" o produto. Ângulos podem ser incomuns; o produto, não.
2. **A hero é a âncora.** As variações nascem dela. Se a hero não está excelente, não avance — todo o resto herda os defeitos dela.
3. **Consistência > novidade.** Os 5 frames são um filme só. Mesmo LOOK SPINE verbatim em todos. Se um frame parece de outro universo, regere antes de animar.
4. **Take 1 (hook) ganha ou perde o ad.** Se o gancho não para o scroll, o resto não importa.
5. **Pense como vídeo.** Cada still é um frame de uma sequência que vai ser montada. Deixe respiro pro movimento e mantenha o produto sempre legível.
6. **9:16 desde a origem.** Nunca gere em outro formato pra cortar depois.
7. **Paralelize geração, serialize aprovação.** Variações e takes geram em paralelo; os 3 checkpoints são sequenciais e do usuário.

## Quando NÃO usar

- Vídeo horizontal/quadrado, ou mais longo que 15s, ou com locução. Outro fluxo.
- Só editar uma foto sem virar vídeo. Use uma skill de edição de imagem.
- Anúncio que exige uma pessoa/modelo específica e real — o Nano Banana pode alucinar pessoas.

## Recursos bundled

- [scripts/gen_hero.sh](scripts/gen_hero.sh) — gera a hero a partir da foto original
- [scripts/gen_variations.sh](scripts/gen_variations.sh) — gera as 4 variações ancoradas na hero (paralelo)
- [scripts/gen_takes.sh](scripts/gen_takes.sh) — anima os 5 frames em takes de 3s (paralelo)
- [scripts/stitch.sh](scripts/stitch.sh) — monta o ad final sem perda
- [references/cinematic_prompts.md](references/cinematic_prompts.md) — **fonte da verdade** da gramática de prompt: look IMAX/cinematográfico, LOOK SPINE, esqueletos de hero e variação, exemplos completos
- [references/sequencia_e_movimento.md](references/sequencia_e_movimento.md) — papéis dos 5 shots, ordem de montagem e direção de movimento por take
