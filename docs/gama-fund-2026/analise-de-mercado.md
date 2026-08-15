# AfiliAds — análise de mercado para o Gama Fund

## Tese

AfiliAds ocupa a interseção entre affiliate operations, paid-media automation e geração de landing pages. O usuário hoje monta uma operação com planilhas, ChatGPT, WordPress/Elementor, um tracker, ferramentas de pesquisa e o painel do Google Ads. Cada ferramenta conhece apenas uma parte do problema. AfiliAds transforma esse stack fragmentado em um workflow verificável: oferta → estratégia → ativos → compliance → campanha → experimento → decisão.

## Problema

Operar campanhas de afiliados em mídia paga exige coordenar decisões que se afetam mutuamente:

- economia da oferta, payout, refund e CPC máximo;
- regras do produtor, canal permitido e brand bidding;
- intenção e custo das keywords;
- continuidade anúncio → bridge page → sales page;
- claims, disclaimers e políticas do Google;
- tracking, postback, publicação e integridade da URL final;
- criação segura da campanha e monitoramento de gasto;
- testes A/B e decisões kill/optimize/scale.

O operador precisa repetir esse processo para dezenas de campanhas, enquanto as regras de plataformas e ofertas mudam. O custo não é apenas tempo: um erro pode reprovar anúncios, comprometer uma conta ou queimar orçamento antes de existir aprendizado confiável.

## Cliente ideal

### Beachhead

1. Afiliado profissional que opera Google Search e múltiplas ofertas.
2. Pequena equipe de media buying com 10–100 campanhas simultâneas.
3. Agência que opera campanhas de afiliados ou performance para múltiplos clientes.

### Expansão

- afiliados iniciantes que precisam de processo guiado;
- produtores e redes que querem elevar a qualidade/compliance de seus afiliados;
- operações de performance em outros canais e mercados.

## Evidências de tamanho e crescimento

Os relatórios comerciais disponíveis divergem bastante sobre o tamanho da indústria de affiliate marketing; portanto, a candidatura não deve usar uma precisão falsa. Três sinais mais defensáveis são:

1. A categoria estreita de software de affiliate marketing foi estimada em US$ 2,1 bilhões em 2025 e projetada para US$ 9,8 bilhões em 2035, CAGR de 16,8%. É um proxy de categoria, não um TAM capturável integralmente pelo AfiliAds.
2. Hotmart e Teachable reportaram mais de US$ 10 bilhões de GMV acumulado, mais de 200 mil creators vendendo e 21 milhões de compradores em um ano. No Brasil, a Hotmart afirma que um em cada cinco brasileiros economicamente ativos já comprou de um creator.
3. Estudo FGV/Hotmart reportou mais de 389 mil ocupações diretas e indiretas na economia brasileira de produtos digitais, alta de 30% em doze meses.

### Dimensionamento proposto

- **TAM de categoria:** software de affiliate marketing, com o proxy externo de US$ 2,1 bilhões em 2025.
- **SAM inicial:** software operacional para afiliados e agências que compram mídia e precisam coordenar tracking, páginas, compliance e Ads. A contagem de operadores pagantes ainda precisa ser validada por entrevistas e dados de waitlist.
- **SOM:** deve ser apresentado como meta operacional, não como fato de mercado. Sugestão após validação: número de contas pagantes × ARPA por segmento, com cenários Starter, Pro e Agency.

Não usar um número bottom-up de SAM/SOM antes de validar a quantidade de operadores e o preço em pilotos pagos.

## Disposição a pagar observável

O stack adjacente mostra preços recorrentes significativos:

| Produto | Foco | Preço público observado |
| --- | --- | --- |
| Voluum | tracker e automação para media buyers | US$ 119/mês a US$ 7.999/mês em contratos anuais |
| RedTrack | tracking, CAPI e automação multicanal | plano de entrada comunicado a US$ 149/mês |
| Optmyzr | automação e operação PPC | a partir de US$ 209/mês |
| ClickFunnels | páginas e funis | US$ 97–297/mês nos planos mensais principais |
| Super Presell | plugin WordPress focado em presells | R$ 197–297/ano por pacotes de licença observados |

Isso valida duas extremidades: ferramentas simples e pontuais competem por preço baixo; plataformas que protegem e operam mídia em escala cobram centenas ou milhares de dólares por mês.

## Concorrência

| Categoria | Exemplos | O que resolvem | Lacuna que o AfiliAds explora |
| --- | --- | --- | --- |
| Tracking/attribution | Voluum, RedTrack, Binom, AnyTrack | cliques, conversões, roteamento, CAPI, relatórios | não transformam oferta e regras do produtor em campanha, copy e compliance completos |
| PPC operations | Optmyzr | automação, orçamento, auditoria e reporting em Ads | não conhecem payout, redes, presell, vendor terms e economics de afiliados |
| Funnel builders | ClickFunnels, Funnelish | criação de landing pages e funis | não decidem oferta, keyword, compliance e lifecycle de Google Ads |
| Presell builders | Super Presell, Flow Pages | geração rápida de presells | resolvem um artefato; não operam o ciclo completo nem criam um data flywheel de campanha |
| Stack manual | planilhas + ChatGPT + WordPress + Google Ads | flexível e barato no início | fragmentação, retrabalho, risco e pouca memória operacional |

## Vantagem competitiva

1. **Workflow vertical completo.** O produto conhece a sequência e as dependências de uma operação de afiliados, não apenas um artefato.
2. **IA com guardrails determinísticos.** LLM interpreta páginas, regras, contexto e copy; código determinístico calcula economia, readiness, estados e autorização de mutações.
3. **Compliance antes do gasto.** Vendor terms, brand bidding, claims, URL final e checklists fazem parte do fluxo, com fail-closed em ações sensíveis.
4. **Memória operacional.** ChecklistLearning, dossiês, snapshots de mercado e resultados de experimento alimentam futuras decisões.
5. **Google-native.** Vertex AI, Gemini, Google Ads API, GA4/GTM e Consent Mode estão no mesmo desenho de produto.
6. **Model-agnostic por resiliência.** O moat está no workflow, dados e avaliações; modelos podem ser roteados por custo, qualidade e independência.

## Por que agora

- LLMs reduziram o custo de interpretar páginas, políticas e contexto não estruturado.
- Vertex AI permite combinar modelos Google e parceiros por MaaS sem operar infraestrutura dedicada.
- Restrições de privacidade aumentam a importância de first-party data, postbacks e tracking server-side.
- Plataformas de anúncios e produtores endurecem compliance, elevando o custo do processo manual.
- A economia de creators e produtos digitais no Brasil já tem escala e crescimento mensuráveis.

## Estratégia de entrada no mercado

1. Waitlist segmentada em iniciante, operador profissional e agência.
2. Design partners com operação real; onboarding concierge para observar o workflow completo.
3. Primeiro valor: reduzir tempo e erros entre escolha da oferta e campanha PAUSED pronta para revisão.
4. Segundo valor: monitorar, aprender e recomendar kill/optimize/scale com evidência.
5. Conteúdo técnico e estudos de caso com foco em processo, não em promessas de renda.
6. Parcerias posteriores com comunidades, redes e agências.

## Riscos e respostas

| Risco | Resposta |
| --- | --- |
| Dependência de APIs e políticas | adapters, testes de contrato, readiness e operação fail-closed |
| “Wrapper de LLM” | dados estruturados, workflow proprietário, estados, avaliações e integrações reais |
| Falta de tração comercial comprovada | waitlist instrumentada e pilotos pagos antes de alegar PMF |
| Compliance em nichos sensíveis | human-in-the-loop, mutation guard, logs e regras determinísticas |
| Concorrentes adjacentes expandirem | profundidade vertical e velocidade do data flywheel |

## Fontes

- [Future Market Insights — affiliate marketing software](https://www.futuremarketinsights.com/reports/affiliate-marketing-software-market)
- [Hotmart — US$ 10 bilhões de GMV acumulado](https://press.hotmart.com/hotmart-company-announces-record-breaking-10-billion-in-global-creator-earnings)
- [FGV — 389 mil ocupações na economia brasileira de produtos digitais](https://portal.fgv.br/noticia/criacao-de-conteudo-digital-cresce-30-e-impulsiona-mercado-de-trabalho-brasileiro-aponta)
- [Voluum — preços e recursos](https://voluum.com/pricing/)
- [RedTrack — comparação pública](https://www.redtrack.io/redtrack-vs-voluum/)
- [Optmyzr — preços](https://www.optmyzr.com/pricing/)
- [ClickFunnels — preços](https://www.clickfunnels.com/pricing)
- [Super Presell](https://superpresell.top/)

