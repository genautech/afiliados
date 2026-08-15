# AfiliAds — roteiro do pitch deck (versão de pesquisa)

> A narrativa executiva mais recente, com copy dos slides, roteiro oral e respostas de objeções, está em `pitch-deck-vencedor.md`. Este arquivo permanece como base de pesquisa e não deve ser enviado isoladamente.

Objetivo: deck de 10–12 slides, legível em menos de quatro minutos, que prove AI-native + Google fit + execução. Não sobrecarregar com screenshots.

## 1. Capa

**AfiliAds**  
O sistema operacional AI-native para campanhas de afiliados.

Subtítulo sugerido: oferta → campanha verificável → aprendizado, em um único workflow.

## 2. O problema

Mostrar a pilha fragmentada:

`rede/oferta → pesquisa → planilha → ChatGPT → builder/WordPress → tracker → Google Ads → planilha`

Consequências: dias de handoff, contexto perdido, reprovação, gasto inseguro e pouco aprendizado reutilizável.

## 3. A solução

Um diagrama do ciclo AfiliAds:

`Descobrir → Decidir → Construir → Verificar → Publicar → Experimentar → Aprender`

Cada etapa deve ter um exemplo de agente e um gate determinístico.

## 4. Demo do produto

Três telas, no máximo:

1. dossiê de produto/estratégia;
2. wizard com readiness/compliance;
3. experimento e decisão.

Incluir QR/link para landing ou vídeo de 90 segundos.

## 5. Por que IA é estrutural

Tabela curta:

| IA | Determinismo |
| --- | --- |
| interpreta páginas e vendor terms | calcula economia |
| gera e adapta copy | valida schema/readiness |
| cruza contexto | autoriza mutação |
| recomenda hipótese | mede experimento |

Mensagem: IA sem controles é insegura; controles sem IA não escalam o trabalho aberto.

## 6. Google fit

- Gemini via Vertex AI.
- Modelos parceiros via Vertex MaaS.
- Google-first em validação independente.
- Google Ads API v25, GA4/GTM e Consent Mode.
- Próxima fronteira: Vertex AI Evaluation Service, Model Garden e multimodal evaluation de páginas/anúncios.

## 7. Mercado

- proxy: US$ 2,1 bilhões em software de affiliate marketing em 2025;
- Hotmart/Teachable: US$ 10 bilhões de GMV acumulado e 200 mil creators vendendo;
- FGV: 389 mil ocupações no setor brasileiro de produtos digitais;
- wedge: operadores e agências que compram mídia em Google Ads.

Incluir nota de metodologia; não apresentar estimativas divergentes como certeza.

## 8. Concorrência

Matriz com eixos:

- horizontal: artefato pontual → workflow completo;
- vertical: genérico → específico para afiliados.

Posicionar Voluum/RedTrack, Optmyzr, ClickFunnels/Super Presell, stack manual e AfiliAds.

## 9. Moat

1. grafo de decisão por campanha;
2. aprendizado de checklist e compliance;
3. integrações e state machines;
4. benchmark/evaluation por tarefa;
5. distribuição via operadores, agências e redes.

## 10. Evidência de execução

- fluxo real de presell publicada e campanha Google Ads PAUSED;
- 14 agentes especializados;
- histórico recente de execução contínua no repositório;
- suíte automatizada ampla, cuja contagem final deve ser congelada em um commit verde;
- experimentos A/B com controles, treatment e significância.

Rotular claramente: “prova de execução técnica”, não “tração comercial”.

## 11. Go-to-market e próximos marcos

Próximos 12 meses:

1. 10–20 design partners;
2. pilotos pagos e validação de preço;
3. benchmark de qualidade/custo por agente;
4. tracking e loops de otimização em produção;
5. expansão por assentos, contas e campanhas.

**PENDENTE:** substituir metas por números aprovados pelo founder.

## 12. Time e pedido

- história e founder-market fit;
- lacunas de time que o capital ajuda a preencher;
- uso de recursos Google/Monashees;
- valor da rodada e runway somente quando definidos.

## Apêndice recomendado

- arquitetura técnica;
- segurança/mutation guard;
- roadmap;
- unit economics de inferência;
- fontes de mercado;
- demo detalhada.
