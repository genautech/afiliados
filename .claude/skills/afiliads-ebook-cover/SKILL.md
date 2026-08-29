---
name: afiliads-ebook-cover
description: >
  Gera a capa de um e-book low-ticket em duas camadas — fundo/textura pelo
  modelo de imagem, tipografia por composição HTML — e roda um controle de
  qualidade automático antes de entregar. Também produz os recortes (social,
  thumbnail) e o mockup 3D para a página de vendas. Use quando o pedido for
  "capa", "cover", "thumbnail do produto", "mockup do e-book". Chamada
  normalmente pelo afiliads-ebook-art-director com um briefing já fechado. Também
  gera recortes do kit de afiliado (9:16, 4:5, 16:9) a partir da capa
  master — sem redesenhar a capa a cada banner.
license: MIT
metadata:
  version: "0.1"
  status: esqueleto
  category: design
---

# afiliads-ebook-cover

Duas camadas, nunca uma. É isso que separa capa de produto de capa de IA.

```
camada 1 — pixels   → modelo de imagem: fundo, textura, elemento gráfico
camada 2 — tipo     → HTML/SVG composto por cima: título, subtítulo, autor, selo
```

**Regra dura:** o modelo de imagem nunca recebe o título no prompt. Peça um
fundo com "espaço negativo no terço superior para tipografia" e componha o
texto depois. Texto gerado por modelo de imagem sai torto, com letra faltando
ou acento errado — e é o erro mais visível numa thumbnail de checkout.

## Pipeline

```
1. Ler tokens.json (de afiliads-ebook-design-tokens) + DNA.
2. Montar o prompt de fundo a partir do cover_pattern + accent + tipo.
   Anexar sempre o bloco de restrições negativas (§Restrições).
3. Gerar 3 variações de fundo.
4. QA automático — mandar cada variação para crítica (§QA) e descartar as
   reprovadas.
5. Compor a tipografia por cima, em HTML, usando tokens.
6. Renderizar em 1600x2560 e no teste de 300px.
7. Recortes: 1080x1080 social, mockup 3D com fundo transparente.
8. Gravar em entregas/ com brief.json e variant_id.
```

## Restrições negativas (anexar a todo prompt)

```
sem texto, sem letras, sem palavras, sem marca d'água, sem logo,
sem interface de aplicativo, sem moldura de celular, sem rosto olhando
para a câmera, sem gradiente roxo-azul de startup, sem stock photo
genérico, sem sombra de mockup 3D pré-renderizada
```

Padrão arquitetural atribuído a `product-shots` (motiful) e já incorporado
nesta skill. A referência não está instalada e não é dependência executável;
este bloco local é a fonte operacional.

## QA automático

Depois de gerar, submeter a imagem a uma crítica antes de aceitar:

> Avalie esta imagem como fundo de capa de e-book. Aponte: artefatos de IA,
> qualquer texto ou letra visível, composição desequilibrada, ausência de
> espaço negativo para tipografia, saturação fora da paleta informada.
> Diga se está pronta para produção.

Padrão portado de `jezweb/claude-skills → ai-image-generator`. Reprovou,
regenera — no máximo 2 vezes, depois volta ao `afiliads-ebook-art-director` com o
motivo.

## Teste dos 300px

Reduzir a capa final para 300px de altura. Se o título não for legível ou o
produto não for identificável, a capa está reprovada — independente de estar
bonita em tamanho cheio. É assim que o comprador vê no checkout.

## Backend de imagem

O provedor aprovado no runtime é escolhido no briefing. A chamada fica
isolada em `scripts/imagegen.py` para que trocar de provedor não toque nas
outras skills; nunca assuma que `product-shots-image-gen` está instalado.

## TODO (esqueleto)

- [ ] `scripts/imagegen.py` — wrapper com resolução de chave por env var
      (`GEMINI_API_KEY`), sem chave hard-coded, sem pedir chave no chat
- [ ] `templates/cover.html` — composição tipográfica por token
- [ ] `scripts/qa.py` — loop de crítica automática
- [ ] `scripts/mockup.py` — mockup 3D em CSS transform, sem banco de imagem
