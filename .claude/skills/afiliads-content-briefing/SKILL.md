---
name: afiliads-content-briefing
description: >
  Coleta e fecha o briefing de qualquer peça do produto — e-book, plataforma,
  afiliado ou extração de conhecimento — valida contra os fatos do produto e
  emite um briefing.json. Use antes de escrever qualquer copy, e sempre que
  o pedido chegar sem informação suficiente ou com URLs de YouTube/GitHub.
---

# Briefing de conteúdo

Fechar o briefing é o trabalho. Copy ruim quase nunca é problema de escrita —
é problema de briefing aberto, onde o modelo preencheu a lacuna com o que
soava plausível.

## Os 8 inputs

Nenhum é opcional:

1. **Produto/oferta** — qual e-book, qual preço, o que entra.
2. **Público-alvo** — uma linha, concreta. "Mulher que anda sozinha na cidade"
   serve. "Pessoas que buscam segurança" não.
3. **Dores** — no vocabulário de quem sente, não no seu.
4. **Benefícios** — resultado observável, não adjetivo.
5. **Provas** — cada uma com origem.
6. **Objetivo da página** — venda, lead, cadastro ou afiliação. Um só.
7. **Nível de consciência** — os cinco da seção 3 do DNA.
8. **Fonte de tráfego** — calibra o nível.

Quando o formato for `afiliado` ou `plataforma`, colete também:

9. **Nível de marca** — produto (e-book) ou marca (plataforma). Presell de
   e-book é produto. Onboarding e programa de afiliados são marca.
10. **Fontes de conhecimento** — URLs de YouTube, GitHub, threads. Se
    existirem, o briefing não fecha até `afiliads-knowledge-scout` devolver o dossiê
    ou o usuário dizer que a fonte é só contexto, não prova.
11. **Regras de afiliado** — comissão, geo, canais permitidos/proibidos,
    tipo de presell. Sem isso, não escreva hop nem CTA de tráfego pago.

Para uma oportunidade low-ticket minerada, acrescente ao briefing: referência
observada, problema e subnicho, sinais de demanda, concorrência/saturação,
ângulo de modelagem, diferença original, entregável viável, demonstração
possível, preço observado como contexto e custos conhecidos. Use
`benchmark_externo` para números vindos de vídeos ou bibliotecas; eles não
podem virar claim do produto.

## Como coletar

Pergunte em **um bloco só**, não uma pergunta por vez. Ofereça o padrão quando
existir (tabela consciência × tráfego em `afiliads-content-director/references/`), e
marque no `briefing.json` o que foi suposto em vez de informado.

Se o usuário responder "não sei" para provas: registre em `fatos_pendentes` e
siga. O texto vai carregar `[FATO PENDENTE: ...]` visível. Isso é melhor que
travar a peça inteira e infinitamente melhor que inventar depoimento.

## O gate

Antes de emitir o briefing, rode:

```bash
python3 scripts/briefing.py --preset <preset> --check-facts
```

Ele falha com exit 1 quando `Fatos_Produto.md` está em estado template — sem
afirmação verificável nenhuma. Nesse estado a peça pode até ser escrita, mas
não pode citar número, prazo, depoimento ou credencial.

Por que travar em vez de avisar: aviso em texto é ignorado, exit code não é.
Mesmo padrão do `tokens.py` do lado visual, que falha quando o preset não
existe em vez de inventar uma paleta.

## Uso

```bash
# valida um briefing preenchido à mão
python3 scripts/briefing.py --in briefing.json

# gera esqueleto a partir do preset
python3 scripts/briefing.py --preset sair-ilesa --formato landing --scaffold

# só checa o estado dos fatos
python3 scripts/briefing.py --preset sair-ilesa --check-facts
```

Saída: `briefing.json` validado, ou erro apontando exatamente qual campo falta.

## Onde ele lê

- `brandkit/brand-voice.md` — presets, promessa, proibições.
- `docs/referencias/Fatos_Produto.md` — fatos.
- `docs/referencias/ICP_Personas.md` — público.

Nenhum desses é copiado para dentro da skill. Mudou lá, muda aqui.

## Saída para a próxima skill

`briefing.json` completo, com `variant_id` já atribuído e `fatos_pendentes`
explícito. `afiliads-content-landing` não começa sem isso.
