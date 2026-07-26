---
id: insight-20260725-google-ads-api-conexao-real-mcc
title: "Conexão real com Google Ads API via MCC (Yoobe) — versão descontinuada era a causa raiz"
source_type: engenharia
source_path: afiliads_app/nextjs_space/lib/google-ads.ts
source_url: ""
projects: [afiliados]
tags: [google-ads, mcc, oauth, api, integracao]
created: 2026-07-25
status: validated
---

# Insight — Conexão real com a Google Ads API

## Mudança operacional (1 frase)

A conta Yoobe (`2381560874`) está conectada de verdade à Google Ads API via MCC (`4651237354`), com criação de campanha (budget → campanha PAUSED → segmentação → ad group → keywords → negativas → RSA) funcionando via API real, não mais em modo simulação.

## O que estava quebrado

- A versão da API usada no código (`v17`) estava descontinuada — retornava 404 puro do Google (nem chegava a ser erro da API), mascarado como se fosse problema de credencial. Atualizado para `v25` (versão atual em 2026-07).
- Faltava o header `login-customer-id` nas chamadas — obrigatório quando as credenciais são de uma conta MCC operando sobre uma conta filha; sem ele a API responde `USER_PERMISSION_DENIED` mesmo com tudo mais certo.
- O OAuth Client ID inicial foi criado como tipo "Desktop app" — não aceita `redirect_uri` customizado, e o OAuth Playground precisa de `https://developers.google.com/oauthplayground` autorizado. Precisou recriar como "Web application" com esse redirect URI.
- A OAuth consent screen do projeto GCP estava como "Internal" (restrita à organização `yoobe.co`) — bloqueava login com `genaujunior@gmail.com`. Trocada para "External" + `genaujunior@gmail.com` cadastrado como test user.

## Checklist replicável para conectar uma nova conta

1. Google Cloud Console → ativar "Google Ads API" no projeto.
2. Criar OAuth Client ID tipo **Web application**, com `https://developers.google.com/oauthplayground` em Authorized redirect URIs.
3. OAuth consent screen → **External** + adicionar test users.
4. Gerar refresh token no OAuth Playground usando esse client_id/secret (não usar credenciais padrão do Playground).
5. Developer token: Google Ads → Ferramentas → Centro de API (só aparece na conta MCC).
6. Se a conta que vai rodar campanhas for filha de uma MCC: preencher `login_customer_id` (ID da MCC) além do `customer_id` (conta filha).
7. Usar `v25` (ou a versão vigente — checar `developers.google.com/google-ads/api/docs/release-notes` antes de assumir uma versão fixa).

## Compliance / o que NÃO fazer

- Campanha criada via API **sempre** como `PAUSED` — nunca ativar automaticamente. Ativar é ação manual separada (via push/sync ou direto no painel).
- Não deixar a versão da API hardcoded sem revisão periódica — Google faz releases mensais e sunset de versões antigas em ~1 ano.

## Próxima ação (uma só)

- Testar a criação de uma campanha real (PAUSED) pela interface do app pra validar o fluxo ponta a ponta com a conta Yoobe.
