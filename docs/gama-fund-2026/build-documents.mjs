import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const documents = [
  "plano-mestre.md",
  "tese-de-investimento.md",
  "rascunho-aplicacao.md",
  "pitch-deck-vencedor.md",
  "modelo-financeiro-12m.md",
  "analise-de-mercado.md",
  "estrategia-google-cloud.md",
  "contexto-de-produto.md",
  "programa-e-formulario.md",
  "roteiro-pitch-deck.md",
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const slugify = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

function inline(value) {
  let output = escapeHtml(value);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawHref) => {
    const href = rawHref.endsWith(".md") ? rawHref.replace(/\.md$/, ".html") : rawHref;
    const external = /^https?:\/\//.test(href) ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${escapeHtml(href)}"${external}>${label}</a>`;
  });
  return output;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;
  let quote = [];
  let inCode = false;
  let code = [];

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote>${quote.map((line) => `<p>${inline(line)}</p>`).join("")}</blockquote>`);
    quote = [];
  };
  const closeBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith("```")) {
      closeBlocks();
      if (inCode) {
        output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeBlocks();
      const level = heading[1].length;
      const label = heading[2];
      output.push(`<h${level} id="${slugify(label)}">${inline(label)}</h${level}>`);
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[index + 1])) {
      closeBlocks();
      const bodyRows = [];
      let cursor = index + 2;
      while (cursor < lines.length && lines[cursor].trim() && lines[cursor].includes("|")) {
        bodyRows.push(lines[cursor]);
        cursor += 1;
      }
      const rows = [line, ...bodyRows];
      const bodyCount = rows.length - 1;
      const cells = (row) => row.replace(/^\s*\||\|\s*$/g, "").split("|").map((cell) => cell.trim());
      output.push("<div class=\"table-scroll\"><table><thead><tr>" + cells(rows[0]).map((cell) => `<th>${inline(cell)}</th>`).join("") + "</tr></thead><tbody>");
      for (let rowIndex = 1; rowIndex <= bodyCount; rowIndex += 1) {
        output.push("<tr>" + cells(rows[rowIndex]).map((cell) => `<td>${inline(cell)}</td>`).join("") + "</tr>");
      }
      output.push("</tbody></table></div>");
      index = cursor - 1;
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const nextType = ordered ? "ol" : "ul";
      if (listType !== nextType) {
        flushList();
        output.push(`<${nextType}>`);
        listType = nextType;
      }
      output.push(`<li>${inline((ordered || unordered)[1])}</li>`);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    if (!line.trim()) {
      closeBlocks();
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  closeBlocks();
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("\n");
}

function pageTemplate({ source, title, content }) {
  const isDraft = source === "rascunho-aplicacao.md" || source === "pitch-deck-vencedor.md";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(title)} — AfiliAds / Gama Fund 2026">
  <title>${escapeHtml(title)} — AfiliAds</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="document.css">
</head>
<body${isDraft ? ' class="is-draft"' : ""}>
  <a class="skip-link" href="#documento">Pular para o documento</a>
  <header class="document-toolbar">
    <a class="document-brand" href="index.html#documentos" aria-label="Voltar à sala de investimento"><strong>A/</strong><span>Investment room</span></a>
    <div class="document-actions">
      <span>${isDraft ? "Rascunho — não enviar" : "Documento de trabalho"}</span>
      <button type="button" onclick="window.print()">Salvar em PDF</button>
    </div>
  </header>
  <main id="documento" class="document-shell">
    <div class="document-meta"><span>Gama Fund 2026</span><span>Fonte: ${escapeHtml(source)}</span></div>
    <article class="prose">${content}</article>
    <nav class="document-close" aria-label="Fim do documento">
      <a href="index.html#documentos">← Voltar ao índice</a>
      <a href="https://airtable.com/appwuiPjoHvDDvrlY/pagJdmdOat1PfvGBs/form" target="_blank" rel="noreferrer">Formulário oficial ↗</a>
    </nav>
  </main>
</body>
</html>\n`;
}

for (const source of documents) {
  const markdown = await readFile(new URL(source, import.meta.url), "utf8");
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] || basename(source, ".md");
  const output = source.replace(/\.md$/, ".html");
  await writeFile(new URL(output, import.meta.url), pageTemplate({ source, title, content: markdownToHtml(markdown) }));
  console.log(`generated ${output}`);
}
