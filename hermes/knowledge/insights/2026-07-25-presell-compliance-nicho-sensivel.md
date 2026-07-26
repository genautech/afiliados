---
id: insight-20260725-presell-compliance-nicho-sensivel
title: "Presell Builder — reescrita de claims sensíveis, generalizada para qualquer produto"
source_type: engenharia
source_path: afiliads_app/nextjs_space/lib/presell.ts
source_url: ""
projects: [afiliados]
tags: [presell, compliance, saude, google-ads, disclaimer]
created: 2026-07-25
status: active
---

# Insight — Compliance de nicho sensível no Presell Builder

## Mudança operacional (1 frase)

Toda presell gerada pelo app agora reescreve claims de diagnóstico/cura/garantia como linguagem condicional focada em benefício, e os disclaimers legais (afiliado, "resultados variam", "não diagnostica/trata/cura", "consulte um profissional") são injetados garantidamente no template — não dependem do LLM obedecer.

## Origem

Disparado por um briefing de compliance para o produto FemiCore (nicho saúde da mulher/saúde urinária), validado com o Hermes Agent. O mecanismo foi generalizado para valer em qualquer produto de nicho sensível (saúde, corpo, finanças, relacionamentos, fases da vida), não só FemiCore.

## Como funciona

- `BUILDER_PROMPT` (agente `presell-builder`, tier `standard`) tem uma regra geral: reescrever qualquer claim de diagnóstico/cura/garantia para condicional + benefício/experiência, com tom de dignidade em nichos sensíveis.
- Detecção automática de nicho sensível (`detectHealthNiche`) a partir de `vertical`/`tags` do produto (ou do ângulo/contexto, quando não há produto vinculado) — ativa o bloco de disclaimers de saúde no template (`lib/presell-template.html`, placeholder `{{DISCLAIMER_SAUDE}}`).
- O Compliance Sentinel (pipeline de Busca de Produtos, `app/api/product-research/route.ts`) agora também gera `regras_reescrita` (claim proibido → reescrita segura) para qualquer produto de nicho sensível analisado — fica salvo em `ProductResearch.compliance` e é puxado automaticamente sempre que aquele produto for escolhido para presell.
- Dossiê do FemiCore atualizado manualmente com o briefing completo (regras de reescrita, tom, imagens, CTA, disclaimers) — serve de referência de "como deveria ficar" pros próximos produtos sensíveis analisados pelo pipeline.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | Presells de nicho sensível passam na revisão do Google Ads sem re-trabalho manual | % de presells aprovadas na primeira submissão | >80% | <50% |
| 2 | `regras_reescrita` geradas automaticamente pelo Compliance Sentinel são específicas o suficiente pra evitar retrabalho manual como o do FemiCore | revisão humana das regras geradas nos próximos 3 produtos sensíveis | regras aplicáveis sem edição | precisa reescrever do zero |

## Ângulos de copy / funil

- Reframe padrão: "parar sintoma X" → "apoio ao controle de X" / "melhora no conforto de X" / "promover bem-estar de X".
- Tipo de presell recomendado para nicho sensível: advertorial em terceira pessoa, storytelling editorial, nunca review direto agressivo.

## Compliance / o que NÃO fazer

- Nunca prometer resultado, cura ou eliminação de sintoma — mesmo em produtos "seguros"; a regra vale para qualquer nicho sensível, não só saúde.
- Disclaimer de saúde ("não diagnostica/trata/cura/previne" + "consulte um profissional") só deve aparecer quando o produto for de fato health/supplement — não faz sentido em nicho financeiro/relacionamento (esses precisam de disclaimer próprio, ainda não implementado).

## O que ignorar desta fonte

- N/A.

## Próxima ação (uma só)

- Quando o próximo produto de nicho financeiro ou "make money" for analisado, avaliar se precisa de um disclaimer equivalente (ex.: "não é aconselhamento financeiro") com o mesmo mecanismo de detecção automática.
