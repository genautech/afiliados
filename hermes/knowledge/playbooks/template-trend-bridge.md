---
id: template-trend-bridge
project: afiliados
updated: 2026-07-24
source_insight: insight-20260724-organic-trend-interweave-presell
---

# Playbook — Template Trend→Bridge

## Quando usar

Oferta com atributo claro + demanda curiosa evergreen (pessoas, cases, comparativos).

## Inputs

- Oferta (rede, hop, geo, Vendor Terms)
- Atributo (`altura`, `rotina de sono`, `ingrediente`, …)
- 5 entidades candidatas com volume a validar
- Money URLs / sitemap da bridge domain
- Disclaimer compliance

## Prompt base (cole no Hermes / Claude)

```text
Crie (1) generation prompt e (2) markdown outline reutilizáveis para bridges de afiliado.
Padrão: curiosidade evergreen sobre {entidade}/{atributo} entrelaçada com a oferta {oferta}.
Regras: sem endosso falso de celebridade; sem claims proibidos; CTA claro para hop;
incluir meta description, H2/H3, FAQ, alt text placeholders, links internos {money_urls},
e bloco de fontes externas confiáveis. Espere a amostra de artigo de referência antes de gerar.
```

## Saída esperada

- `prompt` + `outline` versionados (ex.: `hermes/knowledge/playbooks/templates/celeb-or-trend-v1.md`)
- 2 artigos gerados → publicar → 1 ad group de teste

## Kill/Scale

Seguir skill afiliados: amostra mínima; uma mudança por vez; EPC vs CPC.
