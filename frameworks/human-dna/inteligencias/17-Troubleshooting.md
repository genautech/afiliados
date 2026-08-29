# 17 — Troubleshooting

Diagnóstico dos problemas mais comuns. Sistema DNA Criativo V1.0 — Routines do Claude Desktop.

---

## Setup via CLI + Notion API

### Token Notion não autoriza acesso
- **Sintoma:** `403 Forbidden` ao tentar criar páginas
- **Causa:** integration não foi compartilhada na página principal
- **Solução:** página Notion → ••• → Add connections → seleciona a integration → confirma

### Estrutura criada parcialmente (alguns blocks faltam)
- **Causa:** rate limit Notion (3 req/s soft)
- **Solução:** agente já adiciona `time.sleep(0.4)` entre batches. Se ainda assim falhar, roda `rebuild DNA` no agente — ele detecta gaps e completa.

### Páginas duplicadas após setup
- **Causa:** criação rodou em background + foreground simultâneos (bug clássico)
- **Solução:** apague as duplicatas manualmente no Notion, depois rode `rebuild DNA`. Garante que o `.brand.json` aponta pros IDs corretos.

### Code block com linguagem rejeitado
- **Erro:** `validation_error: language is not a valid language`
- **Causa:** linguagem fora do allowlist do Notion (ex: `sh`, `console`)
- **Solução:** parser `md_to_notion.py` normaliza: `sh` → `bash`, `js` → `javascript`, etc. Mesmo parser do Carrossel.

### Tabela truncada
- **Causa:** Notion API limita blocks por chamada (100). Tabela de 150 linhas estoura.
- **Solução:** parser pagina automaticamente. Se ainda truncar, edita manual ou divide a tabela em duas no `.md`.

### Discovery wizard interrompido no meio
- **Causa:** você fechou o terminal, ou Mac dormiu, ou erro inesperado
- **Solução:** estado salvo em `~/{brand-slug}/.discovery-progress.json`. Reabra:
  ```bash
  cd ~/{brand-slug}
  claude
  > continuar discovery
  ```
  Agente retoma da última pergunta respondida.

---

## R1 (Brand Scout — Routine Remote)

### Não coletou nenhuma referência
- **Causa 1:** `brand_aesthetic_anchor` está vazio ou genérico demais (ex: "moderno" — não dá pra buscar)
- **Causa 2:** queries de busca não retornaram nada relevante
- **Solução:** edita `🧬 DNA Master` → seção "Estética-âncora" → preencha com 2-3 referências específicas (Eye Magazine, Dia Studio, etc.). Próxima run usa.

### R1 trazendo só anti-referências
- **Sintoma:** todas pendentes coletadas violam alguma anti-referência
- **Causa:** o critério de busca está mal calibrado
- **Solução:** revise `📚 Reference Library` → Seção D (anti-referências) — está completa? Se sim, pode ser que o nicho da marca tem muito ruído mesmo. Refine queries no prompt do R1.

### Concorrente sem snapshot recente
- **Causa 1:** handle do concorrente mudou
- **Causa 2:** Instagram do concorrente está privado / fora do ar
- **Solução:** atualiza `🔐 Configuração` → `SCOUT_COMPETITOR_HANDLES`. Re-cole o prompt da Routine R1 com lista atualizada.

### Análise de tendência sem padrão claro
- **Sintoma:** análise mensal devolve "30 refs muito heterogêneas"
- **Causa 1:** você está aprovando refs muito variadas (sem critério visual unificado)
- **Causa 2:** estética da marca está em transição
- **Solução:** se (1), revise critério de aprovação na curadoria semanal. Se (2), considere rodar `evolve` modo (b) Refresh visual no R2 do DNA.

### R1 demora 30+ min
- **Sintoma:** uma run que deveria levar 6-15 min trava
- **Causa comum:** fonte específica trava o agente (timeout não configurado)
- **Solução:** adiciona timeout `5s` em cada fetch HTTP no prompt; identifica fonte travada pelos logs e remove do query

### Status mudando sem você pedir
- **Causa:** R1 mexendo em entries que não devia
- **Solução:** garante que prompt diz "NUNCA modifica entries existentes — só insere pendentes novas" (passo final)

---

## R2 (DNA Routine — Routine Local)

### Routine R2 não roda — fica em "Ask Permissions"
- **Sintoma:** Run now trava pedindo confirmação humana pra cada ação
- **Causa raiz:** permission mode da Routine está em "Ask Permissions"
- **Solução (duas camadas):**

  **1. Permission mode da Routine = automático**
  Abre config da Routine R2 → permissões. Tira de "Ask Permissions". Põe no modo automático ("Allow all" / "Auto" / "Bypass permissions" — varia por versão do app).

  **2. `.claude/settings.json` no working folder**
  Confirma que existe `~/{brand-slug}/.claude/settings.json` com:
  ```json
  {
    "permissions": {
      "allow": ["Bash", "Read", "Write", "Edit", "WebFetch", "WebSearch"]
    }
  }
  ```
  
- **Critério de aceitação:** rode Run now. Se passar do início ao fim sem prompt = OK.

### Higgsfield CLI ausente ou sem login (modo Generate)
- **Sintoma:** R2 para na Etapa 0 ao validar `higgsfield account status`
- **Solução:** instale `npm install -g @higgsfield/cli`, rode `higgsfield login` e confirme com `higgsfield account status`.

### R2 modo Generate falha em copy mas funciona em imagem (ou vice-versa)
- **Sintoma:** generate de copy pura funciona; generate de imagem falha no CLI
- **Causa:** problema de CLI/login/créditos/fila
- **Solução:**
  - CLI ausente → instalar `@higgsfield/cli`
  - login ausente → `higgsfield login`
  - 429 → rate limit, sleep 5s entre chamadas
  - 500 → retry 1-2x

### Compliance score sempre alto / sempre baixo
- **Sintoma:** auditorias devolvem score 9-10 sempre, ou 4-6 sempre
- **Causa 1 (alto):** DNA pouco definido — agente não tem como discriminar
- **Causa 2 (baixo):** anti-patterns muito amplos — qualquer coisa cai
- **Solução:** revise `🚫 Anti-Patterns` e `🗣️ Voice & Tone` — se as regras estão vagas demais OU restritivas demais. Calibração leva 30-60 dias de uso.

### Score em uma dimensão sempre baixo
- **Sintoma:** dimensão Voz sempre 5-6, mas Visual sempre 8-9
- **Causa:** essa dimensão precisa de mais densidade no DNA
- **Solução:** abra a página relevante (`🗣️ Voice & Tone` se Voz, `🎨 Visual System` se Visual), adicione mais especificidade. Critério: "se eu remover a dimensão e ler o resto, eu sei como produzir nessa dimensão sozinho?"

### R2 sugere mudança no DNA mas você discorda (modo Evolve)
- **Sintoma:** rodou evolve, R2 propôs diff, mas algo não bate com sua visão
- **Solução:** opção (e) Editar — abre cada item do diff individualmente, ajusta. Ou cancele a aplicação — DNA fica intacto.

### Evolve aplicou mudança e quero reverter
- **Sintoma:** apliquei evolve mas resultado ficou ruim
- **Solução:** snapshot pré-evolução está em Drive `{brand_slug}/DNA-Snapshots/{TODAY}-pre-evolve/`. Use os arquivos de lá pra restaurar:
  ```bash
  cd ~/{brand-slug}
  claude
  > restaurar snapshot DNA de {data}
  ```
  Agente faz PATCH em todas as páginas afetadas pra estado pré-mudança.

### Output gerado tem informação inventada (hallucination)
- **Sintoma:** R2 gerou copy citando dado/case que não existe
- **Causa:** R2 não verificou via web search (pulou Parâmetro 4 - Fatos verificados)
- **Solução:** reforça no prompt da Routine R2: "TODA estatística passa por web_fetch/web_search antes do output. Se não conseguiu verificar, reescreve sem o dado."

### State directory ocupando disco
- **Causa:** acumula 50-200MB por mês (briefs + outputs + audits + refs cache)
- **Solução:** roda trimestralmente:
  ```bash
  cd ~/{brand-slug}/state
  find . -maxdepth 1 -type d -mtime +90 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;
  # Sobe os .tar.gz pra Drive via MCP ou app web
  ```

### `.dna.json` saiu de sync com Notion
- **Sintoma:** você editou página no Notion, mas R2 ainda usa versão antiga
- **Causa:** `.dna.json` é cache local
- **Solução:**
  ```bash
  cd ~/{brand-slug}
  claude
  > rebuild .dna.json
  ```
  Agente lê todas as páginas DNA do Notion, regenera JSON local. ~30s.

---

## Notion (operacional, pós-setup)

### `🧬 DNA Master` mostrando `{brand_*}` literalmente (sem interpolar)
- **Causa:** página foi populada por humano (sem interpolar) ou rebuild bugou
- **Solução:** `> rebuild DNA --pages=dna_master` no agente. Re-faz interpolação.

### Database `🎯 Assets` enchendo demais
- **Solução:** vista "Arquivo" filtra Status = Arquivado / Descontinuado. Vista padrão "Galeria" mostra só recentes. Pra arquivar em massa:
  ```bash
  > arquivar assets aprovados há mais de 6 meses
  ```

### Compliance entries antigas misturando com recentes
- **Solução:** vista "Recente" filtra Data auditoria >= 30 dias. Vista "Histórico" mostra tudo (use só pra análise comparativa).

### Relations entre databases quebraram
- **Sintoma:** Brief não puxa Asset relacionado, ou vice-versa
- **Causa:** edição manual no Notion quebrou link
- **Solução:** abre o database, na propriedade Relation, confirma destination_database_id. Se errado, reapaga e recria a relation manualmente, depois roda `> repair relations` no agente.

---

## Higgsfield CLI (geração de imagem em modo Generate)

### Erro 400 com `image_size`
- **Causa:** dimensão não múltipla de 16
- **Solução:** usar aspect ratios aprovados (`4:5`, `9:16`, `1:1`, `16:9`) e normalizar localmente quando necessário.

### Custo está alto
| Cenário | Custo |
|---|---|
| 1 audit puro (sem imagem) | $0 (não usa geração visual) |
| 1 audit com vision (lê imagem) | $0 (vision nativa Claude) |
| 1 generate de copy | $0 |
| 1 generate de imagem hero | $0.05-0.08 |
| 1 generate de peça composta (2-4 imagens) | $0.20-0.40 |
| 1 generate de carrossel (9 imagens) | $0.50-0.70 |

Soluções:
- Verifique créditos com `higgsfield account status`
- Gere apenas variações necessárias
- Registre modelo, job_id e tentativa

### Slides saindo idênticos à capa
- **Causa:** prompt do slide N não está deixando claro que é OUTRO slide
- **Solução:** mesma do Carrossel — reforça no prompt da Routine:
  > "This is image [N] of [TOTAL], NOT a duplicate. Match the visual STYLE (palette, typography, mood) of reference, but show DIFFERENT content."

---

## Vision real / Reference Library

### Briefing visual saiu genérico (modo Generate de imagem)
- **Diagnóstico:** abre `state/$TODAY/briefs/{N}-{slug}/visual-brief.txt` — se mencionar "vibrant colors" e palavras vagas, falhou
- **Causa principal:** `📚 Reference Library` (Seção A) tem só descrições textuais, sem imagens reais anexadas
- **Solução:** anexa mínimo 5 imagens reais cobrindo variedade (hero, post, slide, peça composta). Vision precisa de variedade pra extrair padrão.

### R2 não está lendo refs do meu pacote temático
- **Causa:** "Pacote ativo" não está marcado na Library
- **Solução:** verifica se a entry do pacote temático tem campo `ATIVO: true` no Notion. R2 só prioriza pacotes com flag ativa.

---

## Integração com sistema do Carrossel

### R2 do Carrossel não está lendo o DNA
- **Sintoma:** Carrossel sai com tom antigo, ignorando atualizações do DNA
- **Causa:** prompt da Routine R2 do Carrossel não foi atualizado pra incluir Etapa -1 (carregar DNA)
- **Solução:** edita prompt da Routine R2 do Carrossel, adiciona ANTES da Etapa 0:
  ```
  ETAPA -1 — Carregar DNA Criativo
  - Lê page_dna_master via MCP Notion
  - Carrega .dna.json local
  - Variáveis brand_* vêm DAQUI (não da página 🏷️ Brand Identity legacy)
  - Manual editorial passa por filtro do 🗣️ Voice & Tone do DNA
  - Visual System do DNA tem precedência sobre 🎨 Design system legacy
  ```

### Conflito entre Brand Identity (Carrossel) e DNA Master (DNA)
- **Sintoma:** as duas páginas têm versões diferentes da mesma variável (ex: cor primária diferente)
- **Solução:** DNA é fonte da verdade. Esvazie a página `🏷️ Brand Identity` do Carrossel deixando só uma nota:
  ```
  ⚠️ Esta página é legacy. Variáveis canônicas vivem agora em 🧬 DNA Master.
  R2 do Carrossel lê DNA primeiro.
  ```

---

## Claude Desktop (operacional)

### Routine sumiu do painel
- **Causa:** app foi atualizado e perdeu config
- **Solução:** Routines são salvas localmente. Backup recomendado: copie o prompt das duas Routines pra arquivos `~/{brand-slug}/r1-routine-prompt.txt` e `~/{brand-slug}/r2-routine-prompt.txt` depois de qualquer edição.

### MCP Notion / Drive desconectou
- **Sintoma:** Routine falha logo no início com erro de connector
- **Solução:** Settings → Connectors → reconecta. Não precisa refazer Routine.

### App está aberto mas Routine R1 não dispara
- **Diagnóstico:** painel da Routine R1 → status do Schedule deve ser "Active"
- **Causa:** toggle desativado ou cron expression errada
- **Solução:** ativa o toggle. Se cron está errado, ajusta pra `0 10 * * 1,3,5` (default).

---

## Quando tudo falhar — debug step-by-step

1. R1 está rodando? → painel Routines do Desktop
2. Reference Library tem pendentes recentes? → Seção E no Notion
3. R2 modo BRIEF lista jobs? → Run now sem mensagem
4. R2 modo AUDIT funciona em texto? → cola um post simples, vê se devolve score
5. R2 modo GENERATE de copy funciona? → "generate: caption simples sobre X"
6. R2 modo GENERATE de imagem funciona? → "generate: hero shot pra landing X" (precisa Higgsfield CLI ok)
7. `.dna.json` reflete o Notion? → `cat .dna.json | jq .` e compara com `🧬 DNA Master`

Encontra o passo onde quebrou. Fix vai ser em uma página do Notion (instrução, `🔐 Configuração`, `📚 Reference Library`) ou no prompt da Routine — quase nunca em código.

---

## Lições aprendidas que viraram regra V1.0

| Aprendizado | Onde virou regra |
|---|---|
| Brand book congelado fica sem uso → DNA tem que ser executável | Sistema todo é "lido por IA, não por humano só" |
| Discovery superficial gera DNA superficial → 52 perguntas com critério de qualidade | Wizard Pro força especificidade |
| Anti-pattern explícito > esperar pelo bom gosto | `🚫 Anti-Patterns` é página de profundidade igual ao `🗣️ Voice & Tone` |
| Vision das refs precisa de bytes reais | R2 baixa via curl + Read nativo do Claude |
| DNA precisa ser organismo, não monumento | R1 alimenta refs continuamente; auto-snapshot trimestral |
| Compliance subjetivo gera retrabalho | Compliance score quantitativo (0-10 por dimensão) |
| Onboarding de novo membro leva semanas → DNA explícito acelera | Protocolo de onboarding em 7 dias |
| Concorrente sem monitoria gera diferenciação fraca | R1 monitora 3 concorrentes mensalmente |
| Persona genérica gera copy genérica → persona como personagem de romance | `👥 Audience DNA` exige bio densa de 6-10 linhas |
| Chave de geração hardcoded é frágil | Higgsfield CLI fica autenticado localmente |
| Routine em "Ask Permissions" trava | Permission mode automático + `.claude/settings.json` |
| Conflito entre Brand Identity legacy e DNA → resolver com precedência | DNA é canônico; Brand Identity vira legacy |
| Mac pode estar offline | R2 DNA é manual (não tem schedule diário); R1 tem catch-up |
| Setup manual no Notion é lento | Setup CLI + Integration Token cria tudo via API |
| Refresh anual sem snapshot é arriscado | Snapshot pré-discovery automático |
