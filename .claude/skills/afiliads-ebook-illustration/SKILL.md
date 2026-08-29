---
name: afiliads-ebook-illustration
description: >
  Produz o sistema ilustrativo de um e-book — abridores de capítulo, ícones,
  sprites, diagramas e figuras de apoio — com consistência entre todas as
  peças do mesmo produto. Use quando o pedido for "ilustração", "ícone",
  "sprite", "abertura de capítulo", "diagrama", "figura do passo 3", "deixa
  esse capítulo menos seco". Chamada normalmente pelo afiliads-ebook-art-director.
license: MIT
metadata:
  version: "0.1"
  status: esqueleto
  category: design
---

# afiliads-ebook-illustration

O problema de ilustração em e-book não é gerar uma boa imagem: é gerar
quarenta que pareçam do mesmo livro.

## Âncoras de consistência

Todo prompt de ilustração do mesmo produto carrega o mesmo bloco de âncoras,
derivado do `tokens.json`:

```
paleta: apenas <accent>, <accent2>, <neutral-200>, <neutral-800>
traço: <definido no preset — ex.: linha grossa irregular, feita à mão>
sombra: <chapada, sem gradiente>
enquadramento: <plano médio, fundo vazio>
sem texto, sem letras, sem marca d'água
```

Padrão de "identity anchors" atribuído a `product-shots` e já incorporado
nesta skill. A referência não está instalada e não é dependência executável;
as âncoras do preset local são a fonte operacional.

## Escolha de formato — regra

| Conteúdo | Formato | Por quê |
|---|---|---|
| Ícone, selo, marcador | **SVG** | Escala, tema, peso zero |
| Diagrama, fluxo, passo a passo | **SVG** | Texto precisa ser texto de verdade |
| Sprite de interação | **SVG** | Anima por CSS, não vira PNG |
| Cena, ambiente, textura | **Raster** (Nano Banana Pro) | Modelo faz melhor |
| Abridor de capítulo | **Raster + SVG por cima** | Fundo gerado, rótulo composto |

Nunca gerar diagrama por modelo de imagem. O texto sai errado e o usuário já
foi mordido por isso.

## Restrições

Mesmo bloco negativo do `afiliads-ebook-cover`. Além disso: nenhuma imagem de banco
com texto embutido no pixel — se a única imagem boa tiver texto de
fornecedor, recortar a parte limpa em vez de descartar a imagem inteira.

## Pipeline

```
1. Ler tokens.json + DNA.
2. Listar todas as ilustrações do e-book de uma vez (inventário).
3. Decidir formato peça a peça pela tabela acima.
4. Gerar em lote com o mesmo bloco de âncoras.
5. QA de consistência: montar contact sheet e avaliar as peças juntas,
   não isoladas.
6. Gravar em entregas/<produto>/ilustracoes/ com nomes semânticos.
```

## TODO (esqueleto)

- [ ] `references/ancoras-por-preset.md` — bloco de âncoras de cada preset
- [ ] `scripts/contact_sheet.py` — grid de todas as peças para o QA visual
- [ ] Biblioteca de SVG base (ícones, selos) derivada dos que já existem em
      `temp_ebook_interativo/E-book Interativo.dc.html`
