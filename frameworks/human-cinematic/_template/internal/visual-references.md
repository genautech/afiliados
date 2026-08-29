# Referências Visuais (estilo / mood / estética)

O **4º pilar** de referência. Diferente de modelo, produto e ambiente — uma referência visual mostra *o clima* que o usuário quer: paleta de cor, qualidade de luz, composição, textura de filme, energia, época.

**Como funciona:** o usuário manda uma imagem de referência no chat (ou descreve em texto). O Claude **olha a imagem e transcreve em texto** o que ela transmite. Na hora de gerar (Partes 3 e 4), essa descrição entra no prompt para puxar um resultado parecido em estilo — **sem** passar a imagem como `--image` ref (isso causaria "ref bleeding": a referência viraria um quadro literal no vídeo).

> Substitua cada `{{PLACEHOLDER}}`. Adicione mais blocos `ref-visual-N` conforme o projeto precisar.

---

## ref-visual-1 — {{RÓTULO_CURTO — ex.: "Editorial anos 90 / grão pesado"}}

**Imagem de origem** *(se enviada)*: `visual ref/{{arquivo}}`

**O que esta referência transmite:**
> {{Parágrafo único e denso. Cubra, na ordem:
> 1. Paleta de cor (quente/fria, saturada/dessaturada, dominantes)
> 2. Luz (dura/suave, direção, contraste, fontes)
> 3. Composição e enquadramento (centralizado, regra dos terços, espaço negativo, escala)
> 4. Textura e acabamento (grão de filme, nitidez, halação, bloom)
> 5. Movimento/energia (se houver — estático e contemplativo vs. cru e dinâmico)
> 6. Época / linguagem visual (filme 16mm, digital limpo, VHS, editorial de revista…)
> 7. Emoção geral (íntimo, épico, melancólico, eufórico).
>
> Exemplo: "Paleta quente e dessaturada, dominantes âmbar e marrom. Luz dura lateral, sombras profundas, alto contraste. Enquadramento apertado com bastante espaço negativo acima do sujeito. Grão de filme grosso, leve halação nas altas luzes. Energia estática e contemplativa. Linguagem de filme 16mm dos anos 90. Lê como íntimo e nostálgico."}}

**Aplicar em:** {{quais shots/cenas — ex.: "todos os retratos próximos" / "a campanha inteira"}}.

---

## ref-visual-2 — {{RÓTULO_CURTO}}

**Imagem de origem**: `visual ref/{{arquivo}}`

**O que esta referência transmite:**
> {{descritor seguindo a mesma estrutura de 7 pontos}}

**Aplicar em:** {{...}}.

---

*(Continue com ref-visual-3, etc., conforme o usuário enviar mais referências.)*
