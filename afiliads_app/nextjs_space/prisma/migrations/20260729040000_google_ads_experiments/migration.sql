-- NÃO APLICADO. Gerado manualmente para revisão (Tarefa 3 do plano
-- .hermes/plans/2026-07-29_023051-google-ads-experiments-wizard.md).
--
-- Este arquivo NÃO foi executado contra nenhum banco (local ou Railway) nesta sessão.
-- O projeto nunca usou `prisma migrate` (só `prisma db push`), então não existe histórico de
-- migrations/_prisma_migrations aqui. Antes de rodar `prisma migrate deploy` com este arquivo:
--   1. Confirmar DATABASE_URL alvo (mascarado) e fazer backup do Railway (ver plano, Tarefa 16).
--   2. Rodar primeiro em staging/local, nunca direto em produção.
--   3. Autorização humana explícita — não é objeto desta unidade (Tarefa 3 só entrega o SQL
--      revisável, a aplicação real fica para a Tarefa 16 "Migração e rollout").
--
-- Escopo: cria 4 tabelas novas (GoogleAdsExperiment, GoogleAdsExperimentArm,
-- GoogleAdsExperimentOperation, GoogleAdsExperimentMetricSnapshot). Não altera nenhuma
-- tabela existente — os 8 campos-protótipo já aplicados em "Campaign" via db push
-- permanecem intocados (legado temporário, ver comentário em schema.prisma).

-- CreateTable
CREATE TABLE "GoogleAdsExperiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "googleExperimentId" TEXT,
    "resourceName" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SEARCH_CUSTOM',
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trafficAllocationType" TEXT NOT NULL DEFAULT 'SEARCH_CUSTOM',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "variationType" TEXT NOT NULL DEFAULT 'PRESELL_URL',
    "variationConfig" JSONB,
    "budgetRecommendation" JSONB,
    "decisionPolicy" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastMetricsAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsExperimentArm" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "trafficSplit" INTEGER NOT NULL,
    "googleArmId" TEXT,
    "resourceName" TEXT,
    "inDesignCampaignResourceName" TEXT,
    "servedCampaignResourceName" TEXT,
    "googleCampaignId" TEXT,
    "localPresellId" TEXT,
    "finalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsExperimentArm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsExperimentOperation" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleAdsExperimentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsExperimentMetricSnapshot" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "controlImpressions" INTEGER NOT NULL DEFAULT 0,
    "controlClicks" INTEGER NOT NULL DEFAULT 0,
    "controlCostMicros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "controlConversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "controlConversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "treatmentImpressions" INTEGER NOT NULL DEFAULT 0,
    "treatmentClicks" INTEGER NOT NULL DEFAULT 0,
    "treatmentCostMicros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "treatmentConversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "treatmentConversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statistics" JSONB,
    "sourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAdsExperimentMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsExperiment_userId_idempotencyKey_key" ON "GoogleAdsExperiment"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsExperiment_userId_googleExperimentId_key" ON "GoogleAdsExperiment"("userId", "googleExperimentId");

-- CreateIndex
CREATE INDEX "GoogleAdsExperiment_userId_status_idx" ON "GoogleAdsExperiment"("userId", "status");

-- CreateIndex
CREATE INDEX "GoogleAdsExperiment_campaignId_idx" ON "GoogleAdsExperiment"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsExperimentArm_experimentId_name_key" ON "GoogleAdsExperimentArm"("experimentId", "name");

-- CreateIndex
CREATE INDEX "GoogleAdsExperimentArm_experimentId_idx" ON "GoogleAdsExperimentArm"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsExperimentOperation_operationName_key" ON "GoogleAdsExperimentOperation"("operationName");

-- CreateIndex
CREATE INDEX "GoogleAdsExperimentOperation_experimentId_idx" ON "GoogleAdsExperimentOperation"("experimentId");

-- CreateIndex
CREATE INDEX "GoogleAdsExperimentOperation_status_idx" ON "GoogleAdsExperimentOperation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsExperimentMetricSnapshot_experimentId_snapshotDate_key" ON "GoogleAdsExperimentMetricSnapshot"("experimentId", "snapshotDate");

-- CreateIndex
CREATE INDEX "GoogleAdsExperimentMetricSnapshot_experimentId_idx" ON "GoogleAdsExperimentMetricSnapshot"("experimentId");

-- AddForeignKey
ALTER TABLE "GoogleAdsExperiment" ADD CONSTRAINT "GoogleAdsExperiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsExperiment" ADD CONSTRAINT "GoogleAdsExperiment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsExperimentArm" ADD CONSTRAINT "GoogleAdsExperimentArm_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "GoogleAdsExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsExperimentOperation" ADD CONSTRAINT "GoogleAdsExperimentOperation_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "GoogleAdsExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsExperimentMetricSnapshot" ADD CONSTRAINT "GoogleAdsExperimentMetricSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "GoogleAdsExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
