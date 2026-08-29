# Exemplos do EBOOK-OS

Os exemplos são **fixtures do validador**, não produtos comerciais e não
são as 29 missões faltantes do OPERADOR.

## `valid/`

E-book operacional interno: *Classificar o formato antes de escrever*.

Claims usadas aqui são só fatos já estabelecidos na análise de 15/08/2026
e na matriz gerada em 10/08/2026:

- OPERADOR é curso interativo, não e-book;
- o site observado tinha 14 aulas e 4 módulos;
- a matriz local está 1/30, sem aprovação nem publicação;
- `campaign_guard.py OPERADOR` retornou exit 2;
- os áudios não comprovam venda, demanda ou conversão.

O experiment card permanece `inconclusivo` porque `dados/proprio/` está vazio.

## `invalid/`

Cada pasta copia o fixture válido e quebra um contrato:

| Pasta | Falha esperada |
|---|---|
| `claim-nao-verificado` | copy final com status `a-verificar` |
| `formato-ebook-incompativel` | `ebook` com capacidades interativas essenciais |
| `capitulo-incompleto` | capítulo sem ação observável nem critério |
| `raci-incompleto` | atividade sem responsável e sem aprovador |
| `fonte-sem-limite` | fonte autorizada sem o que ela não prova |
| `dossie-sem-ancora` | overlay: claim sem âncora |
| `afiliado-sem-hop` | overlay: programa sem hop |
| `lottie-em-pdf` | overlay: Lottie em superfície PDF |

Os três overlays de dossiê/afiliado/motion não são produtos completos.
Os testes copiam `valid/` e aplicam o arquivo extra. `optional-valid/`
é o overlay que deve passar.

O exemplo de formato inválido usa sinais do OPERADOR só para demonstrar o
gate. Ele **não** reclassifica o curso vivo nem preenche missões.

```bash
python3 ../scripts/validate_product.py valid
python3 ../scripts/validate_product.py invalid/claim-nao-verificado
```
