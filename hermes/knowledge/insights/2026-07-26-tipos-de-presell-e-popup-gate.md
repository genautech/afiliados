---
id: insight-20260726-tipos-de-presell-e-popup-gate
title: "Tipos reais de página de ponte (bridge) + mecânica de pop-up de retenção"
source_type: youtube+outro
source_path: "Conhecimento/YouTube/afiliados/are-your-affiliate-landing-pages-scaring-off-customers-Vb0ceC5BauU.md; Projetos/afiliados/Pre sell para afiliados.md"
source_url: "https://www.youtube.com/watch?v=Vb0ceC5BauU; https://meutrabalhodigital.com/plugin-super-presell/; https://meutrabalhodigital.com/plugin-super-links/"
projects: [afiliados]
tags: [presell, bridge-page, popup, compliance]
created: 2026-07-26
status: active
---

# Insight — Tipos reais de página de ponte + pop-up de retenção

## Mudança operacional (1 frase)

O AfiliAds só tem UM template estrutural de presell (artigo editorial); "ângulo" é só tom de
texto — para atender o pedido de "tipos de página com pop-up" é preciso templates estruturalmente
diferentes (Pogo, VSL, Quiz real, Lead Gen) + um gate de pop-up opcional, sem copiar as táticas de
cloaking do plugin "Super Presell" que inspirou o pedido.

## Ângulos de copy / funil

Do vídeo "Are Your Affiliate Landing Pages Scaring Off Customers" (já destilado em
`Conhecimento/YouTube/afiliados/...Vb0ceC5BauU.md`), 4 tipos de bridge page por caso de uso:

1. **Pogo Page** — quando a página de vendas já abre com VSL/grande ideia. Curta, "vende o clique"
   não o produto. Headline batendo com o anúncio, 1 CTA, prova curta.
2. **Advertorial/Review** — quando a oferta tem uma história/claim/"nós testamos". Já implementado
   no AfiliAds (template atual).
3. **Quiz Funnel** — para ofertas que se beneficiam de personalização (saúde, fitness, etc.).
   Sequência de perguntas com telas de reforço, termina revelando a oferta como "feita sob medida".
4. **Lead Gen Page** — troca um brinde (checklist, mini-plano) pelo e-mail antes de revelar a oferta
   completa. Duas chances de conversão (thank-you page + follow-up).

Do plugin comercial "Super Presell 5.0" (`meutrabalhodigital.com/plugin-super-presell`) — validar
o que é tática legítima de UX vs. o que é evasão de política:

- **VSL com CTA** — vídeo embutido + botão. Estrutural, fácil de replicar, sem problema de
  compliance. **Adotar.**
- **Press and Hold** — pop-up/modal que retém o visitante alguns segundos (pressionar e segurar ou
  clicar para continuar) antes de liberar o CTA. Mesma experiência pra todo mundo (não é
  bot-vs-humano) — é isso que o usuário quis dizer com "tipos... com pop-up". **Adotar como toggle
  aplicável a qualquer tipo de página**, não como tipo isolado.
- **Presell de Segmentação** (páginas diferentes por idade/país) — √ compatível com o que já
  fazemos via `geo`/`context`, não precisa de feature nova.

## Compliance / o que NÃO fazer

- **Presell Fantasma** (redirect direto sem conteúdo) — o próprio dossiê do FemiCore já registra
  que link direto tende a reprovar em nicho sensível; a Super Presell só recomenda isso pra nichos
  de baixo risco. **Não adotar como padrão**, no máximo como opção explícita fora de nichos
  sensíveis, com aviso.
- **Presell de Cookies com Redirecionamento** ("clique automático ao aceitar/fechar aviso de
  cookies") — dispara um clique de rastreio escondido dentro de um banner de cookies falso. É
  dark pattern / interação enganosa. **Não implementar.**
- **Cloaking / cloaker avançado** do "Super Links" (conteúdo diferente pra bot de revisão vs.
  usuário real) — é exatamente o item "Sem cloaking" do checklist anti-strike que o próprio app
  já cobra. Google detecta e bane a conta. **Não implementar, nunca.**
- Todo o marketing desses plugins ("sem bloqueios", "blindagem") é sobre evadir detecção de
  política, não sobre UX genuína — tratar como fonte de ideias de estrutura de página, não como
  playbook de compliance.

## O que ignorar desta fonte

- Integração com API/Pixel do Facebook nos moldes do Super Links (fora do escopo do AfiliAds hoje).
- "Clonar página de vendas em 2 segundos" — infração de direito autoral do produtor, não usar.
- Camuflagem de link ("link camuflado", redirect no botão voltar do navegador).

## Próxima ação (uma só)

Implementar `tipoPagina` (pogo | advertorial | quiz | leadgen | vsl) + `popupGate` (boolean) no
gerador de presell do AfiliAds, com templates reais por tipo — feito nesta mesma sessão para
Pogo/VSL/popupGate; Quiz interativo e Lead Gen (captura de e-mail) ficam para uma iteração seguinte
por serem maiores (precisam de lógica de estado no front e, no caso de Lead Gen, armazenamento de
lead).
