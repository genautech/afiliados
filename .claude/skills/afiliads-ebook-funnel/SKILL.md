---
name: afiliads-ebook-funnel
description: >
  Use when designing a sourced funnel for a first-party product:
  landing, optional order bump, delivery email and own-affiliate kit.
  Does not publish, create checkout or run ads.
---

# E-book Funnel — produto próprio

Orquestra o funil de um produto próprio sem misturar marca, produto e
afiliado externo. Entrega contratos e arquivos. Não publica.

## Leitura obrigatória

1. `docs/PROCEDENCIA_INFOPROD.md`
2. `product-brief.yaml`, `format-decision.yaml`, `claim-ledger.csv`
3. Preset de conteúdo e visual do produto
4. `affiliate-program.yaml` se a peça 4 existir
5. Playbook `Playbooks/Plataforma/Arquitetura_Vendas_Ebooks.md` (stack
   desejado ≠ stack real)

## Entradas EBOOK-OS

| Entrada | Sem o dado |
|---|---|
| `validate_product.py` exit 0 | não escrever peça final |
| `format-decision` = `ebook` | recusar funil de e-book; sugerir o formato classificado |
| claim `verificado` para a promessa | `[FATO PENDENTE]` e bloquear publicação |
| preço, garantia, checkout | contrato `PENDENTE` — não inventar gateway |
| tracking (GA4, Pixel, UTMify) | declarar **ausente** até conta real |

## Ordem fixa

0. **Oportunidade** — se o produto veio de mineração/modelagem, confirme
   scorecard, distância de originalidade, entregável demonstrável e economia
   mínima antes de montar superfícies.
1. **Landing do produto** — nível PRODUTO; uma CTA; `variant_id`.
2. **Order bump** — só se aprovado por humano e com oferta real.
3. **E-mail de entrega / continuidade** — sem upsell inventado.
4. **Kit do programa próprio** — via `afiliads-affiliate-platform`. Sem hop, a
   peça 4 fica `PENDENTE`.

Cada peça tem um objetivo, uma CTA e `variant_id`. Copy final usa
somente claims verificadas.

## Superfícies

| Peça | Nível | Motion |
|---|---|---|
| Landing / bump hospedados | PRODUTO | Lottie/GSAP só aqui, com `motion-brief` |
| PDF / EPUB | PRODUTO | CSS/SVG; sem Lottie |
| E-mail | PRODUTO | estático |
| Portal / onboarding do programa | MARCA | cor primária / tipografia do Brand Kit |
| Presell de terceiro | fora | workspace `afiliados` |

## Gates

- Checkout, preço, garantia, bump, e-mail e tracking precisam de
  contrato real. Sem ele, o arquivo diz `PENDENTE`.
- Uma referência de mercado não autoriza copiar criativos, texto, depoimentos,
  identidade ou prova. O funil deve demonstrar o produto próprio e manter a
  promessa compatível com o entregável.
- Campanha externa vai para este repositório (AfiliAds) e exige
  `campaign_guard` exit 0.
- Esta skill não cria conta, não configura pixel e não implementa
  Next.js/Supabase.

## Recusas

- Inventar prova, ROAS, número de alunos ou depoimento.
- Tratar GA4/Pixel/UTMify como se já existissem.
- Publicar, cobrar ou rodar mídia.
- Converter OPERADOR em e-book.

## Exemplo mínimo de índice

```text
entregas/YYYY-MM-DD_<produto>_funil/
  01-landing.md          # variant_id, CTA única, claims verificadas
  02-bump.md             # ou ARQUIVO-AUSENTE se não aprovado
  03-email-entrega.md
  04-kit-afiliado.md     # ou PENDENTE sem hop
  README.md              # o que é contrato vs o que ainda não existe
```

## Encadeamento

```
validate_product.py → afiliads-content-landing (peças 1–3)
                   → afiliads-affiliate-platform (peça 4)
                   → afiliads-content-qa
                   → humano publica
```

## Assets oficiais da marca

A paleta, a tipografia e os arquivos de marca vêm do Brand Kit da campanha
(`brandkit/`, ou o BrandKit salvo pelo Estúdio de Produto). Não existe cor
padrão: se o Brand Kit não estiver preenchido, pergunte ou gere um antes de
produzir peça.
