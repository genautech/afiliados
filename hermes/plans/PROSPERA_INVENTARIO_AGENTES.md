# PROSPERA — Inventário de Agentes e Skills (Varredura 2026-08-26)

## 🎯 Agentes PROSPERA (.agents/agents/)

| # | Agente | Propósito | Gate Obrigatório |
|---|--------|-----------|------------------|
| 1 | **Analista_Mercado_PROSPERA** | Coleta dados de mercado com Firecrawl, alimenta `dados/` com `.origem.yaml` | `.origem.yaml` obrigatório; benchmark NUNCA vira resultado próprio |
| 2 | **Copywriter_Ebook_PROSPERA** | Copy de e-book/landing/anúncio, gate-locked ao claim ledger | `validate_product.py` exit 0; só claim `verificado` + `uso_copy_final=sim` |
| 3 | **Designer_Visual_PROSPERA** | Capa, key visual, banner — com checklist objetivo (contraste, paleta, tipografia) | Gate de 7 itens antes de aprovação humana; custo IA autorizado antes de gerar |
| 4 | **Estrategista_Lancamento_LowTicket_PROSPERA** | Planeja validação orgânica e campanha de e-books aprovados | `CAMPAIGN` exige `campaign_guard.py` exit 0; `ORGANIC_ONLY` não usa mídia paga |
| 5 | **Fact_Steward_PROSPERA** | Governa claims por produto/versão; prepara evidência, humano decide | `validate_product.py` exit 0; nunca autoaprova |
| 6 | **Pesquisador_Conteudo_Afiliado_PROSPERA** | Pesquisa Firecrawl + gera kit de conteúdo para afiliados próprios | Claim-ledger do produto; Firecrawl salva em `dados/mercado/` |
| 7 | **Refinador_Missoes_OPERADOR** | Refina missões do curso OPERADOR (NÃO relevante para e-books low-ticket) | Específico do OPERADOR |

---

## 🔗 Skills Pipeline PROSPERA (.agents/skills/)

### Pipeline de Texto
```
knowledge-scout → content-briefing → content-landing → content-voice → content-qa
```

| Skill | Função |
|-------|--------|
| **content-director** | Porta de entrada: classifica MARCA vs PRODUTO, roteia para pipeline |
| **knowledge-scout** | Ingere YouTube/GitHub/Firecrawl → dossiê rastreável com âncoras |
| **content-briefing** | Dossiê → briefing formal preenchido |
| **content-landing** | Briefing → landing page nível PRODUTO (blocos, CTA, variant_id) |
| **content-voice** | Aplica DNA de voz (`infoprod-conteudo.md`) |
| **content-qa** | QA final + slopcheck (`scripts/slopcheck.py`) |

### Pipeline Visual
```
ebook-design-tokens → cover/illustration/interactive → ebook-render
```

| Skill | Função |
|-------|--------|
| **ebook-art-director** | Diretor visual, equivalente ao content-director |
| **ebook-design-tokens** | Tokens visuais do produto (`scripts/tokens.py`) |
| **ebook-cover** | Geração de capa |
| **ebook-illustration** | Ilustrações internas |
| **ebook-interactive** | Elementos interativos |
| **ebook-render** | Render final PDF/EPUB (`scripts/render_pdf.mjs`) |

### Pipeline de Funil
```
offers → ebook-funnel → affiliate-platform
```

| Skill | Função |
|-------|--------|
| **offers** | Arquitetura de oferta: promessa, composição, preço, bônus, garantia, CTA |
| **ebook-funnel** | Orquestra funil: landing, order bump, e-mail, kit afiliado próprio |
| **affiliate-platform** | Contrato do programa de afiliados próprio (hop, comissão, canais) |

### Skills de Apoio
| Skill | Função |
|-------|--------|
| **copywriting** | Copy genérica (dependência opcional) |
| **cro** | Metodologia CRO |
| **storybrand-messaging** | Framework StoryBrand |
| **hundred-million-offers** | Framework Grand Slam Offers |
| **lead-magnets** | Geração de lead magnets |
| **image** | Geração de imagens |
| **antigravity-design-expert** | Design via Antigravity |
| **marketing-council** | Conselho de marketing/governança |

---

## 🚀 Skills Hermes Globais (~/.hermes/skills/)

| Skill | Funç��o |
|-------|--------|
| **estrategista-trafego-lowticket** | Estratégia de tráfego pago para low-ticket |
| **oferta-lowticket-generator** | Gerador de ofertas low-ticket |
| **criativo-variations-generator** | Variações de criativos para anúncios |
| **infoproduto-critico-analyst** | Análise crítica de UX/vendas de infoprodutos |
| **presell-master-strategist** | Orquestrador de Pre-sells (Kimi + skills) |
| **affiliate-presell-layout-generator** | Layout HTML/CSS para Pre-sell |
| **clickbank-precel-analyzer** | Valida páginas Precel ClickBank |
| **clickbank-domain-product-matching** | Mapeia domínios → produtos ClickBank |
| **affiliate-product-approval-automator** | Automação de formulários de aprovação |
| **femicore-advertising-rules** | Regras de compliance FemiCore |
| **google-ads-affiliate-automation** | Automação Google Ads para afiliados |
| **infoprod-knowledge-agent** | Geração de infoprodutos (Kimi/Hallmark) |

---

## 🏢 Projeto AfiliAds (/afiliados/)

| Recurso | Função |
|---------|--------|
| **afiliado-google-ads-pro/SKILL.md** | Estratégia de afiliados multi-rede (ClickBank, MaxWeb, Hotmart) + Google Ads |
| **afiliado-google-ads-pro/scripts/validar_copy.py** | Validador de copy RSA (limites + termos de risco) |
| **SKILL.md (raiz)** | Skill principal do projeto Afiliados |
| **SkillClaw/** | Distribuição e gestão de skills entre agentes |
| **hermes/knowledge/prompt-guidelines.md** | Diretrizes de prompt para LLMs |

---

## ⚠️ Regras de Fronteira (WORKSPACE_BOUNDARIES.md)

- **PROSPERA (`infoprod/`)**: produtos próprios, DNA próprio, programa de afiliados próprio
- **AfiliAds (`afiliados/`)**: oferta de terceiro, presell externa, Google Ads, campanhas
- **NÃO MISTURAR**: DNA PROSPERA não se aplica ao AfiliAds; campaign_guard não se aplica à fábrica própria (exceto modo CAMPAIGN)
- **Firecrawl**: configurar no ambiente PROSPERA, não copiar credenciais do AfiliAds
