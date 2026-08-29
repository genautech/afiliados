# 01 — Brand Identity

> **Onde colar:** Página `🏷️ Brand Identity` no Notion.
> Esta página é lida pela R2 em **toda execução** e suas variáveis são interpoladas no pipeline editorial e nos prompts de render.

---

## Cole o conteúdo abaixo na página

---

## Variáveis da marca

| Variável | Valor | Onde aparece |
|---|---|---|
| `brand_name` | `Human Academy` | Capa (signature), slide 9 (logo), caption |
| `brand_handle` | `@humanacademy` | Brand bar de todos os slides, capa |
| `brand_slug` | `human-academy` | Working folder local (`~/human-academy/`), pasta no Google Drive, nome das Routines |
| `brand_color_primary` | `#EC5E26` | Accent em todos os slides (palavras-chave, progress, accent bar) |
| `brand_color_dark` | `#1B1411` | Background slides dark (default warm-dark) |
| `brand_color_light` | `#F1ECE3` | Background slides light (default warm-cream) |
| `brand_subject` | `IA pra criativos` | Triagem editorial, hashtags, sugestão de fontes |
| `brand_audience_term` | `alunos` | Como o pipeline pode referenciar a audiência |
| `brand_voice_anchor` | `Folha de S.Paulo` | Veículo de referência editorial citado no Manual Editorial |
| `brand_email_from` | `news@humanacademy.com.br` (opcional) | Quando enviar relatórios diários por email |
| `brand_has_logo` | `true` / `false` | Se a marca tem logo PNG anexado abaixo. Se `true`, R2 usa o logo nos slides 1 e 9 |
| `cron_r1_hours` | `9,13,17` | Crontab da R1 |
| `cron_r2_time` | `08:00` | Horário-alvo da R2. **Schedule real é `*/30 8-22 * * *`** — primeiro tick do dia em que o app estiver aberto roda. Ticks seguintes detectam `.completed` e saem imediato (~2s, custo desprezível). |

---

## Regra de exibição da marca nos slides

| Slide | O que aparece |
|---|---|
| **1 — Capa** | `POR {brand_name}` como signature + `{brand_handle}` na brand bar + logo **pequena** no canto (se `brand_has_logo=true`) |
| **2-8 — Internos** | `{brand_handle}` e detail signature discreta. **Sem logo e sem numeração de slide.** |
| **9 — CTA** | Logo **grande e centralizado** como protagonista + CTA curto (se `brand_has_logo=true`) — senão, lockup textual grande com `{brand_name}` + CTA curto |

Mantém o feed limpo. Marca acumula em capa + CTA. Slides intermediários respiram. No slide 9, o texto não resume o carrossel: entra só um CTA de até 8 palavras, com handle discreto se necessário.

---

## Logo da marca

Se `brand_has_logo = true`, anexe abaixo um **PNG do logo** (preferência: fundo transparente, mínimo 800×800px, formato quadrado ou retangular limpo). O R2 baixa esse arquivo no início de cada execução e usa nos slides 1 e 9.

> **Anexe aqui:** _(arraste o PNG do logo da marca pra essa página, abaixo desta linha)_

Trocar a logo a qualquer momento = substituir o anexo aqui. Próxima run usa a nova.

Se você NÃO tem logo (ou prefere usar só typesetting com o nome da marca), marca `brand_has_logo = false` na tabela acima e ignora o anexo — o R2 cai num lockup tipográfico no slide 9 (`{brand_name}` em fonte de capa + monogram).

---

## Voz e identidade editorial

Descreva em 3-5 frases:

**Tom de voz** (exemplo Human Academy):
> Mentor provocador. Direta, didática, levemente ácida, culturalmente informada. Fala com adulto inteligente. Não fala sobre IA — fala sobre qualidade criativa na era da IA. IA vira contexto. Qualidade vira assunto.

**Princípio editorial central:**
> A {brand_name} não fala sobre {brand_subject}. Fala sobre [qualidade / método / critério / decisão] no contexto de {brand_subject}.

**O que a marca É:**
- Direta · provocadora · culturalmente informada · com critério · método

**O que a marca NÃO É:**
- Empolgada · motivacional · guru de autoajuda · tech bro · vendedora de ferramenta

**Como NÃO chamar a audiência:**
- Listar termos que infantilizam ou genericizam (no caso Human Academy: nunca "turma da Human", sempre "alunos Human")

---

## Como a R2 usa essa página

A R2 lê esta página no início de cada execução e cria um **dicionário de substituição**:

```python
brand = {
  "brand_name": "Human Academy",
  "brand_handle": "@humanacademy",
  "brand_color_primary": "#EC5E26",
  "brand_has_logo": True,
  "brand_logo_path": "./state/{TODAY}/logo.png",  # baixado do anexo da página
  ...
}
```

Cada prompt enviado ao GPT Image 2 (`gpt_image_2`) e ao `claude` CLI passa por interpolação:

```python
prompt = prompt_template.replace("{brand_name}", brand["brand_name"])
                        .replace("{brand_color_primary}", brand["brand_color_primary"])
                        ...
```

Trocar a marca = editar essa página. **Nada no código do R2 precisa mudar.**

---

## Workspace dedicado (recomendado)

Pra isolar tokens e permissões, recomenda criar **workspace Notion separado** pra cada marca. Vantagens:

- Integration Token tem escopo restrito ao workspace
- Não mistura com docs pessoais ou de outras marcas
- Permite compartilhar pra time da marca sem expor o resto

Pode usar workspace free do Notion — uma marca por workspace.

---

## Setup wizard

A primeira vez que o agente roda o setup, ele preenche essa página perguntando uma coisa de cada vez. Você não preenche à mão na primeira vez — só **edita aqui depois** se quiser ajustar.

Pra fluxo do wizard, ver `02-Setup-Wizard.md`.
