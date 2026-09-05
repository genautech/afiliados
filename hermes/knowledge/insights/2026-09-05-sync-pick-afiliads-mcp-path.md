# Sync Pick → AfiliAds via MCP

## Fluxo canônico para sincronizar picks do Lowticket/Anunaki com o AfiliAds

### 1. Produto (upsert)

**Opção A — Análise completa (Hunter/SEO/Compliance):**
```
analisar_produto(nome="YuSleep", network="clickbank")
```
Demora 1–3 min. Grava ProductResearch com score, keywords em camadas, compliance, estratégia.

**Opção B — Upsert rápido (sem análise LLM):**
```
criar_produto(nome="YuSleep", network="clickbank", vertical="sleep", status="escolhido", ...)
```
Cria ou atualiza por nome. Use quando o pick já vem com dados do scout externo.

### 2. Campanha (create local — não Google Ads)

```
criar_campanha(
  nome="CB_YUSLEEP_US_SEARCH_BRIDGE_v1",
  product_research_id="<id do passo 1>",
  platform="ClickBank",
  vertical="sleep",
  geo="US",
  channel="SEARCH",
  funnel="BRIDGE",
  budget_test=50,
  ...
)
```
Cria a campanha no banco do AfiliAds com wizardStep=1, status=EM_TESTE.

### 3. (Opcional) Google Ads

Quando a campanha estiver pronta (wizard completo, readiness ok):
```
google_ads_create_campaign(campanha="CB_YUSLEEP_US_SEARCH_BRIDGE_v1", idempotency_key="create_yusleep_v1")
```

### Auth

Todos os tools acima usam `AFILIADS_MCP_TOKEN` como header `x-afiliads-token`.
O app resolve o userId via `AFILIADS_MCP_USER_EMAIL` ou `AFILIADS_USER_EMAIL` (ambos aceitos).
