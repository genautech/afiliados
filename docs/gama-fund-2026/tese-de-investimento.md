# AfiliAds — tese de investimento e defesa do CEO

Formato: memo de comitê de investimento. Status: tese factual com pontos que dependem de confirmação do founder.

## Recomendação

**Avançar para entrevista, condicionado à formalização da newco/IP e aos primeiros sinais comerciais.** O founder confirmou dedicação de 50 horas semanais e transição imediata.

AfiliAds ataca um workflow caro, fragmentado e mensurável com uma arquitetura em que IA é estrutural: modelos interpretam contexto aberto; software determinístico controla dinheiro, compliance e mutações. O produto funcional e a execução técnica reduzem risco de construção. A experiência anterior do founder na Yoobe reduz risco de execução empresarial. O risco dominante agora é comercial e organizacional, não técnico.

## Por que esta empresa pode ser grande

O ponto de entrada é afiliados em Google Search, mas o ativo construído é mais amplo: um control plane para transformar sinais de oferta e mercado em campanhas, ativos, experimentos e memória. Se funcionar, a unidade de expansão não é apenas o usuário; são mais campanhas, contas, geos, canais e equipes por cliente.

O produto vive na interseção de três orçamentos já existentes:

- software de tracking/páginas;
- mão de obra de media buying e operações;
- desperdício de mídia e retrabalho por erros de processo.

AfiliAds não precisa substituir todo esse stack no primeiro dia. Precisa assumir a decisão mais valiosa: coordenar o caminho da oferta até uma campanha segura e aprender com o resultado.

## Por que agora

1. LLMs tornaram viável interpretar páginas, termos de produtor, políticas e copy em escala.
2. Google oferece a infraestrutura para modelos, execução de Ads, analytics e data warehouse no mesmo ecossistema.
3. Compliance e privacidade tornam processos manuais mais frágeis.
4. Equipes pequenas precisam aumentar throughput sem contratar uma pessoa por etapa.

## Por que Genau

Esta não é a primeira construção empresarial do founder.

- Genau fundou a Yoobe e a conduziu em uma mudança de B2C para B2B durante a pandemia.
- Em fevereiro de 2022, o Google anunciou oficialmente a Yoobe entre as startups selecionadas pelo Black Founders Fund. O programa aportava recursos sem participação societária; portanto, a formulação correta é “startup investida/selecionada pelo Google for Startups”, não “Google é sócio”.
- O Google também publicou a história de alumni da Yoobe, corroborando founder, pivot e produto.
- Um pitch histórico de 2023 registra 39 clientes ativos, GMV YTD de R$ 6,8 milhões e MRR de R$ 270 mil. Esses dados só devem entrar no deck após confirmação do founder e devem ser rotulados como históricos, nunca como performance atual.
- No AfiliAds, o founder converteu conhecimento operacional em software: 14 agentes, Google Ads API v25, publicação de página, gates de segurança e experimentos.

O argumento não é “o founder conhece Google”. É mais forte: ele já recebeu confiança institucional do Google, aprendeu a usar o ecossistema e voltou com uma tese em que os produtos Google estão no core técnico e comercial.

Fontes públicas: [anúncio do Google Black Founders Fund, 2022](https://blog.google/intl/pt-br/novidades/iniciativas/novo-investimento-para-startups-fundadas-por-pessoas-negras-google-startups-brasil-anuncia-mais-r85-milhoes-para-o-black-founders-fund/), [história da Yoobe no Google for Startups](https://startup.google.com/intl/pt-BR_ALL/alumni/stories/yoobe/), [reflexão do Google sobre o programa](https://blog.google/intl/pt-br/novidades/iniciativas/black-founders-fund-pluralidade-e-impacto-no-ecossistema-de-startups-do-brasil/).

## Por que Google + Monashees

O programa pode comprimir três curvas de aprendizado ao mesmo tempo:

1. **Reliability:** benchmark e avaliação dos agentes com Vertex AI.
2. **Scale:** Cloud Run/Agent Engine, BigQuery e observabilidade para milhares de workflows.
3. **Company building:** Monashees para posicionamento, GTM, hiring e preparação de rodada.

Créditos são relevantes, mas não são a tese. São uma ponte para coletar evidência, melhorar o produto e chegar a unit economics que sobrevivem após o benefício.

## Arquitetura de convicção

| Risco | Evidência atual | Próxima prova |
| --- | --- | --- |
| consegue construir? | produto funcional, integração e testes | demo reproduzível |
| IA é realmente necessária? | interpretação de conteúdo aberto em 14 papéis | ablation: manual/modelo/agent workflow |
| produto é seguro? | readiness, guards e confirmação | auditoria + incident metrics |
| cliente quer? | problema observado pelo founder | 20 entrevistas + 5 pilotos |
| cliente paga? | preços adjacentes | ≥2 pilotos pagos/LOIs |
| Google é vantagem? | Vertex/Gemini + Ads API já usados | evals e custo por tarefa |
| founder está focado? | ainda não comprovado | declaração e plano de transição |

## Moat

O moat potencial é um grafo de decisão e resultado: oferta, restrições, intenção, ativo, configuração, experimento e performance. Cada correção deixa de ser uma conversa e vira regra, teste ou memória reutilizável. A defensabilidade aumenta quando clientes operam mais campanhas e quando as avaliações do produto tornam o roteamento de modelos melhor por tarefa.

## Estratégia de entrada

O ICP inicial é o operador profissional, porque sente frequência e custo da fragmentação. Agências fornecem expansão por assentos e contas. Iniciantes ajudam distribuição e educação, mas não devem ditar o produto nem a economia inicial.

O primeiro valor não é “campanha lucrativa”. É “campanha `PAUSED`, completa, rastreável e pronta para uma decisão humana”. Isso é controlável, rápido de medir e não depende de prometer performance de mídia.

## Principais objeções e respostas

### “É apenas mais uma ferramenta de afiliados.”

Não. Ferramentas existentes resolvem páginas, tracking ou PPC isoladamente. AfiliAds mantém contexto e autorização entre essas etapas. O wedge é afiliados; a categoria é performance operations.

### “O próximo Gemini pode fazer tudo isso.”

Um modelo pode gerar uma resposta. Ele não possui contas, permissões, state machines, histórico de experimentos, política de mutação nem dados conectados do cliente. Melhorias de modelo aumentam a margem e a qualidade do AfiliAds.

### “O negócio depende demais do Google.”

Google Search é o wedge e Google Cloud é a melhor arquitetura inicial. O roteador de modelos já é multi-provider, e o modelo de dados deve permanecer independente. A empresa assume conscientemente dependência da Ads API, mas reduz lock-in na camada de inteligência e prepara expansão para outros canais.

### “Afiliados trazem risco de política e reputação.”

Esse risco é precisamente a dor. O produto proíbe cloaking, cria campanhas pausadas, separa brand bidding de bloqueio de canal, exige confirmação para mutações e preserva evidência. Não promete eliminar reprovações; promete tornar decisões auditáveis e reduzir erros evitáveis.

### “Você ainda opera a Yoobe. Quem recebe seu foco?”

AfiliAds será uma newco independente e Genau dedicará 50 horas semanais, com transição imediata. A resposta precisa ser acompanhada da formalização da entidade, cessão do IP já desenvolvido e definição pública do papel residual na Yoobe.

### “Os créditos mascaram um negócio sem margem.”

Todo dashboard interno deve mostrar custo shadow sem créditos. Pricing, roteamento e limites são aprovados com o custo de tabela. Créditos financiam experimentação, nunca são contabilizados como margem recorrente.

## Condições para uma candidatura forte

- formalizar a newco e a cessão de IP;
- documentar o papel residual na Yoobe;
- apresentar pelo menos dois sinais de willingness-to-pay;
- substituir projeções por métricas de pilotos;
- apresentar orçamento de Cloud em milestones, não como lista de produtos;
- usar dados históricos da Yoobe apenas com ano e fonte.

## Defesa oral de 90 segundos

> Eu já construí uma startup que precisou pivotar, vender e operar no mundo real. A Yoobe foi uma das startups selecionadas pelo Google for Startups Black Founders Fund, e essa experiência me ensinou que tecnologia só vira empresa quando entra num workflow crítico e mensurável. Foi exatamente o que encontrei na operação de afiliados: profissionais alternam entre páginas, planilhas, chats de IA, trackers e Google Ads, mas nenhuma ferramenta preserva a decisão do começo ao fim. O AfiliAds transforma esse trabalho em um sistema operacional. Agentes no Vertex AI interpretam ofertas, regras, intenção e copy; código determinístico controla orçamento, compliance e mutações; a Google Ads API executa e devolve os resultados para a próxima campanha. Eu já construí o fluxo funcional, com 14 agentes, publicação real, integração v25 e experimentos. Agora o risco a resolver é comercial: quais operadores têm maior urgência, quanto pagam e qual primeiro valor os retém. O Gama Fund é o parceiro certo porque junta a infraestrutura e a inteligência do Google com a disciplina de company building da Monashees. Não quero usar créditos para esconder custo. Quero usá-los para chegar mais rápido a um produto confiável, medido e com margem depois dos créditos.
