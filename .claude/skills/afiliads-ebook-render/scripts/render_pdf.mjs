#!/usr/bin/env node
// HTML -> PDF para e-book. Roda via: npx -y puppeteer node scripts/render_pdf.mjs ...
// Espera fontes carregarem, força impressão de cores de fundo e evita quebra
// de página dentro de blocos.
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const args = Object.fromEntries(
  argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

if (!args.in || !args.out) {
  console.error('uso: render_pdf.mjs --in page.html --out book.pdf [--format A4|Letter] [--bleed 3mm]');
  exit(1);
}
if (!existsSync(args.in)) {
  console.error(`arquivo não encontrado: ${args.in}`);
  exit(1);
}

const { default: puppeteer } = await import('puppeteer');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

await page.goto(pathToFileURL(args.in).href, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);

await page.addStyleTag({
  content: `
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .card, .callout, figure, .quiz, .checklist, table { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
    .no-print, .btn, nav { display: none !important; }
  `,
});

const margin = args.bleed
  ? { top: args.bleed, right: args.bleed, bottom: args.bleed, left: args.bleed }
  : { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' };

await page.pdf({
  path: args.out,
  format: args.format || 'A4',
  printBackground: true,
  preferCSSPageSize: !!args.cssPageSize,
  margin,
});

await browser.close();
console.log(args.out);
