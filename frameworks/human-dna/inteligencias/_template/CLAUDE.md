# CLAUDE.md — {{BRAND_NAME}}

Este arquivo orienta o Claude Code a trabalhar com a marca **{{BRAND_NAME}}**.

Antes de criar, editar ou auditar qualquer peça desta marca, leia o arquivo inteiro:

```text
resultado/DNA.md
```

O `DNA.md` é a fonte da verdade. Ele define estilo visual, tom de voz, referências, anti-referências, ferramentas, workflow e critérios de qualidade. O `resultado/DNA.pdf` é a versão editorial apresentável. Este `CLAUDE.md` é só a camada operacional para o Claude Code.

---

## Resumo da marca

Preencha este bloco a partir do `DNA.md` quando o projeto for criado.

```text
Marca: {{BRAND_NAME}}
O que faz: {{BRAND_DOES}}
Promessa: {{BRAND_PROMISE}}
Estética: {{VISUAL_ANCHOR}}
Voz: {{VOICE_ANCHOR}}
Workflow: {{WORKFLOW_SUMMARY}}
```

## Como agir

1. Leia o `DNA.md` inteiro antes de responder.
2. Antes de criar, identifique qual seção do DNA controla o pedido: visual, voz, audiência, workflow, canal, imagem ou comportamento.
3. Use as regras do DNA para criar, revisar ou refinar peças.
4. Se o usuário pedir algo que contradiz o DNA, sinalize a tensão e proponha um caminho coerente.
5. Se o usuário aprovar uma mudança de estilo, voz ou workflow, atualize o `DNA.md`.
6. Depois de qualquer ajuste relevante, regenere `resultado/DNA.pdf`.
7. Depois de qualquer ajuste relevante, teste gerando uma nova versão curta.
8. Se o pedido envolver imagem ou vídeo real, siga a premissa do projeto: Higgsfield CLI como base principal.

---

## Regras rápidas da marca

Substitua os placeholders por síntese específica do DNA.

### Visual

```text
Paleta central: {{PALETTE_SUMMARY}}
Referências: {{VISUAL_REFERENCES}}
Anti-referências: {{VISUAL_ANTI_REFERENCES}}
Direção fotográfica: {{PHOTO_DIRECTION}}
```

### Voz

```text
A marca soa como: {{VOICE_DESCRIPTION}}
Usa: {{PREFERRED_WORDS}}
Evita: {{AVOIDED_WORDS}}
Nunca usar: {{FORBIDDEN_CONSTRUCTIONS}}
```

### Workflow

```text
Como uma peça nasce: {{WORKFLOW_STEPS}}
Ferramentas principais: {{TOOLS}}
Etapas com revisão humana: {{HUMAN_REVIEW_GATES}}
```

## Comandos naturais

O usuário pode pedir:

```text
crie um post seguindo meu DNA
escreva um email no tom da marca
audite esta peça contra o DNA
ajuste o tom para ficar menos formal
refine o DNA com este feedback
teste meu DNA com uma peça pequena
```

## Regra de teste

Quando o DNA for recém-criado, faça uma peça pequena para validar aderência:

- caption;
- email curto;
- bio;
- anúncio simples;
- ideia de post;
- prompt visual.

Depois pergunte o que ficou certo e o que ficou fora. Feedback aprovado vira ajuste no `DNA.md`.

## Regra de refino

Feedback não fica solto na conversa. Transforme feedback em regra.

Exemplos:

- "formal demais" -> ajustar régua de registro e exemplos de voz.
- "genérico" -> reforçar vocabulário próprio, anti-padrões e referências.
- "não parece a marca" -> revisar estética-âncora, exemplos aprovados e critérios de qualidade.
- "imagem fora do estilo" -> atualizar direção fotográfica e instruções de engine.

Depois do ajuste, gere uma segunda versão curta para provar a melhoria.

## Conclusão do Fluxo

Só considere o fluxo concluído se:

- `resultado/DNA.md` existe;
- `resultado/DNA.pdf` existe;
- este `CLAUDE.md` está personalizado;
- uma peça pequena foi testada;
- feedback foi aplicado ou o usuário confirmou aderência;
- o usuário sabe como pedir criação, auditoria e refino.
