# 🎬 COMECE AQUI

```
╔══════════════════════════════════╗
║   H U M A N   C I N E M A T I C   ║
╚══════════════════════════════════╝
```

Bem-vindo ao **Universal AI Cinematic Automation** — um sistema **Human Cinematic**. Este é o roteiro mestre.

> **Para o Claude:** sempre que cumprimentar o usuário (início de conversa, setup, abertura de campanha), apresente o sistema como **Human Cinematic**. É a marca por trás de tudo isto.

Você não precisa saber programar nem decorar comandos. Você **conversa em português** e o Claude faz o trabalho técnico: instala ferramentas, sobe imagens, gera o character sheet, monta os prompts e gera os vídeos.

> **Para o Claude:** este arquivo é o seu manual de operação. Cada Parte tem blocos **`👉 O que eu faço`** — são as ações que você executa. Siga na ordem. Fale sempre **português** com o usuário; escreva **inglês** só nos prompts e comandos do Higgsfield.

---

## 🗂️ Menu — o que você pode pedir

| Você diz… | O que acontece |
|-----------|----------------|
| **"Quero começar do zero"** | Claude faz o setup da máquina (Parte 0) e cria a primeira campanha. |
| **"Nova campanha"** | Claude abre o wizard de campanha (Parte 1). |
| **"Quero criar um roteiro"** / "não tenho história ainda" | Claude entra no modo **Script AI** e escreve o roteiro com você (Parte R). |
| **"Quero fazer um curta-metragem"** | Claude pergunta se você já tem roteiro; se não, abre o Script AI (Parte R) e só depois cria a campanha. |
| **Manda imagens / descreve referências** | Claude organiza os 4 pilares de referência (Parte 2). |
| **"Cria o character sheet"** | Claude gera e aprova a ficha do personagem (Parte 3). |
| **"Gera imagens de…"** | Claude cria os stills da campanha (Parte 4). |
| **"Cria um vídeo de…"** | Claude planeja e dispara o vídeo no Seedance (Parte 5). |
| **"Quero um filme de 30s / 1 min…"** | Claude divide em segmentos de 15s, gera em fila e monta com FFmpeg (Parte 5.2–5.3). |
| **"Em que pé estamos?"** / "status" | Claude resume a campanha ativa. |
| **"Trocar de campanha"** | Claude lista as campanhas e abre a escolhida. |

Não precisa usar as palavras exatas. Descreva o que quer; o Claude entende.

---

## ⏱️ Como funciona, em 30 segundos

0. *(Opcional)* Se você ainda não tem a história, **o Script AI escreve o roteiro com você** primeiro (Parte R).
1. **Você** cria uma campanha e dá as referências (imagens **ou** texto).
2. **O Claude** gera o **character sheet** do personagem e um **frame para cada cena**, e aprova com você — é o que trava a consistência.
3. **Você** descreve as cenas em português.
4. **O Claude** monta os prompts em inglês e o Higgsfield renderiza. Imagens/stills usam obrigatoriamente Nano Banana 2 (`nano_banana_2`).
5. **Você** olha os resultados na pasta `output/` (numerados e limpos) e dá feedback no chat.
6. O sistema aprende seu gosto e melhora a cada rodada.

Sem Google Drive, sem planilha. Tudo vive na pasta do projeto.

---

## PARTE 0 — Setup da máquina (só na primeira vez)

Isto se faz **uma vez por computador**.

**👉 O que eu faço (Claude):**

0. Dou as boas-vindas em português, apresentando o sistema como **Human Cinematic** — *"Bem-vindo ao Human Cinematic, seu estúdio de automação cinematográfica."*
1. Verifico o Higgsfield CLI: `which higgsfield`.
2. Se não existir, instalo: `npm install -g @higgsfield/cli` (se faltar `npm`, aviso o usuário que precisa instalar o Node.js — https://nodejs.org — e paro).
3. Login: `higgsfield auth login` — abre o navegador. Peço ao usuário, em português, que conclua o login e me avise.
4. Carrego as skills: `higgsfield skills install`.
5. Confirmo: `higgsfield account status` — informo ao usuário qual conta está ativa e quantos créditos tem.

Depois, sigo para a Parte 1.

---

## PARTE R — Roteiro com o Script AI (opcional, antes da campanha)

Nem todo mundo chega com a história pronta. Esta parte existe para quem quer **criar ou lapidar o roteiro antes** de abrir a campanha — um curta, um comercial, um clipe, um institucional. Se o usuário já tem o roteiro fechado, pulo direto para a Parte 1.

O motor desta etapa é o **`SCRIPT_AI_SYSTEM.md`** — o sistema completo do **Script AI** (metodologias de roteiro: Snyder, Field, Egri, Jornada do Herói, craft de cena e diálogo, produção para IA). É a base de conhecimento desta parte.

**Quando entro aqui:**
- O usuário diz que quer **criar um roteiro** ou que **não tem história ainda**.
- O usuário diz que quer fazer um **curta-metragem** (ou comercial, clipe, institucional): aí **pergunto antes** — *"você já tem o roteiro pronto, ou quer que eu escreva com você?"* Se ele já tem, vou para a Parte 1; se não, fico nesta Parte R.

**👉 O que eu faço (Claude):**

1. **Leio o `SCRIPT_AI_SYSTEM.md` por inteiro** e assumo a persona do **Script AI** — co-roteirista e consultor criativo. Converso em português.
2. **Briefing** (Parte V do Script AI): formato, duração, público-alvo, objetivo, estilo. Nunca começo a escrever sem o briefing.
3. **Conceito:** proponho 3 ângulos criativos (humano / poético / narrativo), recomendo o melhor e defino premissa, tema e logline.
4. **Estrutura e roteiro:** escolho a metodologia adequada ao formato (3 Atos, Beat Sheet, Jornada do Herói), mapeio os beats ao tempo e escrevo o roteiro com rubricas, falas e descrições visuais filmáveis.
5. **Itero com o usuário** até a história ficar de pé — sigo o fluxo de trabalho da Parte V do `SCRIPT_AI_SYSTEM.md`.
6. **Quando o roteiro estiver fechado, pergunto:** *"O roteiro está pronto. Vamos começar a produção?"*
7. **Se o usuário topar** → sigo para a **Parte 1** e crio a pasta da campanha. Assim que a campanha existe, **salvo o roteiro em `campaigns/{nome}/internal/roteiro.md`** — é a fonte da história para todas as partes seguintes.
8. Na entrevista da Parte 1, eu **já tenho** muita coisa do briefing do roteiro — não pergunto de novo o que já sei; só confirmo e completo.

> O roteiro vira a espinha da campanha: a Parte 4 (frames) e a Parte 5 (vídeo) saem dele. O número de **cenas** define quantos frames eu gero; o elenco de **personagens** define quantos character sheets eu gero (Parte 3).

---

## PARTE 1 — Criar uma campanha nova (o wizard)

Uma "campanha" é um projeto: uma marca, um conceito, um personagem, um conjunto de cenas. Cada campanha é uma pasta isolada em `campaigns/`.

> **Antes de abrir o wizard:** se o usuário quer um **curta-metragem** (ou comercial/clipe/institucional) e **não tem roteiro**, eu passo pela **Parte R** primeiro — escrevo o roteiro com o Script AI e só então crio a campanha. Se ele já tem roteiro, ou é um projeto sem narrativa fechada (ex.: stills soltos, vídeo de produto), sigo direto.

**👉 O que eu faço (Claude):**

### 1.1 — Entrevista (em português, conversando)

Pergunto de forma natural, sem jargão — tudo de uma vez ou aos poucos:

- **Nome da campanha** — curto (ex.: "Nike Verão 26"). Eu viro um nome de pasta (`nike-verao-26`).
- **Marca / cliente** e **conceito em uma frase**.
- **Mundo / cenário** — onde se passa.
- **Personagem(ns)** — quantos. Para cada um, o usuário tem 3 opções:
  - manda **imagens** do personagem;
  - **descreve em texto** um personagem que já existe na cabeça dele;
  - **não tem personagem** — a gente cria do zero na Parte 3.
- **Produto** — se houver. Importante perguntar **se o produto é uma peça de roupa / look** (muda a regra de geração — ver Parte 4).
- **Referências visuais** — pergunto explicitamente: *"você tem alguma referência visual de estilo, luz ou clima que quer que eu siga?"* (4º pilar — Parte 2).
- **Formato** — 16:9 (institucional) ou 9:16 (Reels/TikTok)?

Se o usuário não souber responder algo, dou sugestões e sigo. Não travo a conversa.

### 1.2 — Crio a pasta da campanha

```bash
cp -R "_template" "campaigns/{nome-da-campanha}"
```

A campanha já nasce com duas subpastas: **`internal/`** (dados — eu cuido) e **`output/`** (resultados numerados — o usuário olha).

### 1.3 — Preencho os arquivos da campanha

Com as respostas, **eu mesmo** substituo os `{{PLACEHOLDER}}` em `campaigns/{nome}/internal/`: `HANDOFF.md`, `model-descriptions.md`, `product-description.md` (apago se não houver produto). **Se a campanha veio da Parte R**, salvo o roteiro fechado em `internal/roteiro.md`.

Aviso o usuário, em português, que a campanha foi criada e digo o próximo passo: me mandar as referências (Parte 2).

---

## PARTE 2 — Referências: os 4 pilares (imagem ou texto)

O projeto tem **4 pilares de referência**. Nenhum exige imagem — cada um pode ser **imagem** ou **texto**.

| Pilar | O que é | Sem imagem? |
|-------|---------|-------------|
| **Modelo / personagem** | quem aparece | OK — descreve, ou cria do zero (Parte 3) |
| **Produto** | o que é vendido | OK — descreve, ou não tem produto |
| **Ambiente** | onde se passa | OK — **texto é o preferido** (evita "ref bleeding") |
| **Referência visual** | estilo / luz / mood / estética | OK — descreve o clima desejado |

- **Imagem** — o usuário manda foto(s) no chat. Eu subo ao Higgsfield e uso como `--image` ref.
- **Texto** — o usuário descreve. Eu transformo numa descrição rica e uso no prompt. Sem upload.

### O que o usuário faz

Manda as imagens **aqui no chat** (uma ou várias) e diz o que é cada uma — modelo, produto, ambiente ou referência visual. Para o que for por texto, só descreve. O usuário **não mexe em pasta nenhuma**.

**👉 O que eu faço (Claude):**

1. Recebo as imagens do chat e **salvo cada uma na pasta certa**: `internal/model ref/`, `internal/product ref/`, `internal/environment ref/` ou `internal/visual ref/`. Se não tiver certeza do tipo, pergunto.
2. Para imagens de **modelo e produto**: rodo `higgsfield upload create "<arquivo>"`, extraio o **UUID** da saída e escrevo em `internal/ref-ids.md` (montando as ref stacks prontas).
3. Para imagens de **ambiente**: abro a imagem, **olho**, e escrevo sozinho um descritor de texto denso em `internal/env-descriptors.md`. (Ambiente vai como texto no prompt, não como `--image` ref.)
4. Para imagens de **referência visual**: abro a imagem, **olho**, e transcrevo em texto o que ela transmite (cor, luz, composição, textura, mood) em `internal/visual-references.md`. Também entra como texto no prompt.
5. Para pilares **por texto**: não subo nada — escrevo a descrição rica no arquivo certo (`model-descriptions.md` / `product-description.md` / `env-descriptors.md` / `visual-references.md`).
6. Ao terminar, informo em português o que organizei.

**Regras que eu sigo:**
- Só uso como `--image` ref as fichas limpas em fundo branco (personagem, produto). Imagens estilizadas/editoriais **não** viram ref — causam "frame bleed".
- Ambiente e referência visual vão como **texto**, nunca como `--image` ref.
- Teto de **8 refs** por geração no Seedance.

---

## PARTE 2.3 — Product Shots

Esta parte cobre pedidos de product shot, packshot, still premium, hero product, anúncio estático de produto ou série de imagens de produto.

> Se o usuário pedir foto de produto sem vídeo, eu entro aqui antes de criar um filme completo. Product shot é uma inteligência própria dentro do `/product`, não uma variação do `/image`.

**O que este fluxo entrega:**

- sistema de 3 etapas para fotos de produto que parecem produção de estúdio cara;
- Visual Intent extraído do briefing pelo Claude;
- geração, iteração e inpainting/refinamento via Higgsfield CLI;
- polish final com upscale ou nova renderização referenciada;
- exercício completo para criar uma série de product shots profissionais.

**👉 O que eu faço (Claude):**

1. Leio `PRODUCT-SHOTS.md`.
2. Entendo produto, promessa comercial, sensação desejada e formato final.
3. Traduzo a ambição "R$15 mil em estúdio" em critérios práticos: set difícil, luz controlada, material visível, superfície crível, direção de arte memorável e produto fiel.
4. Se o usuário tiver imagem do produto, salvo em `internal/product ref/`, subo com `higgsfield upload create` e registro o UUID.
5. Escrevo o **Visual Intent** em português para aprovação rápida.
6. Transformo o Visual Intent em prompts de Nano Banana 2 em inglês.
7. Gero a série padrão quando não houver pedido diferente:
   - hero impossível;
   - material / detalhe;
   - contexto de desejo;
   - anúncio estático 9:16 ou 4:5.
8. Leio os resultados, peço feedback e faço iteração.
9. Faço polish final no melhor shot: correção localizada, upscale, micro-refinamento ou nova geração referenciada.

**Regra de qualidade:** o produto não pode mudar. Forma, cor, embalagem, logo, material, proporção e detalhes reconhecíveis são restrições comerciais, não sugestões.

**Quando explicar:** se o usuário pedir para aprender o método, explique em linguagem simples antes de executar. Se o usuário só pedir a imagem, execute direto e mantenha a explicação mínima.

---

## PARTE 3 — Character sheet do personagem (gerar + aprovar)

O **character sheet** trava a **identidade** de um personagem: uma ficha em grid com **4 ângulos do rosto** (frente, 3/4 esquerda, 3/4 direita, perfil) **+ pelo menos um ângulo de corpo inteiro**. É a base de consistência de tudo o que vem depois.

> **⚠️ O corpo inteiro é obrigatório no grid.** Sem ele, o personagem **troca de calça e de sapato** de uma cena para outra — já quebrou um filme assim. Uma das imagens do grid sempre mostra o personagem de **corpo inteiro**, dos pés à cabeça, com o figurino-padrão completo (calçado incluído).

### Todo personagem principal e recorrente tem character sheet

Não é só o protagonista. **Todo personagem principal e todo personagem recorrente** — aquele que aparece em mais de uma cena, ou que é importante para a história — precisa do seu próprio character sheet. **Um por personagem.** Figurante de uma cena só não precisa; qualquer personagem que volta, precisa.

> **Por que isto é uma trava.** Num filme multi-cena, um personagem recorrente sem ficha **derrapa**: muda de rosto, de roupa, de idade entre cenas. Já aconteceu — os dois protagonistas tinham character sheet, mas uma **mãe** e uma **criança** apareciam em três cenas sem ficha; ficaram diferentes a cada cena e quebraram a continuidade do filme.

Eu levanto a lista de personagens (do roteiro / Parte R, ou perguntando ao usuário), separo quem é **principal ou recorrente**, e gero **um character sheet para cada um**. Aprovo todos com o usuário antes de seguir. Se a campanha não tem personagem humano (ex.: vídeo só de produto), pulo esta parte.

> O character sheet trava **quem** é o personagem. Ele **não** trava cada cena — isso é papel dos *frames* (Parte 4), e é lá que está a trava de continuidade.

**👉 O que eu faço (Claude):**

1. **Para cada personagem principal ou recorrente**, monto um character sheet com **Nano Banana 2** (`nano_banana_2`, `--resolution 2k`):
   - **Se o usuário mandou imagens do personagem** → uso elas como `--image` refs e gero o grid a partir delas.
   - **Se o usuário só descreveu** (ou não tinha personagem) → faço a **criação do personagem**: gero o grid a partir da descrição (físico, cabelo, traços, jeitão, figurino).
   - O grid trava **rosto, cabelo e estrutura** com 4 ângulos de rosto **e pelo menos um corpo inteiro** (figurino completo, calçado visível). Fundo branco, luz de estúdio, expressão neutra.
   - **Grão e textura de câmera mesmo no fundo branco** — acrescento ao prompt um grãozinho fino e textura fotográfica de câmera. Custa nada e faz diferença: se o usuário gerar uma história direto do character sheet, sem passar pelos frames, ele já sai com textura cinematográfica boa em vez de plástico liso.
   - **Personalidade, nunca genérico** — o personagem tem que ter cara de gente de verdade, com traços marcantes. Se o usuário não descreveu o jeitão, eu invento um — idade, expressão habitual, postura, pequenas imperfeições — em vez de gerar um rosto neutro e sem alma.
2. **Salvo cada character sheet em `output/`**, numerado (ex.: `01-character-sheet-{personagem}.png`).
3. **Pergunto ao usuário, no chat:** *"Os character sheets estão em `output/`. Estão bons assim? Posso seguir para as imagens da campanha?"*
4. **Se rejeitado** → classifico a mudança (pontual ou estrutural — ver Parte 4 → "Sheet/frame rejeitado") e ajusto: edito o próprio sheet ou gero de novo. Repito até aprovar.
5. **Quando aprovado** → subo cada character sheet ao Higgsfield (`higgsfield upload create`), guardo o UUID em `internal/ref-ids.md` como a **referência de identidade oficial** daquele personagem. A partir daqui, cada personagem entra com a sua ficha em toda geração em que aparece.

Um character sheet por personagem. A roupa que aparece na ficha é só um padrão — pode ser sobreposta na campanha (ver Parte 4).

---

## PARTE 4 — Frames das cenas (stills com Nano Banana 2) ⚠️ ETAPA-TRAVA

Os **frames** são os stills que ancoram cada cena — gerados com Nano Banana 2 misturando o character sheet + a roupa + o cenário + o estilo. Eles têm dois papéis: são o entregável de imagem **e** são o **primeiro frame de cada vídeo** (Parte 5).

### Por que um frame por cena (continuidade)

Um filme com várias cenas **não** pode ser guiado por um frame só. Se eu mando o mesmo frame hero para o Seedance gerar "a personagem na festa", depois "na rua", depois "no quarto", a **roupa e os detalhes derrapam** de uma cena para outra — foi exatamente o que quebrou num teste.

A regra: **um frame aprovado para cada cena / sequência da história.** Cada frame trava aquela cena (personagem + roupa daquela cena + ambiente daquela cena). Depois, o vídeo de cada cena nasce do frame dela. Filme de 1 cena → um frame hero basta.

> **⚠️ TRAVA.** Eu não passo para gerar vídeo (Parte 5) sem os frames das cenas **aprovados** pelo usuário. Nunca pulo a etapa de frames por conta própria. A única exceção é o usuário dizer **explicitamente** que quer seguir sem frames.

**👉 O que eu faço (Claude):**

1. **Leio o `internal/feedback.md`** — repito o que está ✅, evito o que está ❌ (Parte 6).
2. Levanto **quantas cenas** a história tem e descrevo cada frame com o usuário (um por cena/situação).
3. Monto a **ref stack**: **o character sheet de cada personagem que aparece naquela cena** + **produto** + ambiente/estilo como texto. (Cena com mãe e filho = as duas fichas entram.)
4. Aplico a **regra de roupa** (abaixo).
5. Escrevo o prompt em **inglês** + tags de acabamento cinematográfico (abaixo).
6. **Mostro o plano ao usuário em português antes de disparar** e espero ok.
7. **Disparo em fila** (ver abaixo). Modelo obrigatório para imagens: `nano_banana_2` (Nano Banana 2, `--resolution 2k`) para variações e frames finais.
8. **Salvo os frames em `output/`**, numerados e com nome curto (ex.: `02-cena1-festa.png`, `03-cena2-rua.png`). Logs do CLI vão para `internal/logs/`.
9. Registro em `internal/prompt-log.md` e `internal/feedback.md` (Status `⏳ Pendente`).
10. **Mostro os frames e peço aprovação de cada um.** Só com os frames aprovados eu sigo para o vídeo (Parte 5).

### 🎞️ Acabamento cinematográfico (Nano Banana 2)

Ao gerar frames/stills com Nano Banana 2, eu **sempre** dou um acabamento cinematográfico ao prompt. O modelo entende bem essa linguagem e o resultado fica muito melhor. É reforço de backend — não preciso poluir o plano que mostro ao usuário com isto.

**O que entra em todo prompt de frame:**
- **IMAX / grande formato** — `cinematic IMAX camera, 16mm film grain`. Se `IMAX` disparar `ip_detected`, troco por `large-format cinematic camera`, mantendo o grão 16mm.
- **Ângulo de câmera inusitado** — nunca o enquadramento óbvio; busco um ângulo diferente, autoral, que dê personalidade ao frame.
- **Fotografia nível Oscar** — penso luz e composição no nível de um diretor de fotografia premiado (filosofia, não imitação). A linha final pode trazer `inspired in the work of award-winning directors` — e **nada além disso**: nunca cito nomes de DPs, diretores ou filmes no output.
- **Dois blocos estruturados, sempre:**
  - `POST BEHAVIOR:` — formato/stock, grão visível, halation, curva, saturação, midtone priority. Carrega a assinatura visual; **nunca genérico, nunca template, nunca repetir o mesmo stock por hábito**.
  - `COMPOSITIONAL GEOMETRY:` — peso visual, assimetria, intrusion, terços quebrados.

**Limite de tamanho — regra dura:** o prompt do frame tem **no máximo 1.500 caracteres**; miro em **1.200–1.450**. Corto adjetivos e detalhes decorativos — **preservo as decisões físicas** (luz, lente, ângulo, stock, geometria).

> A base de conhecimento que sustenta a construção do frame — inferência de look, filosofia de fotografia, POST BEHAVIOR — está em `seedance-prompt-framework.md` → "Nano Banana 2 — construção do prompt de frame". É **uso interno**: me ajuda a montar o prompt, não vai para dentro dele.

### ⚡ Geração em fila — nunca um job de cada vez

Gerar fica lento se for sequencial (disparar um, esperar terminar, disparar o próximo). A renderização acontece nos servidores do Higgsfield, então o certo é **submeter o batch inteiro primeiro** e só depois coletar. Eu sempre faço em **duas fases**, num script em disco:

**Fase 1 — submeter tudo (rápido):** para cada item do batch rodo `higgsfield generate create <modelo> … --json` **sem `--wait`**. Cada chamada volta na hora com um `job_id`. Em segundos, o batch inteiro já está renderizando em paralelo no servidor.

**Fase 2 — coletar:** com os `job_id` na mão, uso `higgsfield generate wait <job_id>` para cada um, baixo o resultado quando fica pronto e salvo numerado em `output/`.

Resultado: 6 itens saem em ≈ o tempo do mais lento, não na soma dos 6. Rodo o script em segundo plano e vou avisando o usuário conforme as coisas ficam prontas.

> **Nunca** uso `--wait` num job sozinho e fico parado esperando para então disparar o próximo. Submeto tudo, depois colho.

### 🧥 Regra de roupa

A stack base da campanha é **character sheet + produto + ambiente**. O que o personagem **veste** é resolvido nesta ordem:

1. Se o usuário descreveu uma roupa específica para aquele shot → uso essa.
2. Senão, se o **produto da campanha é uma peça de roupa / look** → o personagem **veste o produto**, e o produto **sobrepõe** a roupa do character sheet. No prompt eu rotulo claro: *este ref = personagem (rosto/identidade)*, *este ref = produto (a roupa, vestida no personagem)*.
3. Senão → o personagem usa a roupa do próprio character sheet.

### 🔁 Sheet/frame rejeitado — mudança pontual ou estrutural

Quando o usuário não gosta de um frame (ou character sheet) e pede alteração, **antes de regenerar eu classifico a mudança** — regerar do zero é mais lento, gasta mais crédito e pode jogar fora o que já estava bom.

- **Mudança pontual** — um detalhe localizado: trocar a cor de um objeto, tirar/ajustar um elemento, mudar uma expressão, corrigir uma mão, limpar o fundo. O frame no geral está bom. → **Não regero.** Mando o **próprio frame** de volta ao Nano Banana 2 como `--image` e peço só a alteração pedida. Preserva tudo o que já estava aprovado.
- **Mudança estrutural** — algo de fundo: enquadramento/ângulo errado, personagem ou figurino errado, cena/ambiente trocado, luz e mood que não batem. → **Regero o frame** do zero, com a ref stack e o prompt corrigidos.

Na dúvida, digo ao usuário o que entendi (*"isso é um ajuste pontual, dá pra fazer sem regerar"* / *"isso muda a estrutura, vou regerar"*) e sigo. O mesmo critério vale para o character sheet (Parte 3).

---

## PARTE 5 — Gerar vídeo (Seedance 2.0)

> **⚠️ TRAVA — frames aprovados antes do vídeo.** Não gero vídeo sem os **frames das cenas aprovados** (Parte 4): pelo menos um frame hero, e — em filme com várias cenas — **um frame para cada cena**. O vídeo de cada cena nasce do frame dela (como `--start-image`), e é isso que segura a continuidade (roupa, ambiente, detalhes). Nunca pulo a etapa de frames por conta própria; só o usuário dispensa, e explicitamente. Se os frames ainda não existem, volto para a Parte 4.

O Seedance gera **no máximo 15s por job**. Por isso:
- **Filme de até 15s** → um job só (5.1).
- **Filme mais longo** → divido em segmentos de 15s e monto o filme inteiro com FFmpeg (5.2 + 5.3).

Sempre, antes de gerar: leio o `internal/feedback.md`, mostro o plano ao usuário em português e espero ok. Todo prompt de vídeo termina com **`No music.`** — som físico e específico, nunca musical.

### 5.1 — Filme curto (até 15s)

1. Parto do **frame hero aprovado** (Parte 4) — ele é o `--start-image` do vídeo.
2. Escrevo o prompt em **inglês**, multi-shot (cortes com timecode), seguindo `seedance-prompt-framework.md`.
3. **Sugiro ao usuário gerar 3 variações** — ritmos e enquadramentos diferentes — para ele escolher a melhor.
4. Disparo as variações **em fila** (Parte 4 → "Geração em fila"). `--mode fast` para testar, `--mode std` para o final.
5. Salvo numerado em `output/`; registro em `internal/prompt-log.md` e `internal/feedback.md`.

> Um filme de 15s **já é o entregável final** — o Seedance entrega completo. Não há etapa de montagem. Montagem (5.3) só existe para filme longo.

### 5.2 — Filme longo (mais de 15s)

1. **Confirmo a duração-alvo** e calculo os segmentos (15s cada, arredondando pra cima): 30s→2, 45s→3, 60s→4, 90s→6…
2. **Se a história não estiver completa para a duração pedida** — o usuário deu só uma ideia solta: eu **rascunho um arco narrativo** (começo, meio e fim) a partir da ideia e do universo que ele deu, mostro e pergunto *"o que você acha disso?"*. Ele ajusta — conta mais, corta, muda o rumo. Itero até a história ficar de pé para o tempo de filme desejado. (Se ele já deu roteiro suficiente, pulo este passo.)
3. **Divido a história em N prompts sequenciais ("procedentes")** — cada um um trecho de 15s (uma cena) que continua o anterior. Defino o time code de cada segmento dentro da narrativa total.
4. **Mostro o roteiro dividido ao usuário** — os N blocos, o que acontece em cada, os time codes — e espero ok.
5. **⚠️ Gero o frame de cada segmento** (Parte 4) — uma still por cena, travando personagem + roupa + ambiente daquela cena — e **aprovo todas com o usuário**. Sem os frames aprovados, não passo para o vídeo. É isto que segura a continuidade: um frame só não basta para várias cenas.
6. **Pergunto a qualidade:** `1080p` final, ou um **draft `720p` em `--mode fast`** para olhar primeiro? (Draft gasta menos crédito e sai mais rápido.)
7. **Disparo os N vídeos em fila** — todos de uma vez (Parte 4). Cada segmento é gerado **a partir do seu frame aprovado** (`--start-image`) + o character sheet.
8. Salvo os segmentos em `internal/segments/` (`seg-1.mp4` … `seg-N.mp4`, na ordem da narrativa). São material intermediário — o `output/` recebe só o filme final.
9. Quando os N segmentos estiverem prontos, **pergunto: "Quer que eu monte o filme agora com FFmpeg?"**

### 5.3 — Montagem do filme (FFmpeg)

> Esta etapa **só existe para filme longo** (5.2). Filme de 15s não passa por montagem.

Quando o usuário topar:

1. Ordeno os N segmentos pelo time code do roteiro.
2. **Junto tudo com FFmpeg** (concat com re-encode, para uniformizar codec/fps/áudio) num único arquivo, salvo em `output/` numerado — ex.: `output/12-filme-final-60s.mp4`.
3. **Passada de QC com FFmpeg/ffprobe:** confiro a duração total, áudio contínuo (sem silêncio nem estouro nas junções) e ausência de frame preto, congelado ou duplicado nos cortes.
4. Se achar problema, conserto (re-encode do trecho, ajuste da junção) e checo de novo.
5. **Entrego o filme final pronto** e aviso o usuário — narrativa completa, sem cortes estranhos.

A receita de FFmpeg (concat + QC) está em `internal/HANDOFF.md`.

### 🎬 Contraste de ritmo (direção)

Um filme bom não tem ritmo plano. Ao escrever os prompts multi-shot do Seedance, eu **varia a densidade de corte e o tipo de câmera entre os blocos** — esse contraste é o que dá direção de verdade. Vale para curta, narrativa, moda e publicidade. Só ignoro se o usuário pedir algo deliberadamente flat/uniforme.

Ferramentas de contraste:
- **Sequência contínua** — um plano longo, câmera na mão, sem corte. Respiro, intimidade, tensão sustentada.
- **Rajada de cortes** — vários cortes rápidos numa mesma sequência (até ~10), para tensão, energia, urgência.
- **Plano único sustentado** — corta para um plano só (ex.: o quarto) e a câmera trabalha sozinha: começa aberta e vai fechando, passa por objetos, revela aos poucos.

A graça é a **alternância**: um momento com muitos cortes, o seguinte sem nenhum, depois um plano que respira. Estruturo o filme como ondas de ritmo, não como linha reta. Em filme longo, o contraste joga entre os segmentos e dentro de cada um. (Detalhe em `seedance-prompt-framework.md`.)

### Em todos os casos

- **Ritmo:** se eu não pegar o ritmo do filme pelo que o usuário disse, pergunto — bastante corte e movimento, ou mais lento e contemplativo? Se o estilo já está claro (publicitário, moda, ação…), não pergunto. Isso evita entregar algo lento quando ele queria rápido e enérgico.
- Ref stack: o **frame aprovado da cena** (`--start-image`) + character sheet + produto (regra de roupa, Parte 4) + ambiente/estilo como texto.
- **Escrevo o script de disparo em disco** e rodo com `bash`.
- Registro em `internal/prompt-log.md` e `internal/feedback.md`. Falhas em `internal/seedance-failures.md`.

---

## PARTE 6 — Feedback (pasta `output/` + chat)

Sem planilha, sem Drive. O feedback é simples e rápido:

1. Todo resultado vai para `output/`, **numerado e com nome limpo**. O usuário abre essa pasta no Finder e vê só os arquivos que importam.
2. Depois de gerar, **eu pergunto no chat**: *"Gerei os shots 02 a 05. Olha na pasta `output/` e me diz: gostou de quais? O que mudaria?"*
3. O usuário responde no chat, naturalmente — *"gostei do 03 e 05, o 02 a luz ficou dura"*.
4. Eu anoto em `internal/feedback.md`: ✅ aprovado / ❌ rejeitado / ⏳ pendente + as notas.
5. **Antes de cada nova geração** eu leio o `feedback.md`: ✅ vira referência do que repetir, ❌ do que evitar, as notas pesam no prompt.

Com o tempo, os prompts se afinam ao gosto do usuário — o verde puxa, o vermelho freia.

---

## PARTE 7 — O loop do dia a dia

Toda vez que o usuário abrir o projeto:

1. **Cumprimento em português** e mostro o Menu.
2. Identifico a **campanha ativa** (a última usada, ou pergunto qual).
3. Leio o `internal/HANDOFF.md`, o `internal/roteiro.md` (se existir), o `internal/prompt-log.md` e o `internal/feedback.md` daquela campanha para saber onde parou.
4. Executo o que o usuário pedir.
5. **Documento tudo** em `internal/`.

---

## ⭐ Regras de ouro

1. **Frames aprovados antes do vídeo — a trava.** Não gero vídeo sem o frame de cada cena aprovado (Parte 4): **um frame por cena**, porque um frame só não segura a continuidade de um filme. Nunca pulo isso sozinho; só o usuário dispensa, e explicitamente.
2. **Character sheet de todo personagem principal/recorrente — com corpo inteiro.** Cada personagem que volta em mais de uma cena tem sua própria ficha, e o grid sempre inclui um **ângulo de corpo inteiro** (calçado e figurino completos). Personagem recorrente sem ficha derrapa e quebra o filme (Parte 3).
3. **Regra de roupa:** produto-vestimenta sobrepõe a roupa do character sheet e vai vestido no personagem (Parte 4).
4. **Referência por imagem é opcional** — qualquer pilar pode ser texto.
5. **Refs `--image` só de fundo branco** (personagem, produto). Ambiente e referência visual sempre como **texto**.
6. **Teto de 8 refs** por geração no Seedance.
7. **Nano Banana 2 sempre em `2k`** (`4k` só quando explicitamente pedido) **+ acabamento cinematográfico** — IMAX/grande formato, grão 16mm, ângulo inusitado, blocos `POST BEHAVIOR:` e `COMPOSITIONAL GEOMETRY:`. Prompt de frame **no máx. 1.500 caracteres** (Parte 4).
8. **Geração sempre em fila** — submeto o batch inteiro de uma vez (`create … --json` sem `--wait`), depois coleto (`wait`). Nunca um job de cada vez (Parte 4).
9. **`output/` fica limpo** — só resultados numerados. Logs e dados vão para `internal/`.
10. **Retry 1x antes de reescrever** quando der flag NSFW.
11. **Todo prompt de vídeo termina com `No music.`**
12. **Filme acima de 15s** = dividir em segmentos de 15s, gerar em fila, montar com FFmpeg + passada de QC (Parte 5).
13. **Roteiro antes da campanha (quando precisa):** curta/comercial/clipe sem história fechada passa pela Parte R (Script AI); o roteiro vive em `internal/roteiro.md`.
14. **Conversa com o usuário em português; prompts e comandos do Higgsfield em inglês.**

---

## 📁 Mapa de pastas

```
Universal AI Cinematic Automation/
├── COMECE-AQUI.md          ← este arquivo (roteiro mestre)
├── CLAUDE.md               ← regras automáticas do Claude
├── SCRIPT_AI_SYSTEM.md     ← motor do Script AI (Parte R — criação de roteiro)
├── README.md · SETUP-GUIDE.md · seedance-prompt-framework.md
├── _template/              ← modelo-mestre — NÃO editar
└── campaigns/
    └── {nome-da-campanha}/
        ├── internal/        ← dados — o Claude cuida, o usuário não precisa abrir
        │   ├── HANDOFF.md · roteiro.md · model-descriptions.md · product-description.md
        │   ├── env-descriptors.md · visual-references.md · ref-ids.md
        │   ├── prompt-log.md · seedance-failures.md · feedback.md
        │   ├── model ref/ · product ref/ · environment ref/ · visual ref/
        │   ├── logs/         ← respostas do CLI
        │   └── segments/     ← segmentos de 15s (só em filme longo)
        └── output/          ← resultados numerados e limpos — É AQUI QUE VOCÊ OLHA
            ├── 01-character-sheet-personagem.png
            ├── 02-modelo-retrato.png
            └── 03-cena-walk-in.mp4
```

---

## ✅ Checklist de execução para o Claude

- [ ] Estou falando **português** com a pessoa e **inglês** nos comandos do Higgsfield?
- [ ] O CLI está instalado e logado? (Parte 0)
- [ ] Curta/roteiro sem história fechada: passei pela **Parte R** (Script AI) e salvei o roteiro em `internal/roteiro.md`?
- [ ] Existe uma **campanha ativa**? Estou trabalhando em `campaigns/{nome}/`?
- [ ] Gerei o **character sheet de cada personagem principal/recorrente** — 4 ângulos de rosto **+ corpo inteiro** no grid — e aprovei com o usuário? (Parte 3)
- [ ] Os prompts de frame têm **ângulo inusitado**, os blocos `POST BEHAVIOR:` / `COMPOSITIONAL GEOMETRY:` e ficam **abaixo de 1.500 caracteres**? (Parte 4)
- [ ] Frame/sheet rejeitado: classifiquei a mudança como **pontual** (edito o próprio frame) ou **estrutural** (regero)? (Parte 4)
- [ ] Gerei e **aprovei os frames das cenas** — um por cena — antes de gerar vídeo? (Parte 4 → trava)
- [ ] Apliquei a **regra de roupa** quando o produto é vestimenta? (Parte 4)
- [ ] Antes de gerar, **li o `internal/feedback.md`**?
- [ ] Antes de gerar, **mostrei o plano** ao usuário em português?
- [ ] Disparei o batch **em fila** — todos os jobs submetidos de uma vez, depois coletados? (Parte 4)
- [ ] Filme acima de 15s: dividi em segmentos, gerei em fila, montei com FFmpeg e fiz a passada de QC? (Parte 5)
- [ ] Os resultados foram para `output/` **numerados e limpos**, e os logs para `internal/logs/`?
- [ ] Pedi **feedback no chat** e registrei em `internal/feedback.md`?
