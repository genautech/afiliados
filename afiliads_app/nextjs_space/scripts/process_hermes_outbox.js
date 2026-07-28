// Processa a fila HermesOutboxEntry (banco Postgres compartilhado local/produção) e escreve os
// arquivos de verdade no filesystem local (hermes/knowledge/insights e ~/Vaults/notes) — só
// roda aqui porque só a máquina local tem esse filesystem (produção/Railway não tem).
// Rodado via cron local (ver crontab: HERMES_OUTBOX_PROCESS). Sai rápido se a fila estiver vazia.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const HOME = os.homedir();
const AFILIADOS_ROOT = path.join(HOME, 'afiliados');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function processEntry(entry) {
  if (entry.type === 'market-intel-insight') {
    const { header, entry: entryText, indexId, indexRow, indexFile } = entry.payload;
    const filePath = path.join(AFILIADOS_ROOT, entry.targetPath);
    ensureDir(filePath);
    let existing = '';
    try { existing = fs.readFileSync(filePath, 'utf8'); } catch { /* arquivo ainda não existe */ }
    if (!existing) {
      fs.writeFileSync(filePath, header + entryText, 'utf8');
    } else {
      fs.appendFileSync(filePath, entryText, 'utf8');
    }

    if (indexFile) {
      const indexPath = path.join(AFILIADOS_ROOT, indexFile);
      try {
        let content = fs.readFileSync(indexPath, 'utf8');
        if (!content.includes(indexId)) {
          const lastRowMarker = '| _(gere via Hermes após ingestão)_ |';
          content = content.includes(lastRowMarker) ? content.replace(lastRowMarker, indexRow + lastRowMarker) : content + indexRow;
          fs.writeFileSync(indexPath, content, 'utf8');
        }
      } catch {
        // índice ainda não existe — mesma semântica que o comportamento anterior (silenciosamente pula)
      }
    }
    return;
  }

  if (entry.type === 'obsidian-learning') {
    const { content } = entry.payload;
    const filePath = path.join(HOME, entry.targetPath);
    ensureDir(filePath);
    fs.writeFileSync(filePath, content, 'utf8');
    return;
  }

  throw new Error(`Tipo de outbox desconhecido: ${entry.type}`);
}

async function main() {
  const pending = await prisma.hermesOutboxEntry.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 50 });
  if (pending.length === 0) {
    console.log(`[${new Date().toISOString()}] fila vazia, nada a fazer`);
    await prisma.$disconnect();
    return;
  }

  let ok = 0, fail = 0;
  for (const e of pending) {
    try {
      await processEntry(e);
      await prisma.hermesOutboxEntry.update({ where: { id: e.id }, data: { status: 'synced', processedAt: new Date() } });
      ok++;
    } catch (err) {
      console.error(`[hermes-outbox] falha ao processar ${e.id} (${e.type}):`, err.message);
      await prisma.hermesOutboxEntry.update({ where: { id: e.id }, data: { status: 'failed', processedAt: new Date() } });
      fail++;
    }
  }
  console.log(`[${new Date().toISOString()}] processados ${ok} ok, ${fail} falha(s)`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('[hermes-outbox] erro fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
