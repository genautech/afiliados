---
name: affiliate-marketer-strategies
description: Estratégias de Marketing de Afiliados — ClickBank, BuyGoods, MaxWeb, Hotmart, Eduzz, Monetizze com Google Ads (Search, YouTube, Demand Gen, PMax)
license: MIT
metadata:
  version: 2.2.0
  author: Projeto Afiliados
  category: 03-funis-vendas
  updated: 2026-07-14
risk: safe
---

# Estratégias de Marketing de Afiliados
## ClickBank · BuyGoods · MaxWeb · Hotmart · Eduzz · Monetizze + Google Ads

Skill para **afiliados** (não produtores): seleção de ofertas, funis, tracking, Google Ads e escala multi-rede.

**Arquivos do projeto:** use junto com a planilha `tracking_afiliados_cb_buygoods_maxweb_google.xlsx`.

---

## Keywords

ClickBank, BuyGoods, MaxWeb, Hotmart, Eduzz, Monetizze, Google Ads, Search, Performance Max, YouTube Ads, Demand Gen, HopLink, Smartlink, Gravity, EPC, eCPA, CPA, CPL, RevShare, Bridge Page, Pre-sell, Postback, ClickID, UTM, Compliance, Trademark, Nutra, Weight Loss, Make Money, VSL, Upsell, Kill Scale.

---

## Quick Start

1. Cadastre a oferta (rede, payout, geo, terms, link) na planilha aba **Ofertas**.
2. Calcule **CPC máx / CPC SCALE** na aba **BreakEven**.
3. Se MaxWeb: complete **MaxWeb_Postback** (clickid + postback + teste) antes de gastar.
4. Crie campanha Google com **Campanha_ID** padronizado e conversões com valor ≈ comissão.
5. Teste 48–72h → registre em **Testes_KillScale** → decida SCALE / OTIMIZAR / KILL.
6. Lance diário na aba **Diario**; acompanhe **Dashboard**.

---

## Mapa de Plataformas

| Plataforma | Modelo | Melhor uso | Atenção |
| --- | --- | --- | --- |
| ClickBank | % + upsells (USD) | Evergreen, reviews, Search/YT + bridge | Gravity, Vendor Terms, refund |
| BuyGoods | CPA / ofertas | Nutra, beauty, funis maduros | Approval, geo, claims |
| MaxWeb | CPA, CPL, RevShare, smartlink | Volume Google, teste de vertical | Postback, held, eCPA vs payout |
| Hotmart / Eduzz / Monetizze | % BR | Lançamentos e cursos PT-BR | Carrinho, regras do produtor |
| Google Ads | Canal de tráfego | Intent + escala | Policies + compliance da oferta |

---

# PARTE A — Operação multi-rede

## Workflow 1: Seleção de ofertas

### ClickBank
- Gravity (oferta viva), EPC de referência, avg sale, upsells.
- Ler Vendor Terms: geo, tráfego, trademark, claims.
- Testar LP/VSL no mobile.
- HopLink + UTMs.

### BuyGoods
- Payout vs CPC esperado no geo.
- Criativos oficiais + ângulos próprios sem violar claims.
- Confirmar se exige bridge / proíbe direct / landing approval.

### MaxWeb
- Vertical + payout (CPL vs CPA vs RevShare).
- Smartlink para descoberta; offer fixa após vencedor.
- **Nunca escalar sem postback validado.**
- Monitorar held / rejected / clawback semanalmente.

### Hotmart / Eduzz / Monetizze
- Comissão %, qualidade da página, calendário de lançamento.
- Materiais oficiais + ângulo da sua audiência.
- Regras de tráfego pago do produtor.

**Shortlist:** 2–3 CB/BuyGoods + 1 path MaxWeb + 1 BR (lançamento ou evergreen).

## Workflow 2: Funis

1. **Direct** — anúncio → hop/smartlink (teste rápido; muitas verticals Google pedem bridge).
2. **Bridge / Review** — anúncio → sua página → CTA afiliado (**padrão Google**).
3. **Search Intent** — keyword problema/solução → RSA → bridge.
4. **YouTube / Demand Gen** — UGC/talking-head → bridge ou SL.
5. **PMax** — só após conversões estáveis e Search/YT validados.
6. **Lançamento BR** — conteúdo/lista → carrinho.
7. **MaxWeb Smartlink** — tráfego → SL → depois pin na offer vencedora.

## Workflow 3: Métricas e decisão

| Métrica | Uso |
| --- | --- |
| EPC | Receita líquida / cliques |
| eCPA | Gasto / conversões |
| ROAS | Receita / gasto |
| CVR | Conv / cliques |
| Match rate | Conversões rede vs Google |

**SCALE:** EPC ≥ 1,3 × CPC **ou** eCPA < payout líquido com margem, após volume mínimo.  
**KILL:** sem conversão com gasto ≥ orçamento de teste, ou EPC muito abaixo sem tendência.  
**OTIMIZAR:** perto do break-even (ângulo, negativas, bridge, criativo).

Escale +20–30% por vez; clone geos/ângulos vencedores; negocie payout com volume.

---

# PARTE B — Aprofundamento Google Ads + MaxWeb

## B1. Arquitetura de conta Google para afiliados

### Princípios
- **1 campanha = 1 rede afiliado × 1 vertical × 1 geo × 1 tipo de campanha × 1 funil** (no início).
- Separar verticals sensíveis (health, finance, MMO) de verticals “limpas”.
- Naming idêntico na planilha, UTM e Google:

```text
[REDE]_[VERTICAL]_[GEO]_[CANAL]_[FUNIL]_vN
CB_WL_US_SEARCH_BRIDGE_v1
MW_NUTRA_BR_YT_SL_v1
BG_BEAUTY_US_DGEN_REVIEW_v2
HT_CURSO_BR_SEARCH_LANC_v1
```

### Conversões (crítico)
1. Defina ação: **Purchase** (CB/BuyGoods/Hotmart) ou **Lead/Qualified** (MaxWeb CPL).
2. Valor da conversão ≈ **comissão média líquida** (após refund estimado) — melhora lances inteligentes.
3. Fontes: Google Tag / GTM na bridge; **importação offline** ou **postback → server → Enhanced Conversions** quando a conversão fecha na rede.
4. Janela de conversão alinhada ao cookie/atribuição da oferta (ex.: 7–30–90 dias conforme vertical).
5. Evite duplicar contagem (Google + rede): use uma fonte “de verdade” para lucro (painel da rede) e Google para otimização de lance.

### UTMs obrigatórios
```text
?utm_source=google
&utm_medium=cpc
&utm_campaign=CB_WL_US_SEARCH_BRIDGE_v1
&utm_content={creative}
&utm_term={keyword}
```
No MaxWeb, passe também **clickid/subid** no hop/smartlink conforme tokens da rede.

---

## B2. Google Search para afiliados

### Quando usar
- Intent alto: problema claro, comparação, “como fazer X”, “melhor Y”.
- Ofertas com bridge forte e CVR previsível (ClickBank/BuyGoods/cursos BR).

### Estrutura
- Campanha por tema/oferta (não 200 ad groups no dia 1).
- Ad groups por **cluster de intenção** (dor / solução / comparação).
- Match: **exact + phrase** no começo; broad só com IA/lances e boas negativas.

### Keywords (exemplos de ângulo, não copiar cego)
- Problema: `como emagrecer depois dos 40`, `queda de cabelo tratamento`
- Comparação: `alternativa a [categoria]`, `melhor método para…`
- Comercial suave: `review`, `vale a pena`, `funciona mesmo`

### Negativas (lista base — expandir sempre)
grátis, free, vaga, emprego, salário, reclame, golpe, pirata, torrent, pdf, manual do, o que é (se não converter), marca do produto (se trademark proibido), nomes de concorrentes se policy/terms bloquearem.

### RSA
- 10–15 títulos, 4 descrições.
- Alinhar H1 da bridge à keyword.
- Evitar claims absolutos (“cure”, “garanta R$10 mil”, “100%”).
- CTA: “veja como funciona”, “compare”, “guia”, não milagre.

### Landing (bridge) e Quality
- Relevância keyword → anúncio → H1.
- Mobile fast, SSL, privacidade, disclaimer de afiliado.
- Um CTA principal.
- Sem cloaking, sem redirect enganoso, sem “doorway” spam.

### Lances
- Início: manual CPC ou maximizar cliques com teto **abaixo do CPC BE**.
- Com 30+ conversões/mês na campanha: maximizar conversões / tCPA com tCPA ≤ eCPA alvo.
- Valor da conversão preenchido → maximizar valor / tROAS com meta realista.

---

## B3. YouTube, Demand Gen e PMax

### YouTube / Video
- Hook 0–3s; problema; mecanismo; CTA para bridge.
- Remarketing: 25% / 50% / 75% viewers → bridge.
- Evite mandar tráfego frio direto para VSL de 40 min sem pre-sell.
- Bom para MaxWeb smartlink e nutra **se** criativo e policy permitirem.

### Demand Gen
- Criativos feed + vídeo curto; público interesse/lookalike de converters.
- Bridge obrigatória na maioria dos casos de afiliado.
- Monitore CPM e CTR; mate criativos no bottom 50% cedo.

### Performance Max
- **Só depois** de:
  - Conversões confiáveis
  - Search ou YT já lucrativos na mesma oferta
  - Assets (textos, imagens, vídeo, logo) completos
- Segmente por oferta; não misture MaxWeb CPL com ClickBank high-ticket na mesma PMax.
- Revise insights de canal; se canibalizar Search brand/termo caro, ajuste exclusões/assets.
- Afiliados: PMax sem tracking fino = caixa-preta de prejuízo.

---

## B4. Compliance Google × redes

| Risco | O que fazer |
| --- | --- |
| Claims de saúde/renda | Linguagem condicional, sem garantia, sem antes/depois enganoso |
| Trademark | Respeitar Vendor Terms + políticas Google de marca |
| Cloaking | Proibido — mesma experiência bot/user |
| Vertical restrita | Verificar certificação / país / se anúncio é permitido |
| Destino | Página útil, não só hop opaco se a política exigir conteúdo |
| MaxWeb qualidade | Evitar incentive traffic, bots, geos não autorizados |

**Regra de ouro:** o anúncio deve ser aprovável no Google **e** permitido nos terms da oferta/rede.

---

## B5. MaxWeb na prática (com Google)

### Setup mínimo
1. Conta aprovada + offer ou smartlink da vertical.
2. URL com tokens (clickid / sub1…).
3. **Postback** da MaxWeb → seu tracker **ou** integração que alimente Google (offline conversions).
4. Disparo teste: 1 conversão manual → aparece no painel MaxWeb **e** (se configurado) no Google.
5. Só então ligar budget real.

### Smartlink vs offer fixa
- **Smartlink:** descobrir o que converte no seu tráfego/geo; bom no teste YT/Search amplo.
- **Offer fixa:** quando já sabe payout, CVR e criativo; melhor controle de eCPA e claims.
- Fluxo: SL → achar vencedor → clonar campanha na offer fixa (se disponível).

### Otimização MaxWeb + Google
- Otimize lances no Google por **eCPA vs payout líquido** (não só por “conversões” se o evento for fraco).
- Eventos: prefira lead **qualificado** ou sale; leads lixo destroem conta e held sobe.
- Semanal: % held, % rejected, clawback, match rate Google↔MaxWeb (meta prática > 85% após estabilizar).
- Se match rate baixo: clickid perdido, redirect quebrado, ad blockers, ou conversão fora da janela.

### Quando MaxWeb > ClickBank/BuyGoods
- Você quer **volume e teste de vertical** rápido.
- Payout CPL permite aprender com mais conversões por dia.
- Smartlink reduz tempo escolhendo offer manualmente.

### Quando CB/BuyGoods > MaxWeb
- Quer **EPC alto** com funil de upsell e review content.
- Controle total da narrativa na bridge.
- SEO/YouTube orgânico + Search de intenção.

### Stack avançado
```text
Google Search (intent) → Bridge → ClickBank/BuyGoods (lucro alto)
Google YT/DGen (volume) → Smartlink MaxWeb (aprendizado + cashflow)
Lançamento BR (sprint) → Hotmart/Eduzz/Monetizze
```

---

## B6. Playbooks de teste (72h)

### Playbook Search + ClickBank/BuyGoods
1. BreakEven: comissão, refund 5–15%, CVR conservadora 1–2%.
2. 1 campanha, 2–3 ad groups, 3–5 RSA, bridge única.
3. Orçamento = 1–2× comissão média por dia (ou 50–100 cliques).
4. Dia 1–2: matar keywords com gasto alto zero conv; reforçar negativas.
5. Dia 3: se EPC ≥ 1,3× CPC → SCALE +20–30%; senão OTIMIZAR bridge/ângulo ou KILL.

### Playbook YT/DGen + MaxWeb SL
1. Postback OK + 3 criativos (hooks diferentes).
2. Orçamento testando CPV/CPC até 100–300 cliques ou 10–20 leads (CPL).
3. eCPA vs payout: se eCPA < 70–80% do payout → escalar criativo vencedor.
4. Held alto → cortar fonte/criativo, revisar qualidade.

### Playbook PMax (fase 2)
1. Importar só oferta já lucrativa em Search ou YT.
2. Valor de conversão realista.
3. Excluir brand se necessário; monitorar 7–14 dias antes de julgar.
4. Se ROAS < meta e sem tendência → pausar; não “deixar aprendendo” para sempre.

---

## B7. Diagnóstico rápido

| Sintoma | Causas prováveis | Ação |
| --- | --- | --- |
| CTR baixo Search | RSA fraco, keyword ampla, anúncio irrelevante | Reescrever RSA; apertar match |
| CPC alto | Competição, QS baixo, broad | Bridge melhor; exact; negativas |
| CTR ok, zero vendas | LP/VSL fraca, geo errado, offer morta | Trocar offer; melhorar bridge; checar terms |
| Google conv ≠ rede | Postback/UTM/clickid | Corrigir tracking antes de escalar |
| eCPA ok, lucro baixo | Refund/clawback/held | Olhar líquido semanal; trocar offer |
| Ban / disapprove | Claims, cloaking, vertical | Reescrever; bridge limpa; nova oferta |

---

## B8. Checklist pré-escala Google + MaxWeb

- [ ] Terms da oferta lidos (geo, trademark, claims, sources)
- [ ] Bridge com disclaimer, privacidade, mobile OK
- [ ] Conversões Google testadas (fire real)
- [ ] MaxWeb: postback + clickid + 1 conv teste
- [ ] UTMs = Campanha_ID da planilha
- [ ] Break-even calculado; CPC alvo definido
- [ ] Negativas base + exclusões de placement (se YT/DGen)
- [ ] Orçamento de teste definido e respeitado
- [ ] Plano B de criativo/ângulo se fadiga
- [ ] Lucro medido pela **rede** (não só pelo Google)

---

# PARTE C — Templates

### Bridge (Google-friendly)
```text
H1 alinhado à keyword
Subhead benefício específico
Empatia (problema)
O que é a solução (sem milagre)
Prova realista
Prós e contras
Para quem é / não é
CTA → hop / smartlink
FAQ + garantia do produto (se houver)
Disclaimer afiliado + “resultados variam”
Privacidade / contato
```

### RSA esqueleto
```text
Títulos: {Keyword} Guia 2026 | Como Funciona | Compare Antes | Opção Que Estão Testando
Descrições: Entenda prós e contras. Conteúdo informativo + oferta oficial. Resultados individuais variam.
```

### Hipótese de teste (planilha)
```text
Se eu usar o ângulo [X] no canal [Search/YT] para a oferta [Y] no geo [Z],
então EPC sobe para ≥ 1,3× CPC em [N] cliques,
porque [motivo].
```

---

# PARTE D — Checklists gerais

- [ ] Contas: CB, BuyGoods, MaxWeb, BR, Google Ads
- [ ] Planilha de tracking preenchida
- [ ] Shortlist de ofertas com terms OK
- [ ] Funil escolhido por campanha
- [ ] Compliance revisado
- [ ] Kill/scale documentado
- [ ] Reserva para refund/clawback

---

## Erros comuns

1. Google direct link em vertical restrita.  
2. MaxWeb sem postback.  
3. Escalar no lucro do dia 1 ignorando refund.  
4. EPC do marketplace ≠ seu EPC.  
5. PMax no dia 1 sem conversão confiável.  
6. Misturar redes/ofertas sem naming.  
7. Claims agressivos (ban).  
8. Um criativo só até fadiga.

---

## Dicas avançadas

1. Stack Search CB/BG + YT MaxWeb + sprint Hotmart.  
2. Mesmo ângulo, destinos diferentes em campanhas separadas.  
3. Valor de conversão = comissão líquida.  
4. Biblioteca de hooks por vertical.  
5. Negociar payout com print de volume.  
6. Domínio próprio limpo para bridges.  
7. Revisar held MaxWeb toda semana.  
8. Matriz avatar × ângulo × oferta.

---

## Fluxo diário

1. Painéis Google + CB + BuyGoods + MaxWeb + BR.  
2. Atualizar **Diario**.  
3. Pausar o que está abaixo do BE.  
4. 1–2 testes novos (ângulo/keyword/criativo).  
5. Conferir discrepância de conversões.  
6. Anotar aprendizado em **Testes_KillScale**.

---

## Quando acionar esta skill

- Escolher rede/oferta (CB vs BuyGoods vs MaxWeb vs BR)
- Montar campanha Google (Search, YT, DGen, PMax)
- Configurar lógica de postback/tracking MaxWeb
- Criar bridge compliance-friendly
- Diagnosticar EPC/eCPA
- Decidir kill/scale
- Organizar operação na planilha

---

## Referência rápida de break-even

```text
Comissão líquida = Comissão × (1 − refund%)
EPC break-even   = Comissão líquida × CVR
CPC máx          ≈ EPC break-even
CPC SCALE        ≈ CPC máx / 1,3
eCPA máx         ≈ Comissão líquida (ou payout MaxWeb líquido)
```

Use a aba **BreakEven** da planilha para simular.

---
