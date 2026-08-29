# Briefing, auditoria e telemetria

## Formato do briefing fechado

```json
{
  "produto": "sair-ilesa",
  "preset": "sair-ilesa",
  "entregavel": "capa | ilustracao | miolo | interativo | mockup | cta",
  "formato": "1600x2560 | A4 | 1080x1350 | pagina",
  "promessa": "frase única que o e-book entrega",
  "publico": "quem compra, em uma linha",
  "referencia_visual": "url/arquivo ou 'nenhuma'",
  "conceito_escolhido": "resumo em uma frase",
  "variant_id": "sair-ilesa-capa-a1",
  "restricoes": ["sem foto de pessoa", "..."]
}
```

Campos ausentes usam default: `formato` = default do entregável,
`referencia_visual` = nenhuma, `restricoes` = seção 4 do DNA.

## Dimensões por entregável

| Entregável | Dimensão | Observação |
|---|---|---|
| Capa (checkout/thumb) | 1600×2560 (5:8) | Legível a 300px de altura |
| Capa quadrada (social) | 1080×1080 | Recorte, não redesenho |
| Mockup para página de vendas | 1600×1200, fundo transparente | PNG |
| Abridor de capítulo | 1600×900 | Sangra na largura da coluna |
| Ilustração inline | 1200×800 | Ou SVG, quando for diagrama |
| Ícone / sprite | SVG | Nunca PNG |
| Miolo PDF | A4 ou 6×9in | 6×9 para KDP |

## Auditoria — rodar antes de entregar

- [ ] Todas as cores saem dos tokens do preset
- [ ] `--font-heading` nos títulos, `--font-body` no corpo, sem terceira fonte
- [ ] Título da capa legível a 300px de altura (testar reduzindo)
- [ ] Nenhum texto renderizado pelo modelo de imagem
- [ ] Acentuação correta em 100% do texto visível
- [ ] Nenhum item da seção 4 do DNA presente
- [ ] Contraste do texto sobre fundo ≥ 4.5:1
- [ ] Em interativo: funciona em 375px de largura, sem depender de hover
- [ ] `brief.json` gravado ao lado do entregável

## Telemetria

Cada peça carrega `variant_id` no `brief.json` e no nome do arquivo. Quando a
peça for para uma página de vendas ou checkout, o mesmo `variant_id` vai como
parâmetro na URL do CTA, para amarrar arte a venda.

Mesmo padrão já usado em `~/afiliados/afiliads_app` com `Presell.campaignId`.
Sem isso, não existe forma de saber qual capa vende — e capa é a variável de
maior impacto num produto low-ticket.
