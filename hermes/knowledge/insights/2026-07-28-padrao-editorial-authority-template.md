---
id: insight-20260728-padrao-editorial-authority-template
title: "Padrão 'editorial-authority' — novo pageType de presell derivado da página live do FemiCore"
source_type: outro
source_path: "lib/presell-template-authority.html"
source_url: "https://orangepeelmorning.com/elementor-36/"
projects: [afiliados]
tags: [presell, template, pageType, femicore, nutra, design-system]
created: 2026-07-28
status: active
---

# Insight — Padrão "editorial-authority"

## Mudança operacional (1 frase)

A página Elementor live do FemiCore (`/elementor-36/`) converte melhor que o template `advertorial` padrão porque usa autoridade editorial (nav sticky, grid de ingredientes, selos de certificação, seção de pacotes, garantia) — codificamos esse padrão como novo `pageType: "authority"` no gerador (`lib/presell.ts`) para reuso em qualquer produto nutra/saúde/beleza, não só FemiCore.

## Especificação do template (para o "criador de Pre-sell templates")

```yaml
template:
  id: authority
  nome: "Editorial Authority"
  vertical_alvo: [nutra, saude, beleza, suplementos]
  inspirado_em: "https://orangepeelmorning.com/elementor-36/"
  paleta:
    primaria: "#1C2833"      # navy/charcoal — texto e header
    acento_cta: "#E8785A"    # laranja — botões, nunca usar em texto de corpo
    texto: "#2C3E50"
    fundo: "#FFFFFF"
    fundo_alt: "#F7F8FA"     # seções alternadas
  tipografia:
    heading: "Georgia, 'Times New Roman', serif"
    body: "'Segoe UI', -apple-system, sans-serif"
    h1: "44px / 700 / navy"
    h2: "35px / 700 / navy"
    body_size: "17px / 1.6"
  botoes:
    primario:
      forma: pill (border-radius 50px)
      cor_fundo: acento_cta
      cor_texto: "#FFFFFF"
      microcopy_abaixo: ["Secure checkout", "60-Day Money-Back Guarantee"]
    secundario:
      forma: retangular (border-radius 12px)
      cor_fundo: "#FFFFFF"
      borda: "1px solid navy"
  estrutura_secoes:
    - id: nav
      tipo: header_sticky
      conteudo: [logo, links_ancora(How It Works, Ingredients, Packages, Reviews, FAQ), cta_pill]
    - id: hero
      eyebrow: "Clinically Researched Ingredients" # trocar por claim aprovado do produto
      h1: headline_principal
      byline: "Independent Review by {{AUTOR}} · Advertising Disclosure Below"
      corpo: paragrafo_intro_com_termo_chave_em_negrito
      lista_beneficios: bullet_list (3-5 itens)
      cta: cta_pill
      imagem: produto_hero
    - id: ciencia
      eyebrow: "The Science Behind {{PRODUTO}}"
      h2: "A Revolutionary Discovery..."
      corpo: narrativa_educacional_longa_com_negritos
      imagem: suporte_cientifico
    - id: formula
      eyebrow: "Premium Formula"
      h2: claim_formulacao
      lista_fatos: [once-daily, non-gmo, usa-manufactured, gluten-free]
      cta: cta_pill
      selos_certificacao: badge_row_imagem
    - id: ingredientes
      eyebrow: "Nature's Finest"
      h2: "The Powerful Ingredients Inside {{PRODUTO}}"
      grid: ingredient_cards (5 itens: imagem + h5_nome + descricao_curta)
    - id: pacotes
      eyebrow: "Package Options"
      h2: "Choose the Package That Fits Your Goals"
      corpo: paragrafo_curto
      cta: cta_pill
      aviso: counterfeit_warning_box  # "compre só no site oficial"
    - id: garantia
      eyebrow: "Risk-Free Purchase"
      h2: "60-Day Money-Back Guarantee"  # ajustar dias conforme produto real
      corpo: paragrafo
      badges: [guarantee, shipping]
      imagem: produto
    - id: prova_social
      eyebrow: "Reader Feedback Themes"
      h2: temas_de_feedback
      disclaimer: "resultados individuais variam — não são depoimentos verificados de compra"
      grid: feedback_cards (3 itens: h6_titulo + paragrafo)
      cta: cta_pill
    - id: faq
      eyebrow: "Got Questions?"
      h2: faq_heading
      accordion: perguntas_frequentes (6-8 itens)
    - id: cta_final
      h2: chamada_final
      corpo: linha_curta
      cta: cta_pill
      microcopy: [secure_checkout, guarantee]
    - id: footer
      conteudo: [nome_marca, link_site_oficial, privacy, terms, contact, advertising_disclosure, ftc_statement, copyright]
  placeholders_novos:
    - "{{NAV_LINKS}}"
    - "{{INGREDIENTS_GRID}}"
    - "{{CERTIFICATIONS_IMG}}"
    - "{{PACKAGE_SECTION}}"
    - "{{COUNTERFEIT_WARNING}}"
    - "{{GUARANTEE_BADGES}}"
  regras_de_uso:
    - "Só usar em Search/Display com produto que tenha ingredientes/formulação reais (nutra, suplemento, cosmético) — não força a seção 'ingredientes' em verticais sem isso."
    - "Claims de garantia/dias devem bater com a política real do vendor (checar approved-copy-guide antes de gerar)."
    - "Nunca citar marca do produto na URL/slug (regra geral de compliance de afiliados, ver femicore-advertising-rules e equivalentes de outros vendors)."
    - "Selos de certificação (Non-GMO, USA-Made etc.) só aparecem se o vendor confirmar — não inventar selo que o produto não tem."
```

## Onde isso foi implementado

- `lib/presell-template-authority.html` — novo arquivo de template HTML (placeholders acima).
- `lib/presell.ts` — novo `pageType: "authority"`, `PresellContent` estendida (ingredientes, pacotes, certificações), `BUILDER_PROMPT` atualizado, helpers `ingredientsGridHtml`, `certBadgesHtml`, `packageSectionHtml`, `counterfeitWarningHtml`.
- Wizard (`app/wizard/page.tsx` ou equivalente) — opção `authority` no seletor de `pageType`.

## Compliance / o que NÃO fazer

- Não usar claims não aprovados (cura, eliminação, garantia de resultado).
- Não incluir marca do produto na URL.
- Não inventar número de depoimentos/selos que o vendor não forneceu — usar linguagem genérica ("clientes relatam", sem contagem fictícia).

## Próxima ação (uma só)

- Gerar a nova presell do FemiCore usando `pageType: "authority"` e publicar em `orangepeelmorning.com` via WordPress, depois medir CTR/conversão vs. o template `advertorial` atual.
