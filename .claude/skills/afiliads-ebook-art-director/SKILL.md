---
name: afiliads-ebook-art-director
description: >
  Diretor de arte para e-books low-ticket. Porta de entrada de qualquer pedido
  visual de e-book: capa, ilustrações, miolo, versão interativa, mockups e
  peças de CTA. Use quando o usuário disser "capa do e-book", "faz a arte",
  "ilustrações do capítulo", "deixa o e-book bonito", "versão interativa",
  "mockup pra página de vendas", "arte do bump/upsell", "kit de afiliado",
  "banner 9:16" — ou qualquer pedido visual sobre um produto de ..
  Este skill NÃO gera pixels nem HTML
  final: ele carrega o DNA, fecha o briefing, propõe conceitos e roteia para
  afiliads-ebook-design-tokens / afiliads-ebook-cover / afiliads-ebook-illustration / afiliads-ebook-interactive /
  afiliads-ebook-render.
license: MIT
metadata:
  version: "0.1"
  status: esqueleto
  category: design
---

# afiliads-ebook-art-director

Roteador de intenção. Não gera nada sozinho.

## Carregamento obrigatório

Antes de qualquer decisão visual, ler nesta ordem:

1. `docs/PROCEDENCIA_INFOPROD.md` — confirma que a peça pertence à fábrica própria.
2. `brandkit/brand-visual.md` — obrigatório para superfícies de marca.
3. `brandkit/brand-visual.md` — preset quando a superfície é um produto.
4. `references/roteamento.md` — tabela de rotas e formato do briefing.

Se o DNA não existir ou o produto não tiver preset declarado na seção 5,
**parar e pedir o preset**. Nunca inventar paleta.

## Tabela de rotas

| Pedido | Rota | Skill |
|---|---|---|
| "capa", "thumbnail", "cover", "mockup 3D" | CAPA | `afiliads-ebook-cover` |
| "ilustração", "ícone", "sprite", "abridor de capítulo" | ILUSTRAÇÃO | `afiliads-ebook-illustration` |
| "deixa bonito", "diagrama", "layout do miolo", "PDF" | MIOLO | `afiliads-ebook-design-tokens` → `afiliads-ebook-render` |
| "interativo", "quiz", "animação", "scroll", "CTA no meio", "lottie", "gsap" | INTERATIVO | `afiliads-ebook-interactive` + `motion-brief.yaml` |
| "exporta", "PDF final", "EPUB", "manda pro checkout" | ENTREGA | `afiliads-ebook-render` |
| "banner de afiliado", "kit", "swipe visual", "ad 9:16 do e-book" | AFILIADO | `afiliads-ebook-cover` + `afiliads-ebook-illustration` (peças do kit, não a capa master) |

Em dúvida entre MIOLO e INTERATIVO: perguntar se a entrega é arquivo para
download (PDF/EPUB) ou página hospedada. Lottie e GSAP só na página
hospedada. PDF = CSS/SVG. Playbook:
`Playbooks/Design/Motion_Paginas_e_Ebooks.md`.

Um pedido pode disparar várias rotas em sequência — declarar a sequência
antes de começar.

## Procedimento

```
1. Carregar DNA + preset do produto.
2. Fechar o briefing — no máximo 3 rodadas de pergunta, uma dimensão por vez.
   Ordem de prioridade: entregável > público/promessa > referência visual.
   Parar cedo quando o briefing estiver completo o bastante para decidir.
3. Propor 3 conceitos em TEXTO (não gerar imagem ainda).
   → PARAR e esperar a escolha do usuário.
4. Validar o conceito escolhido contra a seção 4 do DNA (anti-patterns).
   Conceito que viola qualquer item volta para o passo 3.
5. Rotear para a skill-filha com o briefing fechado.
6. Auditoria final: rodar a checklist de `references/roteamento.md` §Auditoria.
7. Confirmar "Revisão visual OK" antes de considerar entregue.
```

## Regras

1. **O DNA da superfície vence a criatividade.** Marca usa os tokens do Brand Kit (rota, cor primária, tipografia e raio); produto usa o preset aprovado. Nenhuma cor, fonte ou raio fora da fonte correspondente.
2. **Sempre 3 conceitos, sempre em texto primeiro.** Gerar pixels antes da
   escolha é queimar crédito de API.
3. **Português correto** em todo texto visível — acentuação sem exceção.
4. **Texto de capa não sai do gerador de imagem.** O modelo de imagem produz
   fundo, textura e elemento gráfico; título e subtítulo entram por composição.
5. **Toda peça carrega um id de variante** (`variant_id`) para amarrar arte a
   conversão depois. Ver `references/roteamento.md` §Telemetria.
6. **Nunca publicar** — a skill entrega arquivo. Publicação é decisão do
   usuário.

## Saída

Todo entregável vai para `entregas/YYYY-MM-DD_<produto>_<tipo>/`
com um `brief.json` ao lado registrando: preset, conceito escolhido, prompts
usados, modelo, `variant_id`.

## TODO (esqueleto)

- [x] `references/roteamento.md` com formato do briefing, checklist de
      auditoria e esquema de telemetria
- [ ] Ligar `variant_id` ao dado de venda (mesmo padrão do `Presell.campaignId`
      no AfiliAds)


## Assets oficiais da marca

A paleta, a tipografia e os arquivos de marca vêm do Brand Kit da campanha
(`brandkit/`, ou o BrandKit salvo pelo Estúdio de Produto). Não existe cor
padrão: se o Brand Kit não estiver preenchido, pergunte ou gere um antes de
produzir peça.
