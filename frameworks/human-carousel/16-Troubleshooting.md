# 16 — Troubleshooting (V2.5)

Diagnóstico dos problemas mais comuns. Versão V2.5 — Routines do Claude Desktop.

---

## Setup via CLI + Notion API

### Token Notion não autoriza acesso
- **Sintoma:** `403 Forbidden` ao tentar criar páginas
- **Causa:** integration não foi compartilhada na página principal
- **Solução:** página Notion → ••• → Add connections → seleciona a integration → confirma

### Estrutura criada parcialmente (alguns blocks faltam)
- **Causa:** rate limit Notion (3 req/s soft)
- **Solução:** agente já adiciona `time.sleep(0.4)` entre batches. Se ainda assim falhar, roda `rebuild brand` no agente — ele detecta gaps e completa.

### Page só tem title, sem conteúdo
- **Causa:** primeira pass cria página, segunda pass adiciona blocks. Se segunda falhar silenciosamente, fica só title.
- **Solução:** `rebuild brand` no agente. Não recria página, só PATCH blocks.

### Code block com linguagem rejeitado
- **Erro:** `validation_error: language is not a valid language`
- **Causa:** linguagem fora do allowlist do Notion (ex: `sh`, `console`)
- **Solução:** parser `md_to_notion.py` normaliza: `sh` → `bash`, `js` → `javascript`, etc.

### Tabela truncada
- **Causa:** Notion API limita blocks por chamada (100). Tabela de 150 linhas estoura.
- **Solução:** parser pagina automaticamente. Se ainda truncar, edita manual ou divide a tabela em duas no `.md`.

---

## R1 (News Scout — Routine Remote)

### Não inseriu nenhuma notícia
- **Causa 1:** filtro restritivo demais ou nenhuma fonte com update nas últimas 5h. Normal em fins de semana.
- **Causa 2:** todas candidatas eram duplicatas.
- **Solução:** edita página `📋 Fontes de notícia` (adiciona fontes, ajusta threshold de dedup no prompt).

### Inserindo lixo
- **Solução:** ajusta seção "Temas pra IGNORAR" em `📋 Fontes de notícia`. Específico vence genérico.

### Relevância errada
- **Solução:** reforça exemplos no critério de relevância em `📋 Fontes de notícia`. "Nota 5 É X, nota 5 NÃO É Y."

### Notícias em inglês
- **Solução:** reforça no prompt da R1: "Traduza pra português sempre, mantém termos técnicos em inglês quando for padrão."

### R1 marcou todas as notícias com "Tem hero? = false"
- **Isso é esperado e NÃO é erro.** O R1 roda Remote — o sandbox da cloud bloqueia HTTP direto (curl/requests dão 403). O R1 **não baixa imagens por design**. Ele só descobre URL candidata (best-effort via web_fetch) e escreve a `Dica visual`.
- **Quem extrai a imagem de verdade é o R2** (Local, rede aberta), na Etapa 1.5, só pra notícia escolhida.
- **O que verificar:** a coluna `Dica visual` no News Feed está preenchida? Se sim, o sistema está saudável — o R2 vai extrair a foto ou gerar uma a partir da dica.
- **Se a `Dica visual` está vazia:** aí sim é bug — reforça no prompt do R1 que a Dica visual é obrigatória em toda notícia.

### R2 não consegue a foto da notícia (Etapa 1.5 cai sempre em "gerada-IA")
- **Sintoma:** o resumo da run mostra `Imagem da notícia: gerada por IA` toda vez — nunca extrai foto real
- **Lembre:** "gerada por IA" **não é falha** — o carrossel sai completo com imagem coerente (Caminho B, a partir da Dica visual). Só não é a foto literal da notícia.
- **Se você quer mais fotos reais, diagnostique a Etapa 1.5** (roda Local — a cascata funciona, diferente do R1):
  - **Site bloqueia tudo (403 em browser-UA):** o Nível C tenta como `facebookexternalhit` e `Twitterbot` — muitos sites servem og:image limpo pra esses. Confirme que o R2 está tentando os 3 User-Agents.
  - **og:image vazio mas a página tem imagem:** lazy-load / JSON-LD. O Nível B varre `data-src`, `data-lazy-src`, `srcset`, JSON-LD. Confirme.
  - **URL relativa:** o R2 precisa resolver `/images/foo.jpg` via urljoin contra a URL da notícia.
  - **URL candidata do R1 morta:** a URL que o R1 deixou pode ter expirado entre o R1 e o R2 (12-24h depois). Normal — o R2 cai pro Nível B (extrai do zero).
  - **Imagem boa descartada na validação:** se a URL tem "logo"/"icon" no path mas é a imagem certa, o filtro de substring pode estar derrubando. Refina o filtro pra casar só o nome do arquivo.
- **Critério de saúde:** o objetivo não é 100% de foto real. Notícia de IA muitas vezes não tem hero boa mesmo. Caminho B com Dica visual rica produz capa ótima. Foco é a Dica visual ser boa.

### R1 demora 30+ min
- **Sintoma:** uma run que deveria levar 5-8 min trava
- **Causa comum:** fonte específica trava o agente (timeout não configurado)
- **Solução:** adiciona timeout `5s` em cada fetch HTTP no prompt; identifica a fonte travada pelos logs e marca prioridade=baixa ou remove

### Status mudando sem você pedir
- **Causa:** R1 mexendo em entries que não devia
- **Solução:** garante que prompt diz "NUNCA modifica entries existentes" (passo 10)

---

## R2 (Carousel Creator — Routine Local)

### Routine não disparou no horário esperado
- **Causa 1:** Claude Desktop não estava aberto no horário do tick
- **Causa 2:** Mac/Windows estava dormindo
- **Causa 3:** Routine pausada no painel
- **Solução — 3 camadas de fallback já configuradas na V2.5:**

  **a) Schedule `*/30 8-22`:**
  Routine dispara a cada 30 min entre 08:00 e 22:00. O primeiro tick em que o app estiver aberto roda o carrossel. Os subsequentes detectam `.completed` e fazem soft exit em <2s — custo desprezível. Sem esse schedule frequente, perdia o dia se o app não estava aberto exatamente em 08:00.

  **b) Catch-up automático:**
  Se você só abre o app de tarde depois de ele ter ficado fechado, o Claude Desktop dispara 1 run automática do tick mais recente perdido (cobertura de 7 dias).

  **c) Manual:**
  Painel da Routine → **Run now** força agora.

- **Como diagnosticar qual camada não funcionou:**
  - Schedule não disparou? Confere expressão cron no painel da Routine
  - Catch-up não disparou? Confere se Schedule está Active (toggle On)
  - Pra evitar dormida no horário: macOS → System Settings → Battery → "Prevent computer from sleeping when display is off"; Windows → Power & sleep → Never

### Routine roda mas faz soft exit imediato (não gera nada)
- **Sintoma:** Routine dispara mas termina em ~2 segundos sem gerar carrossel
- **Causa:** É **comportamento correto** — `.completed` do dia já existe, então a Routine sai imediato (idempotência). Carrossel já foi gerado em tick anterior.
- **Verificar:** olha em `~/{brand-slug}/state/$(date +%Y-%m-%d)/` se existe `.completed` e os outros arquivos esperados
- **Se realmente quer regerar:** Run now → primeira mensagem `--re-render` (re-render só visual) ou `--news=N` (troca notícia)

### Routine R2 não roda sozinha — fica em "Ask Permissions"
- **Sintoma:** a run automática das 8h não gera o carrossel. Ao abrir, a Routine está parada pedindo confirmação. Cada novo chat de run do dia vem em modo "Ask Permissions".
- **Causa raiz:** o permission mode da Routine está em "Ask Permissions" — ela pede OK humano pra cada ação. Sem alguém pra clicar, a run trava. `Always allow` marcado numa run **não persiste** pra runs/chats novos.
- **Solução (duas camadas):**

  **1. Permission mode da Routine = automático**
  Abre a config da Routine R2 → permissões. Tira de "Ask Permissions". Põe no modo que executa sem pedir confirmação ("Allow all" / "Auto" / "Acesso total" / "Bypass permissions" — o nome varia). Esse é o conserto principal.

  **2. `.claude/settings.json` no working folder**
  Confirma que existe `~/{brand-slug}/.claude/settings.json` com:
  ```json
  {
    "permissions": {
      "allow": ["Bash", "Read", "Write", "Edit", "WebFetch", "WebSearch"]
    }
  }
  ```
  O setup cria esse arquivo. Se não existe, cria à mão. Allowlist do projeto cobre as tools locais mesmo se o permission mode resetar.

- **Critério de aceitação:** rode **Run now** e observe. Se passar do início ao fim **sem um único prompt de permissão**, a automação vai funcionar. Se aparecer qualquer prompt, ainda não está certo — ajuste e teste de novo.

### Higgsfield CLI ausente, sem login ou sem crédito
- **Sintoma:** render abortado antes de gerar capa ou slides
- **Diagnóstico:** testa manualmente na própria session da Routine:
  ```bash
  higgsfield account status
  ```
  - command not found → instalar `npm install -g @higgsfield/cli`
  - login ausente → rodar `higgsfield auth login`
  - créditos insuficientes → recarregar no Higgsfield

### R2 para logo com Higgsfield não autenticado
- **Causa:** CLI não instalado ou login local não concluído.
- **Solução:** rode `higgsfield auth login`, confirme no navegador e rode `higgsfield account status`.

### Logo não aparece nos slides 1 e 9
- **Sintoma:** `brand_has_logo=true` mas o carrossel sai sem logo
- **Causa 1:** logo não foi anexada na página `🏷️ Brand Identity` (seção "Logo da marca"). O resumo da run mostra `Logo: ⚠️ brand_has_logo=true mas sem anexo`
- **Causa 2:** o anexo não é PNG ou está corrompido
- **Solução:** anexa um PNG válido (fundo transparente, ≥800px) na seção "Logo da marca" da página `🏷️ Brand Identity`. Roda `--re-render`.
- **Nota:** a logo é colada via composição Pillow (não desenhada pelo gerador). Se o slide saiu com a área da logo vazia mas a logo não entrou, é porque o `logo.png` não foi baixado — confere o anexo no Notion.

### Pipeline editorial roda mas render falha
- **Sintoma:** `narrativa.json` existe, `slides/` vazio (ou só `cover-url.txt`)
- **Verificar:** `cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/log.txt`
- **Causa comum 1:** Higgsfield CLI/login/créditos (ver acima)
- **Causa comum 2:** UUIDs `--image` ausentes nos slides 2-9
- **Solução:** ver bug do `COVER_URL` abaixo

### Capa sai mas slides 2-9 não mantêm coerência
- **Causa principal:** UUIDs `--image` não estão sendo passados nos slides 2-9
- **Diagnóstico:** ver `state/$TODAY/url-N.txt` — se vazio, falhou. Confere logs da session.
- **Solução:** garantir que a Routine está subindo a capa sem logo + refs visuais da marca com `higgsfield upload create` e passando esses UUIDs em todos os slides internos.

### Bug do `COVER_URL` vazio
- **Sintoma:** slides 2-9 chamam Higgsfield sem referência
- **Causa:** session capturou URL/job da capa mas não persistiu antes de iniciar o batch paralelo
- **Solução:** garante que o prompt da Routine sempre grava `cover-url.txt` ANTES de iniciar slides 2-9:
  ```bash
  COVER_URL=$(echo "$COVER_RESP" | python3 -c '...')
  echo "$COVER_URL" > state/$TODAY/cover-url.txt
  # SÓ DEPOIS dispara paralelo
  ```
  Nunca confia em variável de bash entre etapas — sempre escreve em arquivo.

### Render em paralelo mas algum slide veio errado
- **Diagnóstico:** com paralelo, logs misturam. Pede pra session prefixar cada linha com `[slide-N]`
- **Solução pontual:** re-roda só o slide problemático:
  ```
  > --only-slide=5
  ```

### Briefing visual saiu genérico
- **Diagnóstico:** abre `state/$TODAY/visual-brief.txt` — se mencionar "vibrant colors" e palavras vagas, falhou
- **Causa principal:** página `🖼️ Referências visuais` tem só descrições textuais, sem imagens reais anexadas
- **Solução:** anexa mínimo 5 imagens reais cobrindo variedade (capa, slide dark, slide light, slide com foto). Vision precisa de variedade pra extrair padrão.

### State directory ocupando disco
- **Causa:** acumula ~50-100MB por dia (refs + slides + raw PNGs)
- **Solução:** roda trimestralmente o archive script (cf. `15-Como-usar.md` boas práticas)

### Slides aparecem só depois de horas no Notion
- **Causa:** estava usando upload de PNG (lento) em vez de external URLs
- **Solução:** prompt da Routine usa external URLs retornadas pelo Higgsfield ou URLs do Drive. Aparece imediato. Se ainda lento, confere se properties.Slides está com type=external no PATCH.

### Routine consumindo muito subscription
- **Sintoma:** cota Pro+ apertando
- **Causa:** runs longas ou paralelo virou sequencial
- **Diagnóstico:** ver duração média na lista de runs do painel. Saudável: 6-10 min.
- **Solução:** se passar de 18 min, tem algo travado (provavelmente etapa 2 com muito web search redundante ou batch visual que não paralelizou). Ajuste o prompt limitando web_fetch a 3-5 calls por run e confira se slides 2-9 estão em paralelo.

---

## Claude Desktop (operacional)

### Routine sumiu do painel
- **Causa:** app foi atualizado e perdeu config
- **Solução:** Routines são salvas localmente. Backup recomendado: copie o prompt da Routine pra um arquivo `~/{brand-slug}/r2-routine-prompt.txt` depois de qualquer edição

### MCP Notion / Drive desconectou
- **Sintoma:** Routine falha logo no início com erro de connector
- **Solução:** Settings → Connectors → reconecta. Não precisa refazer Routine.

### Catch-up não disparou esperado
- **Causa:** catch-up cobre só **a run mais recente perdida** dos últimos 7 dias, não múltiplas
- **Solução:** se quiser rodar dia X específico, abre painel → Run now → primeira mensagem `--news=N` (escolhe notícia do dia desejado)

### App está aberto mas Routine não dispara
- **Diagnóstico:** painel da Routine → status do Schedule deve ser "Active" 
- **Causa:** toggle desativado
- **Solução:** ativa o toggle

---

## Notion (operacional, pós-setup)

### R2 sobrescreve carrossel de dias anteriores
- **Causa:** filtro errado ao localizar entry do dia (Routine confundindo datas)
- **Solução:** o prompt sempre filtra `Data == TODAY` (data exata). Reforça no prompt se necessário.

### Database "🎨 Carrosséis" enchendo demais
- **Solução:** vista "Arquivo" filtra Postado/Descartado mais antigos que 90 dias. Vista padrão "Galeria" mostra só recentes.

---

## Higgsfield CLI

### Erro com aspect ratio ou dimensões
- **Causa:** proporção não declarada ou saída fora do esperado
- **Solução:** usar `--aspect_ratio "3:4"` e `--resolution "2k"` na chamada, validar que a saída é 3:4 e entregar o PNG original baixado. Não normalizar, cortar, redimensionar nem converter para 1080×1350.

### Custo está alto
Soluções:
- Verifique créditos com `higgsfield account status`
- Gere só as variações necessárias
- Re-render só quando vale (não fica trocando por achismo)

### `Insufficient credits`
- Solução: recarrega no Higgsfield. Routine marca slides como falha e continua.

### Slides estão saindo idênticos à capa
- **Causa:** prompt do slide interno está copiando a capa em vez de usar a capa como estilo
- **Solução:** reforça no prompt da Routine:
  > "Use the cover and brand references for visual style only: palette, typography, mood and composition system. Create different content for this internal carousel page. Do not copy the cover layout or render any page number/counter."

---

## Quando tudo renderhar — debug step-by-step

1. R1 está rodando? → claude.ai/code/routines → Runs (ou painel Routines do Desktop)
2. News Feed tem entries de ontem? → vista "Hoje" no Notion
3. R2 disparou? → painel da Routine Local → última run
4. Pipeline editorial completou? → `cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/narrativa.json`
5. Visual brief gerado? → `cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/visual-brief.txt`
6. Capa foi gerada? → existe `cover-url.txt` populado?
7. Slides 2-9 gerados? → existem `url-2.txt` até `url-9.txt`?
8. Drive backup completou? → checa pasta `{brand_slug}/Carrosseis/$(date +%Y-%m-%d)/` no Drive
9. Notion foi atualizado? → entry nova em `🎨 Carrosséis` com Slides populado?

Encontra o passo onde quebrou. Fix vai ser em uma página do Notion (instrução, `🔐 Configuração`, `🖼️ Referências visuais`) ou no prompt da Routine — quase nunca em código.

---

## Lições aprendidas que viraram regra V2.5

| Aprendizado | Onde virou regra |
|---|---|
| Sandbox bloqueava chamada direta de API | Arquitetura híbrida: R2 vira Routine Local com Higgsfield CLI |
| Scripts + launchd têm muita superfície de erro | Tudo colapsa em UM prompt do Routine Local |
| Vision das refs precisa de bytes reais | Routine baixa via curl + Read nativo do Claude |
| Render sequencial é lento | Slides 2-9 sempre em paralelo via bash & + wait |
| Capturar URL via filesystem é frágil | `cover-url.txt` gravado IMEDIATAMENTE após capa |
| Upload base64 estoura contexto | Notion entry usa external URLs e Drive como backup |
| Sandbox Remote bloqueia HTTP direto | R1 não baixa imagem; extração migra pro R2 Local (Etapa 1.5) |
| R1 falhava todas as heros com 403 | R1 só faz best-effort de URL + escreve Dica visual textual |
| Routine em "Ask Permissions" trava a automação | Permission mode automático + `.claude/settings.json` no working folder |
| Logo desenhada pela IA distorce | Logo compositada via Pillow sobre área reservada |
| Mac pode estar offline às 08h | Catch-up automático + schedule `*/30 8-22` |
| Re-render era exceção, virou regra | Comando `--re-render` é primário |
| Setup manual no Notion é lento | Setup CLI + Integration Token cria tudo via API |
| Homebrew + jq + magick + rclone é muito setup | Zero deps externas — Claude Desktop tem tudo |
