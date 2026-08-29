# Extração de conhecimento — YouTube, GitHub, social

Use antes de escrever quando o pedido trouxer fonte bruta. O diretor não
transcreve: ele aciona `knowledge-scout` ou a skill certa e só então fecha
o briefing.

## Cadeia de ferramentas (nessa ordem)

| Fonte | Primeira escolha | Fallback | O que extrair |
|---|---|---|---|
| YouTube / Loom / Vimeo | `watch-video` (transcript; visual se UI importar) | `ingest-youtube` → `youtube-transcript` | título, canal, data, descrição, capítulos, falas com timestamp |
| Canal / vários vídeos | `ingest-youtube` um a um + dossiê único | `watch-video` nos 3 mais relevantes | temas recorrentes, ângulos, objeções da audiência |
| Post social / thread | `social-fetch` | Firecrawl scrape | texto, data, engajamento, replies se pedidas |
| GitHub (repo, issue, README) | `gh` + `firecrawl_research_search_github` | WebFetch do README | o que o produto faz, issues abertas, changelog |
| Página / docs | Firecrawl scrape/map | WebFetch | claims, preços, restrições de afiliado |

YouTube na `social-fetch` **devolve** para `watch-video`. Não scrapeie a
página do vídeo e chame isso de transcrição.

Idioma padrão das legendas: `pt,pt-BR,en`. Auto-caption em inglês de um
vídeo em português só entra como `[OPINIÃO]` até conferir.

## O que o dossiê precisa ter

Arquivo: `entregas/YYYY-MM-DD_<preset>_conhecimento/dossie-conhecimento.md`
mais o contrato `knowledge-dossier.yaml` (schema EBOOK-OS). Playbook:
`Playbooks/Conteudo/Ingestao_Conhecimento.md`. YouTube/GitHub/Firecrawl
nunca entram em `dados/proprio/`.

Para cada fonte:

1. URL canônica, título, autor/canal, data de publicação, data de acesso.
2. Tipo: transcrição manual | auto-caption | descrição | README | issue | post.
3. Claims extraídos com timestamp ou âncora (`[12:40]`, `#L88`, data do post).
4. Rótulo `[DADO]` ou `[OPINIÃO]`. Interpretação do agente nunca vira fato.
5. Vocabulário da audiência (comentários, issues, replies) separado do
   vocabulário do criador (script, descrição, README).

Descrição do vídeo é fonte primária de **promessa e CTA**, não de prova.
Comentários são fonte primária de **dor e objeção**.

## Quando parar

Saturação: três fontes novas sem claim novo. Ou o briefing já tem os 8
inputs + provas com origem. Não transcreva uma hora de vídeo para escrever
uma headline.

## O que não fazer

- Inventar citação a partir de memória do modelo.
- Tratar auto-caption sem pontuação como citação literal na landing.
- Usar número dito no vídeo sem origem independente, se o DNA exigir fato
  verificável.
- Misturar nível MARCA (plataforma) e nível PRODUTO (e-book) no mesmo
  dossiê sem seção separada.
