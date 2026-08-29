# Product Shots — modo oficial do `/product`

Este modo transforma um briefing simples em uma série de fotos de produto com aparência de estúdio premium, incluindo ideias que seriam caras ou inviáveis de fotografar fisicamente.

O usuário pode chamar de forma explícita:

```text
/product product shot impossível de um perfume artesanal
/product quero fotos de produto profissionais para um creme facial
/product criar uma série de product shots para este tênis
```

Ou de forma natural:

```text
Preciso vender este produto com imagens que pareçam campanha grande.
```

Quando o pedido for sobre still, packshot, foto de produto, hero product, campanha visual de produto sem vídeo, anúncio estático ou product shot impossível, use este modo antes do fluxo longo de filme.

---

## Promessa do modo

Entregar um sistema de 3 etapas:

1. **Visual Intent** — Claude extrai direção criativa do briefing.
2. **Geração, iteração e inpainting** — Claude gera, avalia, corrige e refina com Higgsfield CLI.
3. **Polish final** — upscale, micro-refinamentos e fechamento para entrega.

Resultado esperado: uma série de product shots profissionais, não apenas um prompt solto.

A referência de "fotos que custariam R$15 mil em estúdio" deve virar critério de ambição: set difícil de montar, luz controlada, material bem fotografado, superfície crível, direção de arte memorável, produto fiel e acabamento de campanha. Não é sobre citar o preço; é sobre o resultado parecer caro de produzir.

---

## Experiência para o usuário

Para o usuário, o fluxo deve parecer simples:

1. Ele descreve o produto ou manda imagens.
2. Claude entende o objetivo comercial.
3. Claude propõe uma direção visual clara.
4. Claude gera uma série de imagens.
5. Claude pede feedback e refina.

Não explique terminal, UUID, pastas internas ou parâmetros técnicos sem necessidade. O usuário está aprendendo o método criativo, não operando a infraestrutura.

Se faltar informação essencial, pergunte no máximo:

1. Qual é o produto e o que ele promete?
2. Qual sensação a imagem precisa vender?
3. Existe foto de referência do produto?

Se o usuário já trouxe o suficiente, não pergunte: avance.

---

## Etapa 1 — Visual Intent

Antes de escrever prompt ou gerar imagem, extraia a direção criativa do briefing em português.

Use este raciocínio:

```text
Produto: o que aparece, materiais, formato, cor, escala e detalhes que não podem mudar.
Promessa comercial: o que a imagem precisa fazer a pessoa sentir ou desejar.
Metáfora visual: qual situação impossível, premium ou memorável traduz essa promessa.
Produção impossível: qual parte exigiria estúdio, props, rigging, food styling, macro, pós-produção ou equipe.
Mundo visual: cenário, superfície, clima, época, textura e linguagem de marca.
Luz: setup dominante, direção, contraste, temperatura e comportamento de sombra.
Composição: ângulo, distância, plano, posição do produto, espaço negativo e formato.
Restrições: logo, embalagem, cor, proporção, legibilidade, materiais, claims e o que não pode inventar.
Entrega: quantas imagens, aspect ratios e uso final.
```

Depois sintetize em um bloco curto:

```text
Direção criativa:
- Ideia central:
- Produto precisa permanecer fiel em:
- Cena impossível:
- Por que pareceria caro em estúdio:
- Luz:
- Composição:
- Paleta:
- Série sugerida:
- Critério de reprovação:
```

O Visual Intent deve ser simples de entender, mas útil para produção real.

---

## Etapa 2 — Geração, iteração e inpainting

Use Higgsfield CLI como base principal para geração real.

Leia também:

- `Human Cinematic/COMECE-AQUI.md`

Fluxo operacional:

1. Criar ou identificar a campanha ativa em `Human Cinematic/campaigns/{nome}/`.
2. Salvar imagens de produto recebidas em `internal/product ref/`.
3. Subir referências limpas de produto com `higgsfield upload create`.
4. Registrar UUIDs em `internal/ref-ids.md`.
5. Escrever prompts em inglês para Nano Banana 2.
6. Gerar em batch quando houver mais de uma peça.
7. Salvar resultados numerados em `output/`.
8. Registrar prompts, modelos, UUIDs, job ids e feedback em `internal/prompt-log.md` e `internal/feedback.md`.

Loop obrigatório de iteração:

1. Gerar poucos candidatos.
2. Comparar cada candidato com o Visual Intent.
3. Escolher uma falha principal por rodada.
4. Corrigir uma variável por vez.
5. Preservar produto, câmera e composição quando a base estiver boa.
6. Registrar a tentativa e a decisão.

Quando precisar corrigir partes específicas, use refinamento referenciado:

```text
Use the selected image as reference. Preserve the exact product silhouette, packaging proportions, material, color, label placement and camera angle. Refine only the local issue: [descrever problema]. Do not redesign the product. Do not change the logo. Do not invent text.
```

Inpainting aqui significa correção localizada por nova geração referenciada quando a CLI/modelo disponível permitir esse comportamento. Se a CLI tiver comando específico de edit/inpaint no ambiente, use-o; se não tiver, faça refinamento referenciado com a imagem escolhida.

---

## Etapa 3 — Polish final

O polish fecha a imagem para entrega. Ele não muda a ideia, só melhora acabamento.

Checklist:

- produto fiel ao briefing;
- embalagem, logo e cor sem deformação;
- bordas limpas;
- contato físico crível com superfície, líquido, gelo, tecido, fumaça ou partículas;
- sombra coerente;
- reflexos coerentes com material;
- sem texto inventado;
- sem watermark;
- sem aparência de mockup genérico;
- composição pronta para o formato pedido;
- upscale ou nova renderização em qualidade final quando necessário.

Micro-refinamentos típicos:

- limpar label deformada;
- recuperar proporção do produto;
- melhorar sombra de contato;
- reduzir plástico artificial;
- corrigir reflexo impossível;
- reforçar textura do material;
- ajustar contraste sem perder detalhe;
- criar variação 9:16, 4:5 ou 16:9 sem destruir a composição.

---

## Série padrão de Product Shots

Quando o usuário pedir uma série, entregue por padrão 4 imagens:

1. **Hero impossível** — o produto em uma cena memorável e cara de produzir fisicamente.
2. **Material / detalhe** — close de textura, embalagem, ingrediente, acabamento ou construção.
3. **Contexto de desejo** — o produto em um mundo visual que vende uso, ritual ou status.
4. **Anúncio estático** — composição pensada para 9:16 ou 4:5, com área limpa para copy fora da imagem.

Para cada imagem da série, defina:

- objetivo da peça;
- formato;
- Visual Intent específico;
- prompt;
- critério de aprovação;
- provável refinamento se falhar.

Se for produto de moda/roupa, aplique a regra do Human Cinematic: o produto-vestimenta pode ir vestido no personagem, mas a identidade do personagem vem de character sheet aprovado quando houver continuidade.

---

## Template de prompt para Nano Banana 2

Use inglês no prompt final.

```text
CAMERA: [camera body, ISO, physical camera position, angle, distance].
LENS: [lens, focal length, aperture/T-stop, focus behavior].
PRODUCT FIDELITY: Preserve the exact product silhouette, proportions, material, color, cap/lid/label placement and packaging geometry from the reference. The product must remain recognizable and commercially accurate.
SCENE: [impossible but physically readable product world; what surrounds the product; no generic mockup].
LIGHT: [motivated source, Kelvin, direction, shadow behavior, highlight behavior].
SURFACE AND CONTACT: [surface, contact shadow, reflections, liquid/ice/fabric/particles behavior].
FOREGROUND: [near elements and focus falloff].
MIDGROUND: [product placement and main visual action].
BACKGROUND: [depth, bokeh, set extension, negative space].
MATERIAL PHYSICS: [how glass, metal, paper, fabric, cream, leather, plastic or liquid reacts].
POST BEHAVIOR: [visible film grain or commercial polish, halation, contrast curve, saturation, midtone priority].
COMPOSITIONAL GEOMETRY: [visual weight, asymmetry, crop, ad-safe negative space].
MOOD & ART DIRECTION: Composition and art direction inspired in the work of award-winning directors.
```

Nunca coloque texto novo dentro da imagem, a menos que o produto já tenha texto na embalagem de referência. Se houver label, preserve; não invente claims.

---

## O que reprovar

Reprove e refine se acontecer qualquer item:

- produto mudou de forma;
- logo foi inventado ou deformado;
- label ilegível quando deveria ser preservado;
- embalagem derreteu;
- reflexo contradiz a luz;
- produto flutua sem intenção visual clara;
- cena parece render 3D genérico;
- imagem parece banco de imagem;
- a composição não deixa claro o que está sendo vendido;
- o resultado não serviria para anúncio, landing page ou campanha.

---

## Prática guiada

Objetivo: criar uma série de product shots profissionais a partir de um briefing curto.

Brief mínimo:

```text
Produto:
Público:
Promessa:
Sensação desejada:
Referência ou restrição visual:
Formato final:
```

Execução:

1. Rodar Visual Intent.
2. Aprovar direção criativa.
3. Gerar 4 shots da série padrão.
4. Escolher 1 vencedor.
5. Fazer polish final.
6. Registrar aprendizado: o que o prompt fez bem, o que precisou refinar e qual detalhe vendeu melhor o produto.

Entrega final do exercício:

- Visual Intent aprovado;
- 4 product shots numerados;
- 1 imagem final refinada;
- prompt final;
- notas de iteração;
- checklist de qualidade preenchido.

---
