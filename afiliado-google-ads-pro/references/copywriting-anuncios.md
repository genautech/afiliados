# Copywriting de Anúncios (RSA)

## Anatomia do RSA

- **Títulos:** até 15, máximo **30 caracteres** cada (espaços contam). Entregar sempre os 15.
- **Descrições:** até 4, máximo **90 caracteres** cada.
- **Caminhos de exibição:** 2 × 15 caracteres (ex.: `/guia`, `/oficial`).
- Google combina dinamicamente → cada título precisa fazer sentido com qualquer outro. Nada de frases que dependem de ordem.
- **Fixação (pinning):** fixe no máximo 1–2 títulos (a keyword principal na posição 1 quando a relevância importa mais que o volume de combinações). Fixar demais derruba a classificação de qualidade do anúncio.
- **Validação obrigatória:** todo conjunto passa por `scripts/validar_copy.py` antes de ser entregue.

## Distribuição dos 15 títulos por ângulo

| Qtd | Ângulo | Fórmula | Exemplo (30c) |
|---|---|---|---|
| 3 | Keyword/relevância | [Keyword] + qualificador | "Curso de Inglês Online" |
| 3 | Benefício | Verbo + resultado desejado (sem promessa) | "Aprenda no Seu Ritmo" |
| 2 | Curiosidade | Pergunta/lacuna | "Por Que Métodos Falham?" |
| 2 | Prova/autoridade | Número social ou credencial real | "+10.000 Alunos Formados"* |
| 2 | Quebra de objeção | Preço/tempo/dificuldade | "Só 15 Minutos por Dia" |
| 2 | CTA | Ação + baixa fricção | "Veja a Aula Grátis" |
| 1 | Urgência VERDADEIRA | Só se real | "Turma Fecha em Março" |

*Números de prova: só os reais da oferta (pegar da página do produtor). Inventar prova = violação ética e de política.

Descrições (4): 1 = problema→solução; 2 = como funciona/entregáveis; 3 = prova + diferencial; 4 = CTA + garantia real da oferta.

## Regras de estilo

- Capitalização Inicial Em Cada Palavra (padrão que performa em PT e EN); nunca CAIXA ALTA integral
- Sem exclamação em títulos (política); máximo 1 por descrição
- Número > palavra ("7 Técnicas" > "Sete Técnicas")
- Espelhar a keyword do grupo em ≥3 títulos (relevância = QS = CPC menor)
- Filtro final: cada linha passa no compliance-google.md (sem promessa, prazo, "garantido", termos médicos)

## Transcriação PT ↔ EN (mercado internacional)

Não traduza — reescreva para o padrão de busca local:
- BR busca "curso de X" / "X funciona?" · EUA busca "best X", "X review", "X for beginners"
- EN é mais curto: sobra espaço nos 30c — use para especificidade ("Best AI Tool for Writers")
- Prova social em número absoluto funciona nos dois; "guarantee" nos EUA refere-se ao reembolso (money-back), nunca a resultado
- UK/AU: grafia local (optimise, enrolment); evitar gírias americanas
- Ângulo cultural: EUA responde a eficiência/tempo; UK a valor/ceticismo informado; AU a praticidade e tom direto

## Processo (Fluxo 3)

1. Receber: produto, keyword principal do grupo, público, diferencial real, provas reais, garantia
2. Redigir 15+4 pela distribuição acima
3. Rodar `validar_copy.py` → corrigir estouros e termos de risco
4. Entregar em tabela com contagem de caracteres por linha + sugestão de fixação + os 2 caminhos de exibição
5. Sempre gerar de forma que sirva para colar direto no editor do Google Ads
