# Brand Kit — identidade por campanha

O AfiliAds é agnóstico de marca. Nenhum agente, skill ou framework deste
repositório carrega paleta, tipografia, tom ou claim de uma marca específica.
Tudo isso vive aqui, **por campanha**, e é injetado em tempo de execução.

## Dois modos de uso

**1. Arquivos (Claude Code / scripts locais).**
Os scripts das skills (`tokens.py`, `briefing.py`, `slopcheck.py`) leem desta
pasta. Para trabalhar em outra campanha sem mexer aqui, aponte a variável:

```bash
export AFILIADS_BRANDKIT=~/afiliados/brandkits/minha-campanha
```

**2. Banco (app AfiliAds).**
O modelo `BrandKit` do Prisma guarda os mesmos campos por `campaignId`. O
wizard preenche via agente `brand-dna-extractor` e o usuário edita. Os agentes
de produção recebem o Brand Kit serializado no `userPrompt`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `brand-visual.md` | Paleta, tipografia, raio, grid, estilo de imagem, do-not |
| `brand-voice.md` | Tom, léxico, ritmo, o que nunca dizer |
| `fatos-produto.md` | Fatos verificáveis do produto — a única fonte de claim |
| `assets/` | Logos, mockups, fotos aprovadas da campanha |

Os três `.md` começam como template com placeholders `<...>`. Um template com
placeholder ainda dentro **não** é um Brand Kit válido: os validadores tratam
como ausente.
