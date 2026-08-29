# PLANO MESTRE: WIZARD MULTI-PRODUTO (AFILIADOS, INFOPRODUTOS, E-BOOKS) & ORQUESTRAÇÃO MULTI-AGENTE (AFILIADS v3)

> **Status:** Proposto e Pronto para Execução Orquestrada  
> **Atores:** Claude (UX/UI & Frontend), Codex (Backend, APIs & Integrações), Hermes (Orquestração, Governança, Custos & Obsidian Vault Sync)  
> **Data:** 28 de Agosto de 2026

---

## 🎯 1. VISÃO GERAL & OBJETIVOS

O objetivo deste plano é reestruturar o fluxo de criação de campanhas do AfiliAds, transformando o Wizard genérico em uma **Plataforma Condicional Multi-Produto** adaptada dinamicamente para três grandes verticais:
1.  **Afiliados Tradicionais (ClickBank, MaxWeb, Hotmart, Monetizze):** Fluxo focado em HopLinks, criação de páginas de pré-sell (VSL, Review, Quizzes) e arbitragem pura de tráfego.
2.  **E-books Low-Ticket (Venda Direta R$ 29 - R$ 97):** Fluxo focado em checkout direto (Stripe/Kiwify), landing pages de alta conversão sem pré-sell e upsell de um clique.
3.  **Infoprodutos High-Ticket / Mentorias:** Fluxo focado em captação de leads (Squeeze Page), entrega de isca digital, nutrição e redirecionamento para o WhatsApp ou funil de vendas.

Para suportar isso, integraremos múltiplas APIs de busca de produtos em tempo real (ClickBank Feed, MaxWeb, Kiwify SDK, etc.) alimentadas por agentes autônomos de pesquisa que usam o **Agent Studio / ADK** para extrair as ofertas com melhor "gravity" ou "temperatura de mercado" e sincronizá-las diretamente com o Obsidian Vault.

---

## 🏗️ 2. MATRIZ DE PAPÉIS & COORDENAÇÃO DE AGENTES

A execução deste plano ocorrerá em um regime "a 4 mãos" altamente paralelo e controlado, coordenado por um barramento comum de governança técnica para evitar conflitos de merge ou de contexto:

```
                      ┌────────────────────────────────────────┐
                      │          HERMES ORCHESTRATOR           │
                      │   (Governança de Tokens, Validação,    │
                      │    Controle de Custos & Obsidian Sync) │
                      └──────┬──────────────────────────┬──────┘
                             │                          │
                             ▼                          ▼
               ┌───────────────────────────┐    ┌───────────────────────────┐
               │         CLAUDE            │    │          CODEX            │
               │  (UX/UI, Design System,   │    │  (Backend, Prisma Schema, │
               │   Next.js TSX Components) │    │   APIs, Sagas & Queues)   │
               └───────────────────────────┘    └───────────────────────────┘
```

### 🎨 papel do CLAUDE (UI/UX & Design System)
*   **Ajuste Visual:** Reescrever a interface do Wizard em `app/(app)/wizard/page.tsx` usando uma arquitetura modular de subcomponentes baseados no padrão de design do **Originkit** e Vercel (dark-theme limpo, bordas sutis `#334155`, fontes mono-espaçadas para dados técnicos, animações fluidas de carregamento dos agentes).
*   **UX Condicional:** Criar layouts de passos dinâmicos que mudam suas telas, labels, explicações e visualizações dependendo do `ProductType` selecionado no Passo 1:
    *   *Se Afiliados:* Exibe busca integrada de produtos, configuração de HopLink e gerador de Pré-sells.
    *   *Se E-book Low-Ticket:* Exibe calculadora de precificação ótima, configurador de checkout direto e landing page direta.
    *   *Se Mentoria/Infoproduto:* Exibe configurador de isca digital, captura de lead e links de checkout premium.

### 💻 papel do CODEX (Backend, APIs & Estrutura de Dados)
*   **Extensão de Schema:** Implementar e sincronizar as novas tabelas e relacionamentos necessários para as diferentes APIs de afiliados no `prisma/schema.prisma` (ex: `MetaAdsCampaign`, `ClickBankProduct`, `KiwifyIntegrations`).
*   **Clientes de Integração:** Desenvolver os conectores de API reais e mockados para ClickBank Marketplace API, MaxWeb Offer Feed, Kiwify Webhooks e Hotmart API, encapsulados em serviços puros (`lib/clickbankService.ts`, `lib/kiwifyService.ts`).
*   **Sagas e Filas de Lançamento:** Adaptar o motor de lançamento para processar as mutações idempotentes na Google Ads API e Meta Ads API, variando a estrutura dos anúncios com base no tipo de produto.

### 🧠 papel do HERMES (Governança, Custos, Obsidian Vault & Skills)
*   **Monitoramento de Tokens & Custos:** Auditar e controlar o consumo de recursos de IA (Gemini, OpenRouter, Kimi) nas chamadas de pesquisa profunda e validação de compliance.
*   **Validação de Qualidade (Harness):** Executar a esteira de testes com o `vitest` e testes do TypeScript (`tsc --noEmit`) após cada alteração dos outros agentes para garantir 100% de integridade ("Zero-Regression Rule").
*   **Sincronização de Conhecimento (Obsidian Vault):** Organizar os relatórios e memórias técnicas em arquivos Markdown estruturados no Obsidian Vault (`~/EMAI Starter Vault`), permitindo que futuros agentes acessem essas bases.

---

## 📡 3. INTEGRAÇÃO AMPLIADA DE APIS (TRAFFIC, INTENT & TAGS)

O novo ecossistema AfiliAds v3 operará de forma hiper-conectada, integrando APIs de Tráfego, Intenção de Busca (SEO/Long-tail) e Rastreamento de Conversões (Client e Server-side) para garantir máxima assertividade de lances e atribuição imune a bloqueadores de anúncios:

### 3.1 APIs de Tráfego (Google Ads & Meta Ads APIs)
*   **Google Ads API:** Gerencia a criação de campanhas de busca de alta intenção, grupos de anúncios, lances automáticos por clique máximo (Max CPC) e a injeção de **Keywords Negativas automáticas** identificadas pelo Ad Scout para filtrar termos "sujos" ou curiosos de baixa conversão.
*   **Meta Ads (Graph Marketing API):** Automatiza a criação da Campanha, Conjunto de Anúncios (AdSet) e do Anúncio (Ad) no Facebook/Instagram. Ela configura dinamicamente o orçamento, público-alvo (interesses, faixas etárias de público quente extraídas pelo Ad Scout) e otimização para o Pixel de Conversão.

### 3.2 APIs de Intenção de Busca e SEO (Answer the Public & Google Autocomplete)
*   **Mecanismo de Descoberta de Cauda Longa:** Integraremos um conector para buscar sugestões de pesquisa em tempo real via **Google Search Autocomplete API** e **Google Ads Keyword Planner API**. 
*   **Mapeamento de Dúvidas Pragmáticas (Estilo Answer the Public):** O Ad Scout rodará buscas recursivas de termos adicionando pronomes interrogativos ("como", "por que", "qual", "melhor") para estruturar o "Mapa de Intenção do Consumidor".
*   **Handoff para Copywriter:** Essas perguntas reais que os usuários digitam nos buscadores são passadas de forma canônica para a IA de geração de copy, permitindo escrever criativos focados exatamente em responder às principais dúvidas do mercado-alvo (ex: "Dieta Caps realmente funciona ou é golpe?").

### 3.3 APIs de Tags, Rastreamento & Meta Conversions API (CAPI)
*   **Pixel & GTM Automatizados:** O editor do Passo 5 (compilador de HTML em `lib/presell.ts`) injeta automaticamente no cabeçalho do código os snippets do Google Tag Manager (GTM) e do Pixel do Facebook do usuário, sem necessidade de configuração manual de código.
*   **Meta Conversions API (CAPI - Server-side):** O backend Next.js atuará como proxy e disparará eventos de conversão (`Lead`, `InitiateCheckout`, `Purchase`) diretamente para os servidores da Meta via API Graph. Isso garante atribuição de conversões de **100% de precisão**, contornando restrições de navegadores como Safari (iOS APP Tracking Transparency) e adblockers que costumam cortar o tracking client-side tradicional.

---

## 📁 4. ARQUITETURA DE ARQUIVOS & FLUXO DE DADOS

O sistema será decomposto em módulos de alta coesão e baixo acoplamento para evitar arquivos gigantescos e erros de aninhamento TSX:

```
afiliads_app/nextjs_space/
├── app/
│   ├── (app)/
│   │   └── wizard/
│   │       ├── page.tsx                    # Controller principal (Gerenciador de Estado do Wizard)
│   │       ├── _components/
│   │       │   ├── step-product-type.tsx   # Passo 1: Seleção de Tipo de Produto (Afiliados/E-book/Mentoria)
│   │       │   ├── step-product-search.tsx # Passo 2: Busca unificada via APIs de Afiliados + Ad Scout
│   │       │   ├── step-calculator.tsx     # Passo 3: Calculadora de Break-Even & Precificação Low-Ticket
│   │       │   ├── step-creative-gen.tsx   # Passo 4: Geração de Criativos & Copy focado em Dores do Reddit
│   │       │   ├── step-landing-page.tsx   # Passo 5: Editor visual de Pré-sells / Landing Pages
│   │       │   └── step-launch.tsx         # Passo 6: Painel de Lançamento Multicanal (Google + Meta)
│   └── api/
│       ├── search/
│       │   ├── products/route.ts           # Rota unificada de busca (ClickBank, MaxWeb, Kiwify)
│       │   └── market-scout/route.ts       # Rota do Ad Scout Oracle V2 (GCP Agent Studio)
│       └── launch/route.ts                 # Saga de lançamento multicanal idempotente
```

---

## 🗺️ 4. CRONOGRAMA DE EXECUÇÃO EM 4 FASES

### 📍 FASE 1: Preparação de Terreno & Ingestão de APIs (CODEX)
*   **Atividades:**
    1.  Mapear e documentar os schemas de resposta das APIs de afiliados (ClickBank XML/JSON Marketplace Feed, MaxWeb JSON API, Kiwify Developer API).
    2.  Escrever os clientes de API e as tabelas relacionais correspondentes no `schema.prisma`.
    3.  Garantir cobertura de testes unitários com mocks de alta fidelidade para as rotas `/api/search/products`.
*   **Entregável:** APIs de busca de produtos prontas para consumo com dados de "gravity", "payout" e "niche" unificados sob uma tipagem TypeScript estrita.

### 📍 FASE 2: Reformulação de UI/UX Modular (CLAUDE)
*   **Atividades:**
    1.  Dividir o arquivo `app/(app)/wizard/page.tsx` em componentes modulares sob `_components/` para isolar o escopo de renderização e evitar erros de tags abertas ou desalinhadas.
    2.  Implementar o design de transição de passos baseado no estado selecionado (`ProductType`).
    3.  Embelezar as visualizações de dados técnicos (ex: gráficos SVG inline das dores do Reddit, semáforos de CPC recomendados e termômetros de temperatura de concorrência).
*   **Entregável:** Nova UI do Wizard modular, rápida, responsiva e condicional aos tipos de produtos.

### 📍 FASE 3: Orquestração Multi-Agente & Loops de Pesquisa (HERMES & CLAUDE)
*   **Atividades:**
    1.  Configurar os loops de orquestração onde o resultado da busca de produto (Fase 1) alimenta automaticamente o input de busca do *Ad Scout Oracle* (Fase 2).
    2.  Integrar os resultados do *Ad Scout* diretamente no gerador de copy de criativos para garantir que as dores do Reddit e claims de concorrência modelem os prompts do Kimi / Gemini de forma factual e ética.
    3.  Ajustar o *Compliance Sentinel* e o *Kill-Switch* para varrer e validar todas as copys geradas pelo Wizard de acordo com as diretrizes específicas de cada nicho (Emagrecimento, Renda Extra, etc.).
*   **Entregável:** Funil de dados inteligente onde a descoberta de um produto gera automaticamente a pesquisa de mercado, que gera a copy ideal, que passa pelo gate de compliance.

### 📍 FASE 4: Sincronização, Validação Geral & Rollout (TODOS)
*   **Atividades:**
    1.  Configurar os ganchos do `obsidianSync.ts` para que cada etapa completada com sucesso no Wizard (Pesquisa de Produto, Pesquisa de Mercado, Criativos Gerados, Layout de Landing Page) salve um log detalhado de conhecimento no vault.
    2.  Rodar a suíte completa de testes adversariais (`npm run test`) para garantir zero regressão.
    3.  Realizar o build de produção (`npm run build`) para certificar que o Next.js compila perfeitamente sem erros silenciosos.
*   **Entregável:** Sistema consolidado, compilado com sucesso, documentado no Obsidian Vault e pronto para uso real.

---

## 📂 5. ORGANIZAÇÃO DA BASE DE CONHECIMENTO & OBSIDIAN VAULT

Para garantir que o seu "Eu Operador" de amanhã e os futuros agentes tenham controle absoluto do progresso e aprendizados acumulados do projeto AfiliAds, organizamos e estruturamos as bases de conhecimento em eixos canônicos:

```
~/EMAI Starter Vault/
├── 🗂️ 01 - Projetos Ativos/
│   └── AfiliAds/
│       ├── 📑 Manifesto de Arquitetura.md        # Visão geral do Next.js, Prisma, Google/Meta SDKs
│       ├── 🛡️ Políticas de Compliance.md         # Regras de publicidade e triggers do Kill-Switch
│       └── 🧪 Relatórios Ad Scout/
│           ├── market-scout-diet-caps.md        # Relatório de concorrência real gerado pela rota
│           └── market-scout-renda-digital.md    # Inteligência de dores do Reddit e claims de risco
├── 🗂️ 02 - Agent Intelligence/
│   ├── GCP Agent Studio ADK Specs.md            # Documentação interna de uso das APIs do Google
│   └── Meta Marketing API Integration Guide.md  # Detalhes de lances, orçamentos e Sagas locais
└── 🗂️ 03 - Procedimentos & Skills/
    └── ad-scout-oracle.md                       # Memorização de fluxo operacional e troubleshooting
```

Cada nova pesquisa de mercado salva pela rota de API enriquece este vault dinamicamente, transformando dados brutos da web em um **Ativo de Conhecimento Acumulativo de Longo Prazo** para a sua operação.
