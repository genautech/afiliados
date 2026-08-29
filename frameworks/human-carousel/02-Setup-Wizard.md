# 02 — Setup Wizard

> **Não é página do Notion.** Esse é o roteiro que o **agente de setup (Claude Code CLI)** executa na primeira interação pra coletar identidade da marca antes de criar a estrutura.

---

## Quando o wizard roda

Primeira execução do agente, no terminal:

```bash
cd ~/{brand-slug-temporario}
claude
```

Primeira mensagem que você manda: `vamos começar`.

O agente reconhece que não tem `01-Brand-Identity.md` preenchido na sessão, e dispara o wizard.

---

## As 11 perguntas do wizard

O agente faz UMA pergunta de cada vez, espera resposta, e segue. Não despeja as 11 de uma vez.

### 1. Nome da marca

```
Qual o nome completo da marca? (será exibido no slide de capa e no slide 9)
Exemplo: Human Academy
```

→ vira `brand_name`

### 2. Handle Instagram

```
Qual o @handle do Instagram?
Exemplo: @humanacademy
```

→ vira `brand_handle` (com o @)
→ deriva `brand_slug` (sem @, lowercase, hífen) pra path local

### 3. Cor primária

```
Qual a cor primária da marca? (hex)
Default: #EC5E26 (laranja warm)
```

→ vira `brand_color_primary`

### 4. Cor dark customizada (opcional)

```
Quer cor de fundo dark customizada? (hex, ou Enter pra usar default)
Default: #1B1411 (warm-dark)
```

→ vira `brand_color_dark`

### 5. Cor light customizada (opcional)

```
Quer cor de fundo light customizada? (hex, ou Enter pra usar default)
Default: #F1ECE3 (warm-cream)
```

→ vira `brand_color_light`

### 6. Assunto/nicho

```
Qual o assunto/nicho da marca em uma frase?
Exemplos: 
  - "IA pra criativos"
  - "Renda fixa pra investidor pessoa física"
  - "Tendências de design de produto"
```

→ vira `brand_subject`
→ usado também pra **sugerir fontes automaticamente** (cf. Parte 6.5 do SETUP)

### 7. Como chamar a audiência

```
Como você se refere à sua audiência? (termo curto)
Exemplos: alunos, leitores, investidores, designers
```

→ vira `brand_audience_term`

### 8. Veículo editorial de referência

```
Qual veículo jornalístico é referência de tom pra você? 
(o sistema vai se ancorar nele pro padrão editorial)
Exemplos: 
  - Folha de S.Paulo (BR mainstream)
  - JOTA (BR jurídico/político)
  - Bloomberg Brasil (finanças)
  - Pirate Wires (tech contracorrente)
  - Stratechery (estratégia tech)
```

→ vira `brand_voice_anchor`

### 9. Horários R1

```
Quando R1 (busca de notícias) deve rodar?
Default: 9, 13, 17 (manhã/almoço/fim de tarde)
Formato: horas separadas por vírgula (cron hours)
```

→ vira `cron_r1_hours`

### 10. Horário R2

```
Que horas R2 (geração do carrossel) deve rodar de manhã?
Default: 08:00
```

→ vira `cron_r2_time`

### 11. Logo da marca

```
Você quer usar logo da marca/pessoal nos carrosséis?
(o logo aparece pequeno na capa e grande no slide final — slides do meio ficam sem logo)

(s) Sim, vou anexar PNG depois (no Notion, página Brand Identity)
(n) Não, usa lockup tipográfico com o nome da marca
```

→ vira `brand_has_logo` (true/false)

Se respondeu sim, o agente avisa:
```
Beleza. Depois de criar a estrutura no Notion, abre a página 🏷️ Brand Identity 
e arrasta o PNG da logo na seção "Logo da marca". A R2 da próxima execução 
já pega.

Recomendação: PNG fundo transparente, mínimo 800x800px, formato quadrado ou 
retangular limpo. Pode trocar a qualquer momento substituindo o anexo.
```

→ Pode trocar depois marcando `brand_has_logo` na tabela da página Brand Identity ou anexando/removendo o PNG. **Sem necessidade de mexer em código.**

---

## Confirmação final

Depois das 11 respostas, o agente mostra um resumo:

```
Confirma essa identidade?

  brand_name:           Human Academy
  brand_handle:         @humanacademy
  brand_slug:           human-academy
  brand_color_primary:  #EC5E26
  brand_color_dark:     #1B1411 (default)
  brand_color_light:    #F1ECE3 (default)
  brand_subject:        IA pra criativos
  brand_audience_term:  alunos
  brand_voice_anchor:   Folha de S.Paulo
  cron_r1_hours:        9,13,17
  cron_r2_time:         08:00
  brand_has_logo:       true (você anexa o PNG depois)

(s) Sim, criar a estrutura
(n) Não, refazer
(e) Editar uma variável específica
```

Quando você confirma, o agente:

1. Cria a pasta `~/human-academy/` no Mac (ou `C:\Users\seu-user\human-academy\` no Windows)
2. Move os 17 arquivos `.md` pra `~/human-academy/docs/`
3. Cria `~/human-academy/.brand.json` com o dicionário acima
4. Cria `~/human-academy/.claude/settings.json` com a allowlist de permissões (pra Routine R2 rodar sem pedir confirmação — ver `13-R2-Routine-Local.md`)
5. Pede o **Notion Integration Token**
6. Pede o **slug da página principal do Notion** (que você criou em branco) ou cria via API
7. Cria a estrutura no Notion seguindo o **procedimento à prova de erro** de `03-Notion-template.md` (2 databases + 10 sub-páginas)
8. Popula `🏷️ Brand Identity` com as variáveis confirmadas
9. Popula as outras 9 páginas com o conteúdo dos `.md`, interpolando todas as variáveis
10. Cria `🔐 Configuração` com checklist Higgsfield CLI e valida `higgsfield account status`
11. **Testa os conectores** Notion + Google Drive (cf. `03-Notion-template.md`, "Verificação de conectores")
12. Salva `~/human-academy/notion-ids.json` com todos os IDs
13. **Guia você pela criação das 2 Routines no chat**, uma Routine de cada vez — cada uma entregue numa mensagem só, com todos os campos (ver seção abaixo) — incluindo deixar o permission mode da R2 em automático

Tempo total do wizard: **~5 min de conversa + ~30s de execução** + 2 min criando as Routines.

---

## Como o agente entrega a criação das Routines

> **Regra dura para o agente de setup: NÃO criar arquivo `.md` para o usuário abrir.** Tudo vai **direto no chat**, em blocos copiáveis. **Uma Routine de cada vez** (R1 primeiro, R2 depois), mas **todos os campos de cada Routine de uma vez só** — numa única mensagem. Arquivo `.md` quebra o fluxo; pingar campo a campo esperando "ok" também — o usuário quer ver a Routine inteira de uma vez, copiar tudo e colar.

O agente segue esta sequência:

### Primeiro: R1 — News Scout (Routine Remote)

O agente manda **uma única mensagem** com TODOS os campos da R1, cada um em seu bloco copiável, na ordem:

1. Instrução de abrir: Claude Desktop → Routines → New routine → tipo **Remote**
2. **Nome** (bloco copiável)
3. **Connectors** a marcar
4. **Tools** a marcar
5. **Permissões** (modo automático)
6. **Schedule** (cron)
7. **Prompt completo** (um único bloco copiável grande)

Tudo numa mensagem só. O usuário preenche a Routine inteira, roda o "Run now" de teste, e confirma → o agente passa pra R2.

### Depois: R2 — Carousel Creator (Routine Local)

Mesma lógica — **uma mensagem só com todos os campos** da R2:

1. Instrução de abrir: New routine → tipo **Local**
2. **Nome**
3. **Working folder**
4. **Connectors** e **Tools**
5. **Permissões** (modo automático)
6. **Schedule** (cron)
7. **Prompt completo**

### Por que uma Routine por vez, mas todos os campos juntos

- **Todos os campos juntos:** o usuário copia e cola a Routine inteira sem ficar esperando o próximo campo. Mais rápido, menos ida-e-volta.
- **Uma Routine por vez:** configura R1 inteira, testa, **vê funcionar** — ganha confiança. Só então parte pra R2, sem misturar.
- Blocos copiáveis no chat são mais fáceis de usar que abrir um arquivo.
- Se algo der errado, o usuário pergunta — fluxo de conversa, mas sem o atrito de confirmar campo a campo.

Os prompts completos das Routines estão em `12-R1-News-Scout.md` e `13-R2-Routine-Local.md` — o agente lê de lá e cola no chat (interpolando `{brand_*}`).

---

## Wizard de fontes (Parte 6.5 do SETUP)

Logo depois do wizard de identidade, o agente roda um **mini-wizard de sugestão de fontes** baseado em `brand_subject`:

```
Vou sugerir fontes de notícia pro nicho "IA pra criativos".
[roda web search por: "best ai news sources", "ai newsletter creative", etc.]

Encontrei 14 fontes potenciais. Vou agrupar por prioridade:

ALTA PRIORIDADE
1. The Verge (vertical AI) — EN, scrape
2. TechCrunch AI — EN, RSS
3. ...

MÉDIA PRIORIDADE
...

BAIXA PRIORIDADE / NICHE
...

Quer todas? Ou edita lista? (todas / editar / nenhuma)
```

Você confirma/edita. Lista vai pra página `📋 Fontes de notícia` no formato tabela estruturada.

---

## Reset do wizard

Se errou alguma resposta e quer reconfigurar:

```bash
cd ~/{brand-slug}
claude
> reset brand identity
```

O agente apaga `.brand.json` e roda o wizard de novo.

---

## Sub-comandos do agente após o wizard

Depois da configuração inicial, o agente conversacional (claude CLI no terminal local) reconhece comandos do dia-a-dia:

```bash
cd ~/{brand-slug}
claude
> adicionar fonte: <URL>            # adiciona em 📋 Fontes
> mudar cor primária pra #2A2E45    # edita 🏷️ Brand Identity
> rebuild brand                     # re-interpola todas as páginas com as variáveis atualizadas
> diagnosticar última run           # lê state/$TODAY/log.txt e investiga
```

Comandos do dia-a-dia da R2 não precisam mais do claude CLI — vão direto no painel da **Routine Local** no Claude Desktop (Run now + flag opcional):

```text
[Routine] → Run now                          # roda normalmente
[Routine] → Run now → "--re-render"          # re-render só visual
[Routine] → Run now → "--news=12"            # override de notícia
[Routine] → Run now → "--only-slide=5"       # regen slide específico
```

Os comandos conversacionais do agente CLI vivem em `PROJECT-INSTRUCTIONS.md` (gerado no setup).
