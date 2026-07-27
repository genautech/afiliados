// fs/path são importados dinamicamente (dentro da função, não no topo do módulo) de propósito:
// este arquivo é alcançado por instrumentation.ts (que o Next.js tenta empacotar também pro
// runtime edge, além do nodejs) — import estático de 'fs'/'path' quebra o build nesse bundle
// edge ("Module not found"). Import dinâmico só resolve quando a função roda de verdade (sempre
// em runtime nodejs, nunca edge, por causa do guard em instrumentation.ts).

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export interface ObsidianLearningEntry {
  title: string;
  body: string;
  tags?: string[];
}

// Registra um evento de aprendizado real (não decisão de UI, não log de debug) no formato de
// execução do Hermes Agent (~/.hermes/hermes-agent, gateway em background) que já escreve em
// ~/Vaults/notes/Conhecimento/Execucoes/<projeto>/ — usado aqui só como convenção de arquivo
// (frontmatter + estrutura), sem chamar a API/CLI do Hermes de verdade. Só existe na máquina
// local do usuário (Obsidian é local); em produção (Railway) não existe esse filesystem, então
// isso é best-effort — nunca lança erro que derrube o caller. Cada chamada cria UM arquivo novo
// (mesma convenção do Hermes real: um arquivo por execução).
export async function logLearningToObsidian(entry: ObsidianLearningEntry): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const home = process.env.HOME;
    if (!home) return;
    const dir = path.join(home, 'Vaults', 'notes', 'Conhecimento', 'Execucoes', 'afiliados');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const now = new Date();
    const iso = now.toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${iso}-afiliads-${slugify(entry.title)}.md`);
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
    fs.writeFileSync(file, content, 'utf8');
  } catch (e: any) {
    console.error('[obsidian-sync] falha ao gravar entrada de aprendizado (não bloqueia o caller):', e?.message);
  }
}
