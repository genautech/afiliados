# PROJETO: Doce Lucro Fit — Apresentação Executiva (Claude Cowork)

> **Instrução de uso:** Este documento é autocontido. Cole-o como briefing inicial
> no projeto do Claude (Cowork). Ele contém todo o contexto, os dados, as regras
> e o entregável esperado — sem depender dos arquivos locais da máquina.

---

## 1. Quem pede

Genau, fundador da **PROSPERA** — estúdio/operadora curada de produtos digitais.
Estamos lançando o primeiro de 10 infoprodutos low-ticket: um e-book chamado
**Doce Lucro Fit** (30 receitas de doces saudáveis para vender e faturar alto).

O estudo completo já foi feito por uma orquestração de agentes (pesquisa de
mercado com Firecrawl na Hotmart e fontes agregadoras, estrutura EBOOK-OS
validada com gate automatizado). Agora preciso de uma **apresentação executiva**
para mostrar o projeto internamente.

## 2. O entregável

UM arquivo único: `doce-lucro-fit-apresentacao.html` — slide deck navegável em
HTML puro, que abre offline com duplo clique, sem dependências externas exceto
Google Fonts (Archivo).

### Requisitos técnicos do deck

- Navegação: botões ← → , teclas ArrowLeft/ArrowRight, indicador "slide X de 10"
- Cada slide ocupa a viewport inteira (`height: 100vh`)
- Transição de fade simples entre slides (sem animações pesadas)
- Responsivo (funciona bem em tela cheia de notebook)
- Zero erros de sintaxe HTML/CSS/JS — validar antes de entregar

### Identidade visual PROSPERA (obrigatória)

| Token | Valor |
|---|---|
| Fundo | `#0B1220` |
| Card | `#121C2E` |
| Linha/borda | `#22334F` |
| Acento principal | `#00D5FF` (ciano) — nunca usar azul `#2962FF` |
| Verde (gates PASS) | `#3DDC84` |
| Âmbar (pendências) | `#FFC24B` |
| Texto | `#E7EEF9` |
| Texto secundário | `#93A5C1` |
| Fonte | Archivo (Google Fonts), fallback system sans-serif |
| Border-radius máximo | 14px |

Estilo geral: escuro, sóbrio, técnico. Eyebrow em uppercase com letter-spacing.
Títulos grandes e diretos. Sem gradientes decorativos, sem emojis nos títulos.

## 3. Os dados (use exatamente estes números)

### 3.1 Mercado brasileiro de infoprodutos (benchmark)

| Métrica | Valor |
|---|---|
| Faturamento acumulado Hotmart (desde 2011) | R$ 30 bilhões |
| Produtos digitais ativos | 380.000+ |
| Empregos gerados (creator economy) | 389.000 |
| Crescimento anual do setor | +30% a.a. |
| Brasileiros conectados à internet | 163 milhões (88%) |

Fontes: FGV · Hotmart 2026 · TIC Domicílios 2025.

### 3.2 Top 5 nichos por volume de vendas na Hotmart

| # | Nicho | Faixa de preço e-book | Subnichos quentes |
|---|---|---|---|
| 1 | Finanças e Negócios | R$27–97 | Renda extra · investimentos iniciantes · IA p/ negócios |
| 2 | Saúde e Bem-estar | R$29–97 | Dietas low-carb/keto · treinos em casa · saúde mental |
| 3 | Desenvolvimento Pessoal | R$47–147 | Produtividade · oratória · carreira |
| 4 | Marketing e Vendas | R$29–97 | Tráfego pago · copywriting · SEO |
| **5** | **Gastronomia ← escolhido** | R$37–67 | Doces para vender · receitas fit · panificação artesanal |

### 3.3 As 10 ideias avaliadas (projeções por lançamento)

| # | Produto | Nicho | Entrada / Bump / Upsell | Faturamento est. | ROI proj. | Status |
|---|---|---|---|---|---|---|
| **9** | **Doce Lucro Fit** | Gastronomia | R$47 / R$24 / R$167 | **R$ 76.500** | **206%** | **SELECIONADO** |
| 7 | Mestres do Prompt | Tecnologia/IA | R$67 / R$37 / R$247 | R$ 73.120 | 266% | Backlog v2 |
| 10 | Recomeço a Dois | Relacionamentos | R$57 / R$29 / R$297 | R$ 76.230 | 246% | Backlog v2 |
| 5 | Investidor Iniciante | Finanças | R$57 / R$27 / R$197 | R$ 75.330 | 242% | Backlog v2 |
| 1 | IA Lucrativa | Finanças/IA | R$47 / R$27 / R$197 | R$ 74.800 | 199% | Backlog v2 |
| 3 | Fábrica de Viral | Marketing | R$47 / R$27 / R$197 | R$ 74.800 | 199% | Backlog v2 |
| 6 | Renove-se aos 40+ | Saúde | R$47 / R$22 / R$177 | R$ 75.140 | 189% | Backlog v2 |
| 8 | Visibilidade Local | Marketing local | R$37 / R$19 / R$147 | R$ 70.440 | 152% | Backlog v2 |
| 2 | Mãe em Forma | Saúde/maternidade | R$37 / R$17 / R$147 | R$ 70.380 | 151% | Backlog v2 |
| 4 | Fluxo Imparável | Desenv. pessoal | R$27 / R$12 / R$97 | R$ 55.440 | 85% | Descartado v1 |

Premissas das projeções (colocar no rodapé do slide): order bump 25–35% ·
upsell 8–12% · CPC Meta/Google BR R$0,40–0,70 · conversão LP 1–3% · taxa
Hotmart ~10%. **Projeções são hipóteses dimensionadas por benchmark — nenhum
número é resultado próprio até a primeira venda real.**

### 3.4 Por que Doce Lucro Fit venceu (6 critérios)

1. **Produção mais rápida** — 10 capítulos estruturados; receitas verificáveis em cozinha doméstica
2. **Validação simples** — primeira vitória em ≤7 dias (produzir → fotografar → postar → vender)
3. **Baixa barreira de compra** — ticket R$47 dentro da faixa campeã do nicho (R$37–67)
4. **Diferencial claro** — subnicho "doces fit para vender" menos saturado que doces tradicionais
5. **Funil natural** — planilha de precificação como order bump resolve a dor nº 1 do público
6. **Compliance baixo risco** — sem claims de saúde agressivas que bloqueiam anúncios

### 3.5 O produto (ficha)

| Campo | Valor |
|---|---|
| ID | doce-lucro-fit · versão 0.1.0-rascunho |
| Nome | Doce Lucro Fit: 30 Receitas de Doces Saudáveis para Vender e Faturar Alto |
| Formato | E-book PDF |
| Público | Mulheres 25–55 buscando renda extra com culinária doméstica |
| Dor urgente | Renda extra acessível com baixo investimento; nicho tradicional saturado |
| Transformação | De fazer doces tradicionais sem precificar → produzir doces fit com margem calculada e primeiros clientes recorrentes |
| Mecanismo | Receitas testadas + planilha de precificação + guia de fotografia + divulgação orgânica Instagram/WhatsApp |
| Preços | Entrada R$47 · Order bump R$24 (planilha) · Upsell R$167 (mini-curso embalagens e vendas) |
| Primeira vitória | ≤7 dias: brigadeiro de whey produzido, fotografado, postado no WhatsApp e primeiro pedido recebido |
| Gate | EBOOK-OS: PASS (validate_product.py exit 0 — 0 falhas, 0 avisos) |

### 3.6 Estrutura do e-book (10 capítulos)

| Cap. | Título | Entrega ao leitor |
|---|---|---|
| 1 | Por Que Doces Fit? O Mercado Que Ninguém Te Contou | Comparação de margem tradicional vs fit |
| 2 | Sua Cozinha, Seu Laboratório: Ingredientes e Substitutos | Lista de compras base + substituições |
| 3 | Clássicos Fit: Brigadeiros e Beijinhos (8 receitas) | Primeiros doces testados com ficha técnica |
| 4 | Assados Fit: Brownies, Cookies e Barrinhas (8 receitas) | Doces individuais para encomenda |
| 5 | Sem Forno: Trufas, Palhas Italianas e Colher (8 receitas) | Doces rápidos sem equipamento |
| 6 | Geladas: Mousses e Sobremesas de Verão (6 receitas) | Linha sazonal de verão |
| 7 | Precificação: Como Cobrar Certo e Lucrar de Verdade | Planilha aplicada a 3 receitas |
| 8 | Fotografia de Doces com Celular | Fotos que sustentam venda |
| 9 | Divulgação no Instagram e WhatsApp | Rotina diária orgânica |
| 10 | Escalando: De Renda Extra a Negócio Lucrativo | Cardápio fixo + datas sazonais |

### 3.7 Orquestração de agentes (quem produziu este projeto)

```
Hermes (orquestrador)
 ├── Analista_Mercado_PROSPERA     → coleta Firecrawl com .origem.yaml
 ├── Copywriter_Ebook_PROSPERA     → copy gate-locked ao claim ledger
 ├── Designer_Visual_PROSPERA      → capa/banner com checklist objetivo (7 itens)
 ├── Fact_Steward_PROSPERA         → governa claims; humano aprova promoção
 └── Estrategista_Lancamento_LowTicket_PROSPERA → ORGANIC_ONLY primeiro;
     mídia paga só com campaign_guard exit 0
Genau = Product Editor humano em TODOS os gates
```

Pipeline de skills: texto (knowledge-scout → briefing → landing → voice → QA) ·
visual (design-tokens → cover → illustration → render PDF) · funil (offers →
ebook-funnel → affiliate-platform).

### 3.8 Gates e próximos passos

**✅ PASS (feito):**
- Pesquisa de mercado multi-fonte validada (Firecrawl, 2026-08-26)
- Estrutura EBOOK-OS completa criada (6 arquivos contratuais)
- validate_product.py exit 0 — 0 falhas, 0 avisos
- Matriz editorial completa (10 capítulos com ação observável e critério de conclusão)

**⏳ PENDENTE (próximos):**
- Testar as 30 receitas na cozinha (responsável humano)
- Promover claims C01–C03 de a-verificar → verificado (revisor humano)
- Fase 3: conteúdo do e-book completo (pipeline de texto + QA)
- Fase 4: capa (gate de 7 itens) + diagramação + render PDF
- Fase 5: landing page, order bump, e-mail de entrega, kit de afiliados próprio
- Fase 6: lançamento orgânico primeiro (experimento A/B, amostra mínima 500 visitantes/14 dias); tráfego pago somente após campaign_guard liberar

Backlog de próximos low-tickets: Mestres do Prompt (ROI proj. 266%), Recomeço a
Dois (246%), Investidor Iniciante (242%).

## 4. Os 10 slides obrigatórios

1. **Capa** — eyebrow "PROSPERA · ESTÚDIO DE INFOPRODUTOS", título "Doce Lucro Fit", subtítulo "Primeiro e-book low-ticket da fábrica · pesquisa de mercado validada". Badge verde: `EBOOK-OS: PASS · exit 0`.
2. **O mercado** — os 5 KPIs da seção 3.1 em cards. Nota discreta no rodapé: "Benchmark de mercado — não é resultado próprio".
3. **Top 5 nichos** — tabela da seção 3.2, linha Gastronomia destacada com tag "← produto escolhido".
4. **10 ideias avaliadas** — tabela da seção 3.3 com linha Doce Lucro Fit destacada (SELECIONADO). Premissas no rodapé do slide.
5. **Por que Doce Lucro Fit venceu** — grid com os 6 critérios da seção 3.4.
6. **O produto** — ficha da seção 3.5 (público, dor, transformação, preços, primeira vitória).
7. **Estrutura do e-book** — os 10 capítulos da seção 3.6 (tabela compacta).
8. **Orquestração de agentes** — visualização simplificada da seção 3.7 (não precisa ser diagrama complexo; colunas ou lista hierárquica funcionam).
9. **Gates e próximos passos** — dois blocos lado a lado (PASS verde vs PENDENTE âmbar) + timeline das fases 3–6.
10. **Encerramento** — "Fábrica PROSPERA: primeiro de 10 low-tickets", com os 3 candidatos do backlog e seus ROIs projetados.

## 5. Regras rígidas (não negociáveis)

1. **Não inventar nenhum número.** Todos os valores vêm deste briefing.
2. Projeções sempre marcadas como hipótese ("est.", "projeção") — nunca como resultado alcançado.
3. Nenhum claim de saúde agressivo ("emagreça", "cure"), nenhum depoimento fictício, nenhuma promessa de renda garantida.
4. Sem dependências externas além da Google Fonts Archivo.
5. Arquivo abre offline com duplo clique.
6. Validar o HTML antes de entregar (sem tags abertas, JS sem erro).
7. Ao final, reportar apenas: caminho do arquivo gerado + confirmação de que os 10 slides estão presentes.

---

*Briefing gerado pelo Hermes em 2026-08-26. Fonte dos dados: pesquisa Firecrawl
com registro .origem.yaml em ~/infoprod/dados/mercado/. Estrutura do produto
validada pelo PROSPERA EBOOK-OS.*
