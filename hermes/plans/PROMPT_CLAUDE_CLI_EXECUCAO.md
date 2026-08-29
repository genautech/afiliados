# BRIEFING CLAUDE CODE CLI — ESTUDO DE MERCADO: 10 OPORTUNIDADES DE INFOPRODUTOS LOW-TICKET NO BRASIL

> **Como usar:** abra o terminal em `~/infoprod`, rode `claude` e cole este
> briefing inteiro como primeiro prompt.

---

## 1. ESCOPO (leia com atenção)

Este projeto é **apenas um estudo de mercado apresentável**. NÃO é produção de
e-book, NÃO tem gates de produto, NÃO tem claim ledger, NÃO tem restrições de
copywriting. É um trabalho analítico-comercial: pesquisa já realizada, dados
coletados e validados, que precisam virar uma **página HTML de apresentação**
(slides navegáveis) pronta para ser apresentada a stakeholders.

O objetivo do documento final: convencer uma plateia de que essas 10 ideias são
as melhores oportunidades low-ticket do mercado brasileiro hoje, mostrando
segmento, tamanho de mercado, concorrência, projeção financeira e estratégia de
cada uma.

### 1.1 Metodologia complementar — "Low Ticket Raiz"

Além dos dados quantitativos, cada ideia deve receber uma análise qualitativa
usando três conceitos:

1. **Dor Viva** — o incômodo mental constante da persona (não a dor óbvia).
   Para cada ideia, formular qual é a Dor Viva e onde ela aparece (comentários,
   buscas recorrentes). Ex.: para doces fit, a dor óbvia é "querer renda extra";
   a Dor Viva é "ver clientes pedindo versão saudável e não saber fazer".
2. **Oferta No-Brain** — avaliar se a compra seria por impulso: barreiras baixas,
   sem necessidade de o produtor aparecer, entrega imediata.
3. **Formato tangível** — além do PDF, que formato físico-digital aumentaria o
   valor percebido: Kit de Ferramentas, Planilha inteligente, Dashboard Notion,
   Arsenal de Prompts, Templates editáveis. Recomendar o melhor formato por ideia.

Cada ficha de ideia ganha um bloco "Low Ticket Raiz" com esses 3 campos + um
score de 1–10 em: Dor Viva (intensidade), Impulso de compra, Tangibilidade.

### 1.2 Validação pelas skills locais

Antes de finalizar o HTML, valide a qualidade analítica usando as skills já
instaladas no workspace (leia os SKILL.md correspondentes):

| Skill | Uso neste estudo |
|---|---|
| `~/infoprod/.agents/skills/hundred-million-offers/SKILL.md` | Avaliar a força da oferta de cada ideia (valor percebido, garantia implícita, mecanismo único) |
| `~/infoprod/.agents/skills/cro-methodology/SKILL.md` | Avaliar potencial de conversão do funil low-ticket de cada ideia |
| `~/infoprod/.agents/skills/storybrand-messaging/SKILL.md` | Verificar se a promessa de cada ideia posiciona o cliente como herói (e não o produto) |
| `~/infoprod/.agents/skills/marketing-council/SKILL.md` | Usar como checklist final de consistência do portfólio |

Saída esperada dessa validação: um score consolidado por ideia (Oferta 0–10 ·
Conversão 0–10 · Mensagem 0–10) exibido no slide da matriz risco × retorno,
e qualquer ajuste de recomendação de prioridade que os scores indicarem. Se um
score conflitar com a ordem atual, registrar a divergência no slide de metodologia.

## 2. ENTREGÁVEL

UM arquivo:
```
/Users/genautech/afiliados/hermes/plans/estudo-10-ideias-apresentacao.html
```

Slide deck navegável em HTML puro:

- 15 slides (especificados na seção 6)
- Navegação: botões ← → , teclas ArrowLeft/ArrowRight, indicador "X / 15"
- Cada slide ocupa a viewport inteira (`height: 100vh`)
- Transição fade simples
- Responsivo (1366×768 até 1920×1080)
- Abre offline com duplo clique; única dependência externa permitida: Google Fonts Archivo
- Zero erros de sintaxe — validar antes de entregar

## 3. ARQUIVOS-FONTE LOCAIS (leia antes de codar)

| Arquivo | Conteúdo |
|---|---|
| `/Users/genautech/afiliados/hermes/plans/doce-lucro-fit-estudos.xlsx` | Planilha com 7 abas de dados completos |
| `/Users/genautech/afiliados/hermes/plans/doce-lucro-fit-resumo.html` | Resumo executivo anterior — referência visual |
| `/Users/genautech/infoprod/dados/mercado/hotmart-nichos-top5.md` | Benchmark dos nichos coletado via Firecrawl |

## 4. IDENTIDADE VISUAL

Estilo: dark, sóbrio, consultoria estratégica. Sem emojis nos títulos, sem
gradientes decorativos.

| Token | Valor |
|---|---|
| Fundo | `#0B1220` |
| Card/painel | `#121C2E` |
| Linha/borda | `#22334F` |
| Acento principal | `#00D5FF` (ciano) — nunca azul `#2962FF` |
| Verde (positivo) | `#3DDC84` |
| Âmbar (atenção/médio risco) | `#FFC24B` |
| Vermelho suave (alto risco) | `#FF6B6B` |
| Texto | `#E7EEF9` |
| Texto secundário | `#93A5C1` |
| Fonte | Archivo (Google Fonts), fallback system sans-serif |
| Border-radius máximo | 14px |

## 5. OS DADOS COMPLETOS DO ESTUDO

### 5.1 Mercado brasileiro de infoprodutos (contexto macro)

| Métrica | Valor | Fonte |
|---|---|---|
| Faturamento acumulado Hotmart (desde 2011) | R$ 30 bilhões | FGV / Hotmart |
| Produtos digitais ativos na plataforma | 380.000+ | Hotmart 2026 |
| Empregos gerados pela creator economy | 389.000 diretos/indiretos | FGV |
| Crescimento anual do setor | +30% a.a. | Hotmart 2026 |
| Brasileiros conectados à internet | 163 milhões (88% da população) | TIC Domicílios 2025 |
| Mercado global de e-learning | US$ 279 bi até 2029 (+9,1% a.a.) | Mordor Intelligence |
| Profissionais digitais com faturamento 154% maior que carreira corporativa | — | FGV |

**Taxas das plataformas (impacto na margem):**

| Plataforma | Taxa por venda |
|---|---|
| Eduzz (venda direta) | 4,9% + R$ 2,49 |
| Kiwify | 8,99% + R$ 2,49 |
| Hotmart | 9,9% + R$ 1,00 |

### 5.2 Top 5 segmentos por volume de vendas (Hotmart)

| # | Segmento | Volume de buscas | Faixa de preço e-book | Subnichos quentes |
|---|---|---|---|---|
| 1 | Finanças e Negócios | Muito Alto | R$27–97 | Renda extra · investimentos iniciantes · MEI · IA p/ negócios |
| 2 | Saúde e Bem-estar | Muito Alto | R$29–97 | Dietas low-carb/keto/jejum · treinos em casa · saúde mental · pós-parto |
| 3 | Desenvolvimento Pessoal | Alto | R$47–147 | Produtividade · oratória · inteligência emocional · freelancers |
| 4 | Marketing e Vendas | Alto | R$29–97 | Tráfego pago · copywriting · SEO local · conteúdo viral |
| 5 | Gastronomia | Médio-Alto | R$37–67 | Doces para vender · receitas fit · panificação artesanal |

**Segmentos emergentes identificados:** Tecnologia/IA (prompt engineering),
Relacionamentos (casais em crise) — menor volume total, mas alta conversão e
pouca concorrência direta.

### 5.3 As 10 ideias — ficha completa

> Cada ficha inclui o bloco **Low Ticket Raiz** (Dor Viva · Oferta No-Brain ·
> Formato tangível) e os scores qualitativos que o Claude deve validar conforme
> a seção 1.1/1.2. Os scores abaixo são a hipótese inicial do Hermes — valide,
> ajuste se discordar e registre divergências.

#### IDEA 01 — IA Lucrativa (Finanças × IA)
- **Segmento:** Finanças e Negócios · subnicho Inteligência Artificial
- **Conceito:** "IA Lucrativa: 7 Hacks para Gerar R$3.000/mês com Ferramentas Gratuitas de IA"
- **Tamanho de mercado:** nicho nº 1 da Hotmart em volume; busca por "ganhar dinheiro com IA" em forte crescimento; ~75% dos usuários de negócios já usam IA
- **Preços:** entrada R$47 → bump R$27 → upsell R$197
- **Projeção:** 1.000 vendas · R$74.800 · ads R$25.000 · **ROI 199%**
- **Concorrência:** média · **Risco:** médio
- **Low Ticket Raiz:** Dor Viva = "ver todo mundo lucrando com IA e não saber por onde começar sem parecer mais um" · Oferta No-Brain = alta (ferramentas gratuitas eliminam objeção de investimento) · Formato tangível recomendado: **Arsenal de Prompts + Kit de Ferramentas** (não e-book puro)
- **Scores hipótese:** Dor Viva 8 · Impulso 8 · Tangibilidade 9

#### IDEA 02 — Mãe em Forma (Saúde × Maternidade)
- **Segmento:** Saúde · subnicho pós-parto
- **Conceito:** "Mãe em Forma: Guia de 15 Minutos de Exercícios e Dieta Flexível Pós-Parto"
- **Tamanho:** saúde nº 2 geral; subnicho maternidade menos concorrido
- **Preços:** R$37 → R$17 → R$147
- **Projeção:** 1.200 vendas · R$70.380 · ads R$28.000 · **ROI 151%**
- **Low Ticket Raiz:** Dor Viva = "olhar no espelho e não reconhecer o próprio corpo sem ter 1h livre para academia" · No-Brain = média (tema sensível pede confiança) · Formato: **Planner físico-digital de 15 min/dia**
- **Scores hipótese:** Dor Viva 10 · Impulso 6 · Tangibilidade 6

#### IDEA 03 — Fábrica de Viral (Marketing × Conteúdo)
- **Segmento:** Marketing · subnicho conteúdo para pequenos negócios
- **Conceito:** "Fábrica de Viral: 10 Modelos de Conteúdo Que Vendem no Instagram e TikTok"
- **Tamanho:** milhões de MEIs buscando alcance orgânico; TikTok Shop + Reels dominantes
- **Preços:** R$47 → R$27 → R$197
- **Projeção:** 1.000 vendas · R$74.800 · ads R$25.000 · **ROI 199%**
- **Low Ticket Raiz:** Dor Viva = "postar todo dia, ver 40 visualizações e ver o concorrente pior viralizar" · No-Brain = alta (resultado visível em dias) · Formato: **Templates editáveis + banco de ganchos**
- **Scores hipótese:** Dor Viva 9 · Impulso 8 · Tangibilidade 8

#### IDEA 04 — Fluxo Imparável (Desenv. Pessoal × Freelancers)
- **Segmento:** Desenvolvimento Pessoal · subnicho produtividade freelancer
- **Conceito:** "Fluxo Imparável: O Método Anti-Procrastinação para Freelancers Ocupados"
- **Tamanho:** desenvolvimento pessoal lidera em volume de títulos; home office consolidado
- **Preços:** R$27 → R$12 → R$97
- **Projeção:** 1.800 vendas · R$55.440 · ads R$30.000 · **ROI 85%** (menor do portfólio)
- **Low Ticket Raiz:** Dor Viva = "entregar tudo atrasado e ter medo de perder o cliente que sustenta a casa" · No-Brain = alta pelo preço · Formato: **Planner digital + timer method**
- **Scores hipótese:** Dor Viva 8 · Impulso 7 · Tangibilidade 5

#### IDEA 05 — Investidor Iniciante (Finanças × Investimentos)
- **Segmento:** Finanças · subnicho investimentos acessíveis
- **Conceito:** "Primeiros Passos no Investimento: Comece com R$100"
- **Tamanho:** finanças = nº 1 absoluto em volume na Hotmart
- **Preços:** R$57 → R$27 → R$197
- **Projeção:** 900 vendas · R$75.330 · ads R$22.000 · **ROI 242%**
- **Low Ticket Raiz:** Dor Viva = "dinheiro parado perdendo pra inflação e vergonha de admitir que não sabe investir" · No-Brain = média (medo financeiro exige autoridade) · Formato: **Planilha simuladora interativa**
- **Risco específico:** copy educativa apenas — nunca recomendação de investimento
- **Scores hipótese:** Dor Viva 9 · Impulso 6 · Tangibilidade 8

#### IDEA 06 — Renove-se aos 40+ (Saúde × Público 40+)
- **Segmento:** Saúde · subnicho metabolismo 40+
- **Conceito:** "Renove-se aos 40+: Jejum Intermitente + 50 Receitas Low-Carb Saborosas"
- **Tamanho:** público 40+ é faixa que mais compra infoprodutos; temas evergreen
- **Preços:** R$47 → R$22 → R$177
- **Projeção:** 1.100 vendas · R$75.140 · ads R$26.000 · **ROI 189%**
- **Low Ticket Raiz:** Dor Viva = "comer igual aos 30 e ganhar barriga; sentir que o corpo 'travou'" · No-Brain = média · Formato: **Cardápio rotativo + lista de compras pronta**
- **Scores hipótese:** Dor Viva 9 · Impulso 6 · Tangibilidade 7

#### IDEA 07 — Mestres do Prompt (Tecnologia × Prompt Engineering)
- **Segmento:** Tecnologia/IA · subnicho prompt engineering para não-programadores
- **Conceito:** "Mestres do Prompt: O Guia Definitivo para Comandos Perfeitos"
- **Tamanho:** segmento emergente, menor concorrência; 53% dos profissionais já usam IA
- **Preços:** R$67 → R$37 → R$247
- **Projeção:** 800 vendas · R$73.120 · ads R$20.000 · **ROI 266% — maior do portfólio**
- **Low Ticket Raiz:** Dor Viva = "usar ChatGPT como buscador e ver colega menos capacitado entregando 3x mais" · No-Brain = alta (aplicação imediata no trabalho no dia seguinte) · Formato: **Arsenal de 100+ prompts por profissão + comparador antes/depois**
- **Scores hipótese:** Dor Viva 9 · Impulso 9 · Tangibilidade 10

#### IDEA 08 — Visibilidade Local (Marketing × SEO Local)
- **Segmento:** Marketing · subnicho SEO local / Google Maps
- **Conceito:** "Visibilidade Local: Apareça no Google Maps e Atraia Clientes Perto de Você"
- **Tamanho:** ~46% das buscas Google têm intenção local; 15+ milhões de MEIs
- **Preços:** R$37 → R$19 → R$147 (+ back-end consultoria R$397)
- **Projeção:** 1.200 vendas · R$70.440 · ads R$28.000 · **ROI 152%**
- **Low Ticket Raiz:** Dor Viva = "concorrente pior aparecer primeiro no Maps e levar o cliente que é meu" · No-Brain = alta · Formato: **Checklist auditável + template de descrição otimizada**
- **Scores hipótese:** Dor Viva 8 · Impulso 7 · Tangibilidade 9

#### IDEA 09 — Doce Lucro Fit (Gastronomia × Doces Saudáveis)
- **Segmento:** Gastronomia · subnicho doces fit para vender
- **Conceito:** "Doce Lucro Fit: 30 Receitas de Doces Saudáveis para Vender"
- **Tamanho:** gastronomia nº 5; "doces para vender" recorrente na Hotmart
- **Preços:** R$47 → R$24 → R$167
- **Projeção:** 1.000 vendas · R$76.500 · ads R$25.000 · **ROI 206%**
- **Low Ticket Raiz:** Dor Viva = "cliente pedir versão fit e ter que dizer que não faz; ver confeiteira iniciante cobrando o dobro pelo mesmo brigadeiro" · No-Brain = alta · Formato: **Kit receitas + planilha de precificação automática**
- **Scores hipótese:** Dor Viva 7 · Impulso 8 · Tangibilidade 9
- **Status atual:** única ideia com estrutura EBOOK-OS validada (gate PASS)

#### IDEA 10 — Recomeço a Dois (Relacionamentos × Casais)
- **Segmento:** Relacionamentos · subnicho casais em crise
- **Conceito:** "Recomeço a Dois: 7 Ferramentas para Salvar seu Casamento"
- **Tamanho:** emergente, engajamento emocional altíssimo, pouca oferta séria
- **Preços:** R$57 → R$29 → R$297 (+ back-end R$600/h)
- **Projeção:** 900 vendas · R$76.230 · ads R$22.000 · **ROI 246%**
- **Low Ticket Raiz:** Dor Viva = "dormir de costas todas as noites sabendo que um dos dois vai desistir logo" · No-Brain = baixa-média (decisão emocional pesada, não impulsiva) · Formato: **Diário de casal guiado + cartas-modelo**
- **Scores hipótese:** Dor Viva 10 · Impulso 5 · Tangibilidade 7

### 5.4 Premissas metodológicas das projeções

- Conversão order bump: 25–35%
- Conversão upsell imediato: 8–12%
- CPC médio Meta/Google Brasil: R$0,40–0,70
- Taxa de conversão de landing page: 1–3%
- Taxa da plataforma (~Hotmart): ~10%
- Margem líquida estimada após taxas e ads: 60–75%

⚠️ Todas as projeções são **hipóteses dimensionadas por benchmark de mercado** — nenhum número é resultado realizado até a primeira campanha rodar.

### 5.5 Estratégia transversal de funil (vale para todas as 10 ideias)

```
Lead Magnet (grátis)
 └→ E-book Low-Ticket (R$27–67)          ← aquisição
     └→ Order Bump (R$12–37)             ← +30% ticket médio
         └→ Upsell Imediato (R$97–297)   ← +25% aceitação
             └→ Back-end (mentoria/comunidade R$297–597 ou recorrente)
```

Casos de referência pública: esteira "que vende todo dia" (Hotmart Cast) e
e-book que gerou R$100 mil na primeira semana (Hotmart Cast).

### 5.6 Matriz risco × retorno

| Ideia | ROI proj. | Concorrência | Risco de compliance | Prioridade sugerida |
|---|---|---|---|---|
| Mestres do Prompt | 266% | Baixa | Baixo | 🥇 Onda 1 |
| Recomeço a Dois | 246% | Baixa | Médio | Onda 2 |
| Investidor Iniciante | 242% | Alta | Médio-Alto | Onda 2 |
| Doce Lucro Fit | 206% | Média | Baixo | 🥇 Onda 1 |
| IA Lucrativa | 199% | Média | Médio | Onda 1 |
| Fábrica de Viral | 199% | Alta | Médio | Onda 3 |
| Renove-se aos 40+ | 189% | Alta | Médio | Onda 3 |
| Visibilidade Local | 152% | Baixa | Baixo | Onda 2 |
| Mãe em Forma | 151% | Baixa | Médio | Onda 3 |
| Fluxo Imparável | 85% | Alta | Baixo | Descartada v1 |

### 5.7 Categorização por segmento (agrupamento para os slides)

- **Finanças & Negócios (2 ideias):** IA Lucrativa · Investidor Iniciante — volume máximo de demanda, ROI médio 220%
- **Saúde & Bem-estar (2 ideias):** Mãe em Forma · Renove-se aos 40+ — evergreen, ROI médio 170%, atenção às políticas de ads
- **Marketing & Vendas (2 ideias):** Fábrica de Viral · Visibilidade Local — demanda de MEIs, ROI médio 176%
- **Emergentes de alta margem (3 ideias):** Mestres do Prompt (Tech/IA) · Recomeço a Dois (Relacionamentos) — baixa concorrência, ROI médio 256%
- **Produtividade (1 ideia):** Fluxo Imparável — ticket baixo, ROI 85%
- **Gastronomia (1 ideia):** Doce Lucro Fit — validação mais rápida do portfólio

## 6. OS 14 SLIDES

1. **Capa** — eyebrow "PROSPERA · ESTÚDIO DE INFOPRODUTOS", título "10 Oportunidades Low-Ticket no Brasil", subtítulo "Estudo de mercado completo · Hotmart + fontes agregadoras · coleta 2026-08". Badge ciano: "Pesquisa Firecrawl validada".
2. **O mercado brasileiro** — KPIs da seção 5.1 em cards grandes (R$30 bi, 380 mil produtos, 389 mil empregos, +30% a.a., 163 mi conectados). Rodapé discreto: "Benchmark — fontes públicas".
3. **Top 5 segmentos** — tabela da seção 5.2 com barras visuais proporcionais ao volume de buscas.
6. **Metodologia do estudo** — como foi feito: Firecrawl multi-fonte (Hotmart, Accio, Loja Integrada, RF Digital), registro de origem por dado, premissas das projeções + explicação dos conceitos "Dor Viva", "Oferta No-Brain" e "Formato Tangível". Transparência gera credibilidade.
7. **Panorama das 10 ideias** — tabela completa (produto, segmento, preços, faturamento est., ROI, scores Dor Viva/Impulso/Tangibilidade) ordenada por ROI.
8. **Matriz risco × retorno** — scatter plot em CSS/SVG: eixo X = risco consolidado (Oferta+Conversão+Mensagem), eixo Y = ROI, bolhas coloridas por segmento. Quadrante destaque: alto ROI + baixo risco.
9–13. **Um slide por segmento** (Finanças, Saúde, Marketing, Emergentes Tech/Relacionamentos, Gastronomia+Produtividade): fichas resumidas com bloco Low Ticket Raiz — Dor Viva em destaque (é o coração da venda), formato tangível recomendado, projeção e scores.
14. **Estratégia transversal e roadmap** — funil low-ticket→high-ticket (seção 5.5) + ondas de lançamento sugeridas ajustadas pelos scores validados (Onda 1 provável: Mestres do Prompt, IA Lucrativa, Doce Lucro Fit). Incluir divergências entre scores hipótese e validação pelas skills.
15. **Conclusão** — top 3 priorizadas com justificativa tripla (ROI + baixa concorrência + score qualitativo), backlog completo.

*(Total: 15 slides — atualizar indicador para "X / 15")*

## 7. CHECKLIST DE VALIDAÇÃO ANTES DE ENTREGAR

- [ ] Skills locais (hundred-million-offers, cro-methodology, storybrand-messaging, marketing-council) foram lidas e aplicadas como validação
- [ ] Scores consolidados por ideia presentes no slide da matriz risco × retorno
- [ ] Divergências entre scores hipótese e validação registradas no slide de metodologia
- [ ] Cada ficha de segmento traz a Dor Viva em destaque
- [ ] HTML abre sem erro de sintaxe
- [ ] 15 slides presentes, navegáveis por seta e teclado
- [ ] Todos os números conferem com a seção 5 deste briefing
- [ ] Projeções sempre acompanhadas de marcação "est." ou nota metodológica
- [ ] Tokens visuais corretos (ciano #00D5FF, nunca #2962FF)
- [ ] Scatter plot do slide 8 legível
- [ ] Abre offline com duplo clique
- [ ] Testado em 1366×768 e 1920×1080

Ao terminar, reporte apenas: caminho do arquivo criado + checklist confirmado.

---

*Estudo conduzido via Hermes Agent em 2026-08-26. Coleta: Firecrawl CLI +
busca web multi-fonte (Hotmart, Accio, Loja Integrada, RF Digital, FGV, TIC
Domicílios 2025, Mordor Intelligence). Registro de origem dos dados:
~/infoprod/dados/mercado/hotmart-nichos-top5.origem.yaml.*
