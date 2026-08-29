---
name: afiliads-content-qa
description: >
  Controle de qualidade automático de qualquer copy do produto — detecção de
  anti-patterns de texto gerado, sete parâmetros editoriais, teste da
  substituição e checagem de fatos sem fonte. Use como última etapa de toda
  peça de conteúdo, e sempre que o pedido for "isso está com cara de IA",
  "revisa antes de publicar", "audita esse texto".
---

# QA de conteúdo

Última etapa de toda peça. Nenhuma copy sai sem passar por aqui.

## Camada 1 — automática

```bash
python3 scripts/slopcheck.py copy.md --preset sair-ilesa --json qa.json
```

Exit 0 passa, exit 1 reprova. Detecta:

- construção binária ("não é X, é Y");
- aberturas e fechamentos proibidos;
- muletas ("crucial", "poderoso", "revolucionário", "mergulhar fundo"…);
- promessa irreal ("dinheiro fácil", "em 7 dias", "garantido", "método
  infalível", "única plataforma");
- anglicismo numérico (ponto decimal, `$` em valor de real, data MM/DD);
- número, percentual ou moeda sem fonte declarada;
- proibições específicas do preset (seção 4 do DNA);
- CTA do hero diferente do CTA final;
- `variant_id` ausente;
- mistura de nível: CTA de plataforma ("Criar meu e-book agora") em peça
  de produto, ou CTA de e-book ("Quero o e-book") em peça de marca;
- citação de vídeo sem URL/timestamp quando o briefing listou
  `fontes_conhecimento`.
- linguagem que transforma benchmark externo (número de anúncios, CPC,
  faturamento, prazo ou preço observado) em prova ou promessa da marca;
- modelagem sem ângulo, público, mecanismo ou situação de uso próprios;
- afirmação de demonstração, impressão, bônus ou entregável que não consta no
  briefing/ledger.

O script é heurística, não juiz. Ele encontra o que é detectável por padrão —
a camada 2 encontra o resto.

## Camada 2 — os sete parâmetros

Cada um recebe nota de 1 a 5. Média abaixo de 4, ou qualquer nota abaixo de 3,
reprova a peça.

1. **Gramática** — acentuação, concordância, pontuação.
2. **Fluência** — o texto lido em voz alta soa como alguém falando?
3. **Anti-slop** — sobrou construção genérica que o regex não pega?
4. **Fatos verificados** — toda afirmação tem origem ou placeholder visível?
5. **Estrutura** — a ordem dos blocos serve ao nível de consciência?
6. **Densidade** — quanto do texto some sem perda? Acima de 20%, reprova.
7. **Tom editorial** — é a voz do nível de marca certo, do começo ao fim?
   Presell vende o e-book; onboarding vende a plataforma. Os dois na mesma
   URL reprovam.
8. **Especificidade da oferta** — a página mostra o entregável e diferencia o
   mecanismo sem depender de uma oferta de referência?

## Camada 3 — o teste da substituição

Troque o nome do produto por "Plataforma X". O texto continua fazendo sentido?

Se sim, **reprova** — é copy de categoria, não de produto. A correção é
injetar especificidade do briefing, não trocar palavras. Devolva para
`afiliads-content-voice` com os trechos marcados.

Este teste reprova mais que os outros dois juntos. É o objetivo dele.

## Fatos pendentes

Placeholder `[FATO PENDENTE: ...]` **não reprova** — é o comportamento
correto quando o briefing não trouxe o dado. O que reprova é um número
plausível sem origem, que é exatamente o que aparece quando ninguém trava o
processo.

Liste os pendentes no `qa.json`. Eles viram a lista do que precisa ser
preenchido em `Fatos_Produto.md` antes de publicar.

## Ciclo

```
reprovou  →  afiliads-content-voice com os trechos marcados  →  QA de novo
```

No máximo duas voltas. Na terceira, o problema é briefing, não escrita —
devolva para `afiliads-content-briefing`.

## Saída

`qa.json`:

```json
{
  "variant_id": "sair-ilesa-lp-a1",
  "slopcheck": "pass | fail",
  "ocorrencias": [{"linha": 12, "tipo": "muleta", "trecho": "..."}],
  "parametros": {"gramatica": 5, "fluencia": 4, "...": 4},
  "media": 4.3,
  "substituicao": "pass | fail",
  "fatos_pendentes": ["..."],
  "veredito": "aprovado | reprovado",
  "proximo_passo": "..."
}
```

## O que esta skill não faz

Não avalia se a oferta é boa (`afiliads-offers`), se a página converte (`cro`), nem se
o argumento está certo (`afiliads-content-landing`). Ela avalia se o **texto** está
publicável no padrão do DNA. Confundir isso faz o QA virar gargalo opinativo.
