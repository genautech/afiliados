# 12 — R1: News Scout (Routine Remote)

> **Onde criar:** Painel de Routines do Claude Code Desktop → New routine → tipo **Remote**.
> R1 roda na cloud Anthropic. Coleta notícias e escreve no Notion. Mac/Windows podem estar fechados o dia inteiro.

> **⚠️ Para o agente de setup — entregar no chat.** NÃO crie arquivo `.md` para o usuário abrir. Solte **todos os campos da R1 de uma vez, numa única mensagem**, cada um em seu bloco copiável: Nome → Connectors → Tools → Permissões → Schedule → Prompt completo. Não pingue campo a campo esperando "ok". Guie a R1 inteira primeiro; só depois de o usuário confirmar que criou e testou, parta para a R2. Ver `02-Setup-Wizard.md`, seção "Como o agente entrega a criação das Routines".

---

## ⚠️ Limitação do ambiente Remote — leia primeiro

R1 roda no **sandbox da cloud Anthropic**. O sandbox **bloqueia requisições HTTP diretas**: `curl`, `requests`, fetch de feeds RSS e chamadas a APIs externas (NewsAPI, Microlink) retornam **403**.

**O que funciona no sandbox:** as ferramentas nativas `web_search` e `web_fetch`, e os connectors MCP (Notion).

**Consequência prática:** R1 **não baixa imagens**. Baixar bytes de imagem e subir pro Drive é impossível no sandbox. Por isso:
- R1 cuida só do **texto** — acha notícias, escreve título/resumo/relevância/link no Notion
- R1 faz **best-effort** pra descobrir a URL da imagem de destaque (sem baixar) e gera uma **Dica visual** textual
- A extração/download de imagem de verdade é responsabilidade do **R2**, que roda **Local** com rede aberta (ver `13-R2-Routine-Local.md`, Etapa 1.5)

Isto resolve o problema "todas as notícias com Tem hero? = false" — R1 nunca mais tenta o que o sandbox não permite.

---

## O que faz

3 vezes por dia (default 9h / 13h / 17h):

1. Lê a página `📋 Fontes de notícia` no Notion (fontes a monitorar, temas, critério de relevância)
2. Usa `web_search` + `web_fetch` pra achar notícias recentes de `{brand_subject}`
3. Deduplica contra o que já está no News Feed
4. Best-effort: descobre a URL da imagem de destaque (sem baixar) + escreve uma Dica visual
5. Insere até 8 notícias no database `🗞️ News Feed`

---

## Pré-requisitos

- **Claude Code Desktop** com plano Pro+ ativo
- **Notion** conectado como connector
- Estrutura do Notion já criada (cf. `02-Setup-Wizard.md` + `03-Notion-template.md`)

> R1 **não** precisa de Google Drive (não sobe imagens) nem de chaves de API (NewsAPI/Microlink não funcionam no sandbox).

---

## Criar a Routine Remote no Claude Desktop

1. Abre Claude Code Desktop
2. **Routines → New routine**
3. Tipo: **Remote**
4. Preenche os campos abaixo

### Nome
```
{brand_name} — News Scout
```

### Connectors
- ✅ Notion

### Tools permitidas
- ✅ WebSearch
- ✅ WebFetch
- ✅ MCP Notion (notion-fetch, notion-search, notion-create-pages, notion-update-page)

> R1 não usa Bash, Drive, nem render visual. Render fica com R2 Local + Higgsfield CLI.

### Permissões
Deixe o permission mode **automático** (não "Ask Permissions"). Uma Routine que pede confirmação a cada ação não roda sozinha. Ver `13-R2-Routine-Local.md`, seção "Permissões" — vale igual pra R1.

### Schedule
- Tipo: **Cron**
- Expressão: `0 {cron_r1_hours} * * *` (default `0 9,13,17 * * *`)
- Timezone: `America/Sao_Paulo`
- Catch-up: **Ativado**

> Se o painel só aceitar "Daily at HH:MM", crie 3 routines (`News Scout 9h`, `13h`, `17h`) com o mesmo prompt.

### Prompt
Cole o conteúdo da seção **"Prompt completo da Routine"** abaixo. O agente de setup interpola `{brand_*}` antes de entregar.

---

## Prompt completo da Routine

````
Você é o agente News Scout da {brand_name}. Sua tarefa é coletar notícias
relevantes de {brand_subject} e inserir no database "🗞️ News Feed" do Notion.

## AMBIENTE DE EXECUÇÃO — leia primeiro
Você roda como Routine REMOTE (cloud Anthropic). O sandbox BLOQUEIA requisições
HTTP diretas — curl, requests, fetch de RSS, chamadas a APIs externas retornam
403. Use APENAS as ferramentas nativas web_search e web_fetch (essas funcionam)
e o connector MCP Notion. NUNCA tente curl. NUNCA tente baixar bytes de imagem.
NUNCA chame NewsAPI, Microlink ou qualquer API HTTP externa.

## Página de contexto
URL da página principal no Notion: {NOTION_PAGE_URL}

## Passos

1. Horário em São Paulo: 6h-12h = "Manhã", 12h-16h = "Tarde",
   16h-20h = "Fim de tarde".

2. Leia a página "📋 Fontes de notícia" no Notion: lista de fontes a
   monitorar, temas que interessam, temas a ignorar, critério de relevância 1-5.

3. Para cada fonte, use web_search pra achar notícias recentes (~últimas 12h)
   de {brand_subject}. Use web_fetch pra abrir as candidatas e ler o conteúdo.
   Para cada notícia válida, extraia:
   - Título, fonte, URL da notícia
   - Resumo de 2-3 frases em pt-BR (traduz se for inglês, mantém termos
     técnicos como "prompt", "fine-tuning", "agentic")
   - Relevância 1-5 conforme critério da página Fontes
   - Descarta se cai em "Temas pra IGNORAR"

4. Deduplique contra o News Feed:
   - URL exata já existe → descarta
   - Título ≥80% similar a algo de hoje → descarta
   - Tópico repetido nos últimos 3 dias sem ângulo novo → descarta

5. IMAGEM DA NOTÍCIA — best-effort, SEM download:
   O sandbox impede baixar imagens. Você NÃO baixa nem armazena imagem.
   Você só tenta DESCOBRIR a URL da imagem de destaque e descrevê-la:

   a. Ao usar web_fetch na página da notícia, observe se o conteúdo
      retornado expõe uma URL de imagem principal (a imagem de capa do
      artigo, og:image, imagem destacada). Se uma URL plausível aparecer,
      guarde-a — ela vai pra property "URLs originais".

   b. SEMPRE escreva uma "Dica visual": 1-2 frases em pt-BR descrevendo
      que imagem ilustraria bem a notícia. Seja concreto e visual.
      Exemplos:
      - "Captura de tela do app da OpenAI mostrando a timeline de edição
        de vídeo, interface escura, foco no painel de controle de câmera"
      - "Logo da Anthropic sobre fundo gradiente, anúncio de novo modelo"
      - "Estúdio de design com monitor mostrando still de vídeo gerado
        por IA, ambiente criativo, luz natural"
      A Dica visual é OBRIGATÓRIA em toda notícia. É ela que permite o R2
      gerar uma imagem coerente quando não houver foto real aproveitável.

   c. Se não achou URL de imagem: tudo bem. "Tem hero?" = false. O R2
      (que roda local, com rede aberta) vai extrair a imagem da notícia
      escolhida, ou gerar uma a partir da Dica visual.

6. INSIRA no database "🗞️ News Feed" via MCP Notion:
   - Título (pt-BR)
   - Fonte
   - Link (URL da notícia)
   - Resumo (2-3 frases)
   - Relevância (1-5)
   - Data coleta (hoje)
   - Horário (Manhã/Tarde/Fim de tarde)
   - Status = "Pendente"
   - URLs originais (text): a URL de imagem candidata, se você achou alguma
   - Tem hero? (checkbox): true se você achou uma URL de imagem candidata,
     false se não achou
   - Dica visual (text): a descrição visual da imagem (SEMPRE preenchida)

7. Limite: 8 notícias por rodada. Se houver mais, fica com as 8 de maior
   relevância.

8. NUNCA modifica entries existentes. NUNCA muda status de notícia já
   inserida. Só insere novas.

9. Fonte fora do ar / link não abre → pula e segue. Não inventa.

10. Notícia sem imagem é OK — não descarta por falta de imagem.

## Output final
News Scout — {data} {horário}
Buscou em X fontes. Inseriu Y notícias (Z com URL de imagem candidata, W sem).
Descartou D duplicatas.
Top da rodada: "{título}" (relevância N).

## Regras absolutas
- web_search e web_fetch APENAS. Nunca curl, nunca HTTP direto, nunca API externa.
- Tradução pt-BR sempre.
- Não invente notícia. Zero inseridas é OK (fim de semana, sem novidade).
- Não duplique.
- Dica visual SEMPRE preenchida — é o que garante imagem boa no carrossel
  mesmo quando não há foto real.
````

---

## SUBSTITUIR no prompt antes de colar

| Token | Trocar por |
|---|---|
| `{brand_name}` | Nome real da marca |
| `{brand_subject}` | Nicho real |
| `{cron_r1_hours}` | Horas do cron |
| `{NOTION_PAGE_URL}` | URL real da página principal |

O agente de setup faz essa interpolação na criação das Routines.

---

## Primeira run

Rode **Run now** uma vez e observe. Confirme que a run passa **sem prompt de permissão** (permission mode automático). Se pedir permissão, ajuste a config da Routine.

---

## Tempo real esperado

**~3-6 min por run.** Sem a cascata de download de imagens (que saiu da V2.5), R1 ficou mais rápido e mais confiável — é só texto: web_search + web_fetch + insert no Notion.

Se uma run passa de 15 min, provavelmente uma fonte está travando — confira os logs.

---

## Verificar que está rodando

**Status:** painel da Routine → Active/Paused + última run + próxima run.

**Logs:** painel → click numa run → session completa.

**Notion:** `🗞️ News Feed` → vista "Hoje" → entries com título pt-BR, resumo, relevância 1-5 e **Dica visual** preenchida.

---

## Testar antes de agendar

1. Cria a Routine com Schedule **Off**
2. Run now
3. Aguarda 3-6 min
4. Confirma no Notion (vista "Hoje" do News Feed):
   - Notícias com título em pt-BR, resumo coerente, relevância 1-5
   - **Dica visual preenchida** em todas
5. Se erro: lê a session da run no painel
6. OK → ativa o Schedule

---

## Recomendado: deixar acumular antes de subir R2

Deixa R1 rodando 2-3 dias antes de ativar R2. Quanto mais notícias variadas no feed, melhor a R2 escolhe.

---

## Migrar da V2 (Routine Web em claude.ai/code)

1. claude.ai/code → Routines → R1 antiga → Schedule **Off**
2. Cria nova Routine **Remote** no Claude Desktop conforme essa página (prompt novo — a cascata de imagem saiu)
3. Run now pra validar
4. Confirmado → apaga a Routine Web antiga

`🗞️ News Feed` no Notion é a fonte da verdade — não precisa migrar dados.
