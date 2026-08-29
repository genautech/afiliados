# Roteamento, briefing e telemetria — conteúdo

## Formato do briefing fechado

Emitido por `content-briefing/scripts/briefing.py`. Nenhuma skill escreve antes
de existir um `briefing.json` válido.

```json
{
  "preset": "sair-ilesa",
  "nivel_marca": "produto",
  "formato": "landing | ebook | bloco | anuncio | email | afiliado | plataforma",
  "objetivo": "venda | lead | cadastro | afiliacao",
  "cta": "Quero o e-book",
  "publico": "quem compra, em uma linha",
  "dores": ["dor 1", "dor 2", "dor 3"],
  "beneficios": ["resultado observável 1", "..."],
  "provas": ["afirmação + origem"],
  "nivel_consciencia": "inconsciente | problema | solucao | produto | mais-consciente",
  "fonte_trafego": "search | feed | remarketing | organico | email",
  "objecoes": ["objeção real 1", "..."],
  "variant_id": "sair-ilesa-lp-a1",
  "fatos_pendentes": [],
  "fontes_conhecimento": [],
  "afiliado": {
    "comissao_pct": null,
    "geo": "BR",
    "canais_permitidos": [],
    "canais_proibidos": [],
    "tipo_presell": "review | advertorial | quiz | vsl-bridge | nativo"
  }
}
```

`fatos_pendentes` não vazio é permitido — mas cada item vira um
`[FATO PENDENTE: ...]` visível no texto, nunca um número inventado.

## Os 8 inputs obrigatórios

O playbook de landing page exige estes, e `briefing.py` recusa sem eles:

1. Produto/oferta
2. Público-alvo
3. Dores
4. Benefícios
5. Provas
6. Objetivo da página
7. Nível de consciência
8. Fonte de tráfego

Faltando qualquer um: pergunte. Não infira. Inferir público-alvo é como o
sistema começa a escrever para ninguém.

## Consciência × tráfego — resolução

Quando o usuário informa fonte de tráfego mas não o nível, use o padrão e
declare a suposição no README:

| Fonte | Nível padrão |
|---|---|
| Search (termo de problema) | consciente do problema |
| Search (termo de marca/produto) | consciente do produto |
| Feed / Demand Gen | inconsciente ou consciente do problema |
| Remarketing | consciente do produto |
| E-mail para base própria | mais consciente |
| Orgânico / conteúdo | consciente do problema |

## Telemetria

```
<preset>-<formato>-<letra><n>
sair-ilesa-lp-a1     primeira versão da landing
sair-ilesa-lp-b2     segunda iteração do conceito B
sair-ilesa-ad-a1     anúncio derivado do conceito A
```

Onde grava:

- `data-variant` no `<body>` do HTML;
- parâmetro na URL do checkout;
- campo `variant_id` no `README.md` da entrega.

Quando houver campanha rodando, o mesmo `variant_id` amarra headline a receita
— mesmo padrão de `Presell.campaignId` no AfiliAds.

## Divisão de trabalho com as skills genéricas

| Faz | Quem |
|---|---|
| estrutura de hero, ordem de argumento, anatomia de objeção | `copywriting` |
| hierarquia de auditoria, atrito, sinais de confiança | `cro` |
| stack de oferta, garantia, ancoragem de preço | `offers` |
| idioma, voz do preset, 12 princípios | `content-voice` |
| anti-slop PT-BR, 7 parâmetros, teste da substituição | `content-qa` |
| fatos verificáveis, gate de template | `content-briefing` |
| YouTube, transcrição, GitHub, descrição de vídeo | `knowledge-scout` |
| funil low-ticket (landing + bump + e-mail + kit) | `ebook-funnel` |
| programa, tracking, comissão, portal do afiliado | `affiliate-platform` |

Se você se pegar explicando o que é uma boa headline, parou de dirigir e virou
redator. Delegue.

## Checklist de auditoria (modo AUDITORIA)

Ordem de impacto — não audite CSS antes de proposta de valor:

1. A proposta de valor é entendida em 5 segundos?
2. A headline fala da dor do leitor ou do produto?
3. O CTA é uma ação clara e única?
4. A hierarquia visual leva ao CTA?
5. Há prova específica ou só adjetivo?
6. As 3 objeções reais estão nomeadas?
7. Onde está o atrito (formulário, escolha, carregamento)?
8. `slopcheck.py` passa?

## Anti-patterns de processo

- Escrever antes do briefing fechado.
- Copiar a voz da plataforma para a página de um e-book (seção 1 do DNA).
- Vender a plataforma na landing do e-book, ou o e-book na landing da plataforma.
- Escrever copy de afiliado sem ler restrições de canal do produtor.
- Citar transcrição de YouTube sem URL, data e timestamp.
- Entregar só no chat, sem arquivo.
- Publicar sem gate humano.
- Rodar sobre campanha ativa sem passar pelo `campaign_guard.py`.
