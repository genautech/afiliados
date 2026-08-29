# PROMPT PARA CLAUDE CODE — Apresentação Doce Lucro Fit

Copie o bloco abaixo e cole no Claude Code (a partir de `~/afiliados`):

---

## Contexto

Você vai criar uma apresentação executiva em HTML (slide deck navegável) do projeto
PROSPERA — primeiro produto: **Doce Lucro Fit**, um e-book low-ticket de receitas
saudáveis para vender.

Os dados-fonte completos já existem nestes arquivos locais:

1. `/Users/genautech/afiliados/hermes/plans/doce-lucro-fit-estudos.xlsx`
   Planilha com 7 abas: Mercado BR, Nichos Top 5, 10 Ideias e Projeções,
   Doce Lucro Fit (ficha), Matriz Editorial, Claim Ledger, Orquestração de Agentes.
2. `/Users/genautech/afiliados/hermes/plans/doce-lucro-fit-resumo.html`
   Resumo executivo em página única (referência visual e de conteúdo).
3. `/Users/genautech/infoprod/produtos/doce-lucro-fit/product-brief.yaml`
4. `/Users/genautech/infoprod/produtos/doce-lucro-fit/editorial-matrix.csv`

Leia todos antes de escrever qualquer código.

## Identidade visual (obrigatória)

Use os tokens da marca PROSPERA definidos em
`/Users/genautech/infoprod/dna/prospera-marca-tokens.md`. Resumo:

- Fundo escuro `#0B1220`, cards `#121C2E`, linhas `#22334F`
- Acento principal ciano `#00D5FF` (nunca azul `#2962FF`)
- Verde `#3DDC84` para gates PASS, âmbar `#FFC24B` para PENDENTE
- Fonte Archivo (fallback system sans), zero border-radius grande (máx 14px)
- Texto `#E7EEF9`, muted `#93A5C1`

## Requisitos do entregável

Crie UM arquivo: `/Users/genautech/afiliados/hermes/plans/doce-lucro-fit-apresentacao.html`

Formato slide deck em HTML puro (sem dependências externas além da Google Fonts
Archivo). Navegação por setas ← → , teclado (ArrowLeft/ArrowRight) e indicador
de progresso. Cada slide ocupa a viewport inteira.

### Slides obrigatórios (nesta ordem)

1. **Capa** — eyebrow "PROSPERA · Estúdio de Infoprodutos", título
   "Doce Lucro Fit", subtítulo "Primeiro e-book low-ticket da fábrica ·
   Pesquisa de mercado validada com Firecrawl". Badge de gate:
   `EBOOK-OS: PASS · exit 0`.
2. **O mercado** — KPIs: R$30 bi Hotmart, 380 mil produtos, 389 mil empregos,
   +30% a.a., 163 mi conectados. Nota discreta: "benchmark, não resultado próprio".
3. **Top 5 nichos** — tabela dos nichos com Gastronomia (#5) destacada como escolhido.
4. **10 ideias avaliadas** — tabela com faturamento estimado e ROI; linha
   "Doce Lucro Fit" destacada (SELECIONADO); nota metodológica no rodapé.
5. **Por que Doce Lucro Fit venceu** — 6 critérios (produção rápida, validação
   simples, baixa barreira, diferencial claro, funil natural, compliance).
6. **O produto** — ficha: público, dor, transformação, preços (R$47 entrada /
   R$24 bump / R$167 upsell), primeira vitória ≤7 dias.
7. **Estrutura do e-book** — os 10 capítulos da matriz editorial (títulos +
   promessa local de cada um, resumido).
8. **Orquestração de agentes** — diagrama simplificado: Hermes orquestra
   Analista_Mercado → Copywriter_Ebook → Designer_Visual → Fact_Steward →
   Estrategista_Lancamento; Genau é o Product Editor humano em todos os gates.
9. **Gates e próximos passos** — dois blocos: PASS (validate_product exit 0,
   estrutura criada) vs PENDENTE (testar 30 receitas, promover claims, capa,
   landing, publicação). Linha do tempo das Fases 3–6.
10. **Encerramento** — "Fábrica PROSPERA: primeiro de 10 low-tickets" com os
    próximos 3 candidatos (Mestres do Prompt 266%, Recomeço a Dois 246%,
    Investidor Iniciante 242%) como backlog.

### Regras rígidas

- **NÃO inventar nenhum número.** Todos os valores vêm dos arquivos-fonte.
- Marcar projeções como hipótese ("est.", "projeção") — nunca como resultado.
- Não usar claims de saúde agressivas nem depoimentos fictícios.
- Sem animações pesadas; transição de fade simples nos slides está OK.
- O arquivo deve abrir offline direto no navegador (duplo clique).
- Ao final, valide abrindo o arquivo com um headless browser ou confirme que o
  HTML não tem erro de sintaxe, e reporte o caminho do arquivo gerado.

---

*Gerado pelo Hermes em 2026-08-26. Fonte dos dados: pesquisa Firecrawl com
.origem.yaml em ~/infoprod/dados/mercado/.*
