# Knowledge — YouTube, ebooks e insights

## Por que duas camadas?

Mandar ebook/transcrição inteira no contexto **aumenta custo e piora foco**.
O fluxo certo:

```text
inbox/  →  ingest_source.py  →  youtube/ ou ebooks/
                                    ↓
                         Hermes destila (modelo barato)
                                    ↓
                         insights/ + playbooks/
                                    ↓
                    agente de afiliados carrega só o destilado
```

## Pastas

| Pasta | Conteúdo |
| --- | --- |
| `inbox/` | Drop zone: cole `.md`/`.txt` aqui |
| `youtube/` | Transcrições normalizadas (frontmatter) |
| `ebooks/` | Capítulos/ebooks normalizados |
| `insights/` | Achados acionáveis (curtos) |
| `playbooks/` | Procedimentos estáveis derivados dos insights |

## Como ingerir uma transcrição de YouTube

1. Obtenha o texto (YouTube transcript, Whisper local, ou export do seu tool).
2. Salve como `inbox/yt-titulo-curto.txt` (ou `.md`).
3. Rode:

```bash
python hermes/scripts/ingest_source.py \
  --file hermes/knowledge/inbox/yt-titulo-curto.txt \
  --type youtube \
  --title "Título do vídeo" \
  --url "https://youtube.com/watch?v=..." \
  --tags afiliados,google-ads,presell
```

4. Peça ao Hermes (perfil afiliados):

> Destile `hermes/knowledge/youtube/<arquivo>` em um insight em
> `hermes/knowledge/insights/` com: ideias testáveis, riscos de compliance,
> o que ignorar, e 3 ações para as campanhas atuais.

## Como ingerir um ebook

```bash
python hermes/scripts/ingest_source.py \
  --file hermes/knowledge/inbox/livro.txt \
  --type ebook \
  --title "Nome do livro" \
  --author "Autor" \
  --tags copy,funis
```

Se o ebook for grande, prefira **um arquivo por capítulo** na inbox.

## Template mental do insight (o que importa)

Todo insight deve responder:

1. **O que muda na operação?** (1 frase)
2. **Testes concretos** (hipótese → métrica → critério kill/scale)
3. **Compliance** (o que NÃO copiar)
4. **Projetos impactados** (afiliados / landing / mkt…)
5. **Fonte** (link/arquivo + data de ingestão)

## Reuso em outros projetos

O mesmo padrão de pastas pode ser copiado para landing/mkt/billing/gws.
Mantenha insights **por domínio**; se um vídeo servir a dois projetos, crie
dois insights curtos (não um insight genérico gigante).
