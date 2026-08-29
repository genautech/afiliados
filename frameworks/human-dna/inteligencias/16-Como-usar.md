# 16 — Como usar no dia-a-dia

Oito cenários reais de uso depois que tudo está rodando.

---

## Cenário 1 — Produzir asset compliante seguindo o DNA

Situação: você precisa de uma peça nova (post, email, copy de CTA, etc.). Quer que saia "com tom da marca" sem precisar revisar 5 vezes.

**Fluxo:**

1. Abre Claude Desktop → Routines → `{brand_name} — DNA Routine` → **Run now**
2. Primeira mensagem:
   ```
   generate: Email de boas-vindas pra novo cliente que comprou o produto X.
   Tom: editorial mais íntimo. Inclui link pro quickstart.
   ```
3. R2 entra em MODO GENERATE:
   - Lê DNA (voz, audience, behavior, anti-patterns)
   - Lê referências de email no `📚 Reference Library`
   - Constrói brief enriquecido
   - Gera 2-3 variações
   - Auto-audita cada uma (Compliance Score)
   - Entrega a melhor + segunda opção

4. Você revisa output em ~5 min, copia, envia

Tempo total: **8-15 min** (vs. 1-2h escrevendo do zero)

---

## Cenário 2 — Auditar asset existente (próprio ou externo)

Situação: você produziu um post e está em dúvida se "soa como nós". Ou quer entender por que aquele post do concorrente parece bom.

**Fluxo:**

1. Run now → primeira mensagem:
   ```
   audit: [cola o texto do post completo]
   ```
   ou
   ```
   audit: https://instagram.com/p/XXXXX/
   ```

2. R2 entra em MODO AUDIT:
   - Lê DNA (voz, visual, audience, anti-patterns)
   - Pontua 4 dimensões (0-10)
   - Diagnóstico em prosa
   - Sugestão de reescrita (se aplicável)

3. Output em ~3 min:
   ```
   AUDIT CONCLUÍDA

   Score total: 7.2/10
   ├── Voz: 8.5/10
   ├── Visual: 6.0/10  ← problema
   ├── Persona: 8.0/10
   └── Anti-patterns: 6.5/10  ← problema
   
   Top 3 issues:
   1. Imagem com gradiente roxo IA — anti-pattern visual
   2. CTA "comenta aqui!" sem objeto — anti-pattern verbal
   3. 4 emojis na caption — política de emoji excedida
   
   ⚠️ AJUSTES SUGERIDOS — ver suggestions.md
   ```

4. Você abre `suggestions.md` no working folder, vê reescrita proposta

---

## Cenário 3 — Mini-discovery de evolução (DNA precisa atualizar)

Situação: a marca pivotou produto, ou audiência amadureceu, ou estética envelheceu. DNA precisa refresh.

**Fluxo:**

1. Run now → primeira mensagem: `evolve`

2. R2 pergunta o motivo:
   ```
   Motivo da evolução?
   (a) Pivot estratégico
   (b) Refresh visual  
   (c) Nova audiência
   (d) Pós-crise
   (e) Performance
   (f) Outro
   ```

3. Você escolhe — R2 conduz **8 perguntas focadas** no aspecto

4. R2 apresenta diff proposto:
   ```
   PROPOSTA DE EVOLUÇÃO DO DNA

   Páginas afetadas: 🧬 DNA Master, 🎨 Visual System, 📚 Reference Library

   Mudanças propostas:

   🧬 DNA Master:
   - "brand_color_primary: #EC5E26"
   + "brand_color_primary: #2A2E45"

   🎨 Visual System (paleta canônica):
   - todas as referências a #EC5E26 substituídas por #2A2E45
   - tons derivados recalculados

   📚 Reference Library:
   - Anti-referências adicionadas: "estética warm/laranja anos 2010"
   - Refs A-04, A-12, A-23 marcadas como "arquivar" (envelheceram)

   Razão: Refresh visual — público amadureceu (média de idade subiu 8 anos),
   estética warm-orange está sendo lida como "startup-y" pelo perfil enterprise.

   Aplicar? (s) Sim / (e) Editar / (c) Cancelar
   ```

5. Você confirma → R2 aplica em todas as páginas Notion + atualiza `.brand.json` + cria snapshot pré-mudança

6. **Próxima execução de qualquer agente** (R2 Carrossel, futuros agentes) já lê o DNA atualizado

Tempo total: **15-30 min**

---

## Cenário 4 — Brifar fornecedor externo (designer freela, agência)

Situação: vai contratar designer pra projeto pontual. Quer que a entrega chegue alinhada com o DNA.

**Fluxo:**

1. Acesse no Notion: `🧬 DNA Master`, `🎨 Visual System`, `📚 Reference Library`, `🚫 Anti-Patterns`

2. Compartilhe **as 4 páginas** com o fornecedor (Notion permite share de página específica)

3. Anexe:
   - PDF com as variáveis canônicas (export da `🧬 DNA Master`)
   - ZIP com 10-15 referências aprovadas (export da `📚 Reference Library`, Seção A)
   - Lista de anti-patterns visuais (export da `🚫 Anti-Patterns`, Dimensão 1)

4. Brief do projeto inclui contrato simples:
   > "Toda entrega passa por compliance check via R2 do DNA Routine. Score < 7 em qualquer dimensão = revisão sem custo extra. Ajustes contemplados no escopo até score ≥ 8."

5. Quando fornecedor entrega, você roda MODO AUDIT no asset. Score >= 8 → aprova; < 8 → devolve com diagnóstico estruturado.

> Vantagem: feedback objetivo, não "não gostei" subjetivo. Designer entende rápido o que ajustar.

---

## Cenário 5 — Onboarding de novo membro do time

Situação: entrou alguém novo (designer, copy, social, atendimento). Quer que produza dentro do DNA desde a primeira semana.

**Fluxo (extraído do `🔍 Discovery Protocol`, seção "Onboarding"):**

### Dia 1 (~75 min de leitura)
- 🧬 DNA Master (15 min)
- 🎯 Brand Strategy (15 min)
- 🗣️ Voice & Tone (20 min)
- 🚫 Anti-Patterns (15 min)
- 📐 Pilares & Tabus (10 min)

### Dia 2-5 (lê páginas restantes conforme função)
- Designer → 🎨 Visual System + 📸 Photography Direction + 🖼️ Image Generation Engine
- Copy → 🗣️ Voice & Tone + 📚 Reference Library
- Social manager → 🤝 Brand Behavior + 📚 Reference Library
- Atendimento → 🤝 Brand Behavior + 👥 Audience DNA

### Dia 6-7 (exercício prático)
- Pega 3 assets recentes → audita usando R2 (modo audit)
- Compara seu score com histórico
- Apresenta pro time: o que aprendeu, o que questionou, o que sugeriria mudar

### Dia 30 (mini-discovery próprio)
- Roda 8 perguntas pessoais: o que mudaria no DNA com base no que viu nos 30 dias?
- Apresenta sugestões — equipe decide o que entra no próximo update

---

## Cenário 6 — Análise competitiva trimestral

Situação: a cada 90 dias, quer avaliar o que concorrentes fizeram, identificar tendências, ajustar diferenciação.

**Fluxo:**

1. R1 (Brand Scout) já está coletando snapshots mensais dos concorrentes monitorados (definidos no Discovery)

2. No final do trimestre, abre Claude CLI:
   ```bash
   cd ~/{brand-slug}
   claude
   > análise competitiva trimestral
   ```

3. Agente compila:
   - Snapshots dos 3 concorrentes (3 meses × 3 = 9 snapshots)
   - Mudanças visuais observadas
   - Pivot tonal observado
   - Lançamentos novos
   - White space (o que ninguém faz)

4. Output: documento de 800-1200 palavras com tabelas, salvo em Drive `{brand_slug}/Análises Competitivas/{YYYY-Q[N]}.md`

5. Você lê em reunião estratégica trimestral. Decisões podem virar `evolve` no DNA.

---

## Cenário 7 — Rodar discovery anual completo (refresh do DNA)

Situação: passou 1 ano. Marca evoluiu. DNA precisa de revisão sistemática.

**Fluxo:**

1. Cria snapshot completo do DNA atual (segurança):
   ```bash
   cd ~/{brand-slug}
   claude
   > snapshot DNA quarterly-Q[N]-YYYY
   ```

2. Roda wizard completo:
   ```bash
   claude
   > rodar discovery completo (revisão anual)
   ```

3. Agente entra no modo wizard, mas **traz suas respostas anteriores como hipóteses ao lado de cada pergunta** — você confirma, refina ou refuta. As 52 perguntas em ~30 min.

4. Após confirmação final:
   - Cria diff completo (DNA antes vs. depois)
   - Cria snapshot etiquetado: `DNA Q[N]-{YYYY} — pre-anual-refresh`
   - Aplica todas as mudanças em batch

5. Comunicado interno (opcional):
   - Agente gera changelog "o que mudou no DNA neste refresh anual"
   - Time lê
   - Atualizam práticas conforme

---

## Cenário 8 — Geração paralela do mesmo brief em N variações

Situação: você precisa testar 4 versões diferentes de um anúncio. Mesmo brief, abordagens diferentes.

**Fluxo:**

1. Run now → primeira mensagem:
   ```
   generate: 4 variações de copy de anúncio Meta pra produto X.
   Cada uma com hook diferente:
   - V1: hook ancorado em dado
   - V2: hook ancorado em pergunta retórica  
   - V3: hook ancorado em case
   - V4: hook ancorado em objeção
   Restrições: até 125 caracteres no headline, até 90 no body, CTA "Quero saber mais".
   ```

2. R2 entra em MODO GENERATE:
   - Brief é processado (1 brief, 4 outputs)
   - Cada variação passa por auto-audit
   - Compara scores e sinaliza qual é mais aderente ao DNA
   - Entrega 4 outputs + ranking

3. Você roda os 4 em A/B test, depois marca o vencedor no Notion (Performance: Excelente / Médio / Ruim)

4. R2 acumula esse aprendizado — em futuras gerações similares, peso o hook que historicamente performou

---

## Boas práticas

### Revisar `🚫 Anti-Patterns` mensalmente

R2 traz log dos top 5 anti-patterns mais detectados nos últimos 30 dias. Equipe avalia se precisa reforçar (treinar quem produz) ou retirar (anti-pattern não é mais issue).

### Atualizar `📚 Reference Library` semanalmente

Curar pendentes coletadas pelo R1 (~20 min/semana). Bancada viva > brand book congelado.

### Snapshot trimestral do DNA inteiro

R2 cria automaticamente em `{brand_slug}/DNA-Snapshots/{YYYY-MM-DD}/` no Drive. Vale como histórico ("como era o DNA em Q1 vs Q3") e como backup.

### Histórico de evolução visual

A cada 6 meses, snap visual do feed (print de 30 últimos posts em grid 5×6). Cole na seção "Histórico de evolução visual" do `📚 Reference Library`. Linha do tempo da identidade visual.

### Performance tracking

Toda peça publicada → atualiza Performance no `🎯 Assets` (Excelente/Médio/Ruim). Em 3-6 meses, tem dado interno pra calibrar:
- Que pilares performam melhor
- Que hooks funcionam mais
- Que estética conecta mais
- Que tom converte mais

R2 usa esse dado em futuras gerações.

### Ordem de ajuste quando algo sai ruim

1. `📚 Reference Library` (estética)
2. `🗣️ Voice & Tone` (copy)
3. `🚫 Anti-Patterns` (filtros)
4. `🤝 Brand Behavior` (microcopy)
5. **Por último:** `🧬 DNA Master` (variáveis canônicas)

Quase nunca a solução é mexer nas variáveis canônicas. O sistema foi feito pra ser configurado pelos níveis de profundidade, não pelo topo.

### Backup do prompt das Routines

Quando você edita o prompt no painel, copia pra `~/{brand-slug}/r1-routine-prompt.txt` e `~/{brand-slug}/r2-routine-prompt.txt`. Se o app perder a config, você restaura colando.

---

## Comandos cheat-sheet

```text
# Day-to-day (no painel da Routine Local — DNA Routine)
[Run now] → enter (sem mensagem)               = MODO BRIEF (lista jobs)
[Run now] → "audit:<URL ou texto>"             = MODO AUDIT
[Run now] → "generate:<brief>"                 = MODO GENERATE
[Run now] → "evolve"                           = MODO EVOLVE

# Conversacional na session ativa
> audit: <novo asset>
> generate: <novo brief>
> qual nosso princípio editorial central?
> qual nosso anti-pattern visual #2?
> mostra refs visuais aprovadas

# Debug / consulta local (terminal fora do Claude Desktop)
cat ~/{brand-slug}/.dna.json | jq .          # snapshot completo
cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/log.txt
ls ~/{brand-slug}/state/$(date +%Y-%m-%d)/briefs/
ls ~/{brand-slug}/state/$(date +%Y-%m-%d)/audits/

# Routines (painel Claude Desktop)
Routines → list                                  # 2 routines + status
Routines → DNA Routine → Run now                 # disparar agora
Routines → Brand Scout → Schedule toggle         # pausar/retomar coleta
Routines → [routine] → Edit prompt               # ajustar instruções

# Sub-comandos do agente CLI
cd ~/{brand-slug}
claude
> rebuild DNA                                  # re-sincroniza .dna.json com Notion
> snapshot DNA                                 # snapshot trimestral manual
> diff DNA vs último snapshot                  # mostra o que mudou
> análise competitiva trimestral
> rodar discovery completo (revisão anual)
```

---

## Cenário 9 — Marca de e-book / plataforma / afiliados

Situação: o DNA é a marca, um e-book low-ticket, ou um programa de afiliados. O risco é escrever copy de plataforma na página do produto.

**Fluxo:**

1. Maestro lê `20-Infoprod-Low-Ticket.md` **depois** do DNA da marca.
2. Pergunta o nível: MARCA (Ana, produtora) ou PRODUTO (leitor, R$ 29–67).
3. Se houver URL de YouTube/GitHub, extrai conhecimento (`watch-video` /
   `knowledge-scout`) antes de gerar.
4. Generate/audit com o CTA do nível certo. Mistura reprova.

Não use o Cenário 1 genérico sem essa pergunta — a peça sai "ok" e vende o
produto errado.

---

## Quando pedir ajuda do agente vs ir direto na Routine

**Use a Routine direto (Run now + flag) quando:**
- Você sabe exatamente o que quer (audit, generate, evolve)
- Brief está claro

**Use a session conversacional (mensagem após Run now) quando:**
- Quer iterar (gerou peça, quer ajustar pequena parte)
- Quer entender por que algo saiu de um jeito específico

**Use o claude CLI (`claude` no terminal) quando:**
- Não está no Claude Desktop (no celular dá pra usar via web)
- Quer fazer manutenção / debug do DNA
- Quer rebuild, snapshot, análise complexa
- Quer rodar revisão anual

---

## Cadência sugerida

| Ação | Frequência | Quem faz | Tempo |
|---|---|---|---|
| Auditar peça antes de publicar | Toda peça | Quem produz | 3-5 min |
| Curar pendentes da Reference Library | Semanal | Designer / fundador | 20 min |
| Revisar top anti-patterns detectados | Mensal | Time | 30 min |
| Análise competitiva | Trimestral | Estratégia | 1h |
| Snapshot visual do feed | Semestral | Designer | 15 min |
| Discovery anual completo (refresh DNA) | Anual | Time + fundador | 2-3h |
| Crisis playbook drill (simulação) | Anual | Time + fundador | 1h |
