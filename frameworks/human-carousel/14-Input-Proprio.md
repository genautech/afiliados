# 14 — Carrossel a partir de tema ou conteúdo próprio

Este modo existe para quando a pessoa não quer esperar o feed de notícias. Ela pode pedir de forma simples:

```text
/carrossel quero um carrossel sobre bicicletas elétricas em São Paulo
```

ou colar um texto, uma ideia, um briefing curto, uma transcrição, uma notícia avulsa, um post longo ou um rascunho. O agente não deve exigir que a pessoa saiba estruturar o carrossel. O trabalho do sistema é pesquisar, enquadrar, organizar e transformar a ideia em uma peça pronta.

---

## Quando ativar

Ative este modo quando o pedido:

- trouxer um tema simples;
- colar um conteúdo próprio;
- pedir carrossel sem mencionar News Feed, R1, R2 ou notícia específica;
- disser "quero falar sobre", "faz um carrossel sobre", "transforma isso em carrossel";
- pedir uma peça pontual fora da rotina diária.

Se o pedido for troca de notícia, re-render, slide específico ou rotina automática, use `15-Como-usar.md`.

---

## Regra principal

Entrada simples não é briefing fraco. Entrada simples é sinal de que o agente precisa fazer o trabalho pesado.

Com uma frase curta, o agente deve:

1. entender o assunto;
2. pesquisar contexto atual;
3. separar dado de opinião;
4. encontrar tensão humana ou cultural;
5. escolher o melhor ângulo;
6. criar headline forte;
7. montar a arquitetura narrativa de 9 slides;
8. sugerir visual por slide;
9. renderizar ou preparar para render.

Pergunte só se faltar algo que bloqueia a execução, como marca/projeto ativo ou público obrigatório. Não pergunte "qual ângulo você quer?" quando o próprio sistema pode descobrir.

---

## Pipeline interno

Use estes papéis, mesmo que eles não apareçam para o usuário:

| Papel | Função neste modo |
|---|---|
| Scout | Pesquisa o tema, tendências, dados recentes, exemplos e contraexemplos. |
| Creative Director | Escolhe a tensão, a big idea e o enquadramento editorial. |
| Scriptwriter | Escreve headline, slides e legenda. |
| Art Director | Define direção visual, metáfora e imagem por slide. |
| Producer | Organiza o que precisa ser renderizado e salva o estado local. |
| Social Manager | Fecha caption, CTA, formato e status para publicação. |

O usuário vê uma entrega simples. A complexidade fica nos bastidores.

---

## Fluxo para tema curto

Exemplo de entrada:

```text
/carrossel quero um carrossel sobre bicicletas elétricas em São Paulo
```

Execute:

1. **Clarifique silenciosamente o escopo provável.**
   - Tema: bicicletas elétricas.
   - Recorte local: São Paulo.
   - Possíveis tensões: mobilidade, custo, segurança, trânsito, legislação, entregadores, ciclovias, roubo, sustentabilidade.

2. **Pesquise antes de escrever.**
   - Busque fontes recentes e confiáveis.
   - Procure dados locais quando houver.
   - Procure sinais de comportamento real: reclamações, debates, tendências, dúvidas.
   - Se não houver dado recente suficiente, declare isso na lógica interna e use ângulo mais conceitual.

3. **Escolha um ângulo vencedor.**
   O ângulo precisa ser mais específico que o tema.

   Ruim:
   ```text
   Bicicletas elétricas estão crescendo em São Paulo.
   ```

   Melhor:
   ```text
   A bicicleta elétrica virou uma resposta prática para uma cidade que ficou cara, travada e impaciente.
   ```

4. **Monte a estrutura de 9 slides.**
   - Slide 1: headline com tensão.
   - Slides 2-3: problema ou mudança cultural.
   - Slides 4-6: explicação, evidência, mecanismo.
   - Slides 7-8: consequência prática ou novo comportamento.
   - Slide 9: assinatura de marca com logo/nome em destaque e CTA curto.

5. **Gere a legenda.**
   A legenda deve contextualizar, não repetir os slides.

6. **Crie direção visual.**
   Cada slide precisa ter uma função visual. Não usar imagem genérica.

7. **Se houver ambiente configurado**, seguir para render com o motor visual do projeto.
   Se não houver, entregar copy + plano visual e orientar setup.

---

## Fluxo para conteúdo colado

Quando a pessoa colar um texto, não resuma mecanicamente. Primeiro encontre:

- tese central;
- tensão mais interessante;
- partes repetidas;
- pontos que viram slide;
- dados que precisam ser verificados;
- frases fortes que podem virar headline;
- lacunas que precisam de pesquisa complementar.

Depois transforme em:

- headline;
- arquitetura narrativa de 9 slides;
- legenda;
- direção visual;
- checklist de render.

---

## Saída mínima sem render

Quando ainda não existe setup de marca, Notion, Drive ou Higgsfield, entregue:

```text
Headline:

Slides:
1. ...
2. ...
...
9. ...

Legenda:

Direção visual:
- Slide 1:
- Slide 2:
...

Checklist para render:
- formato 3:4 via Higgsfield (`--aspect_ratio "3:4"` + `--resolution "2k"`), mantendo o PNG original baixado sem normalizar/cortar;
- 9 slides;
- paleta;
- tipografia;
- imagens/metáforas por slide;
- capa como referência mestre + refs visuais em todos os slides internos;
- sem número de slide visível;
- CTA final.
```

Não bloqueie a criação só porque a automação visual ainda não está configurada.

---

## Integração com a Routine Local

Quando a R2 estiver configurada, ela deve aceitar uma primeira mensagem em linguagem natural.

Exemplos:

```text
quero um carrossel sobre bicicletas elétricas em São Paulo
```

```text
transforma este texto em carrossel: [texto colado]
```

```text
--tema="Claude Opus 4.7 e o impacto para times criativos"
```

Nesses casos, a Routine cria uma pauta manual do dia e pula a dependência do News Feed. O restante do pipeline continua igual: pesquisa, headline, arquitetura narrativa, visual brief, render, Drive e Notion.

---

## Critérios de qualidade

Um carrossel por input próprio só está bom se:

- não parece resumo escolar;
- tem ângulo específico;
- tem tensão ou descoberta;
- cada slide avança a ideia;
- a headline promete algo que os slides entregam;
- a legenda complementa;
- o visual ajuda a entender, não só decora;
- o CTA fecha com ação clara e o último slide preserva a marca como protagonista;
- qualquer dado factual importante foi verificado.
