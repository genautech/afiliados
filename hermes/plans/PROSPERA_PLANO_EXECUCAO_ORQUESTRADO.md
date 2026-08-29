# PROSPERA — Plano de Execução Low-Ticket (Orquestração Real)

> Atualizado: 2026-08-26 · Base: varredura de agentes e skills em `infoprod/.agents/` + `afiliados/`

---

## FASE 0 — Setup e Credenciais

**Responsável:** Hermes (Genau)
**Duração:** 1 sessão

1. **Firecrawl no ambiente PROSPERA**: configurar `FIRECRAWL_API_KEY` no `~/.hermes/` (não copiar do AfiliAds)
2. **Validar ambiente EBOOK-OS**: `pip install -r ~/infoprod/frameworks/prospera-ebook-os/requirements.txt`
3. **Gate campaign guard**: `python3 ~/Scripts/campaign-guard/campaign_guard.py` — confirmar instalado

---

## FASE 1 — Pesquisa de Mercado (Firecrawl + Analista de Mercado)

**Orquestrador:** Hermes → Analista_Mercado_PROSPERA
**Skills:** `firecrawl-agent`, `web_search`
**Entregáveis:** `dados/mercado/` + `.origem.yaml`

### 1.1 Coleta nos Marketplaces
```bash
# Hotmart — extrair top e-books por nicho
firecrawl agent "Extraia nome, preço, produtor, avaliação, nº de avaliaç��es dos 20 e-books mais vendidos na Hotmart nos nichos: renda extra, emagrecimento, produtividade, marketing digital, culinária" \
  --schema '{"type":"object","properties":{"nome":{"type":"string"},"preco":{"type":"number"},"produtor":{"type":"string"},"avaliacao":{"type":"number"},"n_avaliacoes":{"type":"integer"},"nicho":{"type":"string"}}}' \
  --wait --pretty -o ~/infoprod/dados/mercado/hotmart-top-ebooks.json
```

### 1.2 Análise de Concorrentes
```bash
# Meta Ad Library — quem está anunciando nesses nichos
# Google Ads Transparency — idem
# Extrair headlines, CTAs, tempo de veiculação
firecrawl agent "Extraia headlines, CTAs e tempo de veiculação dos anúncios de e-books sobre 'ganhar dinheiro com IA' na biblioteca de anúncios" ...
```

### 1.3 Validação e Ledger
**Agente:** Analista_Mercado_PROSPERA
- Cada arquivo em `dados/mercado/` ganha `.origem.yaml`
- Propor linhas no `claim-ledger.csv` com `status=a-verificar`
- Encaminhar ao **Fact_Steward** para revisão

---

## FASE 2 — Seleção e Briefing do Produto #1

**Orquestrador:** Hermes → Estrategista_Lancamento_LowTicket_PROSPERA (modo ORGANIC_ONLY)
**Gate:** `validate_product.py`

### 2.1 Definir o vencedor
Com os dados da Fase 1, selecionar **1 produto** dentre as 10 ideias.
Critérios: volume de busca, CPC estimado, concorrência, margem, adequação ao DNA PROSPERA.

### 2.2 Criar estrutura EBOOK-OS
```bash
cd ~/infoprod/frameworks/prospera-ebook-os
python3 scripts/init_product.py --id "<produto-id>" --nome "<Nome do E-book>"
```
→ Gera diretório com `product-brief.yaml`, `claim-ledger.csv`, `format-decision.yaml`, `editorial-matrix.csv`

### 2.3 Preencher briefing com dados da Fase 1
**Agente:** Estrategista_Lancamento_LowTicket_PROSPERA
- Preencher `product-brief.yaml` com público, dor, transformação, mecanismo, fontes
- Preencher `format-decision.yaml` com `formato: ebook`
- Rodar `validate_product.py` → deve dar exit 0

---

## FASE 3 — Conteúdo do E-book (Pipeline de Texto)

**Orquestrador:** Hermes → content-director → knowledge-scout → content-briefing → content-landing → content-voice → content-qa
**Skills:** knowledge-scout, content-briefing, content-landing, content-voice, content-qa

### 3.1 Coleta de Conhecimento (knowledge-scout)
- Fontes: YouTube (especialistas do nicho), GitHub (ferramentas), artigos, concorrentes
- Saída: `dossie-conhecimento.md` + `knowledge-dossier.yaml` com âncoras

### 3.2 Geração do E-book (Claude Code via agent-skill-distribution)
**Agente:** Claude Code com skill `claude-code`
**Prompt:** (gerado pelo content-briefing)
```
Crie o conteúdo completo do e-book "[NOME]" no formato Markdown.
Estrutura: introdução, N capítulos, conclusão, apêndices.
Use SOMENTE claims do claim-ledger.csv com status=verificado.
Respeite o DNA de voz: dna/infoprod-conteudo.md.
Formato final: pronto para ebook-render.
```

### 3.3 Revisão e QA (content-voice + content-qa)
```bash
python3 ~/infoprod/.agents/skills/content-qa/scripts/slopcheck.py <ebook.md>
```
→ Zero slop, zero claims não verificadas, voz consistente

---

## FASE 4 — Visual do E-book (Pipeline Visual)

**Orquestrador:** ebook-art-director
**Skills:** ebook-design-tokens, ebook-cover, ebook-illustration, ebook-render
**Agente:** Designer_Visual_PROSPERA

### 4.1 Capa
- Tokens do produto via `tokens.py`
- Gerar com Nano Banana API (US$0.04) ou Higgsfield (estimar custo antes)
- Passar pelo gate objetivo (7 itens)

### 4.2 Diagramação e Render
```bash
node ~/infoprod/.agents/skills/ebook-render/scripts/render_pdf.mjs <ebook.md> --cover <capa.png>
```

---

## FASE 5 — Funil de Vendas (Pipeline de Funil)

**Orquestrador:** ebook-funnel → offers → affiliate-platform
**Skills:** offers, ebook-funnel, affiliate-platform
**Agente:** Copywriter_Ebook_PROSPERA (peças de copy)

### 5.1 Arquitetura de Oferta (offers)
→ `offer-architecture.yaml` + `offer-copy.md`
- Promessa, mecanismo, composição, preço, bônus, garantia
- SÓ claims verificadas
- Preço e checkout: `PENDENTE` até decisão humana

### 5.2 Landing Page (content-landing + Copywriter_Ebook_PROSPERA)
- 1 CTA, nível PRODUTO, variant_id
- Copy usa SOMENTE claims com `uso_copy_final=sim`
- Mapa `trecho → claim_id`

### 5.3 Order Bump (se aprovado)
- Oferta real (planilha, template, checklist)
- Mesmo gate de claims

### 5.4 E-mail de Entrega
- Sem upsell inventado
- Tracking declarado como `PENDENTE` até conta real

### 5.5 Kit de Afiliados Próprio (affiliate-platform + Pesquisador_Conteudo_Afiliado_PROSPERA)
- Hop: `PENDENTE` até decisão humana
- Comissão: `PENDENTE`
- Brand bidding: proibido por omissão

---

## FASE 6 — Lançamento (Modo CAMPAIGN — se autorizado)

**Orquestrador:** Estrategista_Lancamento_LowTicket_PROSPERA (modo CAMPAIGN)
**Gate:** `campaign_guard.py <campaign_id>` exit 0

### 6.1 Criativos (criativo-variations-generator + Designer_Visual_PROSPERA)
- Imagens estáticas (1080×1080)
- Script de vídeo 15s
- Passar pelo gate objetivo

### 6.2 Campanhas de Tráfego (estrategista-trafego-lowticket)
- Meta Ads: segmentação, orçamento, criativos
- Google Ads: search + display, palavras-chave
- **Dado próprio decide.** Enquanto não houver, benchmark dimensiona hipótese.

### 6.3 Monitoramento e Otimização
- `dados/proprio/` alimentado com export da conta
- Kill/Scale só com dado próprio suficiente
- Nunca usar benchmark como resultado

---

## Resumo Visual: Quem Faz o Quê

```
FASE 0: Setup
  Hermes ─── Firecrawl, validate_product.py, campaign_guard

FASE 1: Pesquisa
  Hermes ─── Analista_Mercado_PROSPERA ─── Firecrawl ─── dados/mercado/
                                                    └── .origem.yaml
                                                    └── claim-ledger (a-verificar)
                                                    └── Fact_Steward (revisão)

FASE 2: Seleção
  Hermes ─── Estrategista_Lancamento_LowTicket_PROSPERA ─── init_product.py
                                                      └── product-brief.yaml
                                                      └── claim-ledger.csv

FASE 3: Conteúdo
  Hermes ─── content-director ─── knowledge-scout ─── dossiê
                             └── content-briefing ─── briefing
                             └── Claude Code ─── ebook.md
                             └── content-voice ─── ajuste de voz
                             └── content-qa ─── slopcheck

FASE 4: Visual
  Hermes ─── ebook-art-director ─── ebook-design-tokens
                               └── Designer_Visual ─── capa + gate 7 itens
                               └── ebook-render ─── PDF final

FASE 5: Funil
  Hermes ─── offers ─── arquitetura de oferta
          └── ebook-funnel ─── content-landing ─── landing page
                           └── Copywriter_Ebook ─── copy verificada
                           └── affiliate-platform ─── kit afiliados próprios

FASE 6: Lançamento (CAMPAIGN — com gate)
  Hermes ─── campaign_guard.py (exit 0 obrigatório)
          └── criativo-variations-generator ─── imagens/vídeos
          └── estrategista-trafego-lowticket ─── Meta + Google Ads
          └── dados/proprio/ ─── monitoramento
```

---

## Próximo Passo Imediato

1. **Genau fornece `FIRECRAWL_API_KEY`** (ou confirma que o MCP já está autenticado)
2. **Hermes executa FASE 1.1** — coleta Firecrawl nos marketplaces
3. **Analista_Mercado_PROSPERA** produz `.origem.yaml` e propõe claims
4. **Genau + Fact_Steward** revisam e promovem claims
5. **Seleção do produto #1** com dados reais
