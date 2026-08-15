import { prisma } from '../prisma';
import { toExperimentDetailDTO } from './orchestration';

export async function getExperimentDetail(id: string, userId: string, deps?: any) {
  const prismaClient = deps?.prisma ?? prisma;

  const exp = await prismaClient.googleAdsExperiment.findFirst({
    where: { id, userId },
    include: {
      arms: { orderBy: { isControl: 'desc' } },
      operations: { orderBy: { startedAt: 'desc' }, take: 1 },
      metricSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
    },
  });

  if (!exp) {
    throw { status: 404, message: 'Experimento não encontrado' };
  }

  return toExperimentDetailDTO(exp);
}