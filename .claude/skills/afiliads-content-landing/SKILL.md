---
name: afiliads-content-landing
description: >
  Escreve a copy completa de uma landing page de e-book low-ticket, bloco a
  bloco — hero, problema, solução, benefícios, prova, objeções, oferta e CTA
  final — a partir de um briefing fechado. Também opera em modo bloco, texto
  longo, AFILIADO (presell/review/bridge) e PLATAFORMA (onboarding do
  produtor). Use depois de afiliads-content-briefing e antes de afiliads-content-voice.
---

# Copy de landing page e de e-book

## Pré-requisito

`briefing.json` válido. Sem ele, chame `afiliads-content-briefing`. Escrever a partir de
um pedido solto é como o sistema produz páginas genéricas.

## Cinco modos

| Modo | Quando | Saída |
|---|---|---|
| **PÁGINA** | landing do e-book (nível PRODUTO) | 8 blocos + HTML |
| **BLOCO** | headline, CTA, seção isolada | 3 variantes + recomendação |
| **LONGO** | capítulo, sumário, miolo | texto corrido em prosa |
| **AFILIADO** | presell, review, bridge, swipe | 1 objetivo + hop + UTM |
| **PLATAFORMA** | site/onboarding (nível MARCA) | jornada do produtor, sem acidez |

## Modo PÁGINA — a ordem fixa

Blocos podem ser cortados. Nunca reordenados.

**1. Hero.** Headline de 8–12 palavras, na dor ou na promessa — nunca no nome
do produto. Subheadline de 15–20 que responde "para quem e por quê". CTA
visível sem rolar.

**2. Problema.** A dor no vocabulário do leitor, antes de qualquer solução.
Uma cena vale mais que três adjetivos. Não explique a categoria para quem já
consciente do problema.

**3. Solução.** O mecanismo, não o adjetivo. "Três decisões que você toma nos
primeiros oito segundos" é mecanismo. "Método completo e poderoso" é ruído.

Quando a oferta foi modelada a partir de um benchmark, mostre a diferença
concreta: para quem é, em qual situação resolve, qual mecanismo usa e o que o
leitor recebe. Não use a referência como prova nem reproduza a sua estrutura
verbal. O produto deve aparecer em amostras, páginas, checklists ou demonstração
real sempre que isso for possível; mockup sozinho não prova entrega.

**4. Benefícios.** De 3 a 5. Cada um com um resultado observável — algo que o
leitor consegue verificar que aconteceu.

**5. Prova.** Específica ou ausente. Prova genérica ("milhares de leitores")
corrói mais confiança do que a falta dela. Se o briefing trouxe
`fatos_pendentes`, este bloco carrega o placeholder visível.

**6. Objeções.** As três reais, nomeadas. Objeção não nomeada não é objeção
resolvida, é objeção escondida.

**7. Oferta.** Preço, o que entra, garantia, risco de quem compra. Delegue a
arquitetura ao `afiliads-offers`.

**8. CTA final.** Mesma frase do hero. Mesma ação.

## Onde o nível de consciência entra

Ele decide **por onde a página começa**, não o tom:

- Inconsciente → abre no bloco 2, com cena.
- Consciente do problema → abre no hero da dor, bloco 2 curto.
- Consciente da solução → hero de diferenciação, corta o bloco 2.
- Consciente do produto → abre perto do bloco 7.
- Mais consciente → hero + oferta + CTA. Página curta.

Página longa para tráfego quente é atrito. Página curta para tráfego frio é
pedido sem contexto.

## Low-ticket — regras que a página de e-book obedece

Preço típico R$ 29–67. A decisão é de impulso, não de comitê.

- Um CTA. Checkout com o mínimo de campos. Bump/upsell **depois** do
  pagamento, nunca na dobra da landing.
- A página deve fazer o caminho criativo/fonte → página → checkout claro, e o
  entregável precisa estar explicado antes do CTA. Não esconder o que será
  recebido atrás de urgência, quiz ou decoração.
- Ancoragem de preço só com número que esteja no briefing. Sem "de R$ 497
  por R$ 47" inventado.
- Garantia curta e específica, ou ausente. "Garantido" sem condição reprova
  no DNA.
- A plataforma (checkout próprio, área de membros) aparece no rodapé como
  infraestrutura — nunca como argumento de venda do e-book.

## Modo AFILIADO

Vende o e-book, não a plataforma e não o afiliado. O leitor não precisa
saber que existe comissão.

1. Escolher o tipo no briefing: review, advertorial, quiz, VSL-bridge ou
   nativo. Não misturar os cinco na mesma URL.
2. Abrir no nível de consciência da fonte de tráfego — Search de problema
   não recebe review de produto na primeira linha.
3. Um hop, um `variant_id`, UTM no checkout. Direct linking só se o
   briefing disser que o produtor permite.
4. Claims do produtor passam pelo gate de fatos. Ângulo do afiliado pode
   ser original; número, depoimento e prazo não.
5. Fechar com a mesma ação da landing do produto ("Quero o e-book"), não
   com "conheça o programa de afiliados".

Se o pedido for a **página do programa** (convidar afiliados), isso é modo
PLATAFORMA com CTA "Conheça nosso programa de afiliados" — não é presell.

## Modo PLATAFORMA

Nível MARCA. Persona Ana (produtora com audiência, barreira técnica). Voz
quente e acessível — a acidez do produto sabota aqui.

Jornada fixa, blocos podem ser cortados, nunca reordenados:

1. Hero — monetizar conteúdo sem barreira técnica.
2. Dor do criador — checkout, área de membros, afiliados, lançamento.
3. Mecanismo — criação, hospedagem, checkout, membros, programa.
4. Low-ticket / nicho — por que este modelo, não curso de alto valor.
5. Afiliados como multiplicador — tracking e materiais, sem "dinheiro fácil".
6. Prova — só o que estiver em `Fatos_Produto.md` ou no DNA preenchido.
7. Oferta da plataforma — o que o produtor configura (preço, comissão, kit).
8. CTA — "Criar meu e-book agora" ou "Começar a vender".

Não prometa milhões em 7 dias. Não compare com Hotmart/Kiwify sem fato.

## Modo BLOCO

Sempre 3 variantes com ângulos diferentes — dor, promessa, mecanismo — e uma
recomendação com a razão. Cada variante ganha seu próprio sufixo de
`variant_id` para poder ser testada.

## Modo LONGO

Prosa, não bullet. A anatomia do parágrafo: entrada que ancora, desenvolvimento
que sustenta, fechamento que pivota para o próximo.

Ganchos que funcionam: fato + virada, contradição, cena, anomalia, citação.
Fechamentos que funcionam: implicação, reenquadramento, princípio, próximo
passo. Fechamento que resume o que acabou de ser dito não fecha nada.

## Delegação opcional

Esta skill é executável sozinha. Antes de cada handoff, confirme a existência
da skill no runtime atual:

- estrutura e argumentação → `afiliads-copywriting`, se disponível;
- oferta, bônus, garantia e ancoragem → `afiliads-offers`, se disponível;
- auditoria de conversão → `cro`, se disponível; caso contrário, `afiliads-content-qa`
  cobre somente qualidade textual e o limite deve ser declarado.

Skill ausente gera `DEPENDENCIA_OPCIONAL_AUSENTE` e o fluxo segue sem atribuir
ao entregável uma revisão que não ocorreu. Ordem, nível de entrada, fatos e
ancoragem no briefing permanecem responsabilidade desta skill.

## Regras duras

- Um objetivo por página. Dois CTAs concorrentes é a falha mais frequente.
- Mesma frase no hero e no CTA final.
- Nada que não esteja no briefing vira afirmação.
- Mobile-first: a dobra é o celular, não o desktop.
- `data-variant` no `<body>` quando gerar HTML.

## Saída

`copy.md` com os blocos nomeados, e `copy.html` se for página — usando os
tokens de `brandkit/brand-visual.md` via `afiliads-ebook-design-tokens`, para a página
nascer no visual do produto em vez de num tema genérico.

Depois desta skill, sempre `afiliads-content-voice`. O texto sai aqui estruturalmente
correto e ainda não está na voz.
