// Backfill idempotente: Campaign (campos-protótipo isExperiment/...) -> GoogleAdsExperiment
// + arms. Modo dry-run por padrão (só lê e imprime o plano); requer `--apply` explícito para
// escrever. Pressupõe que as 4 tabelas novas já existem no banco alvo (aplicadas via
// prisma/migrations/20260729040000_google_ads_experiments depois de gate humano e backup —
// ver Tarefa 16 do plano). NÃO roda `prisma db push`/`migrate` nem cria tabela nenhuma.
//
// Uso:
//   tsx --require dotenv/config scripts/backfill-google-ads-experiments.ts            (dry-run)
//   tsx --require dotenv/config scripts/backfill-google-ads-experiments.ts --apply     (grava)
//
// Não foi executado nesta sessão — DATABASE_URL local aponta para o Railway de produção
// (ver AGENTS.md) e a Tarefa 3 do plano proíbe qualquer operação real de banco.

import { PrismaClient, Prisma } from "@prisma/client";
import {
  mapLegacyCampaignToExperimentDraft,
  shouldSkipBackfill,
} from "../lib/google-ads-experiments/backfill";

const APPLY = process.argv.includes("--apply");

async function main() {
  const prisma = new PrismaClient();
  try {
    const legacyCampaigns = await prisma.campaign.findMany({
      where: { isExperiment: true },
      select: {
        id: true,
        userId: true,
        isExperiment: true,
        experimentId: true,
        experimentStatus: true,
        experimentTrafficSplit: true,
        baseCampaignId: true,
        googleTrialCampaignId: true,
        experimentVariationType: true,
        experimentVariationValue: true,
        presellUrl: true,
        googleCampaignId: true,
      },
    });

    if (legacyCampaigns.length === 0) {
      console.log("Nenhuma campanha com isExperiment=true encontrada. Nada a migrar.");
      return;
    }

    const existing = await prisma.googleAdsExperiment.findMany({
      select: { idempotencyKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.idempotencyKey));

    let planned = 0;
    let skipped = 0;

    for (const campaign of legacyCampaigns) {
      const draft = mapLegacyCampaignToExperimentDraft(campaign);
      if (!draft) continue;

      if (shouldSkipBackfill(draft.idempotencyKey, existingKeys)) {
        skipped++;
        console.log(
          `[skip] campaign=${campaign.id} já migrada (idempotencyKey=${draft.idempotencyKey})`
        );
        continue;
      }

      planned++;
      console.log(
        APPLY ? `[apply] campaign=${campaign.id}` : `[dry-run] campaign=${campaign.id}`,
        JSON.stringify(draft, null, 2)
      );

      if (APPLY) {
        await prisma.googleAdsExperiment.create({
          data: {
            ...draft.data,
            variationConfig: draft.data.variationConfig as Prisma.InputJsonValue,
            idempotencyKey: draft.idempotencyKey,
            arms: { create: draft.arms },
          },
        });
      }
    }

    console.log(`\nResumo: ${planned} planejadas, ${skipped} já existentes/skipadas.`);
    if (!APPLY) {
      console.log("Modo dry-run — nada foi escrito. Rode com --apply para persistir.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
