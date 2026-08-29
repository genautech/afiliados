---
name: afiliads-knowledge-scout
description: >
  Use when ingesting YouTube, GitHub, Firecrawl, RTF or social sources into a
  cited knowledge dossier before writing copy or filling a claim ledger.
  Also use when the user pastes a video URL, repo, transcript or raw file and
  asks to extract facts. Does not write landing pages or invent proof.
---

# Knowledge Scout — produto próprio

Orquestra fontes reais e devolve um dossiê rastreável. Sem âncora, o claim
não existe. Sem saturação ou recusa explícita, a pesquisa não termina.

Esta skill **não escreve** landing, e-book nem anúncio. O `afiliads-content-director`
só fecha briefing depois do dossiê.

## Leitura obrigatória

1. `docs/PROCEDENCIA_INFOPROD.md`
2. `frameworks/ebook-os/README.md`
3. Playbook `Playbooks/Conteudo/Ingestao_Conhecimento.md`
4. Se o pedido for de um produto já aberto: `product-brief.yaml` e
   `claim-ledger.csv` do diretório EBOOK-OS

## Entradas EBOOK-OS

| Entrada | Obrigatória | Sem o dado |
|---|---|---|
| URL, repo, arquivo ou transcrição | sim | recusar — não pesquisar de memória |
| `produto.id` e `produto.versao` | se o produto já existe | criar dossiê órfão em `entregas/` e **não** gravar no ledger |
| `fontes_autorizadas` do brief | se for promover claim | propor inclusão; não promover sozinho |
| `campaign_id` | só se a tarefa citar campanha | `campaign_guard` fail-closed |

YouTube, GitHub, concorrente e Firecrawl **nunca** entram em `dados/proprio/`.
Destino permitido: `dados/mercado/` ou `dados/benchmark/`. Todo arquivo de
dados ganha irmão `.origem.yaml`.

Para lotes de vídeos de low-ticket, mantenha também uma pasta de pesquisa
datada no projeto (por exemplo, `research/youtube-lowticket-YYYY-MM-DD/`) com
os raw captions, transcrições limpas, URLs, metadados e um dossiê analítico.
O dossiê deve separar observação da fonte, interpretação da marca e regra
proposta; números de um criador continuam `benchmark_externo` até verificação
independente.

## Ferramentas — não clonar, acionar

| Fonte | Primeira escolha | Fallback | O que extrair |
|---|---|---|---|
| YouTube / Loom / Vimeo | `afiliads-watch-video` | `ingest-youtube` → `youtube-transcript` | título, canal, data, descrição, capítulos, falas com timestamp |
| Canal / vários vídeos | `ingest-youtube` um a um + dossiê único | `afiliads-watch-video` nos 3 mais relevantes | temas recorrentes, ângulos, objeções |
| Post / thread | `afiliads-social-fetch` | Firecrawl scrape | texto, data, engajamento, replies se pedidas |
| GitHub | `gh` + pesquisa GitHub do Firecrawl | WebFetch do README | o que o produto faz, issues, changelog |
| Página / docs | Firecrawl scrape/map | WebFetch | claims, preços, restrições |
| Arquivo local / PDF / áudio | skill de OCR/documentos | OCR/documentos para PDF; `afiliads-watch-video` ou transcrição local para mídia | texto com página, slide ou timestamp |

`rtf` é uma instalação compartilhada fora de `.agents`, validada localmente em
2026-08-15. Se o path não existir, falhe com `BLOQUEADO_SKILL_RTF`; não reduza o
contrato de proveniência nem trate resumo sem âncora como extração concluída.

YouTube na `afiliads-social-fetch` **devolve** para `afiliads-watch-video`. Scrapear a página
do vídeo e chamar isso de transcrição é recusa.

Idiomas aceitos: `pt`, `pt-BR`, `en`. Auto-caption em inglês de um vídeo em
português só entra como `[OPINIÃO]` até conferência humana.

## Contrato de saída

Dois arquivos, no mesmo diretório:

```text
entregas/YYYY-MM-DD_<preset>_conhecimento/
  dossie-conhecimento.md
  knowledge-dossier.yaml
```

Se o produto já tiver pasta EBOOK-OS, copie `knowledge-dossier.yaml` para
lá. O validador só exige o YAML se o arquivo existir.

### `dossie-conhecimento.md`

Por claim:

- texto do claim;
- `[DADO]` ou `[OPINIÃO]`;
- URL ou caminho canônico;
- âncora: timestamp, linha, seção, `#L88` ou página;
- data de coleta;
- limite explícito do que a fonte **não** prova;
- destino: `dados/mercado/` ou `dados/benchmark/`.

Ao transformar transcrição em aprendizado de oferta, inclua ainda: `tipo`
(`observacao`, `hipotese`, `guardrail` ou `claim_a_verificar`), âncora no
timestamp do JSON3, distância da fonte e ação que a skill/agente deverá tomar.

Descrição do vídeo é fonte de **promessa e CTA**, não de prova.
Comentários são fonte de **dor e objeção**. Vocabulário da audiência fica
separado do vocabulário do criador.

### `knowledge-dossier.yaml`

Segue `frameworks/ebook-os/schemas/knowledge-dossier.schema.json`.
Cada claim precisa de `ancora` não vazia. Sem âncora o validador bloqueia.

## Saturação

Encerrar quando **três fontes consecutivas** não adicionarem claim relevante
novo. Volume de links não é evidência. Não transcreva uma hora de vídeo
para uma headline.

## Diretrizes Técnicas e de Segurança (Auditoria TASK-18)

As novas integrações de injeção de conhecimento seguem defesas estritas implementadas na TASK-18 contra concorrência, injeções maliciosas (XSS) e vazamento de recursos:

1. **Defesa Anti-XSS (Indirect Prompt Injection):**
   * Remova completamente a geração de scripts personalizados (`proposedCustomCode`) pelo LLM. Código customizado deve ser preservado do operador local, impedindo que dados maliciosos injetados nas fontes de conhecimento (ex: legendas de vídeo, LPs de concorrentes) executem XSS armazenado no renderizador de presells.
2. **Validação Estrita de Dados (Zod strict + LLM validation):**
   * Sempre valide payloads de insights e propostas da IA usando schemas Zod estritos (`.strict()`).
   * Integre a validação ao mecanismo do `callLLM` passando `json: true` e `validate: schema.safeParse`. Se o JSON for malformado, o runner deve reapresentar o erro de validação ao modelo antes de falhar, de modo que a própria IA reescreva o JSON, eliminando casts inseguros (`as unknown as`) e parsing frágil de strings.
3. **Bloqueio de Clique Duplo (Exclusão Mútua):**
   * Na rota de criação de injeção (`/api/knowledge/inject`), use um rate-limit no POST (retornando 409 em tentativas repetidas da mesma fonte em < 10 minutos) combinado com um lock de Compare-and-Swap (CAS) no banco (usando `updateMany` onde `status: 'PENDING'`) para reivindicar o processamento, prevenindo race conditions e múltiplos workers na mesma fonte.
4. **Heurística Anti-Turnstile no Scraper:**
   * Sempre filtre o Markdown retornado de scrapers de concorrentes (como Firecrawl) contra assinaturas de captcha e desafios (ex: `cf-challenge`, `cloudflare turnstile`, `checking your browser`). Se detectado, falhe imediatamente de forma explícita (*fail-fast*) sem gastar tempo de processamento de LLM com páginas de segurança do Cloudflare.
5. **Mitigação de Lock em Serverless / Polling Eficiente:**
   * No polling de frontend para status, use select explícito (ocultando `rawContent` pesado) combinando AbortController para evitar empilhamento de requisições pendentes na rede.
   * Implemente um Reaper de background que falhe automaticamente conexões travadas em `PROCESSING` há mais de 10 minutos para proteger conexões servidoras no ambiente local e serverless.

## Recusas

- Inventar citação, número ou depoimento a partir da memória do modelo.
- Gravar YouTube/GitHub/Firecrawl em `dados/proprio/`.
- Tratar auto-caption sem pontuação como citação literal de landing.
- Promover claim para `verificado` ou `uso_copy_final=sim` — isso é Fact
  Steward + humano.
- Preencher as 29 missões faltantes do OPERADOR.
- Processar dossiê de campanha externa sem `campaign_id` e
  `campaign_guard.py` exit 0. Exit 1, exit 2 ou ID ausente = parar.
- Oferta de terceiro → este repositório (AfiliAds).

## Exemplo mínimo

```yaml
produto:
  id: lowticket-classificacao-formato
  versao: "0.1.0-fixture"
coletado_em: "2026-08-15"
saturacao:
  atingida: true
  fontes_consecutivas_sem_claim_novo: 3
claims:
  - texto: "campaign_guard.py OPERADOR retornou exit 2 em 15/08/2026."
    tipo: DADO
    url_ou_caminho: "docs/exemplos/analise-estrategica-exemplo.md"
    ancora: "seção campaign_guard / OPERADOR"
    data_coleta: "2026-08-15"
    limite: "Não prova que outra campanha exista ou esteja autorizada."
    destino: dados/benchmark
```

## Encadeamento

```
fonte bruta → afiliads-knowledge-scout → dossiê
       ↓
Analista de Mercado propõe linhas a-verificar no ledger
       ↓
Fact Steward + humano promovem claim
       ↓
afiliads-content-briefing / Copywriter / afiliads-ebook-funnel
```

## Assets oficiais da marca

A paleta, a tipografia e os arquivos de marca vêm do Brand Kit da campanha
(`brandkit/`, ou o BrandKit salvo pelo Estúdio de Produto). Não existe cor
padrão: se o Brand Kit não estiver preenchido, pergunte ou gere um antes de
produzir peça.
