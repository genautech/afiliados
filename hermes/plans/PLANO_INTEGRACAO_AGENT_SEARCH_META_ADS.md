# PLANO DE IMPLEMENTAÇÃO: AGENT SEARCH & AD SCOUT (GCP ADK) + MÉTRICAS/TRÁFEGO MULTICANAL (GOOGLE ADS + META ADS) NO PROJETO AFILIADS

> **Status:** Proposto para Execução Automática (Codex / Claude Code / Hermes)  
> **Atualizado:** 28 de Agosto de 2026 (Inclusão do ADK Ad Scout)  
> **Contexto Técnico:** Next.js 14, Prisma ORM, Vitest, GCP Agent Platform / ADK, Google Search API, Meta Marketing API.

---

## 🎯 OBJETIVOS DO PLANO

1. **Agente de Inteligência de Anúncios e Concorrência (Ad Scout - GCP ADK):** Usar o Agent Development Kit (ADK) oficial do GCP e a ferramenta nativa de `google_search` para mapear concorrentes, quantidade de anúncios ativos, precificação praticada no mercado e dores da audiência (via fóruns como Reddit) de forma ética e em conformidade com as diretrizes do Google.
2. **Agente de Conhecimento e Busca Semântica (GCP Agent Search):** Indexar e buscar infoprodutos e ofertas de baixo ticket (catálogo próprio + ClickBank, MaxWeb, etc.) a partir de busca conversacional.
3. **Gestão de Infoprodutos Próprios (Low-Ticket):** Incluir suporte de banco e backend para que o usuário cadastre, configure preços e gerencie ofertas de baixo ticket próprias conectadas diretamente a gateways de pagamento (Stripe, Kiwify, etc.).
4. **Personalização e Ramificação do Wizard:** Adaptar o Wizard clássico para chavear dinamicamente as etapas dependendo se o produto é de Afiliação (foco em HopLinks, pré-sells) ou Próprio (foco em checkout direto, página de vendas direta).
5. **Tráfego Multicanal (Meta Ads + Google Ads):** Criar a estrutura e segurança para criação automatizada de campanhas no Facebook/Instagram Ads de forma integrada ao fluxo que já opera no Google Ads.

---

## 🛠️ ARQUITETURA DE AGENTES E COMPONENTES

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                             WIZARD UI                                  │
 │         (Entrada de Palavra-chave / Seletor de Tipo de Produto)        │
 └───────────────────┬────────────────────────────────┬───────────────────┘
                     │                                │
                     ▼                                ▼
       ┌───────────────────────────┐    ┌───────────────────────────┐
       │   Ad Scout Agent (ADK)    │    │   Agent Search Client     │
       │    (Inteligência SERP,    │    │ (Busca Conversacional de  │
       │  Quantidade de Anúncios,  │    │  Ofertas no Catálogo/Rede)│
       │   Preços e Dores Reddit)  │    └─────────────┬─────────────┘
       └─────────────┬─────────────┘                  │
                     │                                │
                     ▼                                ▼
       ┌───────────────────────────┐    ┌───────────────────────────┐
       │   Prisma MarketResearch   │    │      Prisma Product       │
       │  (Persistência do Relatório│   │  (Cadastro de Afiliado/   │
       │  de Concorrência & Dores) │    │      E-book Próprio)      │
       └─────────────┬─────────────┘    └─────────────┬─────────────┘
                     │                                │
                     └────────────────┬───────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │   Geração de Criativos /  │
                        │    Copy e Lances (CPC)    │
                        └─────────────┬─────────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
        ┌───────────────────────────┐   ┌───────────────────────────┐
        │      Google Ads API       │   │       Meta Ads API        │
        │   (Sagas, Idempotency)    │   │   (Sagas, Idempotency)    │
        └───────────────────────────┘   └───────────────────────────┘
```

---

## FASE 1 — Modelagem de Dados (Prisma Schema)

**Responsável:** Codex  
**Validação:** `npx prisma db push --dry-run` offline. Sem mutações reais no DB de produção.

### 1.1 Modelos de Produto, Pesquisa de Mercado e Meta Ads
Atualizar o arquivo `prisma/schema.prisma` para acomodar os dados ricos extraídos pelo agente Ad Scout, produtos próprios e a estrutura de campanhas do Meta Ads.

```prisma
// Adições e ajustes recomendados ao prisma/schema.prisma

enum ProductType {
  AFFILIATE
  PROPRIETARY_LOW_TICKET
}

model Product {
  id              String          @id @default(uuid())
  userId          String
  name            String
  description     String?
  type            ProductType     @default(AFFILIATE)
  niche           String?
  price           Float?          // Relevante para PROPRIETARY_LOW_TICKET
  currency        String          @default("BRL")
  checkoutUrl     String?         // Stripe, Kiwify, etc. para próprio
  offerUrl        String?         // HopLink / Smartlink para afiliados
  payout          Float?          // Comissão esperada para afiliados
  gravity         Float?          // Métrica do ClickBank
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  campaigns       Campaign[]
  marketResearches MarketResearch[]

  @@index([userId])
}

model MarketResearch {
  id              String        @id @default(uuid())
  productId       String?
  product         Product?      @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId          String
  query           String        // Termo buscado no Google Search
  adCount         Int           // Quantidade de anúncios concorrentes ativos encontrados na SERP
  avgPrice        Float?        // Faixa de preço média dos concorrentes mapeada
  competitors     Json          // Lista de URLs e nomes dos concorrentes que anunciam
  audiencePain    Json          // Principais dores extraídas de fóruns (Reddit/Quora)
  anglesSuggested Json          // Sugestões de ângulos de vendas derivados
  rawSerpData     Json?         // Dump estruturado da API de buscas para auditoria
  createdAt       DateTime      @default(now())

  @@index([userId])
  @@index([productId])
}

// Modelos do Meta Ads (Mantendo paridade técnica com as tabelas do Google Ads)

model MetaAdsCampaign {
  id               String            @id @default(uuid())
  campaignId       String            @unique
  campaign         Campaign          @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  metaCampaignId   String?           @unique
  name             String
  objective        String            // CONVERSIONS, OUT_OF_THE_BOX, etc.
  status           String            @default("DRAFT") // DRAFT, PAUSED, ACTIVE
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  adSets           MetaAdsAdSet[]
}

model MetaAdsAdSet {
  id                String          @id @default(uuid())
  metaCampaignId    String
  metaCampaign      MetaAdsCampaign @relation(fields: [metaCampaignId], references: [id], onDelete: Cascade)
  metaAdSetId       String?         @unique
  name              String
  budget            Float
  bidAmount         Float?
  targeting         Json            // Interesses, demográficos, geolocalização
  status            String          @default("PAUSED")
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  ads               MetaAdsAd[]
}

model MetaAdsAd {
  id              String          @id @default(uuid())
  metaAdSetId     String
  metaAdSet       MetaAdsAdSet    @relation(fields: [metaAdSetId], references: [id], onDelete: Cascade)
  metaAdId        String?         @unique
  name            String
  creativeId      String
  status          String          @default("PAUSED")
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

---

## FASE 2 — Agente Ad Scout (GCP ADK & Google Search API)

**Responsável:** Claude Code / Hermes  
**Foco:** Criar um agente autônomo e ético utilizando o Agent Development Kit (ADK) para coletar dados reais da SERP do Google.

### 2.1 Estrutura do Agente Ad Scout (Python / Node integration)
Arquivo sugerido no backend: `afiliads_app/nextjs_space/lib/agents/ad-scout-agent.ts`
Este agente se conectará à Gemini Enterprise Agent Platform. Em desenvolvimento local ou sem credenciais reais do GCP, operará com um motor de mock determinístico de alta fidelidade.

```typescript
import { GoogleAuth } from 'google-auth-library';

export interface AdScoutAnalysisInput {
  query: string;
  userId: string;
  productId?: string;
}

export interface AdScoutAnalysisResult {
  query: string;
  adCount: number;
  avgPrice: number;
  competitors: Array<{ name: string; url: string; price?: number; angle?: string }>;
  audiencePain: string[];
  anglesSuggested: string[];
}

export class AdScoutAgent {
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = process.env.NODE_ENV === 'development' || !process.env.GCP_PROJECT_ID;
  }

  async runAnalysis(input: AdScoutAnalysisInput): Promise<AdScoutAnalysisResult> {
    if (this.isMockMode) {
      return this.runMockAnalysis(input.query);
    }

    // Executa o agente conectando-se ao Agent Platform / Vertex AI Search ADK
    // 1. Instanciar cliente do Google Search tool nativo do ADK.
    // 2. Realizar busca comercial: "comprar [query]", "[query] preco", "melhor [query]".
    // 3. Realizar busca em fóruns para dores de clientes: "site:reddit.com [query] reclamação OR ruim OR melhor".
    // 4. Utilizar Gemini para analisar e estruturar o resultado JSON.
    return this.runRealADKSearch(input.query);
  }

  private async runRealADKSearch(query: string): Promise<AdScoutAnalysisResult> {
    // Integração real com Discovery Engine / Agent Platform Workbench
    // Implementa chamada à API de buscas e formata o payload via Gemini estruturado
    // ...
    return this.runMockAnalysis(query); // Fallback seguro
  }

  private runMockAnalysis(query: string): AdScoutAnalysisResult {
    // Mock robusto para simulação de comportamento do ADK
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('dieta') || lowerQuery.includes('emagrecer')) {
      return {
        query,
        adCount: 4, // 4 anúncios ativos no topo do Google Search
        avgPrice: 97.00,
        competitors: [
          { name: "Programa Seca Rápido 2026", url: "https://concorrente-a.com/vsl", price: 147.00, angle: "Resultados em 14 dias com jejum inteligente" },
          { name: "Método Detox Low-Ticket", url: "https://concorrente-b.com/oferta", price: 47.00, angle: "Receitas práticas e baratas sem ingredientes raros" }
        ],
        audiencePain: [
          "Dificuldade de manter consistência na dieta devido a receitas caras",
          "Falta de tempo para preparar marmitas complexas",
          "Efeito sanfona e frustração com dietas restritivas demais"
        ],
        anglesSuggested: [
          "Foco na praticidade: Receitas de 5 minutos que custam menos de R$ 10 por dia",
          "Quebra de objeção financeira: Emagreça sem precisar comprar produtos importados",
          "Garantia incondicional: Se não gostar do sabor, devolvemos seu dinheiro"
        ]
      };
    }

    // Retorno genérico de alta qualidade para outros nichos
    return {
      query,
      adCount: 2,
      avgPrice: 67.00,
      competitors: [
        { name: `${query} Premium Masterclass`, url: "https://competitor-premium.com", price: 97.00, angle: "Acesso vitalício com materiais complementares" }
      ],
      audiencePain: [
        `Falta de um passo a passo estruturado e direto ao ponto sobre ${query}`,
        "Excesso de teoria e pouca aplicação prática rápida"
      ],
      anglesSuggested: [
        "Venda direta: Aprenda em 1 hora o que os cursos de R$ 1.000 escondem",
        "Formato pocket: E-book prático + planilha de acompanhamento inclusa"
      ]
    };
  }
}
```

---

## FASE 3 — Integração do Ad Scout no Wizard e Ingestão no Agent Search

**Responsável:** Claude Code / Hermes  
**Foco:** Fazer o Wizard consumir a inteligência do Ad Scout e alimentar as etapas de copy, preço e lances.

### 3.1 UX do Wizard: Passo 2 (Seleção e Pesquisa de Produto)
*   Se o usuário digitar uma palavra-chave para o produto, um botão proeminente **"Analisar Concorrência e Mercado (Ad Scout)"** fica visível.
*   Ao clicar, uma animação de "Agente vasculhando a SERP e analisando dores..." é mostrada.
*   **Retorno do Ad Scout na UI:**
    *   Exibe a **temperatura do mercado** baseada no número de anúncios ativos (ex: 4+ anúncios = "Mercado Quente/Altamente Concorrido", 0-1 anúncio = "Oportunidade de Oceano Azul").
    *   Mostra o **preço médio dos concorrentes** e sugere a faixa ideal para o produto low-ticket do usuário.
    *   Lista as **principais dores da audiência** extraídas do Reddit. O usuário pode selecionar quais dores quer focar.
    *   Salva os dados persistidos em `MarketResearch` vinculados à campanha.

### 3.2 Ingestão das Dores na IA de Geração de Criativos (Passo 4 do Wizard)
*   A IA que gera as copys e variações de criativos (Kimi / OpenRouter) agora recebe os resultados do `MarketResearch` correspondente.
*   **Prompt de Geração de Criativos atualizado:**
    ```
    Você é o redator publicitário de alto nível do AfiliAds.
    Com base na análise de concorrência extraída pelo Ad Scout para o produto "[PRODUTO]":
    - Dores do Público-Alvo: [INSERIR DORES EXTRAÍDAS DO REDDIT]
    - Preço sugerido: [INSERIR PREÇO]
    - Ângulos concorrentes: [INSERIR COMPETITORS.ANGLE]

    Gere 3 variações de headlines e copys focadas exclusivamente em atacar a dor "[DOR_SELECIONADA_PELO_USUARIO]" utilizando o ângulo inovador "[ANGULO_SUGERIDO_PELO_AD_SCOUT]".
    ```

---

## FASE 4 — Fluxo Condicional e Catálogo Próprio no Wizard

**Responsável:** Claude Code  
**Foco:** Permitir o cadastro de ofertas próprias e ajustar as etapas do Wizard de acordo.

### 4.1 Passo 1 do Wizard: Tipo de Oferta (Seletor)
*   **Opção A: Promover como Afiliado (ClickBank/MaxWeb/Hotmart)**
    *   Habilita campo `offerUrl` (HopLink) com validador automático.
    *   Exibe buscador do `AgentSearchClient` para o usuário encontrar ofertas de afiliados recomendadas.
    *   Etapa de página: Configura uma Pré-sell intermediária (VSL, Review, etc.).
*   **Opção B: Vender Produto Próprio (E-book / Low-Ticket)**
    *   Habilita campos: `price` (preço do e-book) e `checkoutUrl` (gateway de pagamento).
    *   Etapa de página: Configura uma Landing Page direta de vendas (venda direta, sem pré-sell).

---

## FASE 5 — Tráfego Multicanal Integrado (Meta Ads API)

**Responsável:** Codex  
**Foco:** Criar o motor técnico para publicar campanhas na Meta Marketing API de forma segura e idempotente.

### 5.1 O Cliente Meta Marketing API (`lib/meta-ads/client.ts`)
*   Se comunica com a Graph API do Facebook.
*   Gerencia os payloads estruturados de campanhas, conjuntos de anúncios (AdSets) e anúncios.
*   Garante que o modo mock esteja ativo por padrão para segurança de custos.

### 5.2 Validador de Prontidão (Readiness Check - `lib/meta-ads/readiness.ts`)
*   Valida se a conta de anúncios (`META_AD_ACCOUNT_ID`) e o token de acesso estão configurados.
*   Verifica se o Pixel do Meta está associado e se a URL da landing page é HTTPS válida.
*   Garante que o orçamento diário por AdSet respeita o mínimo exigido pela plataforma (pelo menos $1 USD ou R$ 5,00 por dia).

### 5.3 Saga de Lançamento Multicanais com Idempotência
Se o usuário selecionar **Google Ads + Meta Ads** na tela de lançamento (Passo 7/8):
1.  Disparar checagem de readiness para ambas as redes. Se houver falha, travar o lançamento.
2.  Criar registros `DRAFT` locais.
3.  Executar criação remota no Google Ads. Em caso de sucesso, salvar `googleCampaignId`.
4.  Executar criação remota no Meta Ads. Em caso de sucesso, salvar `metaCampaignId`.
5.  **Reconciliação:** Se a requisição do Meta Ads falhar após o Google Ads ter sido criado com sucesso, marcar a campanha local como `PARTIAL_SUCCESS_GOOGLE`. Ao tentar novamente, o sistema pula o Google Ads (usando a idempotency key já persistida) e re-executa apenas a chamada do Meta Ads de forma transparente.

---

## FASE 6 — Cobertura de Testes Unitários e Integração (Vitest)

**Responsável:** Todos os Agentes  
**Foco:** Garantir que 100% das novas camadas e do fluxo condicional possuam testes robustos com mocks de alta fidelidade para manter a estabilidade do build Next.js.

### 6.1 Casos de Teste Obrigatórios
*   **AdScoutAgent Test:** Validar que o agente analisa queries comerciais de forma correta e se comporta deterministicamente tanto em mock-mode quanto em produção.
*   **Prisma Database Test:** Validar relacionamentos entre `Product`, `MarketResearch`, `Campaign` e as novas tabelas de campanhas do Meta Ads.
*   **Wizard Conditional Flow Test:** Validar se a validação de dados diferencia com precisão o payload do fluxo de afiliado (exigência de HopLink) do payload do produto próprio (exigência de URL de checkout e preço).
*   **Meta Ads Integration Test:** Testar se o client do Meta Ads monta os payloads corretos de campanha e conjunto de anúncios, respeitando o budget e lances definidos.

---

## 📅 CRONOGRAMA E DISTRIBUIÇÃO DAS TAREFAS

1.  **HERMES (Setup inicial):**
    *   Aprovação do plano.
    *   Inclusão das variáveis de ambiente mockadas no `.env.local` (`META_ACCESS_TOKEN`, `GCP_PROJECT_ID`, etc.).
2.  **CODEX (Engenharia de Banco e APIs):**
    *   **Fase 1:** Atualização do Prisma Schema com novas tabelas de Meta Ads, `Product` estendido e `MarketResearch` para persistência do Ad Scout.
    *   **Fase 5:** Implementação do cliente do Meta Ads, Readiness checks e saga de lançamento robusta e idempotente.
3.  **CLAUDE CODE (UX, Busca e Agentes de Inteligência):**
    *   **Fase 2:** Implementação técnica do `AdScoutAgent` com ADK/Google Search API.
    *   **Fase 3 & 4:** Refatoração condicional do Wizard (passo a passo para Afiliado vs. Próprio) e inserção do botão "Analisar Concorrência (Ad Scout)" com renderização de dores extraídas do Reddit e preços sugeridos.
4.  **RECONCILIAÇÃO FINAL (Hermes):**
    *   Executar testes integrados (`npm run test` / `vitest`).
    *   Validar build Next.js de ponta a ponta (`npm run build`).
