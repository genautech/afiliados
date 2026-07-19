# Guia da Planilha de Controle (9 abas)

A planilha é o painel de controle da operação. Gere-a personalizada com `scripts/gerar_planilha.py`:

```
python3 scripts/gerar_planilha.py --comissao 97 --roas-meta 2.5 --moeda BRL -o planilha-afiliados.xlsx
```

Parâmetros: `--comissao` (comissão média por venda), `--roas-meta` (padrão 2.0), `--moeda` (BRL/USD/GBP/AUD), `--nicho` (opcional, rotula a planilha).

## Convenções (explicar SEMPRE ao entregar)

- **Células azuis** = o usuário preenche
- **Células pretas** = calculam sozinhas (não mexer)
- **Células amarelas** = metas ajustáveis

## As 9 abas e a ordem de uso

| # | Aba | O que faz | Quando usar |
|---|---|---|---|
| 1 | Leia-me | Convenções + ordem de uso | Primeiro contato |
| 2 | Nichos | Candidatos com score e adequação ao Google Ads | Escolher UM nicho (Fluxo 1) |
| 3 | Produtos e Programas | Ofertas candidatas: plataforma, comissão, modelo, status | Selecionar 1–2 ofertas |
| 4 | Palavras-chave | Banco por intenção, correspondência, CPC estimado vs. CPC real do Planejador | Antes de subir e ao expandir |
| 5 | Negativas | Lista-mestra para lista compartilhada | Antes do primeiro real gasto |
| 6 | Estrutura de Campanhas | Nomenclatura + árvore campanha/grupo/keyword + fase atual | Ao subir e ao revisar fases |
| 7 | Copy de Anúncios | Títulos/descrições com contador de caracteres automático (fórmula NÚM.CARACT com alerta de estouro) | Ao redigir/testar RSAs |
| 8 | Controle de Orçamento | Registro DIÁRIO: gasto, cliques, impressões, conversões → CTR, CPC, CPA e ROAS calculam sozinhos a partir da comissão média (célula de config) | Todo dia, 2 minutos |
| 9 | Métricas Semanais | Consolidação por semana com **status automático: ✔ ESCALAR / ⚙ OTIMIZAR / ✖ PAUSAR** comparando CPA×comissão e ROAS×meta | Toda segunda-feira |

## Fórmulas-chave (para explicar ou reproduzir)

- CTR = cliques ÷ impressões
- CPC = gasto ÷ cliques
- CPA = gasto ÷ conversões (se conversões=0, exibir "—" e o gasto acumulado vs. limite da regra do 3×)
- ROAS = (conversões × comissão média) ÷ gasto
- Breakeven CPA = comissão média (ROAS 1.0) · CPA-alvo = comissão ÷ ROAS-meta
- Status semanal: ROAS ≥ meta E amostra mínima → ✔ ESCALAR · ROAS entre 1.0 e meta → ⚙ OTIMIZAR · gasto ≥ 3× comissão com 0 conversões → ✖ PAUSAR/TROCAR OFERTA

## Ao entregar a planilha

1. Rodar o script com os parâmetros do usuário (nunca entregar com comissão genérica se ele informou a dele)
2. Explicar as convenções de cores e a rotina: diário na aba 8, segunda-feira na aba 9
3. Lembrar: CPCs/comissões da planilha são estimativas de planejamento — validar no Planejador e na plataforma
