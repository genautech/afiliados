# CONTRATO DE DADOS E SCHEMAS (PRISMA + ZOD) PARA INTEGRAÇÃO DO AD SCOUT AGENT

Este documento estabelece o **contrato de dados estrito e à prova de falhas** (Opção A — Deepen/Builder) que governa a interoperabilidade entre o agente `ad-scout-oracle` (GCP Agent Studio / ADK) e o backend do Next.js do projeto AfiliAds.

Ele serve de manual técnico direto e pronto para o **Codex** aplicar as alterações de banco (Prisma) e para o **Claude** construir a validação de rota (Zod).

---

## 1. MODELO PRISMA (`schema.prisma`)

Para persistir os dados enriquecidos e a classificação de risco de concorrência gerada pelo agente `ad-scout-oracle`, adicionaremos o modelo `MarketResearch` e o enum `ProductType` ao arquivo `schema.prisma`.

Este modelo se conecta ao `User` (proprietário da pesquisa), ao `ProductResearch` (quando vinculado a um produto) e permite vincular de forma opcional a uma `Campaign`.

### Modificações no `schema.prisma`

```prisma
// 1. Enum para diferenciar o tipo de produto/estratégia (Afiliado tradicional vs Low-Ticket Próprio)
enum ProductType {
  AFFILIATE
  PROPRIETARY_LOW_TICKET
}

// 2. Modelo de Persistência da Inteligência de Concorrência e Pesquisa de Mercado
model MarketResearch {
  id              String           @id @default(cuid())
  userId          String
  productId       String?          @unique // Um MarketResearch por produto (ou 1-para-1 opcional)
  campaignId      String?
  query           String           @db.Text
  productType     ProductType      @default(AFFILIATE)
  
  // Métricas do leilão e precificação
  adCount         Int              @default(0)
  avgPrice        Float            @default(0.0)
  
  // Dados JSON estruturados para evitar tabelas filhas aninhadas e garantir rapidez de leitura/escrita
  // Estruturas de dados validadas via Zod no Backend:
  // - competitors: CompetitorItem[]
  // - audiencePain: string[]
  // - anglesSuggested: string[]
  // - analyzedClaims: AnalyzedClaimItem[]
  competitors     Json             @default("[]")
  audiencePain    Json             @default("[]")
  anglesSuggested Json             @default("[]")
  analyzedClaims  Json             @default("[]")

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relações
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  productResearch ProductResearch? @relation(fields: [productId], references: [id], onDelete: SetNull)
  campaign        Campaign?        @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([productId])
  @@index([campaignId])
}
```

E precisamos também declarar as relações reversas nos modelos existentes:

*   **No model `User`**:
    ```prisma
    marketResearches MarketResearch[]
    ```
*   **No model `ProductResearch`**:
    ```prisma
    marketResearch MarketResearch? // Relação 1-para-1 ou opcional
    ```
*   **No model `Campaign`**:
    ```prisma
    marketResearches MarketResearch[]
    ```

---

## 2. ESQUEMA DE VALIDAÇÃO ZOD (`lib/validations/market-research.ts`)

A validação de entrada e saída é o nosso **portão de segurança (Gate)**. O JSON retornado pelo `ad-scout-oracle` passa pela validação do Zod no backend Next.js imediatamente antes de tocar o banco de dados. Qualquer alucinação ou tipo incorreto disparará um erro de validação controlado, impedindo falhas silenciosas de banco de dados.

### Código do Arquivo: `lib/validations/market-research.ts`

```typescript
import { z } from "zod";

// 1. Enum de Nível de Risco de Claims (Compliance Sentinel)
export const ClaimRiskLevel = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type ClaimRiskLevel = z.infer<typeof ClaimRiskLevel>;

// 2. Enum de Tipo de Produto
export const ProductTypeEnum = z.enum(["AFFILIATE", "PROPRIETARY_LOW_TICKET"]);
export type ProductTypeEnum = z.infer<typeof ProductTypeEnum>;

// 3. Schema de item de Concorrente Mapeado
export const CompetitorItemSchema = z.object({
  name: z.string().min(1, "O nome do concorrente é obrigatório."),
  url: z.string().url("A URL do concorrente deve ser um link válido."),
  price: z.number().nonnegative("O preço deve ser um valor numérico positivo."),
  angle: z.string().min(1, "O ângulo de vendas/headline do concorrente é obrigatório.")
});
export type CompetitorItem = z.infer<typeof CompetitorItemSchema>;

// 4. Schema de Claims Analisadas (Compliance Sentinel / Kill Switch)
export const AnalyzedClaimItemSchema = z.object({
  claim: z.string().min(1, "A declaração/termo da claim é obrigatória."),
  sourceCompetitor: z.string().min(1, "A fonte da claim (concorrente ou URL) é obrigatória."),
  riskLevel: ClaimRiskLevel,
  justification: z.string().min(1, "A justificativa de classificação do risco é obrigatória.")
});
export type AnalyzedClaimItem = z.infer<typeof AnalyzedClaimItemSchema>;

// 5. Schema Completo de Retorno do Agent Studio (ad-scout-oracle Contract)
export const AdScoutOracleOutputSchema = z.object({
  query: z.string().min(1, "A palavra-chave de pesquisa é obrigatória."),
  productType: ProductTypeEnum.default("AFFILIATE"),
  adCount: z.number().int().nonnegative("A contagem de anúncios deve ser um número inteiro."),
  avgPrice: z.number().nonnegative("O preço médio de mercado deve ser um valor positivo."),
  competitors: z.array(CompetitorItemSchema).default([]),
  audiencePain: z.array(z.string()).min(1, "O agente precisa capturar ao menos uma dor real da audiência."),
  anglesSuggested: z.array(z.string()).min(1, "O agente precisa sugerir ao menos um ângulo de copy."),
  analyzedClaims: z.array(AnalyzedClaimItemSchema).default([])
});
export type AdScoutOracleOutput = z.infer<typeof AdScoutOracleOutputSchema>;

// 6. Schema de Requisição da Rota do Wizard para o Backend (Input)
export const MarketResearchRequestSchema = z.object({
  query: z.string().min(2, "Palavra-chave curta demais para pesquisa."),
  productResearchId: z.string().optional(),
  campaignId: z.string().optional(),
  productType: ProductTypeEnum.default("AFFILIATE")
});
export type MarketResearchRequest = z.infer<typeof MarketResearchRequestSchema>;
```

---

## 3. O CORAÇÃO DO COMPLIANCE: O "KILL SWITCH" NO `content-qa`

Para que as decisões baseadas no nível de risco das claims funcionem de verdade (como sugerido pelo Platform Assistant), o `content-qa` utilizará a seguinte lógica de validação durante o fluxo de geração de copy:

```typescript
/**
 * Validador de Compliance Pré-lançamento (Kill Switch)
 * Se a copy gerada pela IA de copy (content-director) contiver termos de risco HIGH
 * detectados pelo ad-scout-oracle na pesquisa de mercado, a campanha é travada e enviada para reescrita.
 */
export function verifyComplianceKillSwitch(
  generatedCopy: string,
  analyzedClaims: AnalyzedClaimItem[]
): { passed: boolean; offendingClaims: string[] } {
  // Filtra apenas as claims com risco HIGH ou MEDIUM que devem ser bloqueadas
  const dangerClaims = analyzedClaims.filter(item => item.riskLevel === "HIGH");
  const offendingClaims: string[] = [];

  for (const item of dangerClaims) {
    // Escapa caracteres especiais de regex para evitar quebra no check
    const escapedClaim = item.claim.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedClaim}\\b`, "i");

    if (regex.test(generatedCopy)) {
      offendingClaims.push(`${item.claim} (Motivo: Risco HIGH detectado em concorrentes - ${item.justification})`);
    }
  }

  return {
    passed: offendingClaims.length === 0,
    offendingClaims
  };
}
```

---

## 4. IMPACTO DE REPROCESSAMENTO NO OBSIDIAN (PREVISÃO DE VERSIONAMENTO)

Respondendo à questão de versionamento levantada:
*   **Tratamento Semântico e Retrocompatível:** O campo `analyzedClaims` nas tabelas do Prisma é um JSON padronizado com fallback default para `[]`.
*   **Zero quebra do Obsidian:** As notas existentes mantêm a sua integridade. As novas execuções que utilizarem o prompt atualizado (`ad-scout-oracle` V2) gravarão o novo metadado `analyzedClaims` em formato JSON bonito e legível nas notas do Obsidian através do `obsidianSync.ts`, fornecendo ao seu cofre do Obsidian um histórico riquíssimo de claims e riscos de mercado que não existia antes.
