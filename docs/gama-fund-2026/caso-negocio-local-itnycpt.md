# AfiliAds além de afiliados — estudo de generalização com caso de referência

**Caso**: In Touch NYC Physical Therapy (itnycpt.com) — clínica de fisioterapia, 3 unidades, Manhattan e Long Island.
**Uso**: material de suporte para a candidatura ao Gama Fund 2026 (Monashees + Google AI Futures Fund), prazo 28/09/2026.
**Data da coleta**: 15–18 de agosto de 2026.
**Método**: crawl do site e do Google Ads Transparency Center, benchmarks públicos de mercado, inventário do próprio código.

Convenção de evidência ao longo do documento: **[V]** verificado por coleta direta ou fonte primária · **[E]** estimativa ou benchmark de terceiro · **[H]** hipótese minha.

---

## 1. Sumário executivo

O AfiliAds foi construído para uma pergunta: *como transformar uma oferta em uma campanha Google Ads verificável, sem queimar orçamento nem conta?* Esse motor tem 27 models, 58 rotas, 14 agentes e 480 testes, e **cerca de 70% dele não sabe que existe afiliado** — ele sabe que existe economia unitária, política de plataforma, página, campanha, experimento e decisão.

Este estudo usa uma clínica de fisioterapia em Nova York como caso de prova de que o motor generaliza, e — mais importante — para descobrir **onde ele não generaliza**, que é exatamente onde está o fosso defensável.

Três conclusões que mudam o enquadramento da candidatura:

**1. O caso é real e está sangrando.** A In Touch NYC parou de anunciar no Google em **29/08/2025** [V] e tem apenas 5 criativos históricos, todos texto. Seus concorrentes de private equity rodam 65–82 criativos em formato Local Ads. Ao mesmo tempo, a clínica tem **~100 páginas publicadas** e a matemática de aquisição fecha com folga: LTV de US$ 850–1.300 por paciente [E] contra custo por paciente de US$ 90–200 [E]. Existe um ativo de conteúdo construído e um leilão viável, e nada conecta os dois. Isso não é um problema de ferramenta de anúncio — é um problema de operação, que é o que o AfiliAds faz.

**2. A tese "otimizamos sua campanha melhor que você" tem prazo de validade — e você vai apresentá-la ao Google.** AI Max for Search entrou em GA em 15/04/2026 com auto-upgrade em setembro/2026; a migração de Local Services Ads para Performance Max pay-per-lead começa em agosto/2026, depreciando manual bidding e tCPA por vertical [V]. O Google está removendo sistematicamente as alavancas que um terceiro usaria para gerar alfa. **Posicionar o AfiliAds como camada de otimização é apostar contra o roadmap do investidor.**

**3. O que sobra é o fosso, e é maior.** O Google não resolve — e não vai resolver — a **qualidade e a procedência do sinal de conversão**. Numa clínica, a conversão acontece no telefone, o valor real só aparece quando o paciente comparece, e o dado de comparecimento vive num EMR de terceiro sob HIPAA. Um sistema que capture, qualifique, reconcilie e devolva esse sinal ao Google de forma conforme **melhora o desempenho da IA do Google em vez de competir com ela**, e fica dono do dado que o Google mais quer e menos tem. Essa é a mesma competência que o AfiliAds já exerce em afiliados — onde o sinal é postback de rede — aplicada a um domínio onde é muito mais difícil e muito mais valioso.

---

## 2. O caso diagnosticado: In Touch NYC Physical Therapy

### 2.1 O negócio

| Dimensão | Dado [V] |
|---|---|
| Unidades | Midtown (162 W 56th St #302), Financial District (111 John St STE 1460), Woodbury LI (65-77 Froehlich Farm Blvd STE 812) |
| Telefone | (212) 288-2988 — **único número para as três unidades** |
| E-mail | frontdesk@itnycpt.com |
| Equipe clínica | 3 fisioterapeutas: Keith Chan (PT, MPT, proprietário), Beth Simoes (MPT, CPI), Ian Fundal (DPT) |
| Modelo | In-network, one-on-one, sessões de 30–45 min, sem aides |
| Seguros aceitos | BCBS, Aetna, Cigna, UnitedHealthcare (+ Oxford Freedom e Metro), Medicare, EmblemHealth, Wellcare, MagnaCare, UniCare, No-Fault, Workers' Comp, self-pay |
| Diferencial declarado | Pilates clínico faturado como fisioterapia (não como add-on privado) — posicionamento raro e defensável |
| Stack | WordPress 7.0.4 + Elementor 4.2.0 + HubSpot (portal 51140363) + Trustindex (widget de reviews) |

### 2.2 O funil de aquisição — e onde ele vaza

Caminhos de conversão existentes [V]: link `tel:` no header e no hero, formulário "Request An Appointment" (hero e rodapé), e-mail do front desk, CTA da HubSpot ("CALL US").

O texto do formulário é literalmente: *"Please fill out this form and we will contact you about scheduling."*

**Não existe agendamento self-service.** Todo lead vira uma tarefa humana de retorno. Isso importa porque o benchmark do setor aponta **23% a 42% de chamadas perdidas** em horário comercial e **62% dos pacientes desligam sem deixar recado** [E — cifras circulam em material de fornecedores de IA de voz, tratar como ordem de grandeza]. Com um único telefone para três unidades e uma equipe de três clínicos que atendem em sessões de 30–45 minutos one-on-one, **não há quem atenda**. O gargalo de aquisição desta clínica não é tráfego — é capacidade de resposta.

### 2.3 Defeitos observáveis no ativo digital

Todos coletados na home em 18/08/2026 [V]:

| # | Achado | Evidência | Impacto |
|---|---|---|---|
| 1 | **Quatro contagens de review diferentes na mesma página** | badge "Over 50 5-star google reviews"; widget Trustindex "Based on **28 reviews**"; bloco "Patient Satisfaction **98%** Based on **500+ reviews**"; link "See what **50+** customers are saying" | Erosão de confiança no ponto de conversão. O "98% baseado em 500+ reviews" é claim não substanciado — exposição FTC e risco de reprovação de anúncio |
| 2 | **CTAs mortos** | "Neurological physical therapy → Learn More" e "Chronic Pain & Postural Issues → Learn More" sem destino; "INDIBA", "Midtown East" e "Areas We Serve" apontam para `#` | Serviços promovidos na home sem página de destino. Se virarem anúncio, é URL final quebrada |
| 3 | **Link com rótulo trocado** | O card "Neck pain" tem texto de âncora "Pelvic pain / Learn More" e aponta para `/pilates-for-neck-pain-relief/` | Bug de continuidade; polui sinal de relevância |
| 4 | **Duração da sessão inconsistente** | Texto diz "30-45 Min One-on-One Sessions"; o nome do arquivo da imagem ao lado é `45–60-Min-One-on-One-Sessions.png` | Copy e criativo divergentes — o tipo de erro que o Compliance Sentinel já pega hoje em presells |
| 5 | **Horários contraditórios** | Rodapé de navegação: "Mon–Fri 8:00–19:00, Sat 9:00–14:00". Midtown: "Mon\|Wed\|Fri 8:00–18:00, Tue\|Thu 8:45–15:00". FiDi **e** Woodbury: ambos "Tue\|Thu 11:00–19:00" — unidades a 50 km com horário idêntico | Horário errado no Google Business Profile derruba conversão de "near me" e afeta lead score de Local Services Ads |
| 6 | **Domínio misto nos links internos** | Canônico é `www.itnycpt.com`, mas links para `/what-we-treat/hip-and-knee-pain/` e `/pilates-for-neck-pain-relief/` usam `itnycpt.com` sem www | Salto de redirect; perde parâmetros de tracking em alguns cenários |
| 7 | **Autoria de dev exposta** | `twitter:data1: "jesus-dev"` | Cosmético, mas sinal de site entregue por agência sem revisão |

### 2.4 A arquitetura de conteúdo — onde está o dinheiro parado

O `firecrawl_map` retornou ~100 URLs [V]. Classificadas:

| Tipo | Quantidade aprox. | Exemplos |
|---|---|---|
| Páginas de serviço (`/services/*`) | 12+ | pelvic-floor-therapy, sports-rehabilitation, manual-therapy, workers-compensation, acupuncture, cupping, fall-prevention, personal-training, INDIBA |
| Páginas de condição (`/what-we-treat/*`) | 9 | back-pain-sciatica, shoulder-pain, hip-and-knee-pain, pelvic-pain, headaches, sports-injuries, foot-or-ankle, elbow-wrist-hand, balance-and-gait |
| Páginas de unidade e bairro | 10 | contact-us/midtown, /financial-district, /woodbury, /hells-kitchen, /chelsea-physical-therapy-nyc, /gramercy-park-physical-therapy, /physical-therapy-upper-west-side |
| **Páginas de seguro** | 5 | `/cigna-physical-therapy`, `/aetna-physical-therapy`, `/unitedhealthcare-physical-therapy-coverage`, `/does-medicare-cover-physical-therapy`, `/ghi-physical-therapy-faqs` |
| Blog clínico | ~50 | bursitis, patellar-tendinopathy, fibromyalgia, ataxia, dupuytren, bell's palsy, hip fractures… |
| **Conteúdo sem intenção comercial** | 7+ | `/colleges-for-physical-therapy`, `/schools-with-physical-therapy-assistant`, `/physical-therapy-interview-questions`, `/physical-therapy-soap-note-example`, `/plof-physical-therapy`, `/comt-physical-therapy`, `/physical-therapy-month` |

Três leituras acionáveis:

**a) O ativo de seguro existe e não é monetizado.** Há cinco páginas respondendo "meu plano cobre fisioterapia?" — e **zero campanhas de seguro rodando** [V]. A camada `does [seguradora] cover physical therapy` / `in-network pt manhattan` é de CPC baixo, intenção altíssima e praticamente desocupada pelas redes concorrentes, que compram cobertura geográfica. A clínica já tem "insurance accepted" na copy dos anúncios antigos [V] — falta virar campanha com página que já existe.

**b) A combinação condição × bairro está quase vazia.** Existem apenas 3 páginas desse tipo (`knee-pain-relief-midtown`, `pelvic-floor-therapy-midtown`, `sports-injury-rehab-midtown-east`) contra ~9 condições × ~6 áreas atendidas = **54 combinações possíveis**. É exatamente o que um gerador de páginas com guardrails produz bem — e exatamente onde o Google pune conteúdo gerado em massa sem valor próprio (*scaled content abuse*, política vigente desde março/2024). Ou seja: é uma oportunidade que **só existe com compliance embutido**, que é a tese do produto.

**c) Parte do blog trabalha contra o negócio.** Páginas sobre faculdades de fisioterapia, programas de PTA, perguntas de entrevista e exemplo de SOAP note atraem **estudantes e profissionais**, não pacientes. E páginas sobre Rett, Guillain-Barré, fibrose cística e Down são condições que uma clínica ortopédica ambulatorial de três pessoas em Manhattan **não trata** [H, mas fortemente sugerido pelo perfil da equipe]. Isso dilui autoridade tópica e, se algum dia virar destino de anúncio, cria um problema de compliance sério: anunciar tratamento que não se presta.

### 2.5 O leilão: o que os concorrentes fazem e ela não

Dados do Google Ads Transparency Center [V]:

| Anunciante | Criativos | Formatos | Status |
|---|---|---|---|
| Professional PT (PPT Management) | **82** | Local Ads (endereço + rating + call/directions) | Ativo |
| SPEAR Physical Therapy | **80** | Local Ads + **vídeo VAST/YouTube** + Display | Ativo |
| JAG-ONE (PT Administrative Services) | **65** | Display + Local | Ativo |
| MOTIVNY | 11 | Text + Local | **Ativo hoje** |
| Bespoke Treatments | 3 | **Local Services Ads (pay-per-lead)** | Ativo |
| **In Touch NYC** | **5** | 100% texto | **Parado desde 29/08/2025** |
| Finish Line, Evolve, Perfect Stride, Custom Performance, H&D | 0 | — | Nunca |

Professional PT e JAG-ONE são roll-ups de private equity (Thomas H. Lee Partners e Pamlico Capital, respectivamente) [V] com 100+ e 135+ unidades. **A batalha em "physical therapy near me" é vencida por cobertura geográfica, e uma clínica de 3 unidades não vence isso.** O que ela pode vencer é especificidade: pelvic floor, vestibular, hand therapy, Pilates clínico coberto por seguro — termos que **nenhum dos cinco grandes anunciantes usa nos criativos coletados** [V].

### 2.6 A economia fecha

| Métrica | Valor | Fonte |
|---|---|---|
| CTR médio Search, fisioterapia | 6,61% | [V] LocaliQ/WordStream 2025 (n=3.542 campanhas) |
| Taxa de conversão | 15,35% (média geral: 7,52%) | [V] idem |
| CPL médio nacional | US$ 32,79 | [V] idem |
| CPL ajustado para NYC | US$ 60–110 | [E] CPC de Manhattan roda 2–3× a média |
| Custo por paciente novo | US$ 90–200 | [E] aplicando show-rate de 55–70% |
| Receita líquida por visita | US$ 105,76 (FY2025) | [V] U.S. Physical Therapy, relatório público |
| Visitas por episódio | 8–12 | [E] |
| **LTV por paciente (in-network)** | **US$ 850–1.300** | [E] |
| **CPC de break-even** | **~US$ 40** | [E] contra CPC real estimado de US$ 8–20 |

Retorno bruto de 5–11×. Mesmo descontando ~50% de custo direto de prestação, a margem de contribuição por paciente fica em US$ 400–550 — de 2 a 5× o custo de aquisição. **Google Ads fecha a conta para fisioterapia em NYC melhor do que para a maioria das verticais de saúde.** É por isso que as redes rodam 82 criativos.

---

## 3. O mercado atrás do caso

| Dimensão | Valor | Fonte |
|---|---|---|
| Estabelecimentos de terapia (PT/OT/fono/audio) nos EUA | **50.883** | [V] ResearchAndMarkets, 05/2025 |
| Tamanho do setor | US$ 53 bi (2024) → US$ 70 bi (2030), CAGR 6,4% | [V] idem |
| Fragmentação | **Top 50 players = apenas 29% de share** | [V] idem |
| Receita média por clínica | US$ 871 mil/ano, margem 14–20% | [V] idem |
| Práticas independentes | ~45% do mercado de rehab | [V] WebPT |
| **Alvo endereçável real** | **~22 mil clínicas independentes** | [E] 45% aplicado ao universo |
| Gasto de marketing típico | 5–8% da receita ≈ **US$ 4.350/mês** | [E] a partir de US$ 871k × 6% |
| **Pool de gasto de marketing** | **~US$ 1,1 bi/ano** | [E] teto absoluto de wallet, não de software |
| Local advertising digital nos EUA (2026) | US$ 104,1 bi (+9,3% a/a) | [V] BIA Advisory Services |

**Quem atende hoje**: agências verticais caras e pouco tecnológicas — Practice Promotions cobra **US$ 1.800–3.200/mês**, Breakthrough PT a partir de **US$ 700/mês** para práticas de PT [V]. Plataformas horizontais de reputação (Podium US$ 399–999/mês, Birdeye US$ 299–449/local, Weave a partir de US$ 250) não entendem o funil de saúde — o Podium sequer cobre Healthgrades e Zocdoc [V]. Ferramentas de PPC (Optmyzr US$ 249–499/mês, Opteo US$ 129) falam com quem já sabe operar Google Ads, não com o dono da clínica.

**Ponto de entrada realista de preço**: US$ 300–800/mês por unidade [E]. Abaixo disso não paga o CAC de vender para SMB de saúde; acima, compete de frente com agência que oferece rosto humano.

**O risco que precisa ser dito**: churn de SaaS para SMB é de **3–7% ao mês** (31–58% ao ano) e **43% das perdas acontecem nos primeiros 90 dias** [V]. É o número que mata teses de vertical SaaS para SMB, e a resposta tem que estar no desenho do produto, não no discurso.

**Onde o capital está indo**: Assort Health levantou US$ 120M Série C a US$ 1,2 bi de valuation com IA de voz para telefone de clínica, 15.000 médicos, receita 20× em 15 meses [V]. Artera US$ 65M, Hello Patient US$ 22,5M — todos em **comunicação de paciente**, não em gestão de mídia. Isso é um sinal: **a dor aguda e paga do negócio local de saúde é o telefone, não o anúncio.** E o telefone é justamente o elo que falta para fechar o loop de sinal do anúncio.

---

## 4. O que já está construído

Inventário completo em 18/08/2026: **Next.js 14.2.35 + React 18 + Prisma 6.7 + NextAuth 4.24 + Vitest + Zod**. 27 models, 58 rotas de API, ~38 módulos em `lib/`, 56 arquivos de teste com 480 casos.

### 4.1 Camada de agentes — 14 agentes especializados

Registry em `lib/agents.ts`, encadeamento em `lib/agentSequence.ts`, orquestração em `lib/agentOrchestrator.ts`.

| Agente | Função | Transfere para negócio local? |
|---|---|---|
| `product-hunter` | Pesquisa oferta, gravity, payout, regra do 3× | **Não** — vira análise de serviço/procedimento |
| `seo-architect` | Universo de keywords em camadas A–D + negativas | **Sim, direto** — a taxonomia muda de camadas, não de mecânica |
| `compliance-sentinel` | Claims proibidos, políticas Google Ads, gate canal × tipo de página | **Sim, e é o mais valioso** — política de saúde do Google é mais rígida que a de afiliado |
| `market-intelligence-analyst` | Firecrawl em páginas de concorrentes + classificação estrutural | **Sim, direto** — foi literalmente o que usei neste estudo |
| `affiliate-page-analyst` | Lê termos do produtor, extrai comissão e canais permitidos | **Não** — vira leitor de contrato de seguradora / credenciamento |
| `atp-keyword-analyst` | Cruza AnswerThePublic com economia da campanha | **Sim** — troca EPC por margem por paciente |
| `cro-copywriter` | Gera RSA (15 títulos ≤30, 4 descrições ≤90) com termos proibidos | **Sim, direto** |
| `ads-auditor` | CPC real vs break-even → SCALE/OTIMIZAR/PAUSAR/KILL | **Sim** — troca break-even de payout por CAC vs LTV |
| `analysis-assistant` | Chat contextual sobre o dossiê | **Sim, direto** |
| `campaign-strategist` | Preenche os campos do Wizard com justificativa | **Sim, direto** |
| `presell-builder` | Escreve a página ponte completa, reescrevendo claims | **Sim** — vira gerador de página condição × bairro |
| `bridge-page-builder` | Roteiro de quiz e lead-gen | **Sim, e mais útil aqui** — triagem de paciente é quiz natural |
| `bridge-page-validator` | Revisa artefato de outro agente com modelo independente | **Sim, direto** |
| `wizard-validator` | Valida campos em tempo real | **Sim, direto** |

**11 de 14 agentes transferem.** Os dois que não transferem (`product-hunter`, `affiliate-page-analyst`) são substituíveis por equivalentes de domínio.

### 4.2 Camada de roteamento e governança de LLM — `lib/llm.ts` (920 linhas)

- **7 providers**: anthropic, openai, google, grok, ollama, kimi, abacusai (inativo). Cadeia de fallback por tier (`premium`/`standard`/`light`) com preferências por agente.
- **Vertex AI**: `callVertexMaas` roda Anthropic, Google e Grok via service account GCP — a integração concreta com o stack Google que o Gama Fund pede.
- **Locks de modelo** (`AGENT_MODEL_LOCKS`): `presell-builder` → Kimi K3, `bridge-page-builder` → Kimi K2.7-code. O validador roda em modelo diferente do gerador, por desenho.
- **Budget com reserva transacional** (`lib/llm-budget.ts`): reserva tokens antes da chamada, com retry em conflito de serialização Prisma P2034, e reconcilia o consumo real depois.
- **Preço por modelo** (`lib/llm-pricing.ts`): custo estimado gravado em `AgentRun.costUsd`.
- **SSRF guard**: `resolveKimiApiBaseUrl` e `resolveOllamaApiBaseUrl` validam host contra allowlist.
- **Campaign guard** (`lib/campaign-guard.ts`): campanha fora de `{RASCUNHO, EM_TESTE, ATIVA}` ou inativa há mais de 30 min não queima LLM.
- **BYOK**: chaves por usuário via model `Integration`, com `keySource` (`platform` | `byok`) registrado em cada run.

**Transfere 100%.** Nada aqui conhece o conceito de afiliado.

### 4.3 Camada Google Ads — API v25

`lib/google-ads.ts` + `lib/google-ads/` (client, ads, errors, experiments, experiment-reporting, mutation-guard, readiness, route-mutation-authorization) + `lib/google-ads-experiments/` (orchestration com 2.027 linhas, schemas, statistics, backfill).

Operações reais implementadas: criação de campanha completa (budget → campanha PAUSED → ad group → keywords → negativas → RSA), leitura de campanha, mutação de status e budget, sync de métricas, criação de experimento com braços controle/tratamento, aplicação de variação de final URL com releitura pós-mutação para confirmar, schedule/end/promote/graduate, relatório com snapshot diário e **z-test de duas amostras** para significância.

Controles de segurança:
- **`mutation-guard.ts`**: capability em runtime com `WeakSet` — não é possível forjar objeto de autorização. Exige cumulativamente customer ID no formato correto, resource name no escopo, `GOOGLE_ADS_MUTATIONS_ENABLED=true`, flag `confirmed` do chamador e customer ID na allowlist.
- **`route-mutation-authorization.ts`**: Zod com `confirmed: z.literal(true)`, optimistic locking por `revision` e `idempotencyKey`.
- **`readiness.ts`**: modos `PREPARE` (avisa) e `SCHEDULE` (bloqueia) — valida checklist crítico, URL final HTTPS sem credenciais, credenciais cadastradas, keywords com match type válido e termos proibidos.

**Transfere 100%.** Google Ads é Google Ads.

### 4.4 Camada de páginas — motor de presell

`lib/presell.ts` (~1.440 linhas) + 6 templates HTML (`advertorial`, `pogo`, `vsl`, `interstitial`, `authority`, `authority_v2`).

Blocos gerados por função: popup gate, cookie consent, script de tracking, GA4, GTM head/body, Meta Pixel, embed de vídeo, trust badges, faixa de benefícios, "como funciona", temas de feedback, grade de ingredientes, seção de pacote, badges de certificação e garantia — com biblioteca de ícones SVG inline.

Publicação em três destinos: **WordPress** (REST API, com criação idempotente das páginas de compliance por locale), **FTP** e **host próprio** (`app/p/[slug]`, que incrementa `Presell.views`). Tracking de clique via endpoint público `POST /api/presells/click`. Ranking de variantes (`rankPresellOutcomes`) realimenta gerações futuras com o que performou.

**Transfere quase 100%** — e o publicador WordPress é particularmente relevante, porque **o site do caso é WordPress** [V].

### 4.5 Camada de decisão determinística

| Módulo | O que faz | Transfere? |
|---|---|---|
| `campaign-rules.ts` | `computeEconomics` + `evaluateRules` → SCALE/OTIMIZAR/PAUSAR/KILL/CONTINUAR/SEM_DADOS/CONFIG_INCOMPLETA. Sem LLM | **Sim**, trocando EPC/break-even por CAC/LTV |
| `complianceVerifier.ts` (298 L) | Verificação por regex de disclosure, link de privacidade, claims banidos, com detecção de negação para evitar falso positivo | **Sim, e as regexes de saúde já servem** |
| `loop-engine.ts` | Loop autônomo: economia → regras → agentes → decisão. Compliance com item crítico rebaixa CONTINUAR/SCALE para OTIMIZAR | **Sim, direto** |
| `salesPageAnalyzer.ts` | Cheerio: detecta vídeo, quiz, lead-gen, advertorial, pitch direto → `SalesPageType` | **Sim** — vira classificador de página de clínica |
| `bridgePageRecommender.ts` | Regras ordenadas com `confidenceScore` para escolher o tipo de página ponte | **Sim** |
| `experiment-budget.ts` | Cálculo determinístico de orçamento de experimento | **Sim** |
| `campaign-strategy.ts` | Deriva estratégia coerente canal × tipo de página × funil | **Sim** |

### 4.6 Wizard de 9 etapas

`1 Oferta · 2 Break-even · 3 Anti-strike · 4 Pré-sell · 5 Keywords · 6 Naming · 7 Google Ads · 8 Tracking · 9 Go-live`

O conceito mais valioso e mais transferível do produto inteiro está aqui: **`CampaignChecklist.verificationType` distingue `auto` (o sistema prova) de `self_attested` (o usuário jura)**. As etapas 3, 4, 7, 8 e 9 chamam verificação automática via `complianceVerifier`. Isso é a espinha dorsal de qualquer produto que precise responder "por que você deixou isso ir ao ar?" — e num vertical de saúde essa pergunta tem consequência regulatória, não só financeira.

### 4.7 Dados

27 models Prisma. **Genéricos** (transferem quase 1:1): `User` (com metas de receita, ROI e budget), `Campaign`, `CampaignChecklist`, `Keyword`, `DailyLog`, `CampaignDecision`, `Integration`, `TestResult`, `LoopRun`, `AgentRun`, `UsagePayment`, `Presell`, `ChecklistLearning`, `MarketIntelSnapshot`, `BridgePageStrategyRecommendation`, `GoogleAdsExperiment` (+ Arm, Operation, MetricSnapshot), `HermesOutboxEntry`.

**Específicos de afiliado** (precisam ser reescritos): `Offer` (network, payoutCommission, gravityEpcRef, hopLink, breakevenCpc) e `ProductResearch` (gravity, avgPayout, commissionPct, rebill, hopLink, affiliatePageUrl).

### 4.8 Segurança de segredos

`lib/integration-secrets.ts`: AES-256-GCM com prefixo `enc:v1:`, detecção de campo sensível por nome (`/(key|secret|token|password)/i`), rollout em fases (`legacy-read` → `enforced`) e script de migração. 14 casos de teste.

### 4.9 Testes — 480 casos

Concentração: Google Ads Experiments ≈ 280 casos (58%), guardas de segurança (mutation-guard 11, route-authorization 7, campaign-guard 7, llm-guard 6, model-lock 6, budget 5, pricing 5, integration-secrets 6).

**Lacuna honesta**: não há teste dedicado para `loop-engine.ts`, `campaign-rules.ts`, `complianceVerifier.ts`, `presell.ts`, `rsa.ts`, `marketIntel.ts`, `clickbank.ts` nem `bridgePageRecommender.ts`.

---

## 5. Mapa de transferência: afiliado → negócio local

### 5.1 A tradução conceitual

| Conceito no AfiliAds | Equivalente na clínica | Onde vive hoje |
|---|---|---|
| Oferta (produto de afiliado) | Serviço/procedimento (pelvic floor, sports rehab, Pilates clínico) | `Offer`, `ProductResearch` |
| Comissão líquida | Margem de contribuição por episódio de tratamento | `Campaign.commission`, `refundPct` |
| Refund rate | **No-show rate + drop-off de tratamento** | `Campaign.refundPct` |
| EPC de break-even | Valor esperado por clique = CVR × margem por paciente | `campaign-rules.computeEconomics` |
| Hop link | URL de agendamento / número rastreado | `Presell.hopLink` |
| Postback da rede | **Conversão offline reconciliada com o EMR** | `lib/clickbank.ts` |
| Termos do produtor | Contrato de credenciamento da seguradora + escopo de prática | `affiliate-page-analyst` |
| Anti-strike (regras da rede) | **Política de saúde do Google + HIPAA + FTC + lei estadual** | Checklist etapa 3 |
| Presell / bridge page | Página condição × bairro, página de seguro, triagem | `lib/presell.ts` |
| Sales page do produtor | Página de agendamento / perfil Zocdoc | `salesPageAnalyzer.ts` |

**Nenhuma dessas traduções exige arquitetura nova.** Todas são substituição de semântica sobre estruturas que já existem. É por isso que a generalização é crível.

### 5.2 O que muda de verdade — e é aqui que está o trabalho

Três diferenças estruturais que **não** são renomeação:

**(1) A conversão não acontece no navegador.** Em afiliados, o clique leva à venda e o postback fecha o loop no mesmo dia. Numa clínica, o clique leva a uma ligação, que leva a um agendamento, que leva (ou não) a um comparecimento, que gera receita ao longo de 8–12 visitas. **O sinal que o Google precisa para otimizar chega dias depois e mora fora da web.**

**(2) O dado que fecha o loop é regulado.** O estado da lei em 2026: em **20/06/2024**, o juiz Mark T. Pittman (N.D. Texas), em *AHA v. HHS*, **anulou** a tese do OCR de que IP + visita a página pública sobre condição de saúde constitui PHI; o HHS **desistiu do recurso** em 29/08/2024 [V]. Isso liberou materialmente o funil não autenticado. Mas continua proibido enviar dados de área autenticada, formulários de intake e qualquer identificador junto de contexto de tratamento. E o Google **não assina BAA para Google Ads** [V].

Consequência operacional dura: **Enhanced Conversions for Leads é inutilizável** — ele funciona enviando e-mail e telefone hasheados, e hash não é de-identificação sob HIPAA. **Isso elimina o principal mecanismo de otimização de lance do Google para leads de saúde.** A única via conforme é offline conversion import com **apenas GCLID + valor + timestamp**, sem nenhum campo de usuário.

Some-se a isso: "saúde física ou mental" é categoria sensível na política de Personalized Advertising do Google — **proibido remarketing por condição e Customer Match de saúde**, e desde junho/2026 a restrição alcança Demand Gen e Discovery [V].

**(3) O risco migrou de HIPAA para litígio de privacidade.** Ações sob wiretapping/CIPA, VPPA e leis estaduais contra pixels em sites de saúde crescem, independentes da decisão do Texas, e Nova York tem o Health Information Privacy Act próprio [V].

**Leitura estratégica**: essas três diferenças são custo de entrada — e por isso mesmo são o fosso. Um concorrente que trate isso como detalhe de implementação entrega um produto que expõe o cliente a litígio. O AfiliAds já tem a arquitetura certa para isso: **guard determinístico com capability não-forjável**, que é exatamente o `mutation-guard.ts` aplicado a um novo domínio.

---

## 6. O que falta construir

Quatro ondas, ordenadas por dependência. As Ondas 1 e 2 melhoram o produto de afiliado também — não são desvio.

### Onda 1 — destravar o que já existe (2–3 semanas)

| # | Item | Onde | Por quê |
|---|---|---|---|
| 1.1 | Propagar autorização real para criação e mutação de campanha | `lib/google-ads.ts:238, :249, :372` — hoje `confirmed: false` hardcoded com `TODO(Tarefa 10)` | **`createGoogleCampaign` e `mutateGoogleCampaign` não passam pelo mutation guard hoje.** Só o caminho de experimentos tem autorização real. Estender `route-mutation-authorization.ts` com as operações `CREATE_CAMPAIGN` e `MUTATE_CAMPAIGN` |
| 1.2 | Verificação real de URL aprovada | `lib/google-ads/readiness.ts:101` | Hoje é só warning em `PREPARE`. Guardar hash do conteúdo aprovado no checklist e comparar antes de agendar |
| 1.3 | Testes para os módulos de decisão | `loop-engine.ts`, `campaign-rules.ts`, `complianceVerifier.ts`, `presell.ts` | São o núcleo do produto e têm zero teste dedicado. 58% dos 480 casos estão em Experiments |
| 1.4 | Expor `authority_v2` no Wizard | `app/(app)/wizard/page.tsx:476` vs `lib/presell.ts:332` | Template de 20 KB existe e não é alcançável pela UI |
| 1.5 | Remover provider morto e limpar dívida | `abacusai` fora de `ACTIVE_PROVIDERS`; `bridgePageRecommender.ts:86` marcado como placeholder | Higiene antes de mostrar o código a due diligence |

### Onda 2 — generalizar o domínio (4–6 semanas)

| # | Item | Descrição |
|---|---|---|
| 2.1 | Abstração `RevenueUnit` | Substitui `Offer`/`ProductResearch` por um conceito que comporta oferta de afiliado **e** serviço de clínica: ticket, ciclo de receita, margem, restrições regulatórias, canal permitido. Migração com adapter para não quebrar o produto atual |
| 2.2 | Agente `local-business-analyst` | Substitui `product-hunter`. Lê o site do negócio e extrai: unidades, horários, serviços, seguros aceitos, equipe e credenciais, canais de conversão. **Já provei que funciona — foi o que fiz neste estudo** |
| 2.3 | Agente `content-inventory-auditor` | `firecrawl_map` → classifica cada URL por intenção comercial → produz a matriz de lacunas (condição × bairro × seguro) e a lista de páginas sem valor comercial. **Também já provado neste estudo** |
| 2.4 | Taxonomia de keyword de 6 camadas | Estende `seo-architect`: sintoma / condição / serviço / local / **seguro** / marca, cada uma com match type e canal recomendado. A camada de seguro é a arbitragem que ninguém está explorando |
| 2.5 | `campaign-rules.ts` em modo CAC/LTV | Nova função de economia paralela a `computeEconomics`: custo por lead → custo por agendamento → custo por comparecimento → margem por episódio. Mesma máquina de decisão |
| 2.6 | Checklist de saúde na etapa 3 | Troca anti-strike de rede de afiliado por: escopo de prática, credenciamento, claims de tratamento, disclaimers de resultado, política de saúde do Google |

### Onda 3 — o fosso: loop de sinal conforme (6–10 semanas)

Esta é a onda que justifica a empresa.

| # | Item | Descrição |
|---|---|---|
| 3.1 | **`lib/phi-guard.ts`** | Guard determinístico, mesma arquitetura do `mutation-guard.ts` (capability em `WeakSet`, não-forjável), que **bloqueia qualquer payload contendo identificador pessoal antes de sair para plataforma de anúncio**. Fail-closed. É o artefato mais defensável do plano inteiro |
| 3.2 | Módulo `offline-conversions/` | Import de conversão para o Google Ads com **apenas GCLID + valor + timestamp**. Enhanced Conversions desligado **por política de código, não por configuração** — não deve haver caminho que o habilite |
| 3.3 | Ingestão de agendamento | Adapter para EMR/CRM de clínica (Prompt, WebPT) e para Zocdoc, reconciliando lead → agendamento → comparecimento → receita. **É aqui que está 70% do trabalho e todo o fosso** |
| 3.4 | Camada de telefone | Call tracking com BAA assinado, atribuição de ligação a campanha, e detecção de chamada perdida. O benchmark diz 23–42% de perda [E]; é o maior vazamento do funil |
| 3.5 | Adapter de Local Services Ads | Fisioterapeuta é categoria elegível [V]; o LSA é pay-per-lead, aparece acima de tudo e **não depende de tracking de conversão no site — contorna metade do problema de compliance**. Preparar para a migração LSA → PMax pay-per-lead que começou em agosto/2026 |

### Onda 4 — escala do ativo (paralela à 3)

| # | Item | Descrição |
|---|---|---|
| 4.1 | Gerador condição × bairro | Usa o motor de presell existente + publicador WordPress. **Com gate obrigatório de valor próprio por página**, para não cair em *scaled content abuse* |
| 4.2 | Página de seguro como campanha | Template dedicado a "seu plano cobre?" com verificação de elegibilidade — a arbitragem identificada no caso |
| 4.3 | GBP e reviews como infraestrutura de mídia | 29,4% dos leads de saúde vêm do Google Business Profile [V]; o rating alimenta o lead score do LSA. Não é canal separado, é insumo de campanha |
| 4.4 | Auditoria contínua de ativo | O que fiz na seção 2.3 — CTAs mortos, claims inconsistentes, horários divergentes — rodando como monitor, não como consultoria pontual |

---

## 7. Plano de análise com agentes e skills

O pipeline abaixo é executável hoje, com o que existe. Foi o que usei para produzir este documento — o que significa que a demo do produto é reproduzir isto dentro do app.

### Fase 1 — Diagnóstico do negócio (agentes 2.2 + 2.3, hoje manual)

```
entrada: URL do negócio
  → firecrawl_map            → inventário de URLs
  → firecrawl_scrape (home)  → unidades, serviços, seguros, equipe, stack, CTAs
  → classificação            → matriz condição × bairro × seguro + páginas órfãs
saída: dossiê do negócio (equivalente ao ProductResearch de hoje)
```

### Fase 2 — Inteligência competitiva (`market-intelligence-analyst`, existe)

```
entrada: vertical + geo
  → Google Ads Transparency Center por domínio concorrente
  → contagem de criativos, formatos, data de última exibição
  → extração de copy e ângulos
saída: MarketIntelSnapshot  (o model já existe)
```

Esta fase produziu o achado mais forte do estudo: a clínica está fora do leilão desde 29/08/2025 enquanto três redes rodam 65–82 criativos. **É diagnóstico que uma agência cobra US$ 3.000 para entregar e o agente entrega em minutos.**

### Fase 3 — Economia e viabilidade (`campaign-rules` em modo CAC/LTV, item 2.5)

```
entrada: ticket, ciclo, margem, CVR esperada, show-rate
  → CPC de break-even, CPC de escala, budget de teste
saída: gate de viabilidade  (segue ou não segue)
```

### Fase 4 — Keywords (`seo-architect` + `atp-keyword-analyst`, existem)

Camadas: sintoma / condição / serviço / local / seguro / marca. Filtro por CPC ≤ teto econômico. Negativas preventivas.

### Fase 5 — Compliance (`compliance-sentinel`, existe; + checklist de saúde, item 2.6)

Claims de tratamento, escopo de prática, política de saúde do Google, disclaimers. **Roda antes de qualquer gasto** — é o mesmo desenho fail-closed de hoje.

### Fase 6 — Ativos (`presell-builder` + `bridge-page-validator`, existem)

Página gerada, validada por modelo independente do gerador, publicada via WordPress REST — **que é o CMS do caso**.

### Fase 7 — Campanha e experimento (Google Ads v25, existe)

Campanha PAUSED, checklist de readiness, autorização explícita, experimento controle/tratamento com z-test.

### Fase 8 — Loop (`loop-engine`, existe)

Decisão SCALE/OTIMIZAR/PAUSAR/KILL com compliance rebaixando decisão positiva quando há item crítico aberto.

### Skills que já existem e se aplicam

`inteligencia-keywords-afiliados` (mecânica de camadas e priorização econômica transfere direto), `afiliado-google-ads-pro` (estrutura de campanha, RSA, negativas), `cacador-produtos-afiliados` (a lógica de scoring de oferta vira scoring de serviço). O que falta é uma skill de domínio local — **`negocio-local-google-ads`** — que encapsule a taxonomia de 6 camadas, o checklist de saúde e a matemática de CAC/LTV.

---

## 8. Como isso entra na candidatura ao Gama Fund

Respondendo às perguntas do guia oficial onde este estudo muda a resposta.

**"Qual o tamanho da oportunidade e como ela foi dimensionada?"**
A `analise-de-mercado.md` atual ancora tudo em software de affiliate marketing (US$ 2,1 bi, proxy admitidamente fraco). Este estudo adiciona um segundo mercado, dimensionado bottom-up e verificável: 50.883 estabelecimentos, ~22 mil independentes endereçáveis, US$ 4.350/mês de gasto de marketing por clínica, top 50 com apenas 29% de share. E é apenas **uma** vertical de negócio local — a mesma mecânica descreve dentista, quiroprático, clínica veterinária, estética.

**"Quem é o cliente ideal?"**
Mantém-se o beachhead de afiliados. O caso serve para provar que o beachhead é **entrada**, não teto — porque 70% do código já é agnóstico e 11 dos 14 agentes transferem.

**"Por que o próximo modelo não torna a empresa irrelevante?"**
Esta é a resposta que mais melhora. Nenhum modelo, por melhor que seja, resolve: reconciliar agendamento com EMR de terceiro, provar que um paciente compareceu, ou enviar esse sinal ao Google sem violar HIPAA e lei estadual de privacidade. O `phi-guard` (item 3.1) e o import de conversão offline (3.2) são **código determinístico e responsabilidade contratual**, não capacidade de linguagem.

**"Que dados, workflow ou distribuição tornam o negócio defensável?"**
O loop de sinal. Quem controla a reconciliação lead → agendamento → comparecimento → receita é dono do dado que o Google mais quer e menos tem, e **melhora o Smart Bidding do Google em vez de competir com ele**.

**"Onde os modelos Google se saem bem e onde ficam aquém no caso de uso?"**
Resposta honesta e específica, que é o que essa pergunta busca: Gemini via Vertex se sai bem em interpretação de página, política e copy — é o que roteamos hoje no tier standard. Fica aquém quando o output precisa ser contratualmente correto (schema de mutação da Ads API, cálculo de economia, decisão de gasto) — e por isso essas partes são código determinístico com guard fail-closed, não prompt.

**"Qual recurso direto do Google mais moveria a startup?"**
Acesso à equipe de Google Ads API e à política de saúde, para desenhar o import de conversão offline conforme; e créditos de Vertex para rodar a avaliação de agentes em escala.

### O ponto que precisa ser tratado de frente

O Google está absorvendo a camada de otimização de campanha: AI Max em GA desde 15/04/2026 com auto-upgrade em setembro/2026, LSA migrando para PMax pay-per-lead a partir de agosto/2026, depreciação de manual bidding e tCPA por vertical [V]. **Apresentar ao Google uma tese de "otimizamos campanha melhor que a IA de vocês" é apostar contra o roadmap de quem está avaliando.**

O enquadramento correto — e sustentado pela evidência deste estudo — é: *a IA do Google fica melhor quanto melhor for o sinal que recebe; nós somos a camada que produz sinal confiável e conforme em mercados onde a conversão não acontece no navegador.* Isso posiciona o AfiliAds como complemento estratégico, não como concorrente.

---

## 9. Riscos e respostas

| Risco | Gravidade | Resposta |
|---|---|---|
| **Churn de SMB: 3–7% ao mês; 43% das perdas em 90 dias** [V] | Alta — é o número que mata a tese | Onboarding que prove valor em menos de 30 dias (o diagnóstico da Fase 1–2 já é entregável de valor imediato). Preço por unidade, não por assento. Não perseguir clínica independente sem canal — priorizar grupos de 3+ unidades e parceria com EMR |
| Google absorve a camada de otimização | Alta | Reposicionar para loop de sinal (Onda 3). Não construir nada cuja única proposta seja ajustar lance |
| EMRs constroem o CRM internamente (Prompt já tem "Reach" e "Local") | Alta | Ser a camada de mídia + compliance que o EMR não quer construir, e integrar em vez de competir |
| Ausência de canal escalável de aquisição para clínica independente | Média-alta | Design partners primeiro. Não alegar PMF antes de piloto pago |
| Litígio de privacidade (CIPA/VPPA/NY HIPA) atingindo cliente | Alta se ignorado | `phi-guard` fail-closed, BAA próprio com a clínica, zero Enhanced Conversions por desenho de código |
| Diluição de foco: dois mercados, um time | **Alta** | Afiliado continua sendo o produto comercial. Negócio local é **prova de generalização e tese de expansão** na candidatura — não roadmap paralelo de execução até haver design partner pagante |
| Geração de páginas em massa punida por *scaled content abuse* | Média | Gate obrigatório de valor próprio por página gerada, no mesmo desenho dos checklists `auto` vs `self_attested` |

---

## 10. Conclusão

O caso da In Touch NYC não prova que o AfiliAds já atende clínicas — prova três coisas mais úteis:

1. **O diagnóstico já funciona.** Tudo na seção 2 foi produzido com agentes e ferramentas que o produto já tem. Um dono de clínica pagaria por esse relatório sozinho.
2. **O motor generaliza mais do que a narrativa atual assume.** 70% do código, 11 de 14 agentes, e a totalidade das camadas de Google Ads, LLM e páginas.
3. **Onde ele não generaliza é onde está o negócio.** A última milha — telefone, agendamento, comparecimento, conformidade — é 70% do trabalho e 100% do fosso. E é a parte que nenhum modelo melhor torna irrelevante.

Para a candidatura, o caso deve entrar como **evidência de que o beachhead de afiliados é entrada e não teto**, e como a base da resposta sobre defensibilidade. Não deve entrar como promessa de que a empresa vai atacar dois mercados ao mesmo tempo.
