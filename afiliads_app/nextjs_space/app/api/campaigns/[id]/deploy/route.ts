export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  campaignSlug,
  campaignWorkspace,
  manifestPath,
  readJsonFile,
  runWithMockFallback,
  withCampaignFileLock,
  withCampaignLock,
} from '@/lib/antigravity';

type DeploySummary = {
  status?: string;
  deployed_at?: string;
  landing_page_zip?: string;
  ebook_pdf?: string;
  ebook_html?: string;
  payment_integration?: {
    platform?: string;
    checkout_url?: string;
    webhook_url?: string;
  };
};

function isCompletedManifest(manifest: Record<string, unknown>): boolean {
  const deploy = manifest.deploy;
  return Boolean(
    manifest.status === 'ready_for_deploy' &&
    deploy &&
    typeof deploy === 'object' &&
    typeof (deploy as DeploySummary).payment_integration?.checkout_url === 'string',
  );
}

function responsePayload(manifest: Record<string, unknown>, mode: 'LIVE' | 'MOCK', idempotent: boolean) {
  const deploy = (manifest.deploy ?? {}) as DeploySummary;
  return {
    status: manifest.status ?? deploy.status ?? 'unknown',
    checkoutUrl: deploy.payment_integration?.checkout_url ?? null,
    ebookPdf: deploy.ebook_pdf ?? null,
    ebookHtml: deploy.ebook_html ?? null,
    landingPageZip: deploy.landing_page_zip ?? null,
    webhookUrl: deploy.payment_integration?.webhook_url ?? null,
    deployedAt: deploy.deployed_at ?? null,
    mode,
    idempotent,
  };
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId },
      select: { id: true, name: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const slug = campaignSlug(campaign.name);
    return withCampaignLock(campaign.id, () => withCampaignFileLock(campaign.name, async () => {
      let manifest: Record<string, unknown>;
      try {
        manifest = await readJsonFile(manifestPath(campaign.name));
        if (isCompletedManifest(manifest)) {
          return NextResponse.json(responsePayload(manifest, 'LIVE', true));
        }
      } catch {
        manifest = {};
      }

      const result = await runWithMockFallback('deploy_product.py', ['--campaign-slug', slug]);
      if (!result.ok) {
        return NextResponse.json({ error: 'Falha ao executar deploy do produto', mode: result.mode }, { status: 502 });
      }

      try {
        manifest = await readJsonFile(manifestPath(campaign.name));
      } catch {
        return NextResponse.json({ error: 'Deploy concluído sem manifest.json válido', mode: result.mode }, { status: 502 });
      }
      if (!isCompletedManifest(manifest)) {
        return NextResponse.json({ error: 'Deploy concluído sem resumo válido no manifest', mode: result.mode }, { status: 502 });
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'ready_for_deploy' },
      });
      return NextResponse.json(responsePayload(manifest, result.mode, false));
    }));
  } catch (error) {
    console.error('POST campaigns/deploy error:', error);
    return NextResponse.json({ error: 'Erro interno ao fazer deploy' }, { status: 500 });
  }
}
