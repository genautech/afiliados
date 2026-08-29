---
name: afiliads-lowticket-workflow
description: Orquestra a criação, validação e publicação controlada de e-books low-ticket próprios com gates, claims verificáveis, copy anti-slop, design acessível e aprendizagem pós-lançamento.
metadata:
  short-description: Workflow para e-books low-ticket
  triggers: "marca-propria master workflow lowticket; criar infoproduto lowticket; workflow ebook marca-propria"
---

# Low-Ticket Master Workflow

Use esta skill quando o trabalho envolve decidir, criar, validar, lançar ou aprender com um e-book low-ticket dentro do framework EBOOK-OS. Ela coordena as decisões entre conteúdo, oferta, pesquisa, design, QA e distribuição; não transforma automaticamente um pedido de e-book em curso, software ou produto interativo.

## Princípios operacionais

- **Mentor provocador e específico:** desafie premissas, nomeie o problema real e mostre exemplos, evidências e artefatos. Evite conselhos genéricos.
- **Fato antes de afirmação:** toda promessa, número, comparação, resultado ou afirmação sensível precisa de fonte, contexto e status no registro de claims. Quando a evidência não existe, marque como hipótese ou remova.
- **Mostre, não diga:** prefira diagnóstico observável, demonstração, passo executável, critério de verificação e exemplo concreto.
- **Anti-AI slop:** elimine jargão vazio, clichês, urgência artificial, depoimentos inventados, dados sem fonte, repetição e layouts ou imagens genéricas. Copy e design devem ter decisões específicas para o público.
- **Gates são bloqueios reais:** não avance para a próxima fase quando o gate atual estiver reprovado. Registre decisão, evidência faltante, responsável e condição de reabertura.

## Artefatos mínimos

Ao conduzir um projeto, mantenha um brief, mapa de evidências, ledger de claims, decisão de formato, contrato de transformação, arquitetura editorial, sistema visual, checklist de QA, registro de distribuição e log de aprendizagem. Use o formato que melhor serve ao estágio, mas nunca substitua evidência por uma declaração de confiança.

Os contratos executáveis vivem em `frameworks/ebook-os/` e são validados por `frameworks/ebook-os/scripts/validate_product.py`:

| Arquivo | O que carrega | Quem preenche |
|---|---|---|
| `product-brief.yaml` | identidade do produto, público, promessa, preço, `produto.id`, `produto.versao` | analista de mercado + estrategista |
| `format-decision.yaml` | por que e-book (e não curso/software), formato e entregável | estrategista |
| `claim-ledger.csv` | todo claim com fonte, status e canais permitidos | **Fact Steward** |
| `editorial-matrix.csv` | capítulos, promessa por capítulo, evidência e artefato | copywriter |
| `production-raci.yaml` | responsável, aprovador e prazo por entrega | orquestrador |
| `experiment-card.yaml` | hipótese, métrica, gate de escala | estrategista |

O **Fact Steward** é o papel que decide se um claim entra no `claim-ledger.csv` como fato, inferência, promessa ou hipótese — nenhum outro papel promove claim sozinho. Exemplos preenchidos ficam em `frameworks/ebook-os/examples/valid/`.

### Ledger de claims

Para cada claim, registre: `id`, texto exato, tipo (fato, inferência, promessa, hipótese), fonte primária ou evidência, URL/identificador, data de acesso, contexto, nível de confiança, uso (conteúdo/copy/design) e decisão (`aprovada`, `revisar`, `rejeitada`). Não trate uma transcrição, tendência ou opinião como prova sem qualificação.

## EBOOK-OS: fases e gates

### Fase 0 — Decisão de formato

Classifique rigorosamente o produto. É e-book quando o valor principal é um conteúdo editorial consumível em leitura, com começo, meio e fim, exercícios/checklists como apoio e entrega em formato documental. Se o núcleo for aulas sequenciais, acompanhamento, software, automação ou interação contínua, reclassifique como curso, serviço ou aplicação.

**Gate:** público, transformação, modo de consumo e entrega são compatíveis com e-book; escopo fora do formato foi explicitamente excluído.

### Fase 1 — Intake e evidência

Colete público específico, contexto, dor, linguagem do público, formato, restrições, canais previstos, fontes primárias e critérios de sucesso. Abra o ledger de claims antes de escrever a promessa. Separe fatos observados, inferências e hipóteses.

**Gate:** brief preenchido, fontes rastreáveis e nenhuma claim crítica sem proveniência ou rótulo de hipótese.

### Fase 2 — Descoberta de problema e demanda orgânica

Valide o problema com pesquisa qualitativa: entrevistas, conversas, comunidades, comentários, buscas com intenção e evidências de comportamento. Procure frequência, custo da inação, linguagem literal, tentativas anteriores e sinais de disposição para agir. Tendência isolada não valida dor.

**Gate:** existe um problema recorrente, específico e relevante, sustentado por evidência qualitativa e uma hipótese clara de demanda orgânica.

### Fase 3 — Contrato de transformação e oferta

Defina a transformação verificável: de qual estado para qual estado, para quem, em quanto tempo ou por qual marco, usando qual mecanismo e com quais limites. Estruture a oferta com dor urgente, consumo rápido, resultado numerado/datado quando honesto, headline magnética, promessa clara, CTA forte e escopo explícito. Ancore os claims da oferta no ledger.

**Gate:** um leitor consegue entender o resultado e como verificá-lo; a oferta não promete controle sobre fatores externos nem usa garantia, prova ou escassez inventada.

### Fase 4 — Arquitetura editorial executável

Projete o e-book capítulo a capítulo no ciclo **diagnóstico → decisão → ação → verificação**. Cada capítulo deve responder a uma pergunta, reduzir uma incerteza e terminar com um próximo passo observável. Inclua exemplos, critérios de conclusão, checklists e pontos de retorno quando isso acelerar a execução.

**Gate:** a sequência leva ao contrato de transformação, o leitor sabe o que fazer e como conferir o resultado, e não há capítulos decorativos.

### Fase 5 — Produção de conteúdo e copy

Escreva a partir de claims aprovadas, preservando a distinção entre fonte e interpretação. Faça revisão factual, editorial e de voz. Use linguagem direta, concreta e brasileira; corte abstrações, redundâncias, moralismo, jargão e frases que poderiam servir a qualquer produto. A copy da landing, e-mails e CTAs deve refletir a mesma transformação e limites do e-book.

**Gate:** claims críticas conferidas, fontes citadas no lugar adequado, copy específica e revisão anti-slop concluída.

### Fase 6 — Sistema visual e diagramação

Defina direção de arte, tokens de cor/tipografia/espaçamento, hierarquia, componentes, templates e regras de imagem antes de diagramar em escala. O visual deve reforçar a ideia e a ação, não simular autoridade. Verifique contraste, legibilidade, ordem de leitura, texto alternativo, links, navegação e demais requisitos relevantes de WCAG AA. Evite gradientes, mockups, ícones e ilustrações genéricos usados sem função.

**Gate:** sistema consistente, arquivo exportável e acessível, testes em desktop/mobile/leitor de PDF concluídos e nenhum bloqueio visual ou factual.

### Fase 7 — QA de produto e pré-venda orgânica

Faça teste cego com leitores que representem o público: observe compreensão, execução, pontos de abandono e interpretação da promessa sem explicar o material. Teste a landing page organicamente, prepare FAQ, suporte, onboarding, entrega e tratamento de dúvidas. Registre falhas por severidade e corrija antes de publicar.

**Gate:** leitores conseguem executar o caminho principal, a entrega ponta a ponta funciona e a landing não depende de tráfego pago para provar que o problema existe.

### Fase 8 — Publicação controlada e distribuição orgânica

Publique em audiência própria, e-mail e SEO, conforme o escopo aprovado. Teste ponta a ponta: captura, checkout, pagamento, entrega, links, suporte, analytics e reembolso. Faça mudanças controladas e registre hipótese, métrica e janela de observação. Antes de qualquer campanha paga, a atividade deve passar pelo `campaign_guard.py`; se o script não existir, falhar ou não autorizar a campanha, não iniciar tráfego pago.

**Gate:** fluxo técnico testado, canal permitido, instrumentação mínima funcionando e plano de observação definido.

### Fase 9 — Aprendizagem e portfólio

Registre vendas, ativação, consumo, conclusão, suporte, reembolsos, feedback qualitativo, objeções, claims que falharam e variações de mensagem. Separe problema de oferta, produto, canal e tracking. Transforme aprendizados comprovados em atualizações de templates, critérios e próximos produtos; não generalize a partir de uma amostra pequena.

**Gate:** retrospectiva documentada, decisões ligadas a dados/evidências e backlog de atualização priorizado.

## Oferta e tráfego low-ticket

Use a oferta como uma ponte entre dor urgente e ação de baixo atrito. O preço não compensa uma transformação vaga. Valide organicamente antes de comprar alcance; use dados para localizar gargalos de mensagem, página, checkout, entrega e ativação. Em testes A/B, mude uma hipótese relevante por vez, defina métrica e janela antes do teste e não declare vencedor com amostra insuficiente. Renovação contínua de criativos deve responder a aprendizados reais, não a variações cosméticas infinitas.

Toda atividade de campanha paga requer validação pelo `campaign_guard.py`, além de orçamento, criativo, tracking, destino e critérios de parada claramente registrados.

## Aprendizado incorporado dos vídeos de benchmark

Os vídeos registrados em `research/youtube-lowticket-2026-08-26/` reforçam um pré-fluxo para oportunidades: **minerar → avaliar demanda e saturação → escolher um entregável viável → modelar com distância real → demonstrar o produto → testar o funil → medir antes de escalar**. Use o `insights-lowticket.md` quando o pedido envolver mineração de oferta ou modelagem.

Trate os critérios narrados nos vídeos — volume de anúncios, idade aparente da oferta, faixa de preço, CPC e resultado financeiro — como benchmarks externos e hipóteses de teste. Eles não são prova da marca. Toda oportunidade deve preencher o scorecard com fontes e passar pelo teste de originalidade: novo ângulo, público, mecanismo ou situação de uso; trocar palavras não é diferenciação.

Antes de avançar para produção, confirme que o entregável é executável, demonstrável, legalmente utilizável, acessível e compatível com e-book. A unidade de validação é a oferta completa (mensagem, criativo, landing, checkout, entrega, tracking, ativação e suporte), não apenas o arquivo PDF.

## Transcrições e áudios como material de origem

Conteúdo do YouTube, usando `youtube-content` ou ferramenta equivalente, e áudios podem alimentar a base de conhecimento e a pesquisa de um produto. Preserve sempre URL, título, autor, data, origem, permissões/limites de uso, arquivo ou identificador da transcrição e o texto bruto antes da síntese. Diferencie transcrição de fato verificado: extraia claims, confira trechos importantes em fontes primárias e cite a proveniência no ledger. Não trate cortes, opinião do apresentador ou contexto omitido como evidência suficiente.

## Benchmark operacional de low-ticket de venda direta

Réguas de campanha derivadas do preço, não fixadas em reais. Todo teto é uma fração do
ticket; trocar o preço recalcula a régua inteira.

| Métrica | Régua | Em R$ 47 | Em R$ 67 |
|---|---|---|---|
| Custo por pageview da landing | ≤ 4% do ticket | R$ 1,88 | R$ 2,68 |
| Custo por início de checkout | ≤ 23% do ticket | R$ 10,81 | R$ 15,41 |
| CPA excelente | ≤ 45% do ticket | R$ 21,15 | R$ 30,15 |
| CPA limite | ≤ 50% do ticket | R$ 23,50 | R$ 33,50 |
| ROAS de front-end | ≥ 2,0 | — | — |
| Conversão da landing (compras ÷ pageviews) | ≥ 10% | — | — |
| Teto de escala diária | 10× o ticket | R$ 470/dia | R$ 670/dia |

**A conversão de 10% é de venda direta, não de captura.** Landing de low-ticket que vende
no primeiro contato converte pageview em compra na casa de 10–12%; 5–7% é fraco e abaixo
de 5% é crítico. Não importe a régua de 1–3% de página de captura ou de lançamento: ela
subestima o funil por um fator de cinco e reprova ofertas viáveis.

Leitura cruzada para localizar o gargalo antes de mexer em qualquer coisa:

| Custo/pageview | Custo/checkout | Diagnóstico |
|---|---|---|
| ok | ok | Funil saudável — o gargalo é escala, não conversão |
| alto | ok | Criativo e tráfego: o clique está caro |
| ok | alto | Página de vendas fraca: chega gente, não inicia compra |
| alto | alto | Funil quebrado — revisar tudo antes de aumentar verba |

Dia com entrega e sem venda **não tem CPA nem ROAS**. Registre ausência de dado, nunca
zero: zero entra na média como se fosse um dia excelente.

Derivada útil na triagem de oportunidade: o custo por pageview de 4% do ticket, com taxa
de carregamento de 80% (hipótese; meça a sua), exige **CPC ≤ 3,2% do ticket**. Compare com
o CPC medido do nicho — é o teste mais barato de viabilidade antes de qualquer produção.

### Procedência

`github.com/wallaceleite/painel-meta-ads-low-ticket`, commit `7c1cda9` de 2026-08-24,
público e **sem arquivo de licença** — os números servem como referência externa, o código
não pode ser copiado sem permissão do autor. Perfil `low_ticket_venda_direta`, definido em
`lib/metrics.js` e `lib/benchmarks.js`.

Riscos registrados: o próprio repositório mantém **dois tetos diferentes** para custo por
checkout (23% na tabela de benchmark, 33% na matriz de diagnóstico) — use 23% para aprovar
e 33% para diagnosticar, e diga qual está usando. Os valores são benchmark de mercado, não
medição da marca: entram no ledger como hipótese com fonte, e só viram fato depois da
primeira campanha medida.

## Integração futura com GitHub

Manter esta seção como ponto de extensão para análise de repositórios relacionados a produtos low-ticket, agentes de automação de YouTube, monetização de listagem de serviços e oportunidades de ganhos online. Quando esses repositórios forem analisados, registre repositório, commit/data, licença, capacidades, riscos e evidências. Os achados poderão informar novos tipos de produto, estratégias e integrações de agentes, mas não devem virar promessa comercial sem validação independente.

Analisados até aqui: `wallaceleite/painel-meta-ads-low-ticket` (`7c1cda9`, 2026-08-24, sem licença) — benchmarks operacionais incorporados na seção acima.

## Obsidian e metodologia Human/Machine

Documente e vincule o conhecimento gerado ou usado por esta skill no vault `/Users/genautech/EMAI Starter Vault`. Siga a metodologia Human/Machine: preserve a decisão e o julgamento humano, explicite o que foi pesquisado ou sintetizado pela máquina, mantenha links entre brief, fontes, claims, decisões e resultados, e deixe claro o que ainda precisa de verificação. Prefira notas atômicas com propriedades de origem, data, status e relação com o produto; não sobrescreva evidência original com um resumo sem rastreabilidade.

## Saída esperada ao usar a skill

Entregue a decisão de formato, o status de cada gate, os artefatos produzidos, claims pendentes, riscos, próximos passos executáveis e critérios de verificação. Se um gate falhar, diga exatamente o que bloqueia o avanço e qual evidência ou mudança o desbloqueia. Se o pedido for apenas uma fase, aplique os princípios e gates relevantes sem inventar que o restante foi validado.
