# 15 — Como usar no dia-a-dia

Sete cenários de uso depois que tudo está rodando.

---

## Cenário 1 — Tudo automático (caso padrão)

1. Durante o dia anterior, R1 (Routine Remote) enche o News Feed (3x ao dia)
2. A Routine **Local** R2 dispara no primeiro tick do dia (`*/30 8-22`) em que o Claude Desktop estiver aberto
3. R2 executa pipeline editorial + render paralelo + Notion + Drive backup
4. Ticks subsequentes do dia caem em soft exit (~2s, custo zero) porque `.completed` já existe
5. Você abre Notion no celular, vista "Galeria" de `🎨 Carrosséis`
6. Vê o carrossel do dia (Status: Rascunho), avalia visualmente
7. Se aprovado: marca Status = Aprovado, baixa os 9 PNGs, posta no Instagram
8. Marca Status = Postado

Tempo gasto da sua parte: **~3 min/dia**.

> **Fallback robusto (3 camadas):**
> - Schedule `*/30 8-22` — pega o primeiro horário do dia em que o app abrir
> - Catch-up automático — se app estava fechado por horas, dispara 1 run do tick mais recente perdido quando você abrir
> - Manual — Run now no painel a qualquer hora
>
> Mesmo abrindo o app só de tarde, o carrossel do dia é gerado. Sem necessidade de Mac sempre ligado.

---

## Cenário 2 — Trocar a notícia escolhida

Situação: R2 escolheu uma notícia ruim. Você prefere a Nº 12.

**Opção A — Run now no painel da Routine:**
1. Abre Claude Desktop → Routines → `{brand_name} — Carousel Creator`
2. Botão **Run now**
3. Primeira mensagem da session: `--news=12`

R2 marca a entry anterior do dia como Descartada com prefix `[Substituído]`, gera novo carrossel com a Nº 12, cria entry nova.

Tempo: ~5-10 min.

**Opção B — claude CLI conversacional (fora da Routine):**
```bash
cd ~/{brand-slug}
claude
> regerar carrossel do dia com a notícia 12
```

Agente conversacional dispara o equivalente. Útil quando você não lembra os flags.

**Opção C — Pinar pra próximo cron:**
News Feed → notícia desejada → Status = Pinada. R2 das 08h de amanhã usa essa com prioridade (filtro de ordenação já privilegia Pinada).

---

## Cenário 3 — Carrossel a partir de tema simples

Situação: você não quer esperar o feed de notícias. Você só tem uma ideia.

Exemplos:

```text
/carrossel quero um carrossel sobre bicicletas elétricas em São Paulo
```

```text
/carrossel faz um carrossel sobre como pequenos negócios podem usar IA no atendimento
```

O agente deve pesquisar, escolher o ângulo e estruturar. A pessoa não precisa trazer headline, roteiro ou dados.

**Se estiver usando a Routine Local:**

1. Abre Claude Desktop → Routines → `{brand_name} — Carousel Creator`
2. Botão **Run now**
3. Primeira mensagem da session:

```text
quero um carrossel sobre bicicletas elétricas em São Paulo
```

ou:

```text
--tema="bicicletas elétricas em São Paulo"
```

A R2 cria uma pauta manual do dia, pesquisa o tema, gera headline, arquitetura narrativa de 9 slides, legenda, visual brief, slides, Drive e Notion. Nesse modo, ela não depende de notícia no News Feed.

**Se ainda não houver setup visual completo:**
o agente entrega headline, slides, legenda, direção visual e checklist de render, sem bloquear a criação.

---

## Cenário 4 — Re-render quando visual veio fraco

Situação: copy excelente, mas carrossel ficou visualmente genérico.

**Opção A — na própria session da run que acabou de terminar:**
Se a session da Routine ainda está aberta, basta mandar mensagem:
```
> --re-render
```

A session já tem todo o contexto (narrativa.json, visual-plan.json em memória). Pula etapas 1, 2, 3. Re-roda 4-8.

**Opção B — Run now no painel da Routine:**
1. Routines → `{brand_name} — Carousel Creator` → Run now
2. Primeira mensagem: `--re-render`

Dispara nova session. Lê state existente do disco (`./state/{TODAY}/`), pula etapas que já têm output, re-roda do visual brief em diante.

Custo: conferir créditos no Higgsfield. Tempo: depende da fila/modelo.

**Quando faz sentido:**
- Você editou `🖼️ Referências visuais` (anexou imagens novas, ajustou descrições)
- Você ajustou `🏷️ Brand Identity` (cor primária, contraste)
- Higgsfield/modelo teve "dia ruim" — alguns slides saíram conflitantes com a capa

**Quando NÃO faz sentido:**
- Copy fraca → editar `📚 Manual editorial`, dispara Run now SEM `--re-render` (run completa)
- Notícia errada → Run now com `--news=N`

---

## Cenário 5 — Ajustar slide específico

Situação: 8 slides estão ótimos, mas o slide 5 ficou estranho.

**Opção A — na session da Routine ainda aberta:**
```
> regenera só o slide 5 com mais densidade visual. mantém o resto.
```

Session:
1. Lê `state/$TODAY/narrativa.json` e `visual-plan.json` do disco
2. Ajusta o prompt do slide 5 conforme seu pedido
3. Chama Higgsfield CLI com GPT Image 2 (`gpt_image_2`) e UUIDs de referência (`--image cover_uuid` + refs visuais da marca + hero da notícia quando aplicável)
4. Sobrescreve `url-5.txt` e (opcional) `slides/slide-05.png`
5. PATCH na entry do Notion (só o slide 5)

Tempo: ~30s. Custo: $0.05.

**Opção B — Run now com flag:**
```
--only-slide=5
```

Variações úteis:
- *"No slide 5, troca a tabela por um card único centralizado"*
- *"Regenera slide 2 com textura mais granulada"*
- *"Tira a foto de fundo do slide 6, deixa só dark sólido"*

---

## Cenário 6 — Mudar a estética do feed inteiro

Situação: cansado da estética atual, quer dar refresh visual no próximo carrossel.

**Não precisa mexer no prompt da Routine.**

1. Edita a página `🖼️ Referências visuais` no Notion:
   - Substitui as imagens anexadas por novas
   - Atualiza descrições textuais
   - Atualiza anti-exemplos
2. Opcional: ajusta cor primária em `🏷️ Brand Identity`
3. Próximo carrossel (próximo cron OU `--re-render` agora) já sai na nova estética

Você pode manter log na própria página tipo "estética 2026-01 → 2026-03" pra referência futura.

---

## Cenário 7 — Pausar / pular dia / reset

**Pular dia específico:** não faça nada. Carrossel fica Rascunho no Notion, você não posta, segue a vida.

**Pausar tudo por uns dias:**
- Routine Remote (R1): claude.ai/code → Routines → toggle Schedule Off
- Routine Local (R2): Claude Desktop → Routines → toggle Schedule Off

Reativa quando quiser (mesmos toggles On).

**Reset do dia (após erro grave):**
```bash
cd ~/{brand-slug}
rm -rf state/$(date +%Y-%m-%d)
```

Depois dispara Run now no painel da Routine Local.

---

## Boas práticas

**Revisar Engine de Headlines a cada 30 dias.** Olha os carrosséis que performaram melhor — quais padrões? Quais gatilhos? Reforça a página com aprendizados.

**Atualizar Referências de Qualidade.** Quando um carrossel seu sair excelente, considere adicioná-lo como 3º exemplo nessa página. R2 vai usar como âncora pros próximos.

**Ordem de ajuste quando algo sai ruim:**
1. `🖼️ Referências visuais` (estética)
2. `📚 Manual editorial` (copy)
3. `📐 Referências de qualidade` (padrão de qualidade)
4. Páginas operacionais
5. **Por último:** prompt da Routine

Quase nunca a solução é mexer no prompt da Routine. O sistema foi feito pra ser configurado pelo Notion.

**Performance tracking.** Depois de postar, volte no Notion e preencha `Performance` (Excelente/Médio/Ruim) na entry. Em 1 mês você tem dado interno pra calibrar critérios.

**Backup do state.** O diretório `state/` cresce. Mantém últimos 90 dias localmente, arquiva o resto pra Drive:
```bash
# Roda manual a cada trimestre:
cd ~/{brand-slug}/state
find . -maxdepth 1 -type d -mtime +90 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;
# Sobe os .tar.gz pra Drive via MCP ou app web
```

**Backup do prompt da Routine.** Quando você edita o prompt no painel, copia pra `~/{brand-slug}/r2-routine-prompt.txt`. Se o app perder a config, você restaura colando.

---

## Comandos cheat-sheet

```text
# Day-to-day (no painel da Routine Local)
[Run now] → enter (sem mensagem)     = roda normalmente
[Run now] → "quero um carrossel sobre X" = pauta manual com pesquisa
[Run now] → "--tema=X"               = pauta manual com pesquisa
[Run now] → "--re-render"            = re-render só visual
[Run now] → "--news=N"               = override de notícia
[Run now] → "--only-slide=N"         = regen slide específico

# Conversacional na session ativa
> --re-render
> regenera só o slide 5
> mostra o narrativa.json do dia

# Debug local (terminal fora do Claude Desktop)
cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/log.txt      # logs
cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/narrativa.json  # arquitetura narrativa aprovada
cat ~/{brand-slug}/state/$(date +%Y-%m-%d)/visual-brief.txt  # briefing visual

# Routines (painel Claude Desktop)
Routines → list                                  # ver as 2 routines + status
Routines → [routine] → Run now                   # disparar agora
Routines → [routine] → Schedule toggle           # pausar/retomar
Routines → [routine] → Edit prompt               # ajustar instruções

# claude CLI (conversa fora da Routine)
cd ~/{brand-slug}
claude
> [comando em linguagem natural]
```

---

## Quando pedir ajuda do agente vs ir direto na Routine

**Use a Routine direto (Run now + flag) quando:**
- Quer rodar comando exato e conhecido (`--re-render`, `--news=12`)
- Quer rodar no horário fora do cron

**Use a session conversacional (mensagem após Run now) quando:**
- Quer regenerar slide específico com instrução custom
- Quer ajustar uma página do Notion sem abrir o Notion
- Quer entender porque algo saiu errado (faz pergunta na session)

**Use o claude CLI (`claude` no terminal) quando:**
- Não está no Claude Desktop (no celular dá pra usar via web)
- Quer fazer manutenção / debug de estrutura local
- Quer reset, archive, etc.
