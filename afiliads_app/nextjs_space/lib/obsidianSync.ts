import { prisma } from './prisma';

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export interface ObsidianLearningEntry {
  title: string;
  body: string;
  tags?: string[];
}

// Registra um evento de aprendizado real (não decisão de UI, não log de debug) no formato de
// execução do Hermes Agent (~/.hermes/hermes-agent, gateway em background) que escreve em
// ~/Vaults/notes/Conhecimento/Execucoes/<projeto>/. O vault Obsidian só existe na máquina local
// do usuário (produção/Railway não tem esse filesystem), então em vez de tentar escrever direto
// (que era no-op silencioso em produção), sempre enfileira em HermesOutboxEntry — o mesmo banco
// Postgres compartilhado entre local e produção. Um processo rodando local
// (scripts/process_hermes_outbox.js, via cron) consome a fila e escreve o arquivo de verdade,
// tanto pra entradas geradas localmente quanto em produção. Nunca lança erro que derrube o
// caller — esse log é best-effort por natureza.
export async function logLearningToObsidian(entry: ObsidianLearningEntry): Promise<void> {
  try {
    const now = new Date();
    const tags = ['conhecimento/execucao', 'projeto/afiliados', ...(entry.tags ?? [])];
    const content = `---
tipo: execucao
projeto: afiliados
agente: AfiliAds (Claude Code)
data: ${now.toISOString()}
status: concluida
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
---

# Execução · ${entry.title}

${entry.body}
`;
    const fileName = `${now.toISOString().replace(/[:.]/g, '-')}-afiliads-${slugify(entry.title)}.md`;
    await prisma.hermesOutboxEntry.create({
      data: {
        type: 'obsidian-learning',
        targetPath: `Vaults/notes/Conhecimento/Execucoes/afiliados/${fileName}`,
        payload: { content },
      },
    });
  } catch (e: any) {
    console.error('[obsidian-sync] falha ao enfileirar entrada de aprendizado (não bloqueia o caller):', e?.message);
  }
}
