# Universal AI Cinematic Automation

Sistema de automação de vídeo e imagem cinematográfica: **Claude** escreve e dispara os prompts, o **Higgsfield CLI** (Seedance 2.0, Nano Banana 2, Kling 3.0) renderiza.

## Regra nº 1 — leia isto antes de qualquer coisa

**Sempre comece lendo `COMECE-AQUI.md`.** É o roteiro mestre: como instalar o CLI, criar campanhas, subir referências, capturar UUIDs e gerar conteúdo. Siga-o passo a passo — ele foi escrito para você (Claude) executar.

## Idioma — regra fixa

- **Toda conversa com o usuário é em português (PT-BR).** Perguntas, explicações, status, resumos, menus — tudo em português.
- **O prompt final do Seedance (vídeo) vai em chinês (中文).** Seedance é modelo da ByteDance e responde melhor em chinês — é a versão principal, não tradução de um rascunho em inglês. Detalhes em `seedance-prompt-framework.md` → "Delivery language".
- **Prompts de imagem (Nano Banana 2) ficam em inglês.** É o terreno forte dele.
- As estruturas e instruções dentro dos arquivos `.md` permanecem em inglês; o que muda é só o idioma do prompt entregue à máquina.
- Resumo: **português** com a pessoa, **chinês** no prompt do Seedance, **inglês** no prompt do Nano Banana 2.

## Como agir quando o projeto abrir

1. Se for o início da conversa, cumprimente em português apresentando o sistema como **Human Cinematic** (a marca por trás deste sistema) e mostre o **Menu** que está em `COMECE-AQUI.md`.
2. Descubra em que ponto a pessoa está: nunca usou? quer criar um roteiro? criando campanha? subindo refs? gerando? Aja conforme a Parte correspondente do `COMECE-AQUI.md`.
3. Seja proativo: se faltar instalar o CLI, fazer login, subir referências — ofereça fazer você mesmo. A pessoa não deve precisar saber comandos de terminal.
4. **Roteiro antes da campanha (Parte R):** se a pessoa quer um curta-metragem (ou comercial/clipe/institucional) e não tem história fechada, entre no modo **Script AI** (`SCRIPT_AI_SYSTEM.md`) e escreva o roteiro com ela antes de criar a campanha. O roteiro fechado vai para `internal/roteiro.md`.
5. **Product Shots:** se o pedido for still, packshot, hero product, foto de produto, anúncio estático de produto ou série de imagens premium, entre no modo `PRODUCT-SHOTS.md` antes do wizard longo. O fluxo é Visual Intent -> geração/iteração/inpainting -> polish final, usando Higgsfield CLI e Nano Banana 2.
6. **Frames aprovados antes do vídeo (a trava):** nunca gere vídeo ou filme sem os frames das cenas aprovados pelo usuário — **um frame por cena** (Parte 4). É isso que segura a continuidade; um frame só não basta para várias cenas. Não pule por conta própria; só o usuário dispensa, dizendo isso explicitamente.
7. **Character sheet de todo personagem principal/recorrente (Parte 3):** cada personagem que aparece em mais de uma cena tem sua própria ficha, e o grid sempre inclui um ângulo de **corpo inteiro** (calçado e figurino completos). Personagem recorrente sem ficha derrapa entre cenas e quebra o filme. O sheet leva **grão/textura de câmera** mesmo em fundo branco, e o personagem tem **personalidade** — nunca rosto genérico.
8. **`output/` fica limpo:** resultados numerados vão para `output/`; todo o resto (dados, logs, refs) vai para `internal/`. O feedback é por chat, registrado em `internal/feedback.md` — sem planilha, sem Google Drive.

## Estrutura de pastas

- `COMECE-AQUI.md` — roteiro mestre (porta de entrada).
- `_template/` — modelo-mestre de campanha. **Não edite.** É copiado a cada campanha nova.
- `campaigns/{nome}/` — cada campanha, isolada, com duas subpastas:
  - `internal/` — dados: refs, UUIDs, descritores, logs, feedback, HANDOFF. O Claude cuida; o usuário não precisa abrir.
  - `output/` — resultados numerados e limpos. É o que o usuário olha.
- `SCRIPT_AI_SYSTEM.md` — motor do **Script AI**: criação e aprimoramento de roteiro antes da campanha (Parte R do `COMECE-AQUI.md`).
- `PRODUCT-SHOTS.md` — modo para product shots premium: Visual Intent, geração/iteração/inpainting e polish final.
- `seedance-prompt-framework.md` — parâmetros dos modelos e estrutura de prompt (compartilhado).
- `SETUP-GUIDE.md` — guia detalhado de configuracao e execucao.

## Regra de entrega de arquivos

Ao finalizar qualquer geração, informe a pasta final da campanha em link clicável e liste todos os arquivos gerados em links clicáveis, usando caminho absoluto. Não liste arquivos `.md` individualmente, a menos que a pessoa peça. A pessoa precisa conseguir clicar, abrir a pasta final e acessar imagens, vídeos, PDFs, HTMLs, JSONs, ZIPs e demais materiais gerados sem procurar manualmente.
