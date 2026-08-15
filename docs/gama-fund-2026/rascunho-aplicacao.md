# AfiliAds — rascunho da candidatura ao Gama Fund

Status: rascunho factual. Todo item marcado como **PENDENTE DO FUNDADOR** precisa de resposta ou confirmação antes de virar PDF.

## Narrativa central

AfiliAds é o sistema operacional AI-native para afiliados e agências transformarem uma oferta em uma campanha Google Ads verificável, publicável e continuamente otimizável. Agentes especializados interpretam páginas, regras, intenção e copy; motores determinísticos controlam economia, compliance, readiness, autorização de mutações e experimentos. A IA não é uma interface sobre o produto: é o mecanismo que torna possível coordenar o workflow inteiro em escala.

## Time

### 1. Quem são seus cofundadores e por que decidiram construir a empresa juntos?

Founder confirmou newco independente e dedicação de 50 horas semanais, com transição imediata. Confirmar apenas se existe cofounder antes do envio. Se for solo founder:

> Hoje sou solo founder. Comecei o AfiliAds a partir de uma dor operacional que eu próprio vivia: transformar pesquisa dispersa, regras de produtor, copy, páginas e dados do Google Ads em uma sequência segura e repetível. Em vez de esperar montar um time antes de validar a tese, construí o produto funcional e usei agentes de IA como multiplicadores de engenharia e pesquisa. Minha prioridade de contratação/capital é complementar o time com liderança técnica/produto e distribuição sem terceirizar a competência central de IA.

### 2. Por que vocês são as pessoas certas para construir essa empresa específica?

> A combinação necessária é incomum: domínio operacional de afiliados e mídia paga, capacidade de transformar conhecimento tácito em software e disciplina para deixar decisões financeiras críticas fora do alcance arbitrário de um LLM. Nos últimos meses transformei essa combinação em produto: um wizard completo, 14 agentes especializados, publicação real de presells, integração Google Ads v25, compliance e experimentos A/B. A árvore atual contém 58 rotas de API e uma suíte automatizada ampla. A contagem final de testes e demais métricas técnicas será congelada somente a partir de um commit verde. Esses números demonstram velocidade de execução; não são apresentados como tração comercial.

Complemento recomendado:

> Antes do AfiliAds, fundei a Yoobe e conduzi sua mudança de B2C para B2B durante a pandemia. Em 2022, a empresa foi selecionada pelo Google for Startups Black Founders Fund; o Google também publicou nossa história como alumni. Essa trajetória me deu experiência em produto, venda enterprise, operação e uso responsável de capital. No AfiliAds, essa capacidade aparece na velocidade com que transformei uma dor operacional em sistema funcional — sem confundir software construído com product-market fit.

**PENDENTE DO FUNDADOR:** confirmar o papel atual na Yoobe, dedicação ao AfiliAds e quais métricas históricas/atuais podem ser divulgadas.

### 3. O que você acreditava há um ano e não acredita mais?

Proposta para validação:

> Eu acreditava que a principal vantagem viria de dar mais autonomia ao modelo. Construindo o AfiliAds, aprendi o oposto: em operações com dinheiro e risco de conta, a vantagem vem de separar interpretação probabilística de decisão determinística. Hoje LLMs leem páginas, sintetizam contexto e geram alternativas; orçamento, transições de estado, readiness e mutações passam por regras explícitas, autorização humana e falha fechada. Essa mudança tornou o produto menos “mágico” e muito mais confiável.

### 4. O que lançou ou aprendeu nos últimos 90 dias?

> Lancei o fluxo ponta a ponta do AfiliAds: pesquisa e scoring de oferta, mapa de keywords, análise da página do produtor, estratégia de canal/funil/budget, geração e publicação de presells, checklists com correção assistida, criação de campanha Google Ads em PAUSED, sync de métricas e experimentos A/B. Em paralelo, integrei Gemini e modelos parceiros via Vertex AI, roteamento multi-provider por tarefa/custo, controle de budget de LLM e guardrails de mutação. O principal aprendizado foi que o produto valioso não é o agente isolado; é o sistema que preserva contexto, mede resultados e impede ações inseguras.

### 5. Última decisão revertida quando os dados contrariaram o plano

> O sistema havia classificado a oferta FemiCore como proibida para Google Search. Ao reler as regras reais do produtor, descobrimos que a restrição era apenas brand bidding — não o canal inteiro. Revertemos a decisão, corrigimos o dado persistido e redesenhamos o motor para separar `blockedChannels` de `forbiddenAdTerms`. O resultado foi uma regra mais precisa: negativa exata da marca em vez de matar uma campanha potencialmente válida. Esse caso virou teste e memória operacional para não repetir o erro.

### 6. Conquista mais extraordinária da trajetória

Proposta para validação:

> Minha conquista mais extraordinária foi transformar a Yoobe em uma empresa B2B em meio à pandemia. O modelo anterior perdeu sua premissa, e tivemos de reconstruir produto, narrativa e operação sem abandonar o cliente. A empresa foi posteriormente selecionada pelo Google for Startups Black Founders Fund. Mais importante do que o reconhecimento foi aprender que um founder precisa mudar de tese quando o mercado muda, preservar a equipe e continuar executando. É essa combinação de resiliência e velocidade que levo para o AfiliAds.

**PENDENTE DO FUNDADOR:** validar se esta é realmente a conquista pessoal mais forte e acrescentar um episódio específico, não apenas o resultado.

### 7. O que diriam as três pessoas que mais te conhecem?

**PENDENTE DO FUNDADOR.** Pedir três frases reais; evitar adjetivos genéricos.

### 8. O que mais preocupa e ainda não resolveu?

Proposta para validação:

> Minha maior preocupação é transformar uma validação técnica forte em aprendizado comercial rápido o suficiente. O produto já executa o workflow, mas ainda preciso provar qual segmento sente a dor com maior urgência, qual primeiro valor gera retenção e quanto cada perfil paga. Por isso a próxima fase é menos sobre adicionar features e mais sobre design partners, instrumentação do funil, pilotos pagos e repetibilidade de onboarding.

### 9. Como Yoobe e AfiliAds se relacionam?

> AfiliAds será uma newco independente, com entidade, IP, cap table e dedicação próprios. Dedicarei 50 horas por semana ao projeto, com transição imediata. Minha posição na Yoobe e a cessão do IP já desenvolvido serão formalizadas para evitar conflito operacional ou societário. A trajetória da Yoobe é experiência do founder, não ativo ou tração atribuída ao AfiliAds.

## Oportunidade de mercado

### 1. Qual problema está resolvendo?

> Afiliados e agências operam com um stack fragmentado: planilhas, ferramentas de pesquisa, chats de IA, builders, trackers e Google Ads. A informação crítica se perde entre essas etapas. Uma regra de produtor ignorada, um CPC incompatível com o payout, uma presell sem continuidade ou um claim proibido pode desperdiçar dias, reprovar anúncios ou queimar budget. AfiliAds coordena essa cadeia em um workflow único, com IA especializada para interpretar contexto e regras determinísticas para proteger dinheiro e conta.

### 2. Qual o tamanho da oportunidade e como dimensiona?

> Usamos três camadas. Como proxy top-down, a categoria de software de affiliate marketing foi estimada em US$ 2,1 bilhões em 2025 e projetada para US$ 9,8 bilhões em 2035. Como evidência do ecossistema, Hotmart e Teachable reportam mais de US$ 10 bilhões de GMV acumulado, 200 mil creators vendendo e 21 milhões de compradores em um ano; a FGV reporta 389 mil ocupações no setor brasileiro de produtos digitais. Como validação de willingness-to-pay, ferramentas adjacentes cobram de US$ 97 a mais de US$ 799 por mês para páginas, tracking ou operação PPC. O próximo passo é transformar o SAM em bottom-up com waitlist, entrevistas e pilotos pagos; não tratamos estimativas de operadores como fatos antes dessa validação.

### 3. Quem é o cliente ideal?

> O beachhead é o afiliado profissional ou pequena equipe que roda 10–100 campanhas de Google Search em múltiplas ofertas e geos. Também atendemos agências que precisam de processo, governança e visibilidade entre operadores. Para iniciantes, o valor é um caminho guiado; para avançados, é reduzir handoffs, risco e tempo por campanha.

### 4. Quais mudanças macro abrem a oportunidade agora?

> Quatro mudanças convergem. LLMs tornaram economicamente viável interpretar páginas, políticas e contexto não estruturado. Vertex AI permite acessar modelos Google e parceiros em uma camada governável. Privacidade e perda de cookies aumentam o valor de first-party data, postbacks e tracking server-side. E plataformas de anúncios e produtores endureceram compliance, tornando o processo manual mais caro e arriscado. Ao mesmo tempo, a economia brasileira de produtos digitais segue crescendo.

### 5. Estratégia para alcançar e conquistar o mercado

> Começaremos com design partners em três segmentos: afiliados profissionais, equipes de media buying e agências. O onboarding será concierge para observar o workflow real e medir tempo até uma campanha PAUSED pronta para revisão. A lista de espera será segmentada por volume e stack atual. Estudos de caso técnicos — tempo economizado, erros evitados e qualidade de decisão — serão o principal canal de aquisição, seguidos por comunidades e parcerias com redes. A expansão vem de mais campanhas, assentos e contas por cliente.

### 6. Concorrentes e vantagem competitiva

> Voluum e RedTrack são excelentes em tracking e atribuição; Optmyzr em operação PPC; ClickFunnels e Super Presell em páginas. O concorrente mais comum é a combinação de planilhas, ChatGPT, WordPress e Google Ads. AfiliAds une o que essas ferramentas deixam entre si: transforma a economia e as regras de uma oferta em estratégia, ativos, compliance, campanha e experimento. Nossa vantagem é o workflow vertical, a memória acumulada por campanha e a separação entre IA probabilística e controles determinísticos.

### 7. Visão de mundo

> Hoje, pequenos operadores têm acesso aos mesmos modelos e canais que grandes equipes, mas não ao mesmo sistema operacional. Nossa visão é que expertise de performance deixe de morar em checklists dispersos e passe a ser um sistema verificável que aprende com cada campanha. Isso permite que um iniciante opere com disciplina e que uma agência escale sem multiplicar risco, retrabalho e headcount na mesma proporção.

## Produto e substância em IA

### 1. Como o produto resolve e qual o papel da IA?

> O produto conduz o usuário da oferta ao aprendizado de campanha. Quatorze agentes especializados pesquisam produtos, classificam intenção, extraem vendor terms, analisam concorrentes, definem estratégia, geram e validam páginas/copy e auditam performance. IA é essencial para interpretar informação aberta e contextual, adaptar conteúdo e cruzar sinais heterogêneos. Motores determinísticos calculam budget, validam estados, autorizam mutações e medem experimentos. Sem IA, o workflow volta a exigir horas de leitura e produção manual; sem determinismo, ele não é seguro.

### 2. O que fica 10 vezes melhor, barato ou rápido?

> O ciclo entre identificar uma oferta e ter uma campanha completa pronta para revisão. Tarefas que exigem alternar entre pesquisa, páginas, planilhas, copy e painéis passam a compartilhar o mesmo dossiê e os mesmos gates. A meta que validaremos em pilotos é reduzir de dias para horas o tempo até uma campanha PAUSED e aumentar o número de hipóteses testadas por operador sem elevar proporcionalmente o risco ou o headcount.

### 3. Por que o próximo modelo não torna a empresa irrelevante?

> Modelos melhores tornam o AfiliAds melhor. O valor não está em possuir um modelo; está no workflow, integrações, dados estruturados, avaliações, guardrails e distribuição. O roteador já escolhe modelos por tarefa, custo e independência. Cada campanha adiciona relações entre oferta, regra, keyword, página, decisão e resultado. Essa memória e o sistema de execução permanecem úteis quando o modelo muda — e permitem incorporar o novo modelo rapidamente.

### 4. Dados, workflow ou distribuição defensáveis

> O data flywheel conecta sinais que normalmente vivem separados: regras do produtor, economia, intenção de keyword, estrutura de página, claims, versão de presell, configuração de campanha, métricas e resultado experimental. `ChecklistLearning` reaplica correções em campanhas futuras; snapshots preservam padrões de mercado; experimentos registram controle, tratamento e significância. O workflow também cria defensabilidade: autorização humana, readiness e state machines fazem parte da operação, não de um prompt. A distribuição será construída com design partners e comunidades; ainda não alegamos um canal proprietário comprovado.

### 5. Monetização e evolução dos unit economics

> Pretendemos operar SaaS em três níveis: Starter para orientação e baixo volume, Pro para operadores e Agency para múltiplos assentos/contas. O preço final será validado em pilotos. A margem melhora com roteamento por tarefa, modelos leves onde possível, budget de tokens por provider, BYOK opcional e cache/reuso de análises. Os principais drivers serão campanhas ativas, chamadas de IA, volume de tracking e suporte. **PENDENTE:** incluir preços, CAC, gross margin e retenção somente após evidência.

### 6. Como o time usa IA no dia a dia?

> IA é usada para engenharia, revisão de segurança, pesquisa de documentação, síntese do vault Obsidian e geração de testes. No produto, agentes são divididos por responsabilidade e tier; saídas estruturadas passam por schemas e validação, e tarefas críticas recebem revisão independente. Aprendizados úteis viram código, testes ou notas versionadas — não ficam apenas em conversas.

## Google Fit

### 1. Como conheceu o Gama Fund?

**PENDENTE DO FUNDADOR:** escolher o canal real. O e-mail da imagem foi enviado por Maurício Martiniano/Google Campus; confirmar se essa é a origem correta a declarar.

### 2. Expectativas com o programa

> Queremos transformar um produto funcional em uma empresa global: aprofundar a arquitetura de agentes e avaliações, validar o go-to-market e preparar o produto para operar milhares de campanhas com governança. O acesso conjunto ao DeepMind, Cloud e Monashees é especialmente relevante porque precisamos evoluir modelo, infraestrutura e distribuição ao mesmo tempo — sem sacrificar segurança em um domínio que movimenta dinheiro real.

### 3. Recurso Google que mais moveria a startup

> O recurso de maior impacto seria uma colaboração direta com o time de Vertex AI/DeepMind focada em evaluation e agent reliability, acompanhada de créditos de Cloud. Construiríamos um benchmark proprietário com tarefas reais de vendor terms, compliance, estratégia e validação de páginas; usaríamos o Vertex AI Evaluation Service e Model Garden para medir qualidade, custo e segurança por tarefa, e evoluir o roteador com dados em vez de preferência subjetiva. Isso aceleraria a passagem de agentes bons em demos para agentes confiáveis em produção.

### 4. Produtos Google usados hoje — máximo 200 caracteres

Versão com 188 caracteres:

> Gemini no Vertex AI e Vertex MaaS. Sem eles, perdemos a validação Google-first e a camada MaaS do roteador; o produto mantém fallback, mas com menor independência, qualidade e resiliência.

**Nota:** recontar caracteres no PDF final caso haja mudança de pontuação.

### 5. Onde os modelos Google se saem bem e onde ficam aquém?

> No nosso desenho atual, modelos Google são fortes como revisor independente, em respostas estruturadas e na leitura de contexto para estratégia/compliance. Por isso o validator de bridge pages prioriza Google, enquanto o gerador usa outro modelo: independência reduz aprovação enviesada. Onde ficam aquém é na consistência de artefatos longos e altamente formatados para nossas páginas; por isso mantemos roteamento por tarefa, schemas, retry e fallback. **PENDENTE:** substituir essa avaliação arquitetural por métricas de um benchmark reproduzível antes da entrevista.

## Pergunta aberta

### Se AGI existisse agora, o que perguntaria?

Proposta para validação:

> “Qual decisão você recomendaria que eu não executasse — e qual evidência observável mudaria sua própria recomendação?”

Racional: testa autocontenção, falsificabilidade e capacidade de explicitar incerteza, valores centrais do produto.

## Campos online ainda pendentes

- nome jurídico e nome público;
- URL e LinkedIn da empresa;
- headcount;
- ano de fundação;
- cidade;
- entidade legal;
- receita e faixa de MRR/ARR, se houver;
- investimentos ou aceleradoras anteriores;
- nome, LinkedIn, e-mail e telefone do founder;
- dados do cofounder, se houver;
- duas referências de founders;
- canal real de descoberta do programa;
- pitch deck final.
- documentação da newco e cessão de IP;
- instrumento e valuation/cap da rodada;
- métricas históricas da Yoobe autorizadas para divulgação.

## Rodada e plano financeiro

> Estamos levantando R$ 2 milhões para um runway mínimo de 12 meses. O plano aloca 45% a produto, engenharia e P&D; 18% a go-to-market; 11% a Cloud/IA/dados; 9% a customer success/operações; 8% a jurídico, segurança e administração; e 9% a contingência. O cenário-base busca R$ 244 mil de MRR no mês 12, mas contratações e escala ficam condicionadas a pilotos pagos, margem bruta e retenção. O runway não depende de atingir essa receita.

## Claims que não podem aparecer sem prova

- número de usuários/clientes;
- receita, crescimento ou retenção;
- campanhas processadas;
- economia de tempo “10x” já medida;
- acurácia superior de um modelo;
- market share;
- depoimentos, logos ou parcerias;
- uso efetivo agregado de Vertex em produção sem logs verificáveis.
