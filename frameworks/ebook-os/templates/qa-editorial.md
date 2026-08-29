# QA editorial — EBOOK-OS

Produto:  
Versão:  
Revisor:  
Data:

Use este checklist depois do rascunho factual e antes do design final. IA pode apontar risco; não aprova factualidade nem conteúdo sensível.

## Gates

- [ ] G0 — brief, responsável humano e fontes autorizadas existem
- [ ] F0 — `format-decision` classifica e-book sem capacidades interativas essenciais
- [ ] G2 — promessa específica, plausível e verificável; sem prova inventada
- [ ] G4 — nenhum capítulo existe só para dar volume
- [ ] G5 — cada claim relevante tem fonte ou está `a-verificar` / `nao-usar`

## Claims

- [ ] Ledger preenchido e validado (`validate_product.py`)
- [ ] Nenhuma claim de copy final com status diferente de `verificado`
- [ ] Nenhuma claim `nao-usar` aparece no texto
- [ ] Claims `a-verificar` viraram marcador `[FATO PENDENTE]`
- [ ] Número, prazo, credencial e depoimento citam origem e limite
- [ ] Benchmark não foi escrito como resultado próprio
- [ ] Claim de um produto não contaminou outro

## Capítulos

- [ ] Cada capítulo tem promessa local, conceito, exemplo e ação observável
- [ ] Cada capítulo tem artefato de ação e critério de conclusão
- [ ] Erro comum e recuperação estão escritos
- [ ] Dependências são reais; não há capítulo órfão necessário
- [ ] Instruções foram executadas por um humano no fluxo previsto

## Texto

- [ ] Português brasileiro com acentuação correta
- [ ] Nota mínima 8/10 nos sete critérios do playbook de copy
- [ ] Anti-slop: sem “estudos mostram”, pergunta retórica vazia ou prova sintética
- [ ] Leitura em voz alta sem tropeço grave
- [ ] Conteúdo sensível passou por revisor técnico nomeado no RACI

## Decisão

- [ ] Aprovar
- [ ] Corrigir e revalidar
- [ ] Bloquear publicação

Evidência do aceite (link, data, responsável):
