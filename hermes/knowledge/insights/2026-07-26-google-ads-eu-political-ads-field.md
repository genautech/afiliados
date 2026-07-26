---
id: insight-20260726-google-ads-eu-political-ads-field
title: "Google Ads API v25 exige contains_eu_political_advertising na criação de campanha"
source_type: outro
source_path: ""
source_url: "https://developers.google.com/google-ads/api/docs/api-policy/eu-par"
projects: [afiliados]
tags: [google-ads, compliance, bug]
created: 2026-07-26
status: validated
---

# Insight — Google Ads API v25 exige contains_eu_political_advertising

## Mudança operacional (1 frase)

Teste ponta-a-ponta da criação de campanha real (PAUSED) na conta Yoobe via `createGoogleCampaign` falhou com `FieldError.REQUIRED` em `contains_eu_political_advertising` — campo obrigatório desde set/2025 (EU Political Ads Regulation), com bloqueio total de mutate calls a partir de abr/2026 se não declarado. Corrigido em `lib/google-ads.ts`: toda campanha criada agora envia `containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'` (nunca fazemos ads políticos).

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | Fix resolve criação de campanha real sem erro | próxima criação via `/api/google-ads/create` com conta MCC real | sucesso sem `FieldError.REQUIRED` | mesmo erro reaparece |

## Ângulos de copy / funil

- N/A (fix técnico de infraestrutura).

## Compliance / o que NÃO fazer

- Nunca declarar `CONTAINS_EU_POLITICAL_ADVERTISING` — este produto não roda ads políticos em nenhuma hipótese.
- Confirmado neste teste: campanha criada via API continua sempre `PAUSED` (linha 345 de `lib/google-ads.ts`), como já documentado no insight de conexão MCC.

## O que ignorar desta fonte

- N/A.

## Próxima ação (uma só)

- Validado ponta-a-ponta com sucesso (orçamento → campanha PAUSED → geo/idioma → ad group → keyword → RSA) na conta real Yoobe (customer 2381560874, MCC 4651237354); objetos de teste já removidos da conta. Não há mais próxima ação pendente deste insight — o item "testar criação real" do insight `2026-07-25-google-ads-api-conexao-real-mcc` está concluído.
