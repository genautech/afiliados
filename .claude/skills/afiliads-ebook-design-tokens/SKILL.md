---
name: afiliads-ebook-design-tokens
description: >
  Deriva o sistema de design de um e-book — paleta, tipografia, escala,
  padrão de capa — a partir do preset do produto e do tipo de conteúdo, e
  emite um tokens.json que todas as outras skills consomem. Use antes de
  gerar capa, ilustração, miolo ou versão interativa. Também use quando o
  usuário pedir "define o visual", "qual paleta", "cria o preset do produto
  novo". Chamada normalmente pelo afiliads-ebook-art-director, não direto.
license: MIT
metadata:
  version: "0.1"
  status: esqueleto
  category: design
---

# afiliads-ebook-design-tokens

Ponto único onde cor, tipo e espaçamento são decididos. Todo o resto herda.

Inspirado no padrão arquitetural “conteúdo → tokens → capa → miolo” atribuído
ao `minimax-pdf` (MiniMax-AI/skills). Isso é referência arquitetural, **não
dependência executável**: nenhuma execução deve chamar `minimax-pdf` ou assumir
que `frameworks/refs/minimax-skills/` existe. O DNA e os scripts locais
são as únicas fontes operacionais.

## Entrada

`preset` (obrigatório) + `tipo` do e-book + `promessa`.

Se o preset não existir na seção 5 de `brandkit/brand-visual.md`,
**parar e propor um preset novo** para o usuário aprovar — nunca gerar cor
solta.

## Tipos de e-book → padrão de capa

| Tipo | Padrão de capa | Clima |
|---|---|---|
| `guia-pratico` | `poster` | Título gigante, barra lateral, sem imagem |
| `metodo` | `stripe` | Faixas do accent, numeração forte |
| `checklist` | `minimal` | Fundo claro, uma régua de accent |
| `dossie` | `fullbleed` | Fundo escuro, textura, autoridade |
| `historia` | `magazine` | Imagem herói, título centralizado |
| `workbook` | `frame` | Moldura interna, cara de caderno |
| `defesa-pessoal` | `fullbleed` | Escuro + terracota, tensão controlada |

O padrão é sugestão, não lei: o `afiliads-ebook-art-director` pode sobrescrever se o
conceito aprovado pedir outro. O que não pode mudar é a paleta do preset.

## Saída — `tokens.json`

```json
{
  "preset": "sair-ilesa",
  "tipo": "defesa-pessoal",
  "cover_pattern": "fullbleed",
  "color": { "bg": "#f5ead8", "surface": "#ebddc5", "text": "#201e1d",
             "accent": "#c67139", "accent2": "#7a8a5e" },
  "ramps": { "neutral": ["#f9f4ed", "..."], "accent": ["#fff2eb", "..."] },
  "font": { "heading": "Caprasimo", "body": "Figtree" },
  "scale": { "cover_title": 96, "h1": 40, "h2": 28, "body": 17, "caption": 13 },
  "radius": { "md": 16, "lg": 28 },
  "shadow": { "md": "0 3px 10px rgba(46,43,37,0.16)",
              "lg": "0 12px 32px rgba(46,43,37,0.22)" }
}
```

## Uso

```bash
python3 scripts/tokens.py --preset sair-ilesa --tipo defesa-pessoal \
  --out entregas/2026-08-08_sair-ilesa_capa/tokens.json
```

## TODO (esqueleto)

- [ ] `scripts/tokens.py` lendo os presets direto do DNA em vez de tabela
      embutida
- [ ] `references/padroes-de-capa.md` com o desenho de cada padrão
      (portar de `refs/minimax-skills/skills/minimax-pdf/design/design.md`)
- [ ] Emitir também um `tokens.css` com as custom properties, para o
      `afiliads-ebook-interactive` importar sem duplicar valores
