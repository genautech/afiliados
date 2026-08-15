import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const documents = [
  "plano-mestre.html",
  "tese-de-investimento.html",
  "rascunho-aplicacao.html",
  "pitch-deck-vencedor.html",
  "modelo-financeiro-12m.html",
  "analise-de-mercado.html",
  "estrategia-google-cloud.html",
  "contexto-de-produto.html",
  "programa-e-formulario.html",
  "roteiro-pitch-deck.html",
];

const load = (path) => readFile(new URL(path, root), "utf8");

test("portal exposes the official deadline and working materials", async () => {
  const html = await load("index.html");
  assert.match(html, /datetime="2026-09-28"/);
  assert.match(html, /airtable\.com\/appwuiPjoHvDDvrlY/);
  assert.match(html, /pitch-deck-rascunho\.pdf/);
  assert.match(html, /guia-perguntas-rascunho\.pdf/);
  assert.doesNotMatch(html, /href="[^"]+\.md"/);
  assert.doesNotMatch(html, /474 casos/);
});

test("all generated documents are readable HTML pages", async () => {
  for (const document of documents) {
    const html = await load(document);
    assert.match(html, /<article class="prose">/);
    assert.match(html, /href="index\.html#documentos"/);
  }
});

test("all local portal links resolve to files", async () => {
  const html = await load("index.html");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1].split("#")[0])
    .filter((href) => href && !href.startsWith("http"));
  for (const href of new Set(hrefs)) await access(new URL(href, root));
});

test("interaction and numeric readability safeguards remain present", async () => {
  const [script, css] = await Promise.all([load("portal.js"), load("portal.css")]);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /2026-09-28T23:59:59-03:00/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /\.submission-bar/);
  assert.match(css, /\.readiness-grid/);
});
