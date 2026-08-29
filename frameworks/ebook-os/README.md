# EBOOK-OS

Sistema operacional da fábrica de e-books low-ticket. Converte o framework
estratégico em contratos executáveis: schemas, templates, validador e QA.

Este pacote **não escreve um e-book comercial**. Ele impede a fábrica de
começar pelo outline, pela capa ou pela campanha.

## O que isto resolve

A análise de 15/08/2026 mostrou três produtos misturados:

1. site vivo do OPERADOR — 14 aulas e 4 módulos;
2. estratégia local — jornada de 30 dias;
3. fábrica da marca — e-books low-ticket.

OPERADOR é curso/aplicação interativa, não e-book. A matriz local está 1/30.
Não há dado próprio de venda. `campaign_guard.py OPERADOR` retornou exit 2.

## Uso

```bash
python3 frameworks/ebook-os/scripts/validate_product.py \
  frameworks/ebook-os/examples/valid
```

Copie `templates/` para o diretório do produto, preencha e valide. O
placeholder `[preencher]` é recusado de propósito: template não é produto.

```bash
python3 -m unittest discover -s frameworks/ebook-os/tests -v
```

## Contratos

| Artefato | Função |
|---|---|
| `product-brief.yaml` | Constituição: público, dor, transformação, responsável, fontes |
| `format-decision.yaml` | Gate F0: ebook, sprint, curso, aplicação ou inconclusivo |
| `claim-ledger.csv` | Cada afirmação com origem, limite e status |
| `editorial-matrix.csv` | Capítulo com ação observável e critério de conclusão |
| `experiment-card.yaml` | Hipótese, dado próprio, benchmark e resultado |
| `production-raci.yaml` | Responsável e aprovador por atividade crítica |
| `qa-editorial.md` / `qa-visual.md` | Aceite humano |
| `knowledge-dossier.yaml` | Opcional: dossiê com âncora por claim |
| `affiliate-program.yaml` | Opcional: hop, UTM e gates do programa próprio |
| `motion-brief.yaml` | Opcional: motor × superfície; Lottie/GSAP só em página |

O validador só cobra os três opcionais se o arquivo existir. Dossiê sem
âncora, afiliado sem hop e Lottie em PDF são falhas bloqueantes.

Somente claim `verificado` com evidência diferente de `nenhuma` entra em uso operacional. `canais_permitidos` usa valores reais (`produto`, `landing-page`, `organico`, `email`, `anuncio-pago`, `interno` ou `nenhum`); `uso_copy_final` controla o estágio, não o canal. A fonte da claim e de cada capítulo precisa constar em `product-brief.fontes_autorizadas`. Claims, capítulos e demais contratos precisam referenciar o mesmo `produto.id` e `versao`. Qualquer capacidade interativa essencial ativa no núcleo bloqueia a classificação `ebook`. Responsáveis humanos e papéis do RACI não podem ser agentes de IA; atividades de risco exigem executor e aprovador distintos. Sem arquivo real sob `dados/proprio/`, o experimento não pode declarar dado próprio nem adotar/rejeitar hipótese. Benchmark não declara vitória.

## Agentes integrados

Os contratos são consumidos pelos agentes canônicos no vault a marca:

- `Agentes/analista-mercado.agent.md` — coleta origem e propõe claims pendentes;
- `Agentes/fact-steward.agent.md` — governa promoção factual com revisor humano;
- `Agentes/copywriter-ebook.agent.md` — só usa claims autorizadas do produto/versão;
- `Agentes/estrategista-lancamento-lowticket.agent.md` — separa orgânico de campanha e falha fechado no campaign guard.
- `Agentes/analista-mercado.agent.md` — aceita dossiê do `knowledge-scout`; YouTube/GitHub nunca em `dados/proprio/`.
- Skills Hermes `oferta-lowticket-generator` e `estrategista-trafego-lowticket` — adendo de preflight, `format-decision` e `campaign_guard`.

Os contratos textuais são testados por `tests/test_agent_contracts.py`. O workflow canônico está em `Playbooks/Producao/Workflow_Criacao_Ebooks.md`.

## Regras duras

- Não inventar fatos, métricas, depoimentos ou número de alunos.
- Não preencher as 29 missões faltantes do OPERADOR sem fonte.
- Não alterar `operador-course/conteudo/matriz.md`; ele é gerado.
- Não executar campanha paga até existir `campaign_id` e o gate retornar 0.
- Não commitar, publicar ou fazer deploy sem autorização explícita.

## Dependência

O validador usa a biblioteca padrão e o PyYAML já instalado no ambiente
(6.0.3 na máquina desta implementação). Nenhuma dependência nova foi
adicionada ao `package.json` nem a um `requirements.txt`.

A validação de JSON Schema é um subconjunto local (tipo, required,
properties, additionalProperties, enum, const, minLength, pattern,
minimum, minItems, items, `$ref` em `$defs`). Não usamos `jsonschema`.

## Fontes

- `docs/exemplos/analise-estrategica-exemplo.md`
- `frameworks/ebook-os/README.md`
- `CURSOR_HANDOFF_EBOOKS.md`
