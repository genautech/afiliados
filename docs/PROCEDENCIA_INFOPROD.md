# Procedência: o que veio de `~/infoprod` e como usar aqui

**Data da importação:** 2026-08-28
**Origem:** `/Users/genautech/infoprod` (fábrica de infoprodutos própria) e
`/Users/genautech/infoprod/protegido-ai-assistant/frameworks` (métodos "Human").

## Por que existe este documento

O AfiliAds é **agnóstico de marca**: cada campanha promove um produto diferente,
de um dono diferente, com tom, paleta e claims diferentes. A fábrica de origem é
o oposto — ela existe para uma marca só, com DNA fixo.

Ao trazer os agentes, skills e frameworks para cá, **todo DNA de marca foi
removido**. O que sobrou é o *método*. A identidade concreta entra em tempo de
execução, por campanha, via **Brand Kit** (`brandkit/` ou o registro `BrandKit`
no banco).

## Regra de ouro

> Nenhum arquivo deste repositório pode conter paleta, tipografia, tom de voz,
> claim ou prova de uma marca específica. Se precisar de identidade, leia o
> Brand Kit da campanha. Se ele não existir, gere ou pergunte — nunca invente
> nem reuse a identidade de outra campanha.

## O que foi copiado

| Destino | Origem | Natureza |
|---|---|---|
| `frameworks/human-dna/` | `protegido-ai-assistant/frameworks/Human DNA` | Método de extração de DNA de marca/audiência a partir de fontes reais |
| `frameworks/human-carousel/` | `.../Human Carroussel` | Método de carrossel social |
| `frameworks/human-images/` | `.../Human Images` | Direção de imagem / prompt de geração |
| `frameworks/human-motion/` | `.../Human Motion` | Vídeo curto e motion |
| `frameworks/human-social/` | `.../Human Social` | Distribuição social |
| `frameworks/human-cinematic/` | `.../Human Cinematic` | Peça cinematográfica |
| `frameworks/human-skills/` | `.../Skills` | Engine de skills |
| `frameworks/ebook-os/` | `infoprod/frameworks/prospera-ebook-os` | Schemas de produção (product-brief, claim-ledger, editorial-matrix, format-decision, RACI, experiment-card) + validador |
| `frameworks/agentes-referencia/` | `infoprod/.agents/agents` | 6 definições de agente, em prosa, usadas como fonte dos system prompts |
| `.claude/skills/afiliads-*` | `infoprod/.agents/skills` | 27 skills de produção de peça, renomeadas com prefixo `afiliads-` |

## O que **não** foi copiado

- `dna/` da marca de origem (paleta, tipografia, tom, assets `.svg`)
- `conhecimento/` e `dados/` da marca (fatos de produto, concorrentes, personas)
- `produtos/` (produtos concretos da fábrica)
- Relatórios de auditoria internos (`*_REPORT.md`)

## Não conflitar com `~/infoprod`

1. **Prefixo obrigatório.** Toda skill importada vive em
   `.claude/skills/afiliads-<nome>`. A fábrica continua usando `<nome>` sem
   prefixo. Os dois conjuntos podem coexistir na mesma sessão do Claude Code sem
   ambiguidade.
2. **Sem caminho absoluto cruzado.** Nenhum arquivo daqui lê de `~/infoprod`,
   `~/notes` ou do vault da fábrica. Os scripts leem de `brandkit/` (override por
   `AFILIADS_BRANDKIT`).
3. **Sem escrita cruzada.** Nada aqui escreve em `~/infoprod`.
4. **Divergência é esperada.** Estas cópias são um *fork* datado. Correções feitas
   aqui não voltam automaticamente para a fábrica, e vice-versa. Se um método
   evoluir muito lá, reimporte conscientemente e refaça a limpeza de marca.

## Fronteira de domínio

| Situação | Onde |
|---|---|
| Promover oferta de terceiro (ClickBank, Hotmart, MaxWeb…) | AfiliAds — vertical `AFFILIATE` |
| Criar e vender e-book/low-ticket próprio | AfiliAds — vertical `PROPRIETARY_LOW_TICKET` |
| Captar lead para mentoria/high-ticket | AfiliAds — vertical `MENTORSHIP` |
| Produzir o catálogo da marca da fábrica, com o DNA dela | `~/infoprod` |

## O que virou código no app (2026-08-28)

Os métodos importados não são lidos em runtime pelo app — foram destilados em
prompts de agentes. Quem executa é:

| Arquivo | Papel |
|---|---|
| `afiliads_app/nextjs_space/lib/product-agents.ts` | 7 agentes de produto próprio (spec + schema Zod de entrada/saída + runner) |
| `afiliads_app/nextjs_space/lib/product-agent-route.ts` | fábrica de handler Next (sessão, validação, `campaignTarget`) |
| `afiliads_app/nextjs_space/lib/agents.ts` | registro dos 8 agentes novos para a tela `/agentes` e `/api/agent-test` |
| `afiliads_app/nextjs_space/app/(app)/wizard/_components/product-studio.tsx` | UI de 7 abas no Passo 1, só para produto próprio/mentoria |

Rotas criadas: `/api/brand-kit`, `/api/offer-design`, `/api/claims`,
`/api/content-architecture`, `/api/copy-qa`, `/api/visual-system`,
`/api/launch-plan`.

Nenhum agente carrega paleta, fonte, tom ou claim fixos: tudo vem do input da
campanha ou do Brand Kit gerado. O `brandkit/` na raiz é template em branco.
