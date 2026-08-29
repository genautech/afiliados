# Sequência dos 5 shots e direção de movimento

Os 5 frames não são imagens soltas — são uma **sequência** que monta um arco de 15s. A hero é gerada primeiro (pra travar o look) mas vive **no fim** da timeline, como o "money shot" de fechamento.

## Os 5 papéis e a ordem na timeline

| # | Frame | Papel no arco | Ângulo / enquadramento (linha CHANGE ONLY THE CAMERA) |
|---|---|---|---|
| 1 | `01-hook` | **HOOK** — para o scroll nos primeiros 0,5s | close extremo / detalhe intrigante / ângulo incomum e ousado |
| 2 | `02-reveal` | **REVEAL** — contexto, mostra o produto inteiro na cena | plano aberto, produto inteiro no cenário |
| 3 | `03-detail` | **DETAIL** — desejo tátil, textura e acabamento | macro de material/textura/acabamento |
| 4 | `04-action` | **ACTION/USE** — prova de uso / interação | produto em interação (luz, líquido, mão entrando no quadro, movimento) |
| 5 | `05-hero` | **HERO** — crava a memória de marca (= a hero aprovada) | beauty shot dramático, simétrico/icônico (já gerado) |

A ordem de montagem é sempre `01-hook → 02-reveal → 03-detail → 04-action → 05-hero`. O hook abre forte, o reveal situa, o detail gera desejo, o action prova, a hero fecha gravando a marca.

> O `05-hero` **não** é gerado nesta etapa — ele é a hero que o usuário já aprovou, copiada pra dentro de `03-sequencia/`. Você só escreve prompts pros 4 papéis 01–04 em `variacoes.txt`.

## "Ângulo em comum" entre os shots

Mesmo variando o enquadramento de cada take, mantenha um **eixo compositivo comum** (definido no LOOK SPINE): mesma altura/linha de câmera, mesmo lado de onde vem a luz, mesma relação produto-fundo. É isso que faz 5 ângulos diferentes parecerem o mesmo filme, não 5 filmes.

## Direção de movimento por take (Kling 3.0, 3s cada)

Cada linha de `movimento.txt` descreve só o **movimento** — a cena já está no frame. Escreva em inglês, curto e físico. Sempre mantendo o produto nítido e dominante.

| Take | Movimento | Velocidade |
|---|---|---|
| `01-hook` | snap zoom out, whip pan ou rápida rotação que revela o produto | RÁPIDO — é o gancho |
| `02-reveal` | dolly-in lento ou órbita suave ao redor do produto | médio-lento |
| `03-detail` | push-in macro com leve rack focus na textura | lento, contemplativo |
| `04-action` | movimento do produto ou da interação (líquido escorrendo, luz varrendo, mão) | médio-rápido |
| `05-hero` | pull-back que afasta + leve tilt-up, com flare suave | lento, "money shot" |

Exemplos de linhas de movimento (perfume da referência):
```
slow snap zoom out from the gold cap, the bottle emerging from shadow, fast confident move
slow dolly-in toward the bottle on the wet stone, mist drifting softly behind
slow macro push-in along the faceted glass, gentle rack focus catching the speculars
warm light sweeps across the glass, faint condensation, the liquid shifting inside
slow pull-back and slight tilt-up revealing the full bottle, soft lens flare, hero beat
```

## Pensar como vídeo desde a imagem

Os stills são feitos pra animar. Por isso os prompts da Etapa 2/3 pedem "leave headroom for motion": não corte o produto rente às bordas, deixe respiro pro movimento (zoom, órbita, tilt) sem cortar o produto. E nunca um movimento que jogue o produto pra fora de foco — ele é o rei até no movimento.
