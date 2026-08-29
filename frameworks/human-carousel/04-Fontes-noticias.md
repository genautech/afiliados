# 04 — Fontes de notícia

> **Onde colar:** Página `📋 Fontes de notícia` no Notion.
> Conteúdo gerado automaticamente pelo wizard de fontes (Parte 6.5 do SETUP), você ajusta depois.

---

## Cole o conteúdo abaixo na página

---

## Como esta página é usada

A R1 lê esta página em **toda execução** (não tem cache). Ela usa as ferramentas nativas `web_search` e `web_fetch` pra varrer cada fonte — não importa se a fonte tem RSS, API ou só site. A R1 roda no sandbox Remote, que bloqueia HTTP direto; por isso a estratégia única é busca + fetch nativos.

A coluna `Idioma` ajuda a R1 a saber se precisa traduzir. A coluna `Prioridade` orienta a ordem e o peso de cada fonte.

Você pode editar essa página a qualquer momento. Adiciona linha, remove, ajusta prioridade. Próxima execução da R1 já usa.

---

## Fontes monitoradas (exemplo para nicho "IA pra criativos")

> **Substitua pelas suas fontes específicas.** O wizard sugere essa lista inicial a partir do `{brand_subject}`.

| Fonte | URL | Idioma | Prioridade |
|---|---|---|---|
| Anthropic Blog | https://www.anthropic.com/news | EN | alta |
| OpenAI Blog | https://openai.com/blog | EN | alta |
| Google DeepMind Blog | https://deepmind.google/discover/blog/ | EN | alta |
| Black Forest Labs | https://blackforestlabs.ai/announcements/ | EN | alta |
| Runway Research | https://research.runwayml.com/ | EN | alta |
| Higgsfield Blog | https://higgsfield.ai/blog | EN | média |
| OpenAI News | https://openai.com/news/ | EN | alta |
| The Verge — AI | https://www.theverge.com/ai-artificial-intelligence | EN | alta |
| Ars Technica — AI | https://arstechnica.com/ai/ | EN | alta |
| Every | https://every.to/ | EN | média |
| Pirate Wires | https://www.piratewires.com/ | EN | média |
| Stratechery | https://stratechery.com/ | EN | alta |
| Hugging Face Daily Papers | https://huggingface.co/papers | EN | média |

---

## Temas que interessam

Inclui quando entra numa destas categorias:

- **Lançamento de modelo ou versão nova** (Sora 3, Veo 4, Claude Opus 4.7, novo modelo de imagem)
- **Capacidade técnica nova** que muda fluxo (controle de câmera em vídeo, lip sync, edição semântica)
- **Caso de uso real bem-feito** de estúdio, agência, criador reconhecido
- **Workflow ou método** documentado por quem entende
- **Mudança de preço, política, disponibilidade** que afeta criativos
- **Fenômeno cultural com ângulo IA** (uso por celebridade, marca, evento)

---

## Temas pra IGNORAR

R1 descarta:

- Hot take de Twitter sem fonte primária
- Drama de comunidade, polêmica de personalidade
- Funding rounds e M&A sem mudança de produto
- "X startup levantou Y milhões" puro
- Opinião sobre futuro da IA sem caso concreto
- Notícia de regulamentação sem efeito direto em ferramenta
- "10 prompts incríveis pra você usar"
- Notícia já coberta nas últimas 72h (dedup por URL + título)

---

## Critério de relevância

Cada notícia ganha nota 1-5:

| Nota | Critério |
|---|---|
| **5** | Lançamento de modelo/ferramenta principal + capacidade nova relevante + fonte primária. Ex: "OpenAI lança Sora 3 com controle de câmera dolly." |
| **4** | Lançamento ou capacidade nova, mas com escopo mais limitado ou de player médio. Ex: "Higgsfield lança Soul 2 com 4 novas trends." |
| **3** | Análise editorial forte de fonte respeitada sobre tendência verificável. Ex: "Stratechery — por que vídeo IA matou produção de stock." |
| **2** | Caso de uso isolado, interessante mas não inédito. Ex: "Estúdio paulistano usou Veo 3 em comercial da Skol." |
| **1** | Marginalmente interessante. Ex: "Lista das 10 ferramentas IA mais populares em outubro." |

R2 só considera notícias com **relevância ≥ 3**.

---

## Wizard de fontes (Parte 6.5 do SETUP)

Quando o agente roda o setup, ele oferece sugestão automática:

```
Vou sugerir fontes de notícia pro nicho "{brand_subject}".

[web_search: "best news sources {brand_subject}"]
[web_search: "rss feed {brand_subject}"]
[web_search: "{brand_subject} newsletter weekly"]

Encontrei 14 candidatas. Categorizadas:

ALTA PRIORIDADE
1. ...
2. ...

MÉDIA
...

BAIXA / NICHE
...

Opções:
(t) Aceitar todas
(e) Editar lista (vou perguntar uma por uma)
(s) Adicionar fontes específicas só pelas que você já tem em mente
(c) Combinar essas + adicionar as suas
```

Resultado vira a tabela acima.

---

## Como adicionar fonte nova depois

**Opção 1 — via Notion direto:**
Adiciona linha na tabela aqui. Próxima execução da R1 usa.

**Opção 2 — via agente local:**
```bash
cd ~/{brand-slug}
claude
> adicionar fonte: https://example.com/blog (alta prioridade)
```

O agente edita a página via API.

---

## Critério de inclusão

Quando estiver em dúvida entre incluir ou descartar fonte nova, pergunta:

> *Essa fonte cobre {brand_subject} com regularidade (semanal pelo menos) e qualidade editorial defensável?*

Se sim → inclui. Se não → deixa de fora.

Feed enxuto > feed cheio de ruído.
