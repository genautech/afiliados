---
name: afiliads-ebook-render
description: >
  Renderiza o entregável final do e-book — HTML para PDF pronto para
  impressão/download, EPUB, e os recortes de imagem para checkout e social.
  Use quando o pedido for "exporta", "gera o PDF", "versão pra download",
  "EPUB", "manda pro checkout", "arquivo final". Chamada normalmente pelo
  afiliads-ebook-art-director no fim do fluxo.
license: MIT
metadata:
  version: "0.1"
  status: esqueleto
  category: document-generation
---

# afiliads-ebook-render

Último passo. Não decide nada visual — só materializa o que já foi aprovado.

## Rotas

| Entregável | Ferramenta | Saída |
|---|---|---|
| PDF para download | Puppeteer (`scripts/render_pdf.mjs`) | A4 ou 6×9in, com sangria |
| PDF para KDP | Puppeteer + margens de encadernação | 6×9in, PDF/X quando exigido |
| EPUB | pandoc a partir do HTML semântico | `.epub` |
| Capa isolada | recorte do HTML da capa | 1600×2560 PNG |
| Recortes sociais | mesmo HTML, viewports diferentes | 1080×1080, 1080×1350 |

## PDF — o que costuma quebrar

1. **Fonte não carregada** — esperar `document.fonts.ready` antes de imprimir,
   ou o PDF sai em fallback do sistema.
2. **`print-color-adjust`** — sem `-webkit-print-color-adjust: exact`, fundos
   coloridos somem no PDF.
3. **Quebra de página no meio de um bloco** — `break-inside: avoid` em card,
   callout, quiz e figura.
4. **Interação em PDF** — quiz e checklist viram versão estática. A skill
   troca o componente, não some com ele.

## Uso

```bash
node scripts/render_pdf.mjs \
  --in entregas/2026-08-08_sair-ilesa_miolo/index.html \
  --out entregas/2026-08-08_sair-ilesa_miolo/sair-ilesa.pdf \
  --format A4
```

Puppeteer roda via `npx` — sem instalar nada global no Mac.

## TODO (esqueleto)

- [ ] `scripts/render_pdf.mjs` (rascunho já no diretório) — validar com o
      e-book real antes de considerar pronto
- [ ] Preset 6×9in com margem de encadernação para KDP
- [ ] Rota EPUB via pandoc
- [ ] Portar as specs de capa por plataforma de
      `arturseo-geo/ebook-publishing-skill` (11 plataformas)
