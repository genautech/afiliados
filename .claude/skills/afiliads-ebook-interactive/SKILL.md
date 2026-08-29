---
name: afiliads-ebook-interactive
description: >
  Constrói a versão interativa do e-book em HTML — progresso de leitura,
  quizzes, checklists, sprites animados, revelações por scroll e CTAs
  posicionados por valor entregue. Use quando o pedido for "e-book
  interativo", "versão web do e-book", "quiz", "animação", "efeito de
  scroll", "onde colocar o CTA", "página do produto". Chamada normalmente
  pelo afiliads-ebook-art-director.
license: MIT
metadata:
  version: "0.2"
  status: contrato
  category: design
---

# afiliads-ebook-interactive

E-book interativo low-ticket tem dois jobs: **terminar de ser lido** e
**vender a próxima coisa**. Interação que não serve a um dos dois é enfeite.

## Padrões de interação — quando cada um se justifica

| Padrão | Serve para | Não usar quando |
|---|---|---|
| Barra de progresso | Reduzir abandono, dar senso de avanço | E-book com menos de 10 min de leitura |
| Quiz inline | Fixar conteúdo, gerar micro-compromisso | Só para "engajar", sem resposta útil |
| Checklist com estado | Transformar leitura em ação | Conteúdo que não é acionável |
| Revelação por scroll | Sequência que tem ordem real (passo a passo) | Texto corrido comum |
| Sprite animado | Mostrar movimento que a foto não mostra | Decoração pura |
| Antes/depois com slider | Comparação visual concreta | Sem par real de imagens |
| Áudio do capítulo | Consumo em movimento | Sem narração de verdade |
| CTA contextual | Depois de entregar valor | Antes do leitor receber algo |

O e-book atual já usa progresso, quiz, SVG inline e blocos de áudio —
esse é o piso, não o teto.

## Posicionamento de CTA

```
0–20% da leitura   → nenhum CTA. O leitor ainda não recebeu nada.
20–60%             → CTA suave, contextual (order bump relacionado ao capítulo)
60–90%             → CTA principal (upsell), depois do capítulo de maior valor
100%               → CTA de continuidade (comunidade, próximo produto) + pedido de depoimento
```

Todo CTA carrega o `variant_id` da peça na URL, para amarrar arte e posição
a venda real.

## Regras técnicas

1. **Mobile primeiro.** Funciona a 375px ou não entra.
2. **Nada depende de hover.** Toque é o input padrão.
3. **Sem dependência externa em runtime** quando o entregável for arquivo
   único — animação em CSS e SVG. GSAP/Lottie **somente** em página
   hospedada, com `motion-brief.yaml` e justificativa de peso. Lottie em
   PDF é recusa.
4. **`prefers-reduced-motion` respeitado** em toda animação.
5. **Tokens vêm do `tokens.css`** emitido pelo `afiliads-ebook-design-tokens`. Zero
   valor de cor escrito à mão no HTML.
6. **Gate F0.** Sem `format-decision` classificando o entregável, não há
   motion. Curso/aplicação (OPERADOR) não vira e-book animado.

Playbook: `Playbooks/Design/Motion_Paginas_e_Ebooks.md`.
Schema: `frameworks/ebook-os/schemas/motion-brief.schema.json`.

## Referências de técnica

Clonar sob demanda em `frameworks/refs/`:

- `freshtechbro/claudedesignskills` — GSAP, Lottie, scroll-driven, react-spring
- `lewislulu/html-ppt-skill` — 24 temas, 31 layouts, 20+ animações em HTML
- `zarazhangrui/codebase-to-course` — navegação e progresso em página única

## Contrato `motion-brief.yaml`

Obrigatório quando o pedido incluir Lottie, GSAP, scroll-film ou sprite
animado. O validador só exige o arquivo se ele existir.

```yaml
produto:
  id: lowticket-classificacao-formato
  versao: "0.1.0-fixture"
superficie: pagina-hospedada   # pdf | epub | pagina-hospedada
motores:
  css_svg: true
  lottie: false
  gsap: false
justificativa: "Nenhum motor pesado: o fixture é PDF operacional."
reduced_motion: obrigatorio
variant_id: "motion-fixture-0"
```

`superficie: pdf` ou `epub` com `lottie: true` ou `gsap: true` é falha
bloqueante.

## Recusas

- Lottie/GSAP em PDF, EPUB ou e-mail.
- Animação sem `prefers-reduced-motion`.
- Higgsfield em lote sem autorização de custo.
- Inventar interação que o `format-decision` classificou como incompatível
  com e-book (login, progresso persistente, depende_online no núcleo).

## TODO (templates ainda não extraídos)

- [ ] `templates/` — shell da página, capítulo, quiz, checklist, bloco de CTA
- [ ] `references/padroes-de-interacao.md` — implementação de cada padrão
- [ ] Extrair os componentes que já funcionam do
      `temp_ebook_interativo/E-book Interativo.dc.html` para o template base

Esta etapa fecha o contrato. Não implementa a loja nem gera lote de vídeo.
