# 03 — Template do Notion (V2.0 — via conectores do Claude Desktop)

> **Não cole manualmente.** Esta página descreve a **estrutura final desejada** no Notion. O Maestro cria tudo automaticamente via **conectores nativos do Claude Desktop** (Settings → Connectors). Você lê este arquivo só pra debugar ou customizar.

## Princípio: tudo via conectores, nunca via API direta

Toda integração do DNA Criativo segue regra única: **conectores nativos do Claude Desktop**.

| Ferramenta | Como integra | NÃO se usa |
|---|---|---|
| Notion | Conector → tools `notion-search`, `notion-create-pages`, `notion-update-page`, `notion-fetch` | Integration Token, REST API, `curl https://api.notion.com/...` |
| Google Drive | Conector → tools `gdrive-*` | OAuth manual, Service Account, `gcloud` |
| Slack / Linear / GitHub / Gmail (se relevantes) | Conector → tools nativas | Webhooks, App tokens, API keys |

**Razão:** facilidade pra a pessoa. Conector se ativa em Settings → Connectors → [nome] → Connect → autoriza (3 cliques, 30 segundos). Não precisa criar integrações, gerar tokens, compartilhar páginas, configurar webhooks. Pessoa não vê credencial nenhuma.

**Mudança V1 → V2 (mai/2026):** versão antiga deste documento descrevia uso de Notion REST API + Integration Token. Esse modelo foi descontinuado — não use mais. V2 usa conector MCP, ponto final.

---

## Estrutura desejada no Notion

O sistema do DNA cria mais coisas que o do Carrossel: **4 databases + 14 sub-páginas + 1 página principal**. Mais profundidade significa mais blocos, mais relations, mais cuidado com idempotência.

---

## Estrutura criada automaticamente pelo agente

Página principal: `🧬 {brand_name} — DNA Criativo`

Dentro:
- 4 databases inline
- 14 sub-páginas

---

## Database 1: 🗂️ Touchpoints

> **Criado PRIMEIRO** — outros databases têm relations apontando pra ele.

Cada touchpoint da marca é uma entry: post Instagram, story, reel, email, landing, ad, deck, podcast, evento, packaging, in-store, etc. Funciona como mapa do "onde a marca aparece".

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `TP`** |
| Nome | Title | Ex: "Instagram — post carrossel", "Email — boas-vindas", "Landing — produto X" |
| Categoria | Select | `Social`, `Email`, `Web`, `Anúncio`, `Deck`, `Físico`, `Áudio`, `Vídeo`, `Outro` |
| Canal | Select | `Instagram`, `LinkedIn`, `YouTube`, `Email transacional`, `Email marketing`, `Site`, `Landing`, `Meta Ads`, `Google Ads`, `Físico`, `Outro` |
| Frequência | Select | `Diário`, `Semanal`, `Quinzenal`, `Mensal`, `Trimestral`, `Sob demanda` |
| Tom predominante | Select | `Editorial`, `Conversacional`, `Comercial`, `Crise`, `Institucional` |
| Owner | People | Quem responde por esse touchpoint |
| Especificações técnicas | Text | Dimensões, formatos, pesos, restrições |
| Template canônico | Files & Media | PNG/PDF do template aprovado (se houver) |
| Última revisão DNA | Date | Quando esse touchpoint foi auditado contra o DNA |

**Vistas:** "Por categoria" (Board, group by Categoria — padrão), "Por canal" (Table, ordem Frequência), "Sem revisão recente" (Table, filtro Última revisão DNA < 90 dias atrás).

---

## Database 2: 📥 Briefs

> **Criado DEPOIS** do Touchpoints (relation aponta pra ele).

Cada brief criativo enviado pra R2 é uma entry. Histórico permanente de "o que foi pedido", pra reuso e calibração.

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `BR`** |
| Título | Title | Ex: "Email de boas-vindas v2", "Carrossel sobre lançamento Y" |
| Touchpoint | Relation | → `🗂️ Touchpoints` |
| Brief original | Text | O que o usuário pediu, em texto livre |
| Brief processado | Text | Brief enriquecido pelo R2 com DNA aplicado |
| Status | Select | `Em produção`, `Entregue`, `Aprovado`, `Publicado`, `Arquivado` |
| Output | Relation | → `🎯 Assets` (saída gerada) |
| Compliance score | Number | 0-10 — média da auditoria do output |
| Solicitante | People | Quem pediu |
| Prazo | Date | Deadline |
| Observações | Text | Ajustes, contexto, links externos |

**Vistas:** "Em produção" (Board, group by Status — padrão), "Por touchpoint" (Table), "Histórico" (Table, ordem Created Time desc).

---

## Database 3: 🎯 Assets

> **Criado DEPOIS** do Briefs.

Biblioteca canônica de outputs aprovados — copy, imagens, decks, vídeos. Cada asset aprovado vira referência pra futuros agentes (alimenta `📚 Reference Library`).

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `AS`** |
| Nome | Title | Ex: "Email boas-vindas v3 — aprovado" |
| Tipo | Select | `Copy`, `Imagem`, `Vídeo`, `Deck`, `Carrossel`, `Email`, `Landing`, `Outro` |
| Brief origem | Relation | → `📥 Briefs` |
| Touchpoint | Relation | → `🗂️ Touchpoints` |
| Status | Select | `Rascunho`, `Aprovado`, `Publicado`, `Arquivado`, `Descontinuado` |
| Arquivos | Files & Media | PNGs, PDFs, MP4s |
| URL pública | URL | Link pro asset publicado (post, landing, etc.) |
| Performance | Select | `Excelente`, `Médio`, `Ruim`, `Sem dado` |
| Lições | Text | O que aprendeu desse asset (alimenta `📚 Reference Library`) |
| Pode reusar? | Checkbox | Se sim, vira referência canônica pra futuros briefs |

**Vistas:** "Galeria" (Gallery, ordem Created Time desc — padrão), "Aprovados reusáveis" (Gallery, filtro Pode reusar = true), "Por tipo" (Board).

---

## Database 4: ✅ Compliance

> **Criado por último.**

Histórico de auditorias. Toda vez que R2 audita um asset (próprio ou externo) contra o DNA, registra aqui. Cria histórico de aderência ao DNA ao longo do tempo.

| Propriedade | Tipo | Configuração |
|---|---|---|
| Nº | Unique ID | **prefix `CP`** |
| Asset auditado | Title | Nome ou descritor do asset |
| Tipo de asset | Select | `Copy`, `Imagem`, `Vídeo`, `Deck`, `Carrossel`, `Email`, `Landing`, `Outro` |
| Origem | Select | `Interno (R2 gerou)`, `Interno (humano fez)`, `Externo (concorrente)`, `Externo (referência inspiracional)` |
| Asset relacionado | Relation | → `🎯 Assets` (se for próprio) |
| Score voz | Number | 0-10 |
| Score visual | Number | 0-10 |
| Score persona | Number | 0-10 |
| Score anti-patterns | Number | 0-10 |
| Score total | Formula | (voz + visual + persona + anti-patterns) / 4 |
| Diagnóstico | Text | O que está aderente, o que não está |
| Sugestão | Text | Como melhorar |
| Imagem | Files & Media | Print do asset auditado |
| Data auditoria | Date | — |

**Vistas:** "Histórico" (Table, ordem Data auditoria desc — padrão), "Score baixo" (Table, filtro Score total < 7), "Por tipo" (Board).

---

## As 14 sub-páginas criadas

Em ordem (emojis exatos — agente cria por API):

1. `🧬 DNA Master` — conteúdo de `01-DNA-Master.md`, populado com a síntese executiva do wizard. **A logo PNG é anexada aqui pelo usuário depois.**
2. `🔐 Configuração` — página de ambiente. Criada com checklist Higgsfield CLI; usuário não cola chave de geração.
3. `🔍 Discovery Protocol` — conteúdo de `04-Discovery-Protocol.md` (as 52 perguntas pra reuso em revisões futuras)
4. `🎯 Brand Strategy` — conteúdo de `05-Brand-Strategy.md`, populado com respostas da Fase 2
5. `👥 Audience DNA` — conteúdo de `06-Audience-DNA.md`, populado com respostas da Fase 3
6. `🗣️ Voice & Tone` — conteúdo de `07-Voice-and-Tone.md`, populado com respostas da Fase 4
7. `🎨 Visual System` — conteúdo de `08-Visual-System.md`, populado com respostas da Fase 5
8. `📸 Photography Direction` — conteúdo de `09-Photography-Direction.md`, populado com setups de iluminação escolhidos
9. `🖼️ Image Generation Engine` — conteúdo de `10-Image-Generation-Engine.md`
10. `🤝 Brand Behavior` — conteúdo de `11-Brand-Behavior.md`, populado com respostas da Fase 6
11. `🚫 Anti-Patterns` — conteúdo de `12-Anti-Patterns.md`, populado com seeds da Fase 7
12. `📚 Reference Library` — conteúdo de `13-Reference-Library.md` (você anexa imagens depois; R1 alimenta automaticamente)
13. `📋 Pilares & Tabus` — página derivada das respostas da Fase 7 (pilares de conteúdo e temas-tabu, expandidos com escopo)
14. `📜 Manifesto` — opcional, derivada das respostas da Fase 2 — texto público de 200-400 palavras que sintetiza propósito + posicionamento + promessa, formatado pra eventual publicação no site/about

---

## Página `🔐 Configuração` — detalhada

Página privada que centraliza ambiente e conectores. Mesma filosofia do Carrossel: geração visual usa Higgsfield CLI local, não chave de API no Notion. Se você já instalou o Carrossel, **as duas páginas Configuração podem ser unificadas**.

O agente cria com este conteúdo:

```
# 🔐 Configuração

⚠️ PÁGINA PRIVADA — não compartilhe. Mantenha este workspace Notion
restrito a você. Quem tem acesso a esta página tem suas chaves de API.

## Higgsfield CLI (obrigatório pra R2 quando gerar imagens)

Checklist:

​```
HIGGSFIELD_CLI=installed
HIGGSFIELD_LOGIN=done
HIGGSFIELD_IMAGE_MODEL=nano_banana_2
​```

O login é local: `higgsfield login`.

## Chave ElevenLabs (opcional — pra geração de voz)

​```
ELEVENLABS_API_KEY=
​```

Deixe vazio se não usa voz.

## Configurações da R1 (Brand Scout)

​```
SCOUT_INSPIRATION_SOURCES=pinterest,arena,behance,dribbble
SCOUT_COMPETITOR_HANDLES=
SCOUT_BRAND_MENTIONS=true
​```

Lista de fontes que R1 monitora pra inspiração visual e menções da marca.
```

**Como agentes leem:** R2 do DNA e R2 do Carrossel validam o ambiente no shell com `higgsfield account status`. Se falhar, param com erro claro pedindo instalação ou login.

> **Nota de segurança:** nao guardar chave de geração visual no Notion. Higgsfield fica autenticado localmente pelo CLI.

---

## Procedimento de criação via MCP Notion

> O Maestro segue esta ordem usando **tools MCP** (`notion-search`, `notion-create-pages`, `notion-update-page`, `notion-fetch`). Os gotchas listados ainda valem porque o backend é o mesmo Notion — mas o Maestro não precisa lidar com tokens, headers, retries manuais ou rate limits (o conector cuida).

### Passo 0 — Verificação do conector
- Tenta uma chamada simples (`notion-search` com query vazia) pra confirmar que o conector tá ativo
- Se a tool não responde → instrui a pessoa a ativar Settings → Connectors → Notion → Connect (mensagem em `CLAUDE.md` Passo 1.8)
- **Só prossegue quando o conector tá funcional.**

### Passo 1 — Localizar workspace e criar página principal
- `notion-search` pra ver workspaces acessíveis
- `notion-create-pages` cria página `🧬 {brand_name} — DNA Criativo` no workspace adequado
- Guarda o `page_id` retornado

### Passo 2 — Criar 4 databases inline (na ordem certa, por causa de relations)

Ordem importa — Touchpoints primeiro porque outros databases têm relations apontando pra ele.

1. **Touchpoints** (`prefix: TP`) — criado primeiro
2. **Briefs** (`prefix: BR`) — relation `Touchpoint` → Touchpoints
3. **Assets** (`prefix: AS`) — relations `Brief origem` → Briefs, `Touchpoint` → Touchpoints
4. **Compliance** (`prefix: CP`) — relation `Asset relacionado` → Assets, formula `Score total = (voz + visual + persona + anti-patterns) / 4`

Use `notion-create-pages` com tipo database. Propriedades vão no payload da chamada — o MCP aceita criar database completo de uma vez na maioria dos casos.

**Gotcha mantido:** `unique_id` precisa de prefix com 2+ caracteres. `T` falha; `TP` passa.

### Passo 3 — Criar 14 sub-páginas (sequencial)
- `notion-create-pages` uma de cada vez, foreground
- ⚠️ **Nunca em paralelo** — duplica páginas (gotcha do Notion, não do MCP)
- Criadas só com title primeiro; blocks vêm no Passo 4

Lista das 14 páginas (em ordem):
1. `🧬 DNA Master`
2. `🔐 Configuração`
3. `🔍 Discovery Protocol`
4. `🎯 Brand Strategy`
5. `👥 Audience DNA`
6. `🗣️ Voice & Tone`
7. `🎨 Visual System`
8. `📸 Photography Direction`
9. `🖼️ Image Generation Engine`
10. `🤝 Brand Behavior`
11. `🚫 Anti-Patterns`
12. `📚 Reference Library`
13. `📋 Pilares & Tabus`
14. `📜 Manifesto`

### Passo 4 — Popular as 14 sub-páginas
- `notion-update-page` pra cada uma, em sequência
- Conteúdo vem do `.md` correspondente (ver mapa em `CLAUDE.md` → "Mapa interno dos arquivos")
- Variáveis `{brand_*}` interpoladas a partir do briefing
- Análise estratégica (do Passo 1.7 do Maestro) é injetada como conteúdo expandido nas páginas relevantes — não só compilação, **insight emergido do briefing**

**Gotchas que ainda importam:**
- Code block: linguagens fora do allowlist do Notion (ex: `sh`, `console`) precisam ser normalizadas pra `bash`/`bash`
- Strings longas: `rich_text.content` tem limite de 2000 chars por segmento — quebrar em múltiplos blocks
- Batch de blocks: máximo 100 children por update — paginar se necessário

### Passo 9 — Verificação de conectores

> Roda **antes** de finalizar o setup. Mesma lógica do Carrossel.

**Notion:** OK por construção (acabou de criar tudo via API).

**Google Drive:** Teste de escrita real:
1. Via MCP Google Drive, cria pasta de teste `{brand_slug}/_setup_test/`
2. Sobe arquivo dummy `test.txt`
3. Lê de volta pra confirmar
4. Apaga arquivo e pasta de teste
5. **Se passar:** Drive confirmado. R2 pode fazer backup de outputs.
6. **Se falhar:** o agente PARA e instrui:
   ```
   ⚠️ Google Drive não está conectado.
   Abra Claude Desktop → Settings → Connectors → Google Drive → Connect.
   Autorize o acesso. Depois me avise "drive conectado" pra eu testar de novo.
   ```

### Passo 10 — Salvar `notion-ids.json`
- Grava todos os IDs no working folder `~/{brand-slug}/notion-ids.json`
- Schema completo na seção "Output do setup" abaixo

### Passo 11 — Salvar `.dna.json`
- Snapshot completo do DNA em JSON local (cache rápido pra subprocess)
- Schema na seção `🧬 DNA Master` (`01-DNA-Master.md`)

### Passo 12 — Checklist final
- [ ] 4 databases criados (Touchpoints `TP`, Briefs `BR`, Assets `AS`, Compliance `CP`)
- [ ] Relations entre databases funcionando
- [ ] 14 sub-páginas criadas e populadas
- [ ] `🔐 Configuração` criada com placeholders
- [ ] Vistas criadas nos 4 databases
- [ ] Conectores Notion + Drive testados e OK
- [ ] `notion-ids.json` + `.brand.json` + `.dna.json` salvos no working folder
- [ ] Nenhuma página duplicada
- [ ] Pelo menos 3 entries-seed no database Touchpoints (Instagram post, email marketing, landing — pra deixar claro o uso)

---

## Tools MCP Notion usadas

| Ação | Tool MCP |
|---|---|
| Verificar conector + listar workspaces | `notion-search` |
| Criar página principal / sub-página | `notion-create-pages` |
| Criar database inline | `notion-create-pages` (com tipo database) |
| Popular sub-página com blocks | `notion-update-page` |
| Ler conteúdo de página existente | `notion-fetch` |
| Comentar (registrar diff de evolve) | `notion-create-comment` |
| Ler comentários | `notion-get-comments` |

> **Não há mais "endpoints REST".** O Maestro chama as tools como qualquer outra função do Claude Code. O MCP cuida de auth, retries, rate limit.

---

## Gotchas que ainda valem (mesmo com MCP)

Alguns gotchas são do **Notion em si** (não da camada de transporte) — continuam valendo:

- **`unique_id` prefix ≥ 2 caracteres** — usar `TP`, `BR`, `AS`, `CP`. Prefix de 1 char é rejeitado pelo Notion.
- **Nunca criar páginas em paralelo** — duplica entradas. Sempre serial, foreground, uma única passada.
- **Página vazia primeiro, blocks depois** — mais robusto. Cria title; popula conteúdo num segundo passo.
- **Strings longas em rich_text** — limite de 2000 chars por segmento. Quebrar em múltiplos blocks ou múltiplos rich_text segments.
- **Linguagens de code block** — Notion aceita só um set específico. Normalizar: `sh`→`bash`, `js`→`javascript`, `console`→`bash`.
- **Relation: database destino antes do origem** — Touchpoints antes de Briefs/Assets/Compliance.
- **Formula property** — usa expressão Notion (não JS): `(prop("Score voz") + prop("Score visual") + prop("Score persona") + prop("Score anti-patterns")) / 4`.

### Gotchas que SUMIRAM com MCP (não precisa mais lidar)

- ❌ Token validation (`/v1/users/me`) — MCP cuida da auth
- ❌ Page sharing manual ("Add connections") — conector dá acesso a tudo do workspace
- ❌ Rate limit manual (`sleep 0.4`) — MCP retorna erro, você retenta
- ❌ Retry de "Unexpected error" transiente — MCP já tem retry interno
- ❌ Diferença entre POST `/v1/pages` e PATCH `/v1/blocks/{id}/children` — você usa tools nominais
- ❌ Parser markdown próprio (`md_to_notion.py`) — você gera blocks Notion direto via `notion-update-page`

---

## Output do setup — `notion-ids.json`

Ao final, o agente salva `~/{brand-slug}/notion-ids.json`. **Os R2s leem esse arquivo** (não usam env vars):

```json
{
  "page_principal": "...",
  "page_dna_master": "...",
  "page_config": "...",
  "page_discovery": "...",
  "page_strategy": "...",
  "page_audience": "...",
  "page_voice": "...",
  "page_visual": "...",
  "page_photography": "...",
  "page_image_engine": "...",
  "page_behavior": "...",
  "page_anti_patterns": "...",
  "page_reference_library": "...",
  "page_pillars_taboos": "...",
  "page_manifesto": "...",
  "db_touchpoints": "...",
  "db_briefs": "...",
  "db_assets": "...",
  "db_compliance": "..."
}
```

Se a marca também tem Carrossel instalado, o `notion-ids.json` é **mesclado** — contém também `page_brand_identity`, `db_news_feed`, `db_carrosseis`, etc., do Carrossel. R2 do Carrossel passa a ler `page_dna_master` antes de ler `page_brand_identity` (DNA tem precedência).

---

## Re-rodar setup sem destruir

```bash
cd ~/{brand-slug}
claude
> rebuild DNA
```

O agente lê `.brand.json` + `.dna.json`, reaplica interpolação nos `.md`, e faz `PATCH /v1/blocks/{id}/children` substituindo os blocks de cada sub-página. **Não recria a estrutura, não toca nos databases, não duplica.** Útil quando você editou um `.md` localmente, ou quando o conteúdo do Notion saiu de sync com o JSON local.

```bash
> rebuild DNA --pages=voice,visual
```

Variação seletiva — só re-popula páginas específicas.

---

## Snapshots trimestrais

R2 cria automaticamente um snapshot do DNA inteiro a cada 90 dias, salvo no Drive em `{brand_slug}/DNA-Snapshots/{YYYY-MM-DD}/`:

- `dna-master.pdf` — export da página `🧬 DNA Master`
- `dna-full.zip` — export de todas as 14 páginas + 4 databases
- `dna.json` — versão estruturada
- `changelog.md` — diff vs snapshot anterior

Vale como histórico ("como era nosso DNA em Q1 vs Q3") e como backup. Pra rodar manual: comando `> snapshot DNA` no agente CLI.
