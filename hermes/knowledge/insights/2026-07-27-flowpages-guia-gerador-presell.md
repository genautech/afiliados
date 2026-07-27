---
id: insight-20260727-flowpages-guia-gerador-presell
title: "Guia FlowPages (best practices) aplicado ao gerador de presell — o que foi implementado, o que falta, o que foi descartado"
source_type: pesquisa-mercado
source_path: ~/hermes-precell-guide.md
source_url: https://www.flowpages.com.br
projects: [afiliados]
tags: [presell, flowpages, gtm, tracking, roadmap, compliance]
created: 2026-07-27
status: active
---

# Insight — Guia FlowPages aplicado ao `lib/presell.ts`

## Mudança operacional (1 frase)

O usuário forneceu `~/hermes-precell-guide.md` (guia de boas práticas inspirado na
FlowPages, ferramenta concorrente de landing pages para afiliados) pedindo pra usar como
referência de incremento do nosso gerador de presell. Este insight registra o que já existe,
o que foi implementado agora, e o que foi avaliado e **descartado de propósito** por
conflitar com as regras de compliance do nosso modelo (advertorial/bridge pro Google Search
com ClickBank), pra nenhum agente futuro reimplementar sem reler esse contexto.

## Origem

`~/hermes-precell-guide.md` (fora do repo, na home do usuário) — guia com 4 seções:
rastreamento (pixels/GTM/UTM), otimização de conversão (redirects, pop-ups, CTAs, formulários
CRM, contadores de urgência), conteúdo/estrutura (HTML custom, vídeo, responsivo, FAQ), e
instruções pra agentes inspecionarem a FlowPages ao vivo (`browser_navigate`,
`browser_snapshot`, `browser_console`, `browser_vision`).

Antes de implementar, pesquisei a FlowPages de verdade (`flowpages.com.br` +
`ajuda.flowpages.com.br`, central de ajuda com ~165 artigos) pra confirmar os padrões —
achados relevantes já registrados/aplicados no insight
`2026-07-27-strategy-engine-funil-budget.md` (correção FemiCore) e na sessão que gerou este.

## O que JÁ existia antes deste guia

- GA4, Meta Pixel, Google Ads Conversion ID/Label — via `Integration` (serviceName=`tracking`),
  configurável em `/configuracoes`, injetado em `lib/presell.ts`.
- UTM/gclid: capturado da URL e **persistido em cookie próprio de 30 dias** (`afp_track`) —
  mais robusto que o próprio mecanismo da FlowPages, que só repassa parâmetros da URL atual
  pros links, sem persistir nada (confirmado lendo `ajuda.flowpages.com.br/docs/como-instalar-utms-no-flowpages/`).
- Vídeo embed (YouTube/Vimeo/mp4) — pageType `vsl`.
- FAQ — seção fixa no template advertorial, com heading localizado por idioma.
- Responsivo — CSS mobile-first em todos os templates, sem toggle de visibilidade por
  dispositivo (não implementado, ver "O que falta").
- Consent Mode v2 (banner de cookies) já mais rigoroso que o banner padrão da FlowPages —
  bloqueia GA4/Ads/Meta por padrão até aceite, não só mostra aviso.

## O que foi implementado agora (2026-07-27, sessão que gerou este insight)

- **GTM (Google Tag Manager)**: novo campo `gtm_container_id` em Configurações →
  Integrações, injetado via `{{GTM_HEAD}}`/`{{GTM_BODY}}` nos 4 templates
  (`lib/presell.ts` → `gtmHeadHtml()`/`gtmBodyHtml()`).
- **Bloco de código customizado**: novo campo `Presell.customCode` (`db.Text`, migrado via
  `prisma db push`), injetado cru via `{{CUSTOM_CODE}}` antes do `</body>` nos 4 templates.
  Aceito em `generatePresell()`, `/api/presells` e `/api/presells/variants`. Ainda **sem UI**
  no Wizard pra editar isso — só disponível via API/script por enquanto (próxima ação).
- Pros/contras estruturado, segunda imagem (rótulo), CTA com pulse, sticky CTA mobile,
  i18n completo dos textos fixos (footer/disclosure/cookie banner/FAQ heading) — feito na
  mesma sessão, registrado em `feedback_presell_quality_bar.md` (memória).

## O que foi avaliado e DESCARTADO de propósito (não reimplementar sem revisar compliance)

O guia foi escrito olhando pra FlowPages genérica, que atende principalmente funis
brasileiros de WhatsApp/Hotmart com captura de lead — isso não é o nosso modelo
(ClickBank + Google Search, advertorial que precisa passar como conteúdo editorial
genuíno, regra de ouro do `SKILL.md`: "link direto nunca é URL final", "copy jamais promete
resultado"). Itens do guia que NÃO devem ser implementados sem decisão explícita do usuário:

- **Contadores regressivos/progressivos de urgência** (seção 2.5): escassez artificial
  ("restam X unidades") é exatamente o tipo de gatilho que reprova revisão de saúde/nutra
  no Google Ads e contradiz a regra #10 do `SKILL.md` ("copy jamais promete resultado" /
  linguagem condicional). Só cogitar se o produto/vertical não for sensível E a escassez for
  real (ex.: estoque de verdade via API do vendor).
- **Exit pop-up com oferta/desconto** (seção 2.2): nosso modelo não tem desconto pra
  oferecer (afiliado não controla preço do vendor) — um exit pop-up prometendo desconto
  seria enganoso. Um exit pop-up puramente informativo (sem promessa) poderia fazer sentido,
  mas é decisão de produto, não um "sim implícito" do guia.
- **Botões de WhatsApp/Telegram e pagamento (Mercado Pago/Shopify/PagSeguro)** (seção 2.3):
  fora do funil ClickBank/Google Search — o CTA único e óbvio já é regra de ouro nossa
  ("uma única ação óbvia... nunca dilui atenção com múltiplos caminhos", `BUILDER_PROMPT`).
  Múltiplos botões de canais diferentes contradiz isso.
- **Formulários de captura de lead + webhook pra CRM** (seção 2.4): nossas presells não
  capturam lead, é bridge direto pro hoplink. Só faria sentido se o produto entrar no
  Fluxo 4 (Lead Gen) do `SKILL.md`, que ainda não tem gerador próprio.
- **Toggle de visibilidade mobile/desktop por elemento** (seção 3.3): os templates já são
  responsivos via CSS; um controle de "esconder elemento X no mobile" é feature de editor
  visual (a FlowPages é um page builder drag-and-drop, nós geramos HTML via LLM+template) —
  não se aplica ao nosso modelo de geração, só a um builder manual que não temos.

## Atualização (mesmo dia, revisão de toda a cadeia de templates)

Fiz uma revisão completa gerando as 4 combinações de `pageType` × 2 idiomas (8 no total) —
zero placeholders `{{...}}` sobrando, `<html lang>` e todo texto fixo corretos nos dois
idiomas, build de produção (`npm run build`) e `tsc --noEmit` limpos. Na revisão achei e
corrigi um gap real: `Presell.ctaClicks` era lido por `rankPresellOutcomes()` (aprendizado
contínuo) mas nunca incrementado por nada — não existia beacon de clique. Corrigido:
- `generatePresell()` agora gera o `id` da presell ANTES de renderizar o HTML (`randomUUID()`,
  passado explicitamente pro `prisma.presell.create({ data: { id: ... } })`) — precisa disso
  porque o HTML gerado embute o próprio id no beacon de clique.
- Novo endpoint público `POST /api/presells/click?id=<id>` (`app/api/presells/click/route.ts`),
  chamado via `navigator.sendBeacon()` no clique de qualquer `.cta` (`trackingScriptHtml()` em
  `lib/presell.ts`). Beacon usa URL ABSOLUTA (`NEXTAUTH_URL`/`RAILWAY_PUBLIC_DOMAIN`), não
  relativa — necessário porque presells podem ser publicadas num domínio WordPress externo do
  afiliado, não no domínio do app.

## Hipóteses testáveis

| # | hipótese | métrica | critério sucesso | critério kill |
| --- | --- | --- | --- | --- |
| 1 | GTM opcional aumenta adoção de rastreamento avançado sem quebrar o Consent Mode existente | nº de presells com GTM configurado vs. erros de consent reportados | 0 erros de consent | qualquer conflito de consent reportado |
| 2 | Bloco de código customizado é usado pra embeds legítimos (não pra burlar compliance) | revisão manual do `customCode` das primeiras 5 presells que usarem o campo | conteúdo é embed/copy extra, não claim proibido | claim de saúde/resultado injetado via customCode |

## O que ignorar desta fonte

- Toda a seção 4 do guia original (instruções de ferramentas `browser_snapshot`/
  `browser_console`/`browser_vision`) é escrita pra um MCP de browser diferente do que
  temos disponível aqui (`claude-in-chrome` usa `get_page_text`/`read_page`/`computer`) —
  os nomes de tool não existem no nosso ambiente, adaptar mentalmente, não copiar literal.

## Próxima ação (uma só)

- Adicionar campo de edição de `customCode` no Wizard (passo de presell) — hoje só é
  setável via API/script, sem UI. Quem pegar, comece lendo `lib/presell.ts`
  (`generatePresell`/`renderPresellHtml`) e `app/api/presells/route.ts` antes de mexer.
