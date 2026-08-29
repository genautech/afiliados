---
name: afiliads-affiliate-platform
description: >
  Use when defining the brand's own affiliate program for a first-party
  product — commission contract, hop/UTM, allowed channels, brand bidding
  and the minimum kit. Never use for third-party offers or AfiliAds.
---

# Affiliate Platform — produto próprio

Define o **contrato** do programa de afiliados dos produtos próprios
da marca. Não cria conta, não opera marketplace, não publica kit e não
pertence ao AfiliAds.

## Leitura obrigatória

1. `docs/PROCEDENCIA_INFOPROD.md`
2. `brandkit/brand-visual.md`
3. Playbook `Playbooks/Plataforma/Programa_Afiliados.md`
4. `product-brief.yaml`, `format-decision.yaml` e `claim-ledger.csv` do produto
5. Schema `affiliate-program.schema.json` do EBOOK-OS

## Entradas EBOOK-OS

| Entrada | Sem o dado |
|---|---|
| `produto.id` + `versao` | recusar — programa sem produto |
| `format-decision` classificado | não cravar e-book se o gate F0 for curso/sprint |
| claim-ledger | kit só com claim `verificado` |
| hop / postback / cookie | gravar `PENDENTE` — não inventar |
| comissão, geo, prazo | `PENDENTE` até decisão humana |

## Contrato de saída

```text
<dir-produto>/affiliate-program.yaml
entregas/YYYY-MM-DD_<produto>_afiliados/kit-minimo.md
```

O YAML segue o schema. O validador só cobra se o arquivo existir. Hop
ausente ou vazio é falha bloqueante.

Campos mínimos do YAML:

- `modelo`: `proprio` ou `marketplace`
- `produto` + `geografia`
- `comissao` e `base_calculo` (valor ou `PENDENTE`)
- `hop` (URL ou `PENDENTE-humano` explícito — campo obrigatório)
- `utm_padrao` e `postback`
- `canais_permitidos` / `canais_proibidos`
- `brand_bidding`: `proibido` por omissão
- `disclaimer`
- `kit_minimo`
- `gates_humanos`

## Níveis de marca

| Superfície | Nível | Fonte |
|---|---|---|
| Presell, review, criativo do e-book | PRODUTO | preset do produto |
| Portal, onboarding, página do programa | MARCA | cor primária / tipografia do Brand Kit |
| Oferta de terceiro | fora | este repositório (AfiliAds) |

## Kit mínimo (arquivo, não conta)

1. Ângulo e promessa do produto (claim verificado).
2. 3 headlines + 1 CTA.
3. Swipe de objeções com resposta factual.
4. Regras de brand bidding e disclaimer.
5. `variant_id` por peça.

Sem hop aprovado, o kit circula só internamente.

## Recusas

- Oferta externa → este repositório (AfiliAds).
- Tráfego pago sem `campaign_id` e `campaign_guard` exit 0.
- Comissão, cookie, geo, preço ou performance inventados.
- Criar conta Hotmart/Stripe, publicar ou rodar campanha.
- Usar `Fatos_Produto.md` como fonte de número.

## Exemplo mínimo

```yaml
produto:
  id: lowticket-classificacao-formato
  versao: "0.1.0-fixture"
modelo: proprio
geografia: "BR — pendente de decisão jurídica"
comissao:
  valor: PENDENTE
  base_calculo: "percentual sobre líquido — PENDENTE"
hop: "PENDENTE-humano"
utm_padrao: "utm_source=afiliado&utm_medium=proprio&utm_campaign={{produto_id}}"
postback: PENDENTE
canais_permitidos: [organico, email]
canais_proibidos: [brand-bidding, trafego-pago-sem-gate]
brand_bidding: proibido
disclaimer: "Programa próprio de produto próprio da marca. Sem conta publicada."
kit_minimo: [angulo, headlines, objecoes, disclaimer]
gates_humanos: [conta, contrato, checkout, publicacao]
```

## Encadeamento

`afiliads-affiliate-platform` → Pesquisador (rascunho do kit) → Copywriter
(claims verificadas) → `afiliads-ebook-funnel` (peça 4) → humano publica.

## Assets oficiais da marca

A paleta, a tipografia e os arquivos de marca vêm do Brand Kit da campanha
(`brandkit/`, ou o BrandKit salvo pelo Estúdio de Produto). Não existe cor
padrão: se o Brand Kit não estiver preenchido, pergunte ou gere um antes de
produzir peça.
