---
name: afiliads-offers
description: >-
  Estrutura ofertas de produtos próprios da marca com gates de briefing e
  claim ledger. Use ao definir promessa, composição, preço, bônus, garantia,
  ancoragem, objeções e CTA antes da copy de landing page em nível PRODUTO.
---

# Arquitetura de oferta

Crie a arquitetura comercial de um produto próprio sem preencher lacunas com
copy plausível. Esta skill planeja a oferta; não publica, não faz deploy e não
opera campanha.

## Escopo

- Trabalhe somente com produtos próprios da marca em
  `.`.
- Entregue arquitetura e copy-base da oferta, não uma landing page completa.
- Não use DNA, provas, métricas ou práticas de campanhas de afiliados externos.
- Não copie nem adapte skills externas; use somente os contratos locais citados.
- Não crie preço, desconto, prazo, promessa, garantia, bônus, depoimento,
  escassez, credencial ou comparação que não conste em fonte autorizada.
- Não altere contratos de origem. Registre lacunas como `PENDENTE`.

## Níveis obrigatoriamente separados

### MARCA

A marca-mãe é a infraestrutura. Neste nível, registre apenas:

- atribuição da marca;
- papel institucional comprovado;
- CTA institucional, se o pedido for explicitamente de nível MARCA.

Não use a plataforma como argumento de venda do e-book e não transfira claims
institucionais para o produto.

### PRODUTO

A oferta comercial de e-book, curso, sprint ou aplicação pertence a este
nível. Público, dor, transformação, mecanismo, provas, termos e CTA devem
referenciar o mesmo `produto.id` e `produto.versao`.

Por padrão, pedidos vindos de `afiliads-content-landing` são nível PRODUTO. Se o pedido
misturar os níveis, pare e marque a decisão como `PENDENTE`.

## Entradas obrigatórias

Leia antes de trabalhar:

1. briefing válido do produto — preferencialmente `product-brief.yaml`; um
   `briefing.json` é aceito se identificar produto, versão, público, dor,
   transformação, mecanismo, limites e fontes;
2. `claim-ledger.csv` do mesmo produto e versão;
3. `brandkit/brand-voice.md`;
4. contratos comerciais aprovados citados no briefing, quando existirem.

Se briefing ou claim ledger estiver ausente, inconsistente, em estado template
ou pertencer a outro produto/versão, não improvise. Produza somente um
diagnóstico de bloqueio nos dois arquivos de saída, com campos não comprovados
como `PENDENTE`.

## Gate de claims

Uma claim só pode entrar como afirmação final quando todos os critérios forem
verdadeiros:

- `status` é `verificado`;
- `forca_evidencia` não é `nenhuma`;
- `uso_copy_final` é `sim`;
- `canais_permitidos` inclui o canal solicitado;
- produto e versão coincidem com o briefing;
- fonte, validade, revisor humano e limite estão preenchidos;
- a formulação respeita literalmente o alcance e o limite da evidência.

Claims `a-verificar`, vencidas, conflitantes ou fora do canal viram
`PENDENTE`; nunca devem ser reescritas como certeza.

## Workflow

### 0. Triagem de oportunidade antes da arquitetura

Quando a oferta vier de mineração, benchmark ou modelagem, leia o dossiê de
conhecimento e preencha o scorecard de oportunidade. Registre anúncios e
anunciantes observados, idade aparente, saturação, entregável, distância da
referência, capacidade de demonstração e economia após custos. Os intervalos
vistos em vídeos ou ferramentas externas são hipóteses de priorização, não
prova de venda nem autorização para copiar.

Exija uma matriz de modelagem com: referência, ângulo original, público,
mecanismo, situação de uso, elementos proibidos de reutilizar e evidência de
que a nova oferta não depende da identidade, texto, criativos, depoimentos ou
assets de terceiros. Se a única diferença for trocar palavras ou aumentar a
quantidade, marque `BLOQUEADO_POR_DIFERENCIACAO_INSUFICIENTE`.

Descarte ou marque `PENDENTE` quando o entregável não puder ser produzido,
entregue, demonstrado ou suportado com qualidade. Para e-book, confirme que o
núcleo continua editorial; curso, serviço ou aplicação interativa exigem outra
decisão de formato.

### 1. Fechar o contexto

Extraia sem reinterpretar:

- produto, versão, formato e nível;
- público, contexto, dor urgente e nível de consciência;
- estado inicial, estado final, mecanismo, primeira vitória e limite;
- objetivo único e canal da oferta;
- fontes e aprovador humano.

Marque como `PENDENTE` qualquer item ausente.

### 2. Montar a matriz de evidência

Para cada elemento comercial, registre `source_refs`, status e limite:

- promessa principal;
- mecanismo;
- entregáveis;
- benefícios/resultados observáveis;
- prova;
- preço e condições;
- bônus;
- garantia;
- urgência ou escassez;
- tratamento de objeções;
- CTA.

Termos comerciais podem vir de contrato ou briefing aprovado. Afirmações
factuais e promessas precisam passar pelo claim ledger. Ausência de evidência
não autoriza estimativa.

### 3. Arquitetar sem completar lacunas

Defina:

1. **Promessa** — uma transformação específica, limitada e comprovável.
2. **Mecanismo** — como o produto ajuda, sem adjetivos vazios.
3. **Composição** — apenas entregáveis confirmados.
4. **Valor** — benefícios observáveis ligados a entregáveis e claims.
5. **Termos** — preço, pagamento, garantia e bônus somente se aprovados.
6. **Risco** — limites e para quem a oferta não serve.
7. **Objeções** — responda apenas com fatos disponíveis.
8. **CTA** — uma ação, consistente com o contrato do produto.

Não invente ancoragem. Sem preço anterior real e autorizado, use
`anchoring.status: PENDENTE`.

### 4. Produzir os artefatos

Crie exatamente:

- `offer-architecture.yaml` — contrato legível por máquina;
- `offer-copy.md` — copy-base do bloco de oferta para revisão humana.

Use [offer-architecture.template.yaml](offer-architecture.template.yaml) como
estrutura mínima. Preserve `PENDENTE` visível; não o esconda em texto fluido.

## Regras para `offer-copy.md`

Use esta ordem:

1. título com produto e versão;
2. status: `PRONTO_PARA_REVISAO` ou `BLOQUEADO_POR_PENDENCIAS`;
3. nível e objetivo único;
4. promessa aprovada ou `PENDENTE`;
5. o que entra;
6. como funciona;
7. resultados observáveis permitidos;
8. prova autorizada ou `PENDENTE`;
9. preço e condições ou `PENDENTE`;
10. bônus ou `PENDENTE`;
11. garantia ou `PENDENTE`;
12. objeções e respostas;
13. limites e não promessas;
14. CTA ou `PENDENTE`;
15. pendências e aprovações humanas;
16. referências: IDs de claims e fontes usadas.

Não transforme `PENDENTE` em frase persuasiva. Não escreva HTML nem a página
inteira; `afiliads-content-landing` consome este artefato para montar o bloco 7.

## Critério de prontidão

Use `PRONTO_PARA_REVISAO` somente quando:

- briefing e ledger forem válidos e compatíveis;
- promessa, entregáveis, termos, limites e CTA tiverem fonte;
- toda claim usada passar pelo gate;
- nenhuma pendência bloquear compreensão ou compra;
- um responsável humano estiver identificado para aprovação.

Isso não significa aprovado, publicado ou liberado para campanha. Registre
`human_approval: PENDENTE` até aprovação explícita.

## Restrições operacionais

- Não executar checkout, tracking, campanha, anúncio ou `campaign_guard`.
- Não publicar, enviar, commitar ou fazer deploy.
- Não criar bônus para aumentar valor percebido.
- Não propor garantia como padrão de mercado.
- Não inferir preço por faixa low-ticket.
- Não promover uma claim no ledger.
- Não declarar revisão humana que não ocorreu.

## Validação final

- [ ] Níveis MARCA e PRODUTO não foram misturados.
- [ ] Produto e versão coincidem em todas as fontes.
- [ ] Toda afirmação final aponta para claim ou contrato autorizado.
- [ ] Preço, garantia, bônus e ancoragem não foram inventados.
- [ ] Lacunas aparecem como `PENDENTE`.
- [ ] Há apenas um CTA.
- [ ] Os dois arquivos de saída foram criados.
- [ ] Aprovação humana continua explícita.
- [ ] Nenhuma publicação ou operação de campanha ocorreu.
