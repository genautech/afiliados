import { prisma } from '@/lib/prisma';

export type RelevantKnowledgeInsight = {
  id: string;
  videoUrl: string;
  title: string;
  channel: string | null;
  vertical: string | null;
  summary: string;
  insights: unknown;
  tags: string[];
  createdAt: Date;
};

/**
 * Busca conhecimento global aplicável à vertical e às tags do produto.
 * A consulta é deliberadamente limitada e ordenada por recência para evitar
 * carregar o histórico inteiro no contexto dos agentes.
 */
export async function getRelevantInsights(
  vertical: string,
  tags: string[],
): Promise<RelevantKnowledgeInsight[]> {
  const normalizedVertical = vertical.trim();
  const normalizedTags = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  ).slice(0, 50);

  const filters = [
    ...(normalizedVertical
      ? [
          { vertical: { equals: normalizedVertical, mode: 'insensitive' as const } },
          { tags: { has: normalizedVertical } },
          { campaigns: { some: { vertical: { equals: normalizedVertical, mode: 'insensitive' as const } } } },
        ]
      : []),
    ...(normalizedTags.length ? [{ tags: { hasSome: normalizedTags } }] : []),
  ];

  if (!filters.length) return [];

  return prisma.globalKnowledgeInsight.findMany({
    where: { OR: filters },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      videoUrl: true,
      title: true,
      channel: true,
      vertical: true,
      summary: true,
      insights: true,
      tags: true,
      createdAt: true,
    },
  });
}
