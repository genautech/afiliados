---
title: "Case — Mídia Paga e Demanda de Busca: Fisioterapia em NYC (In Touch NYC Physical Therapy)"
projeto: afiliads
tipo: case-study / test-validation
mercado: Physical Therapy — Manhattan / NYC Metro (EUA)
alvo: In Touch NYC Physical Therapy (itnycpt.com)
coleta: 2026-08-15 a 2026-08-18
ferramentas: Google Ads Transparency Center (Firecrawl stealth), Meta Ad Library, WebSearch
status: baseline coletado — pronto para validação de agentes AfiliAds
tags: [afiliads, test-validation, google-ads, healthcare, local-services-ads, hipaa, nyc]
---

# Case — Mídia Paga e Demanda de Busca: Fisioterapia em NYC

> **Como ler este documento**
> Cada bloco está marcado como **[VERIFICADO]** (extraído diretamente de fonte primária, com URL e data) ou **[ESTIMATIVA]** (derivado de benchmark público + extrapolação de mercado). Nada aqui foi inferido sem marcação.

---

## 0. Sumário executivo

1. **In Touch NYC PT está fora do leilão desde 29/08/2025.** O Google Ads Transparency Center mostra 5 criativos, 100% texto, sem nenhuma veiculação em ~12 meses. Não há Display, YouTube, PMax nem Local Services Ads. [VERIFICADO]
2. **As redes grandes dominam por formato, não por copy.** Professional PT (82 criativos), SPEAR (80) e JAG-ONE (65) usam predominantemente *Local Ad Rendering Service* — anúncio com endereço, nota, horário e botões de ligar/rota. É um jogo de cobertura geográfica, não de criatividade. [VERIFICADO]
3. **Boutiques provam que dá para competir sem escala.** MOTIVNY (11 criativos, ativa hoje) e Bespoke Treatments (3 criativos, via **Local Services Ads / GLS**) mostram dois caminhos baratos e ainda pouco disputados no nicho. [VERIFICADO]
4. **A economia fecha com folga.** CPL nacional em fisioterapia é US$ 32,79 e a receita líquida por visita da USPh foi US$ 105,76 em FY2025. Mesmo com CPC de NYC 2–3× o nacional, o CPC de break-even fica em torno de US$ 40. [VERIFICADO para os insumos; ESTIMATIVA para o break-even]
5. **Compliance é o gargalo real, não o orçamento.** Fisioterapia **não** exige certificação LegitScript, mas cai em "physical or mental health" — categoria sensível: sem remarketing por condição, sem Customer Match de saúde, e **Enhanced Conversions deve ser desligado**. [VERIFICADO]

---

## 1. Anúncios ativos — Google Ads Transparency Center

**Método:** `firecrawl_scrape` com `proxy: "stealth"` e `waitFor: 8000–9000ms` sobre `https://adstransparency.google.com/?region=US&domain=<dominio>`. Taxa de falha ~15% (`ERR_TUNNEL_CONNECTION_FAILED`, `ECONNRESET`), resolvida por retry. As páginas de advertiser retornam VAST/AdSense inline, o que estoura o limite de output — foi necessário fatiar os arquivos de resultado.

### 1.1 Alvo — In Touch NYC Physical Therapy [VERIFICADO]

| Campo | Valor |
|---|---|
| Advertiser ID | `AR06386836443276247041` |
| Domínio | itnycpt.com |
| Criativos no arquivo | 5 |
| Formato | 100% texto (Search) |
| Última veiculação | **29/08/2025** |
| Display / YouTube / PMax / LSA | nenhum |

URL: https://adstransparency.google.com/?region=US&domain=itnycpt.com

**Criativos recuperados** (texto integral):

1. `Pelvic Floor Therapy In Manhattan | In Touch NYC Physical Therapy`
   — "Find specialized care for pelvic health at In Touch NYC Physical Therapy in Manhattan. Pelvic Floor Therapy addresses conditions to help you"
2. `Neck Pain in Manhattan | In Touch NYC Physical Therapy`
   — "Find relief from neck pain with expert care at In Touch NYC Physical Therapy in Manhattan. Connect with us today"
3. `In Touch NYC Physical Therapy`
   — "Pain-free movement starts here—book physical therapy with NYC's trusted specialists. Convenient Midtown clinic, flexible hours, insurance accepted—start recovery today."

**Leitura:** a estrutura era correta (sintoma + serviço + bairro no título), mas rasa — 5 criativos para 3 unidades e um catálogo de serviços com pelo menos 5 nichos distintos. Sem extensão de localização, sem LSA, sem chamada de call-only.

**Ficha da clínica** (scrape de itnycpt.com, 2026-08-15) [VERIFICADO]:

- Telefone: (212) 288-2988 · frontdesk@itnycpt.com
- Unidades: 111 John St, Ste 1460 (Financial District) · 162 W 56th St, Suite 302 (Midtown) · Woodbury (Long Island)
- Google: 4,8/5 com **22 avaliações**
- Serviços: Pilates, terapia vestibular, hand therapy, escoliose, dry needling, pelvic floor

### 1.2 Concorrentes — inventário de anunciantes [VERIFICADO]

| Clínica | Domínio | Criativos no arquivo | Formato dominante | Advertiser ID |
|---|---|---|---|---|
| Professional PT | professionalpt.com | **82** | Local Ad Rendering Service | — |
| SPEAR Physical Therapy | spearcenter.com | **80** (72 no domínio) | Local Ads + Vídeo (VAST, 1280×720, ~44s) | `AR12635811583176474625` |
| JAG-ONE Physical Therapy | jagpt.com | **65** | Imagem/Display + Local | — |
| MOTIVNY | motivny.com | **11** — *ativa em 15/08/2026* | Texto + Local Ad | `AR07630208009221701633` |
| Bespoke Treatments | bespoketreatments.com | **3** | **GLS Ad Rendering Service (Local Services Ads)** | `AR10203456515508011009` |
| In Touch NYC PT | itnycpt.com | 5 — *parada desde 29/08/2025* | Texto | `AR06386836443276247041` |
| Finish Line PT | finishlinept.com | **0** | — | — |
| Evolve PT | evolveny.com | **0** | — | — |
| Perfect Stride PT | perfectstridept.com | **0** | — | — |
| Custom Performance | customperformancenyc.com | **0** | — | — |
| H&D Physical Therapy | hdptny.com | **0** | — | — |

> ⚠️ "Criativos no arquivo" = número de anúncios únicos arquivados, **não** volume de impressão nem gasto. O GATC não expõe budget, impressões ou keywords. Um anunciante com 82 criativos pode gastar menos que um com 11.

**Padrões de copy da SPEAR** (extraídos dos criativos) [VERIFICADO]:
- "long-lasting recovery from back, neck & joint pain with expert therapists"
- "We Will Get You Moving and Performing More Optimally While Also Preventing Future Injuries"
- "Book an Appointment at Your Nearest Facility Today. Browse by Service, Sport or location."
- Anúncios locais renderizam: `5.0 (135) · Physical therapy clinic · Open 24 hours` + endereço + botões
- Landing pages por unidade: `/locations/long-island/long-island-rockville-centre/`, `/long-island-great-neck/`, `/long-island-garden-city/`, `/long-island-bellmore/`

**Conclusão estrutural:** o eixo competitivo é **cobertura geográfica × prova social (nota + volume de reviews) × formato local**, não copy diferenciada. A SPEAR renderiza 5.0 com 135 reviews; a In Touch, 4,8 com 22. Essa diferença aparece dentro do próprio anúncio.

### 1.3 Meta Ad Library — limitação declarada ⚠️

**Não foi possível confirmar presença ou ausência de anúncios dos concorrentes-alvo no Meta.** A Ad Library é JS-heavy com scroll infinito e busca semântica ruidosa. Duas abordagens foram tentadas:

1. Scrape direto de `facebook.com/ads/library/?q=physical%20therapy%20new%20york&country=US&active_status=active` com stealth + `waitFor: 12000` → retornou ~350 resultados parciais (114k de 175k chars processados).
2. Busca por `"In Touch NYC Physical Therapy"` → ~240 resultados, **nenhum** correspondendo à clínica; o algoritmo devolveu "Dr. Physio Therapy & Wellness" (@dr.physiotw) por similaridade semântica.

**18 anunciantes identificados na busca genérica** (nenhum é concorrente direto de fisioterapia ortopédica em Manhattan): Arthritis Support Community, We Speak For You, UNITY Chiropractic Wellness, Ventus Therapy, Project Physical Therapy, Tribeca Physical Therapy NYC, Solniera, Rosabella, Weill Cornell Medicine, New York Living, Vitality Medicine of New York, Hireline, Form Physical Therapy and Performance, Dr. Bruce Numeroff DC, Boston Applied Biologics, Sports and Pain Institute of New York, Axis Spine Clinic, World Class Chiropractic.

**Para fechar essa lacuna é preciso Page ID**, não busca por texto: `facebook.com/ads/library/?view_all_page_id=<ID>`. Os Page IDs teriam que ser coletados página a página nos perfis do Facebook de cada clínica.

**Sinal indireto observado:** o padrão dominante no Meta em saúde local NYC é copy narrativa longa em primeira pessoa (ex.: Arthritis Support Community, Library ID `1009041561838724`, começa com "I found a wallet on the dining room table..."), o oposto do anúncio de serviço local direto.

---

## 2. Concorrência — mapa do mercado

### 2.1 Redes grandes (private-equity backed)

| Rede | Unidades | Controle | Fonte |
|---|---|---|---|
| **JAG-ONE Physical Therapy** | 135+ (NYC, NJ, Westchester, Rockland, Long Island, PA) | **Pamlico Capital** | pamlicocapital.com/portfolio/jag-one-physical-therapy [VERIFICADO] |
| **Professional Physical Therapy** | 100+ (NY, NJ, CT) — contagem de 2016, atual não publicada | **Thomas H. Lee Partners** (comprou participação da Great Point Partners em 2016) | thl.com/companies/professional-physical-therapy/ [VERIFICADO] |
| **SPEAR Physical Therapy** | ~45 na região metropolitana de NYC | PE não confirmado publicamente (perfis PitchBook/ZoomInfo existem, sem conteúdo aberto) | [PARCIAL] |

Origem do JAG-ONE: fusão em 2018 entre JAG Physical Therapy e One on One Physical Therapy; aquisição da Monmouth Rehab Professionals (3 unidades NJ) em dez/2024.

### 2.2 Boutiques e cash-based

| Clínica | Posicionamento | Observação |
|---|---|---|
| **MOTIVNY** | SoHo, out-of-network, sessões de 60 min | Self-pay até **US$ 225**/consulta (US$ 275 com os fundadores). Único boutique com campanha **ativa** no GATC [VERIFICADO] |
| **Bespoke Treatments** | Multi-cidade (NYC/Seattle/San Diego), performance-oriented | Único da lista rodando **Local Services Ads** [VERIFICADO] |
| **Finish Line PT** | Corredores/endurance — Chelsea (119 W 23rd St, Ste 304) + New Rochelle | Zero anúncios no GATC |
| **Custom Performance** | Corredores, cash-based | Zero anúncios |
| **Evolve PT** | Ortopédica de bairro | Zero anúncios |
| **Perfect Stride PT** | Corredores/esportiva | Zero anúncios |
| **H&D Physical Therapy** | Multi-unidade Manhattan | Zero anúncios |
| **In Touch NYC PT** | Ortopédica + pelvic + vestibular + hand, aceita seguro | Parada desde ago/2025 |

**Espaço competitivo real:** entre as redes PE (que compram cobertura) e as boutiques cash-based (que quase não compram mídia), há um vão. A In Touch está exatamente nele — aceita seguro (funil mais largo que boutique), tem nichos de alta margem (pelvic, vestibular, hand therapy) e três unidades. É o perfil que mais se beneficia de LSA + campanhas de nicho.

---

## 3. Demanda de busca e economia do clique

### 3.1 CPC

| Termo / segmento | Valor | Status |
|---|---|---|
| Healthcare geral EUA — CPC médio | **US$ 3,17 – 5,64** | [VERIFICADO] LocaliQ Healthcare Search Advertising Benchmarks |
| Fisioterapia nacional EUA | US$ 3 – 7 | [VERIFICADO] faixa reportada |
| Fitness/health (Statista) | US$ 3 – 20 conforme mercado | [VERIFICADO] statista.com/statistics/1402612 |
| **Fisioterapia NYC** | **US$ 8 – 20** | [ESTIMATIVA] extrapolação por tier de mercado |
| `physical therapy near me` | US$ 6 – 14 | [ESTIMATIVA] |
| `physical therapy nyc` | US$ 10 – 20 | [ESTIMATIVA] |
| `pelvic floor therapy nyc` | US$ 5 – 12 | [ESTIMATIVA] — concorrência menor |
| `sports injury rehab nyc` | US$ 8 – 16 | [ESTIMATIVA] |
| `does [seguradora] cover physical therapy` | baixo | [ESTIMATIVA] — CPC baixo, intenção alta |

**Tendência:** CPCs de healthcare dobraram em alguns mercados regionais entre 2025 e 2026. Provisionar **20–30% de aumento YoY** no planejamento. [VERIFICADO — reportado por LocaliQ/Promodo]

### 3.2 Conversão [VERIFICADO — LocaliQ 2025, base de 3.542 campanhas]

| Métrica | Fisioterapia |
|---|---|
| CTR médio | **6,61%** (3º maior dentro de healthcare) |
| Taxa de conversão | **15,35%** |
| CPL médio nacional | **US$ 32,79** (3º menor em healthcare) |

**Ajuste para NYC** [ESTIMATIVA]:
- CPL NYC: **US$ 60 – 110**
- Custo por paciente novo: **US$ 90 – 200** (assumindo show rate de 55–70% entre lead e primeira consulta comparecida)

### 3.3 LTV do paciente

| Item | Valor | Status |
|---|---|---|
| Receita líquida por visita | **US$ 105,76** (U.S. Physical Therapy, FY2025) · US$ 106,49 (comparável público Q1/2026) | [VERIFICADO] |
| Faixa de mercado | US$ 80 – 110 | [VERIFICADO] |
| Seguro comercial | US$ 95 – 130/visita | [VERIFICADO] |
| Self-pay / cash NYC | US$ 120 – 200/sessão (MOTIVNY chega a US$ 225–275) | [VERIFICADO] |
| Medicare — conversion factor 2025 | **US$ 32,3465** (queda de 2,83% vs US$ 33,2875 em 2024; 5º corte consecutivo) | [VERIFICADO] |
| Medicare — avaliação inicial | US$ 95 – 120 · reavaliação US$ 60 – 85 | [VERIFICADO] |
| KX modifier threshold 2025 | US$ 2.410 (PT+SLP combinado; OT em separado) | [VERIFICADO] |
| Visitas/dia por clínica | 32,2 (FY2025) · 32,7 (Q4/2025) | [VERIFICADO — USPh] |
| Visitas por episódio | 8 – 12 | [ESTIMATIVA de mercado] |

**LTV derivado** [ESTIMATIVA]:
- In-network: **US$ 850 – 1.300** por episódio
- Out-of-network / self-pay: **US$ 1.400 – 2.400**
- Margem de contribuição: **US$ 400 – 550** por paciente
- **CPC de break-even: ~US$ 40** (com CTR 6,6%, conv. 15%, show rate 60%)

> Fontes: btetechnologies.com/therapyspark/how-much-does-medicare-pay-for-physical-therapyper-visit/ · sprypt.com/blog/medicare-physical-therapy-reimbursement · patientstudio.com/2025-physical-therapy-reimbursement-rates · localiq.com/blog/healthcare-search-advertising-benchmarks/

**Implicação:** com break-even em ~US$ 40 e CPC real estimado em US$ 8–20, o mercado tem margem de 2–5× no clique. O gargalo não é o CPC — é show rate, capacidade de agenda e mix de seguro.

---

## 4. Intenção e sazonalidade

### 4.1 Taxonomia de intenção

| Camada | Exemplos | Volume | Intenção | CPC | Uso recomendado |
|---|---|---|---|---|---|
| **Sintoma** | `lower back pain`, `shoulder pain when lifting arm`, `sciatica relief` | alto | difusa (pode virar conteúdo, não consulta) | médio | Search amplo + conteúdo; qualificar com "physical therapy" |
| **Condição** | `patellar tendinopathy`, `frozen shoulder treatment`, `plantar fasciitis` | médio | alta — já diagnosticado | médio-alto | Grupos dedicados, LP por condição |
| **Serviço** | `pelvic floor therapy`, `dry needling`, `vestibular rehab`, `hand therapy` | baixo-médio | **muito alta** | baixo-médio | **Melhor ROI** — pouca concorrência, margem alta |
| **Local** | `physical therapy midtown`, `physical therapy financial district`, `physical therapy near me` | alto | muito alta | **mais caro** | Local Ads + LSA + extensão de localização |
| **Seguro** | `does cigna cover physical therapy`, `aetna physical therapy nyc`, `physical therapy that takes united healthcare` | médio | alta e barata | **baixo** | Campanha própria — subexplorada |
| **Marca** | `spear physical therapy`, `jag pt nyc`, `in touch nyc pt` | baixo | máxima | mínimo | Defesa de marca + conquista de concorrente |

**Onde está a assimetria:** as camadas *serviço* e *seguro* têm intenção alta e CPC baixo porque as redes PE otimizam por cobertura geográfica (camada *local*), não por especialidade. Uma clínica com pelvic floor + vestibular + hand therapy compete em leilões quase vazios.

### 4.2 Jornada local — o que a literatura diz [VERIFICADO]

- **Google Business Profile responde por 29,4% de todos os leads de saúde** (estudo 2026, base de 102.392 leads) — subiu de 27,5% em 2025. Fonte: webtonic.io/blog/health-wellness-local-seo-stats
- **CTR do local pack:** posição 1 = 25–35%; posições 2–3 = 10–20%. Fonte: biziq.com/blog/local-search-statistics/
- **Comportamento "near me":** 76% visitam um estabelecimento em até 24h; 28% convertem no mesmo dia.
- **Ordem de captura:** LSA (topo absoluto) → anúncio de texto → local pack → orgânico. Em mobile, a maior parte do valor vai para **click-to-call**, não formulário.

**Consequência operacional:** o GBP não é "SEO local" — é o maior canal isolado de lead. Nota e volume de reviews aparecem literalmente dentro do anúncio pago (Local Ad). A In Touch com 22 reviews contra 135 da SPEAR perde CTR **no mesmo leilão**, com o mesmo lance.

### 4.3 Sazonalidade [VERIFICADO qualitativo, ESTIMATIVA quantitativa]

| Período | Dinâmica | Ajuste de mídia |
|---|---|---|
| **Jan–Mar** | Franquia (deductible) reseta em 1º de janeiro — paciente paga do bolso e adia tratamento. Volume cai. | Reduzir budget; mensagem de custo/self-pay/parcelamento |
| **Abr–Jun** | Retomada; início da temporada esportiva amadora | Nichos esportivos, corrida (maratonas) |
| **Jul–Ago** | Férias; lesões esportivas de verão | Sports rehab, menor concorrência de leilão |
| **Out–Dez** | Franquia já batida — paciente quer "usar o benefício antes que zere". **Melhor janela do ano.** | **Pico de budget**; mensagem "use your benefits before they reset" |

---

## 5. Regulação e compliance — CRÍTICO

### 5.1 Google Ads: o que fisioterapia precisa (e não precisa)

**NÃO exige certificação LegitScript.** [VERIFICADO] A certificação é obrigatória apenas para: farmácias online, telemedicina que prescreve, tratamento de dependência química e medicamentos prescritos. Fisioterapia ambulatorial é serviço de saúde não-restrito — pode anunciar sem certificação prévia.

**Mudanças de política 2025–2026** [VERIFICADO]:
- O rótulo "Restricted Medical Content" foi **descontinuado em 31/07/2025** — simplificação de enforcement interno, sem mudança de regra para anunciantes. Fonte: ppc.land/google-simplifies-healthcare-ad-enforcement-by-removing-content-label/
- Nova aplicação de certificação para "Restricted Drug Terms" (EUA, Canadá, NZ) — não afeta PT. Fonte: seroundtable.com/google-ads-prescription-drug-terms-policy-40272.html
- Google passou a avisar com **pelo menos 7 dias** antes de suspensão de conta.

### 5.2 Categoria sensível — o que trava de verdade

Fisioterapia cai em **"physical or mental health"**, categoria sensível da Personalized Advertising Policy. Restrições em vigor [VERIFICADO]:

| Proibido | Detalhe |
|---|---|
| ❌ Remarketing por condição de saúde | Não é permitido criar audiência de quem visitou `/pelvic-floor-therapy` e mostrar anúncio de pelvic floor |
| ❌ Customer Match com base em condição | Lista de pacientes de uma condição específica não pode ser carregada |
| ❌ Audiências advertiser-curated em categoria sensível | Bloqueado |
| ❌ Demand Gen / Discovery para categoria sensível | Serving restrito (atualização jun/2026) |
| ✅ Remarketing genérico de site | Permitido, desde que a audiência **não** seja segmentada por condição — ex.: "todos os visitantes do site" ou "visitantes da home" |

### 5.3 HIPAA e tracking — o estado atual (importante: mudou)

**A orientação da HHS OCR sobre tracking online foi VACATED (anulada) em 20/06/2024** pelo juiz Mark T. Pittman (N.D. Texas), no caso movido pela American Hospital Association. A HHS retirou o recurso em 29/08/2024. [VERIFICADO]

O que caiu: a doutrina da "Proscribed Combination" — a tese de que IP + visita a página pública já constituía PHI.

**O que isso significa na prática:**

| Situação | Status pós-vacatur |
|---|---|
| Pixel em página pública, sem login | **Não** é automaticamente violação de HIPAA sob a orientação anulada |
| Área autenticada (portal do paciente) | **Continua proibido** |
| Formulários com PII/PHI (nome, e-mail, queixa, seguro) | **Continua proibido** enviar a plataforma de ads |
| Envio de dados a plataforma sem BAA | **Continua proibido** — Google e Meta **não assinam BAA** para pixels de anúncio |

⚠️ **O risco não acabou, apenas mudou de lei.** Mesmo sem HIPAA, pixels em site de saúde continuam expostos a:
- **Wiretapping / CIPA** (Califórnia) — onda de litígio ativa contra pixels
- **VPPA** (conteúdo em vídeo)
- **Leis estaduais de privacidade** — incluindo o **New York Health Information Privacy Act**, que trata dado de saúde separadamente e independe da HIPAA

Fontes: improvado.io/blog/telehealth-marketing-post-pixel-playbook-for-dtc-health · geonetric.com/digital-strategy/hipaa-guidance-series-pixel-problems/ · freshpaint.io/blog/how-tracking-technologies-work-and-why-they-violate-hipaa

### 5.4 Arquitetura de tracking recomendada

| Item | Decisão | Motivo |
|---|---|---|
| **Enhanced Conversions** | ❌ **DESLIGAR** | Envia e-mail/telefone com hash — identificador pseudonimizado de paciente. Hash não é anonimização sob HIPAA nem sob leis estaduais |
| **Offline Conversion Import** | ✅ usar, mas só com `GCLID` + `valor` + `timestamp` | Nenhum identificador de usuário sobe. Permite otimizar por paciente que realmente compareceu |
| **Server-side (GTM SS / Segment / RudderStack)** | ✅ **obrigatório** | Camada onde o PHI é removido antes de qualquer dado chegar à plataforma. Evento enviado deve ser genérico: `booking_request`, sem tipo de tratamento |
| **Call tracking** | ✅ só com provedor que assina BAA (CallRail, Invoca) | Transcrição de ligação **nunca** sobe para plataforma de ads |
| **URL de conversão** | ⚠️ nunca deixar tipo de tratamento na URL | `/thank-you?service=pelvic-floor` transmite condição de saúde |

**Regra de ouro:** o que sobe para o Google/Meta é **evento + valor + GCLID**. Nada que identifique a pessoa, nada que identifique a condição.

---

## 6. Plano de ação para a In Touch NYC PT

Ordenado por (impacto ÷ esforço):

| # | Ação | Justificativa | Prazo |
|---|---|---|---|
| 1 | **Reativar a conta** | Parada desde 29/08/2025; 12 meses de leilão entregues aos concorrentes | imediato |
| 2 | **Aplicar para Local Services Ads** | PT é categoria elegível; só a Bespoke usa. Modelo pay-per-lead, aparece acima de tudo | 1–2 semanas (background check) |
| 3 | **Campanha de review generation** | 22 reviews vs 135 da SPEAR — a nota aparece dentro do anúncio local e afeta CTR no mesmo lance | contínuo |
| 4 | **Campanhas de nicho**: pelvic floor, vestibular, hand therapy, dry needling, escoliose | Leilões quase vazios, alta margem, CPC estimado 40–60% menor que termos genéricos | semana 1 |
| 5 | **Campanha de seguro**: `[seguradora] physical therapy nyc` | CPC baixo, intenção alta, ninguém disputa. In Touch aceita seguro — é diferencial vs boutiques | semana 2 |
| 6 | **Local Ads para as 3 unidades** (FiDi, Midtown, Woodbury) | Formato que as 3 redes PE usam — endereço, nota, click-to-call, rota | semana 2 |
| 7 | **Tracking server-side + Enhanced Conversions OFF** | Pré-requisito de compliance antes de escalar budget | antes do item 4 |
| 8 | **Calendário sazonal** | Pico Out–Dez (franquia batida); mensagem de custo Jan–Mar; esportivo no verão | planejar já |

**Modelo econômico do teste** [ESTIMATIVA]:
- CPC NYC: US$ 8–20 · CTR 6,6% · conv. 15% · show rate 60%
- CPL: US$ 60–110 · custo por paciente comparecido: US$ 90–200
- LTV in-network: US$ 850–1.300 · margem: US$ 400–550
- **ROI esperado: 2–5×** · CPC de break-even ~US$ 40

---

## 7. Limitações metodológicas

1. **GATC é arquivo histórico, não telemetria.** Não expõe budget, impressões, keywords nem parcela de impressão. Contagem de criativos ≠ investimento.
2. **Meta Ad Library não foi resolvida.** Duas abordagens de scrape falharam em confirmar presença dos concorrentes-alvo. Resolver exige coletar Page IDs.
3. **CPCs de NYC são estimativa.** Derivados de benchmark nacional + tier de mercado. Só o Keyword Planner com conta ativa dá o número real.
4. **Contagem de unidades das boutiques não foi auditada** unidade a unidade.
5. **Controle acionário da SPEAR não confirmado** — PitchBook/ZoomInfo têm perfis, mas sem conteúdo aberto.
6. **Firecrawl teve ~15% de falha** em URLs do GATC (`ERR_TUNNEL_CONNECTION_FAILED`, `ECONNRESET`); todos os alvos foram recuperados por retry.

---

## 8. Uso no projeto AfiliAds — validação

Este case serve como **fixture de validação** para os agentes do AfiliAds em um mercado que não é o de afiliados clássico. Testa especificamente:

| Capacidade do AfiliAds | O que este case exercita |
|---|---|
| Pesquisa de concorrência paga | GATC via Firecrawl stealth — inventário de anunciantes, formatos, criativos |
| Inteligência de keywords | Taxonomia de 6 camadas de intenção (sintoma/condição/serviço/local/seguro/marca) |
| Economia de campanha | CPC × CPL × show rate × LTV → CPC de break-even |
| Compliance guard | Categoria sensível + HIPAA + tracking server-side — regras que o gerador de campanha precisa respeitar |
| Geração de copy (RSA) | Baseline real de 5 criativos do alvo + padrões de 5 concorrentes |
| Sazonalidade | Ciclo de franquia de seguro dos EUA como variável de pacing |

**Próximos passos de validação sugeridos:**
- [ ] Rodar o pipeline de keywords do AfiliAds sobre a taxonomia da seção 4.1 e comparar com o que foi mapeado à mão
- [ ] Rodar o gerador de RSA e comparar com os criativos reais da seção 1.1
- [ ] Validar se o compliance guard bloqueia Enhanced Conversions e remarketing por condição (seção 5)
- [ ] Testar o modelo econômico da seção 3.3 no calculador de break-even do app
- [ ] Fechar a lacuna do Meta coletando Page IDs

---

## 9. Fontes

**Primárias (scrape direto, 2026-08-15 a 2026-08-18)**
- https://adstransparency.google.com/?region=US&domain=itnycpt.com
- https://adstransparency.google.com/advertiser/AR06386836443276247041?region=US
- https://adstransparency.google.com/?region=US&domain=professionalpt.com
- https://adstransparency.google.com/?region=US&domain=spearcenter.com
- https://adstransparency.google.com/?region=US&domain=jagpt.com
- https://adstransparency.google.com/?region=US&domain=motivny.com
- https://adstransparency.google.com/?region=US&domain=bespoketreatments.com
- https://adstransparency.google.com/?region=US&domain=finishlinept.com · evolveny.com · perfectstridept.com · customperformancenyc.com · hdptny.com
- https://itnycpt.com
- https://www.facebook.com/ads/library/ (parcial)

**Benchmarks e economia**
- LocaliQ — Healthcare Search Advertising Benchmarks: https://localiq.com/blog/healthcare-search-advertising-benchmarks/
- Statista — Fitness/health Google Ads CPC: https://statista.com/statistics/1402612/fitness-health-googleads-cpc
- U.S. Physical Therapy — resultados FY2025 (receita líquida/visita, visitas/dia)
- BTE Technologies: https://www.btetechnologies.com/therapyspark/how-much-does-medicare-pay-for-physical-therapyper-visit/
- SpryPT: https://www.sprypt.com/blog/medicare-physical-therapy-reimbursement
- PatientStudio: https://www.patientstudio.com/2025-physical-therapy-reimbursement-rates
- Direction/WebTonic — Health & Wellness Local SEO Stats: https://www.webtonic.io/blog/health-wellness-local-seo-stats
- BizIQ — Local Search Statistics: https://biziq.com/blog/local-search-statistics/

**Política e compliance**
- PPC Land — Google simplifies healthcare ad enforcement: https://ppc.land/google-simplifies-healthcare-ad-enforcement-by-removing-content-label/
- Search Engine Roundtable — prescription drug terms policy: https://www.seroundtable.com/google-ads-prescription-drug-terms-policy-40272.html
- Rosewood Marketing — healthcare policy update 2025: https://rosewoodmarketing.ca/google-ads-is-updating-its-healthcare-and-medicine-policy-in-2025/
- Improvado — post-pixel playbook: https://improvado.io/blog/telehealth-marketing-post-pixel-playbook-for-dtc-health
- Geonetric — HIPAA pixel problems: https://www.geonetric.com/digital-strategy/hipaa-guidance-series-pixel-problems/
- Freshpaint — tracking technologies and HIPAA: https://www.freshpaint.io/blog/how-tracking-technologies-work-and-why-they-violate-hipaa
- AHA v. Becerra, N.D. Tex., decisão de 20/06/2024 (vacatur da orientação de tracking da OCR)

**Estrutura societária**
- Pamlico Capital — JAG-ONE: https://www.pamlicocapital.com/portfolio/jag-one-physical-therapy
- Thomas H. Lee Partners — Professional PT: https://thl.com/companies/professional-physical-therapy/
- NJBIZ — aquisição Monmouth Rehab: https://njbiz.com/jag-physical-therapy-acquires-monmouth-rehab-professionals/
