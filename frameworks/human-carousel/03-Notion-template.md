# 03 — Template do Notion (V2.5)

> **Não cole manualmente.** Esta página descreve a estrutura que o **agente de setup cria via API REST** usando seu Notion Integration Token. Você só precisa entender pra debugar ou customizar.
>
> A V2.5 endureceu este procedimento contra os erros que apareceram nas primeiras execuções reais. Seguindo os passos abaixo na ordem, o setup roda **sem erro** — importante porque vai pra muitos usuários.

---

## Estrutura criada automaticamente pelo agente

Página principal: `🚀 {brand_name} — News-to-Carrossel`

Dentro:
- 2 databases inline
- 10 sub-páginas

---

## Database 1: 🗞️ News Feed

> **Criado PRIMEIRO** — o database Carrosséis tem uma relation que aponta pra ele.

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `NF`** (prefix precisa ter ≥ 2 caracteres — `N` sozinho é rejeitado pela API) |
| Título | Title | — |
| Fonte | Text | — |
| Link | URL | — |
| Resumo | Text | 2–3 frases |
| Relevância | Select | `1`, `2`, `3`, `4`, `5` |
| Data coleta | Date | — |
| Horário | Select | `Manhã`, `Tarde`, `Fim de tarde` |
| Status | Select | `Pendente`, `Pinada`, `Usada`, `Descartada` |
| Imagens | Files & Media | Opcional — R2 pode anexar a hero aqui |
| URLs originais | Text | URL de imagem candidata que o R1 descobriu (sem baixar) |
| Tem hero? | Checkbox | R1 marca tentativa; R2 confirma após extração local |
| Dica visual | Text | Descrição textual da imagem ideal — **R1 sempre preenche**. É o que permite o R2 gerar imagem coerente quando não há foto real |
| Nível extração | Select | Preenchido pelo R2 após a Etapa 1.5: `og:image`, `twitter:image`, `json-ld`, `social-bot`, `google-cache`, `url-do-R1`, `gerada-IA` |

> **Mudança V2.5:** o R1 roda Remote (sandbox bloqueia HTTP direto) — ele **não baixa imagens**, só descobre URL candidata (best-effort) e escreve a `Dica visual`. Quem extrai/baixa a imagem de verdade é o R2 (Local, rede aberta), na Etapa 1.5, só pra notícia escolhida. Detalhes em `12-R1-News-Scout.md` e `13-R2-Routine-Local.md`.

**Vistas:** "Hoje" (Table, filtro `Data coleta = Today`, ordem `Relevância` desc — padrão), "Pinadas" (Gallery, filtro `Status = Pinada`), "Arquivo" (Table, ordem `Data coleta` desc).

---

## Database 2: 🎨 Carrosséis

> **Criado DEPOIS** do News Feed (a relation precisa do database destino já existindo).

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `CR`** (≥ 2 caracteres) |
| Headline | Title | Frase principal escolhida |
| Data | Date | — |
| Notícia origem | Relation | → `🗞️ News Feed` |
| Padrão de hook | Select | `Brasil/Contexto`, `Ruptura`, `Geracional`, `Investigando`, `Marca+Revelação`, `Dois-Pontos`, `Dado`, `Contraste`, `Pergunta` |
| Eixo | Select | `Mercado`, `Cases`, `Notícias`, `Cultura`, `Produto` |
| Caption | Text | Caption Instagram pronta |
| Status | Select | `Rascunho`, `Aprovado`, `Postado`, `Descartado` |
| Performance | Select | `Excelente`, `Médio`, `Ruim` (preenche depois de postar) |
| Render attempts | Number | Quantas vezes foi re-renderizado |
| Última render | Date | Timestamp da última render |

> **Sobre os slides (imagens):** o R2 embute as 9 imagens **no corpo da página** de cada entry (blocks tipo `image`). A property "Slides" (Files & Media) **não aceita external URLs de forma confiável via MCP** — por isso o R2 usa o body. O backup canônico dos slides é a pasta local + Google Drive.

**Vistas:** "Galeria" (Gallery, ordem `Data` desc — padrão), "Calendário" (Calendar, date `Data`), "Por status" (Board, group by `Status`).

---

## As 10 sub-páginas criadas

Em ordem (emojis exatos — agente cria por API):

1. `🏷️ Brand Identity` — conteúdo de `01-Brand-Identity.md`, populado com as variáveis do wizard. **A logo PNG é anexada aqui pelo usuário depois.**
2. `🔐 Configuração` — página de ambiente (ver seção abaixo). Criada com checklist de Higgsfield CLI; o usuário não cola chave de geração.
3. `📋 Fontes de notícia` — conteúdo de `04-Fontes-noticias.md`, populado com lista do wizard de fontes
4. `📚 Manual editorial` — conteúdo de `05-Manual-Editorial.md`, com `{brand_*}` interpolado
5. `🎯 Engine de headlines` — conteúdo de `06-Engine-de-Headlines.md`
6. `🧭 Arquitetura narrativa` — conteúdo de `07-Arquitetura-Narrativa.md`
7. `🎨 Design system` — conteúdo de `08-Design-System.md`, com cores interpoladas
8. `⚙️ Render engine` — conteúdo de `09-Render-Engine.md` (sem API key, só método)
9. `📐 Referências de qualidade` — conteúdo de `10-Referencias-de-Qualidade.md`
10. `🖼️ Referências visuais` — conteúdo de `11-Referencias-Visuais.md` (você anexa imagens depois)

---

## Página `🔐 Configuração` — detalhada

Página privada que centraliza o checklist de ambiente. O R2 não lê chave externa de geração. Ele valida o login local do Higgsfield CLI com `higgsfield account status`.

O agente cria a página com este conteúdo:

```
# 🔐 Configuração

⚠️ PÁGINA PRIVADA — não compartilhe. Mantenha este workspace Notion
restrito a você. Quem tem acesso a esta página tem suas chaves de API.

## Higgsfield CLI (obrigatório pro R2)

Checklist:

​```
HIGGSFIELD_CLI=installed
HIGGSFIELD_LOGIN=done
HIGGSFIELD_IMAGE_MODEL=gpt_image_2
​```

O login é feito localmente com `higgsfield auth login`. Não usamos Higgs MCP.

## Chaves opcionais (R1 — busca de notícias)

​```
NEWSAPI_KEY=
MICROLINK_API_KEY=
​```

Deixe vazio se não tiver. R1 funciona sem — só pula esses níveis da cascata.
```

**Como o R2 lê:** usa esta página como checklist humano, mas a validação real acontece no shell com `higgsfield account status`. Se falhar, o R2 para com erro claro pedindo instalação ou login.

> **Nota de segurança:** nao guardar token de geração no Notion. O Higgsfield fica autenticado localmente pelo CLI.

---

## Procedimento de criação à prova de erro

> O agente segue **exatamente esta ordem**. Cada passo embute os gotchas que causaram erro nas primeiras execuções.

### Passo 0 — Pré-checagem
- `GET /v1/users/me` com o token → confirma token válido (401 → token errado)
- `GET /v1/pages/{id}` da página recebida → confirma que a integration foi compartilhada (404/403 → usuário precisa fazer ••• → Add connections)
- **Só prossegue se ambos passarem.** Não adianta criar nada com token sem acesso.

### Passo 1 — Renomear página principal
- `PATCH /v1/pages/{id}` com o novo title `🚀 {brand_name} — News-to-Carrossel`

### Passo 2 — Criar database News Feed
- `POST /v1/databases`, `parent.type = page_id`
- Propriedade `Nº`: `type: unique_id` com `prefix: "NF"` — **prefix de 1 caractere é rejeitado**, usar 2+
- Criar com TODAS as propriedades de uma vez
- **Se retornar "Unexpected error" (erro transiente conhecido da API):**
  1. `sleep 2` e retry a chamada uma vez
  2. Se persistir: cria o database mínimo (só `title` + `Nº`), depois adiciona as outras propriedades via `PATCH /v1/databases/{id}`
- Guarda `db_news_feed` (o ID retornado)

### Passo 3 — Criar database Carrosséis
- Igual ao Passo 2, `prefix: "CR"`
- A propriedade `Notícia origem` (relation) aponta pra `db_news_feed` — por isso News Feed vem antes
- Mesma estratégia de retry/fallback
- Guarda `db_carrosseis`

### Passo 4 — Criar as 10 sub-páginas (vazias)
- `POST /v1/pages` com `parent.page_id`, **uma de cada vez, sequencial, em foreground**
- ⚠️ **NUNCA execute a criação em background + foreground ao mesmo tempo, nem em paralelo** — isso duplica páginas. Sempre serial, foreground, uma única passada.
- Cada página é criada só com o title (emoji + nome). Blocks vêm depois.
- `sleep 0.4` entre chamadas (rate limit 3 req/s)
- Guarda cada `page_id` num dicionário

### Passo 5 — Smoke test do parser
- Pega UMA sub-página (`🏷️ Brand Identity`) e popula com `md_to_notion.py`
- `GET /v1/blocks/{page_id}/children` → confirma que os blocks entraram
- Se falhar → debugar o parser **antes** de popular as outras 9 (não propaga o erro)

### Passo 6 — Popular as 9 sub-páginas restantes
- Para cada uma: `PATCH /v1/blocks/{page_id}/children` adicionando os blocks
- Blocks em batches de no máximo 100 por chamada
- Sequencial, foreground, `sleep 0.4` entre chamadas
- `🔐 Configuração` é populada com o template de placeholders (não precisa de parser de .md)

### Passo 7 — Verificação de conectores (crítico — ver seção abaixo)

### Passo 8 — Salvar `notion-ids.json`
- Grava todos os IDs no working folder `~/{brand-slug}/notion-ids.json`
- Schema completo na seção "Output do setup" abaixo

### Passo 9 — Checklist final
- [ ] 2 databases criados (News Feed com prefix NF, Carrosséis com prefix CR)
- [ ] Relation Carrosséis → News Feed funcionando
- [ ] 10 sub-páginas criadas e populadas
- [ ] `🔐 Configuração` criada com placeholders
- [ ] Vistas criadas nos databases
- [ ] Conectores Notion + Drive testados e OK
- [ ] `notion-ids.json` salvo no working folder
- [ ] Nenhuma página duplicada

---

## Verificação de conectores (Passo 7)

> Roda **antes** de finalizar o setup. Garante que quando o R2 rodar pela primeira vez, Notion e Drive já estão funcionando — evita o R2 falhar silenciosamente no backup.

### Notion
OK por construção — o agente acabou de criar a estrutura inteira via API. Se chegou aqui, Notion funciona.

### Google Drive
Teste de escrita real:
1. Via MCP Google Drive, cria pasta de teste `{brand_slug}/_setup_test/`
2. Sobe um arquivo dummy (`test.txt` com "ok")
3. Lê de volta pra confirmar
4. Apaga o arquivo e a pasta de teste
5. **Se passar:** Drive confirmado. O R2 vai conseguir fazer backup dos slides.
6. **Se falhar:** o agente PARA e instruni o usuário:
   ```
   ⚠️ Google Drive não está conectado.
   Abra Claude Desktop → Settings → Connectors → Google Drive → Connect.
   Autorize o acesso. Depois me avise "drive conectado" pra eu testar de novo.
   ```
   Não finaliza o setup enquanto o Drive não passar — porque o R2 precisa dele pro backup dos carrosséis.

---

## Endpoints Notion API usados

| Ação | Endpoint | Método |
|---|---|---|
| Validar token | `/v1/users/me` | GET |
| Validar acesso à página | `/v1/pages/{id}` | GET |
| Renomear página principal | `/v1/pages/{id}` | PATCH |
| Criar database inline | `/v1/databases` (`parent.type=page_id`) | POST |
| Adicionar propriedade a database | `/v1/databases/{id}` | PATCH |
| Criar sub-página | `/v1/pages` (`parent.page_id`) | POST |
| **Adicionar blocks a uma página** | `/v1/blocks/{id}/children` | **PATCH** (não POST) |
| Ler blocks de uma página | `/v1/blocks/{id}/children` | GET |

---

## Gotchas da Notion API (todos já tratados no procedimento)

- **`unique_id` prefix ≥ 2 caracteres** — prefix de 1 char (`N`) retorna 400. Usar `NF`, `CR`.
- **`/blocks/{id}/children` é PATCH**, não POST. Errar o método dá 405.
- **Nunca rodar criação em background + foreground** — duplica páginas. Sempre serial, foreground, uma passada.
- **Página primeiro vazia, blocks depois** — criar página só com title, depois `PATCH .../children`. Mais robusto.
- **"Unexpected error" transiente** — a API às vezes falha sem motivo. Retry 1x após `sleep 2`; se persistir, usa fallback (database mínimo + PATCH de propriedades).
- **Chunk de 2000 chars** — `rich_text.content` tem limite de 2000 chars por segmento. Strings maiores são quebradas pelo parser.
- **Batch de 100 blocks** — `PATCH .../children` aceita no máximo 100 children por chamada. Parser pagina.
- **Linguagens de code block** — Notion aceita só um set específico. Normalizar `sh`→`bash`, `js`→`javascript`, `console`→`bash`.
- **Rate limit 3 req/s** — `sleep 0.4` entre chamadas em loops.
- **Relation: database destino antes do origem** — News Feed criado antes de Carrosséis.

---

## Parser markdown → Notion blocks

Usado pelo **agente de setup CLI** (uma única vez, na criação da estrutura). Vive em `~/{brand-slug}/md_to_notion.py` (gerado pelo agente). API:

```bash
python3 md_to_notion.py docs/05-Manual-Editorial.md {page_id}
```

Suporta: headings H1-H3, parágrafos, listas (bullet/numbered), code blocks (linguagem normalizada), tabelas, quotes, inline code, bold, links.

---

## Output do setup — `notion-ids.json`

Ao final, o agente salva `~/{brand-slug}/notion-ids.json`. **O R2 lê esse arquivo** (não usa env vars):

```json
{
  "page_principal": "...",
  "page_brand_identity": "...",
  "page_config": "...",
  "page_fontes": "...",
  "page_manual": "...",
  "page_headlines": "...",
  "page_arquitetura": "...",
  "page_design_system": "...",
  "page_render_engine": "...",
  "page_refs_qualidade": "...",
  "page_refs_visuais": "...",
  "db_news_feed": "...",
  "db_carrosseis": "..."
}
```

---

## Re-rodar setup sem destruir

```bash
cd ~/{brand-slug}
claude
> rebuild brand
```

O agente lê `.brand.json`, reaplica interpolação nos `.md`, e faz `PATCH /v1/blocks/{id}/children` substituindo os blocks de cada sub-página. **Não recria a estrutura, não toca nos databases, não duplica.** Útil quando você editou um `.md` localmente e quer sincronizar com o Notion.
