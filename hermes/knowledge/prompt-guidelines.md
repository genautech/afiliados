# Hermes Agent Prompt Guidelines

Este documento contém diretrizes e melhores práticas para a criação e otimização de prompts para os diversos Large Language Models (LLMs) utilizados pelos agentes Hermes no projeto AfiliAds. O objetivo é maximizar a qualidade das respostas, otimizar o uso de tokens e garantir a consistência.

## Princípios Gerais de Prompting

1.  **Clareza e Especificidade:** Seja o mais claro e específico possível em suas instruções. Evite ambiguidades.
    *   **Ruim:** "Escreva algo sobre produtos." 
    *   **Bom:** "Gere 5 títulos persuasivos para um anúncio de Google Ads sobre um produto de emagrecimento chamado 'FemiCore', focando em benefícios rápidos e usando uma linguagem direta para o público feminino entre 30 e 50 anos."

2.  **Contexto Completo:** Forneça todo o contexto relevante que o LLM precisa para entender a tarefa, incluindo persona (se aplicável), dados de entrada, e o objetivo final.

3.  **Formato de Saída:** Especifique o formato da saída desejada (JSON, Markdown, lista, parágrafo, etc.). Use exemplos se necessário.
    *   **Exemplo:** "A saída deve ser um objeto JSON com as chaves `titulo`, `descricao` e `palavras_chave`."

4.  **Instruções Negativas:** Diga ao LLM o que *não* fazer. Isso pode ser tão importante quanto dizer o que fazer.
    *   **Exemplo:** "Não inclua termos como 'milagre', 'cura' ou 'garantido'."

5.  **Pensamento em Cadeia (Chain-of-Thought):** Para tarefas complexas, instrua o LLM a pensar passo a passo. Isso melhora a qualidade do raciocínio e a rastreabilidade.
    *   **Exemplo:** "Pense passo a passo. Primeiro, identifique os 3 principais benefícios do produto. Segundo, adapte cada benefício para o público-alvo. Terceiro, formate a resposta final em JSON."

6.  **Restrições e Limites:** Indique limites de palavras, caracteres, número de itens, etc.
    *   **Exemplo:** "O título deve ter no máximo 30 caracteres."

7.  **Iteração e Refinamento:** Se a primeira saída não for satisfatória, não hesite em refinar o prompt com base nos erros do LLM.

## Otimização para Modelos Kimi Code

Modelos Kimi Code são otimizados para tarefas de programação, estrutura e extração de dados com alta precisão. Ao usar Kimi:

*   **Para Geração de Código/Estrutura:** Seja explícito sobre a linguagem (TypeScript, HTML, JSON), a estrutura de dados esperada e as interfaces/schemas.
*   **Contexto de Código:** Inclua trechos de código relevantes, schemas Zod ou tipos TypeScript para guiar a saída.
*   **Validação:** Kimi é excelente em seguir regras. Se a saída precisar passar por validação (ex: um Zod schema), instrua o Kimi a *gerar uma saída que passe na validação*.
    *   **Exemplo:** "Gere um objeto JSON que seja compatível com o seguinte schema Zod: `[Seu Schema Zod Aqui]`"
*   **Controle de Detalhe (`reasoning_effort`):** No `callAgent` (que Kimi usa), o `reasoning_effort` pode ser ajustado. Para saídas JSON curtas e diretas, `low` pode ser mais eficiente e evitar consumo excessivo de tokens. Para raciocínio mais complexo ou correção de erros, `max` pode ser preferível. (Esta configuração é interna ao `callAgent` e não diretamente no prompt).

## Fallback e Resiliência

Lembre-se que o sistema de orquestração tenta provedores alternativos em caso de falha. Ao projetar prompts:

*   **Prompts Agnósticos:** Tente escrever prompts que funcionem bem com múltiplos LLMs, para que o fallback seja mais eficaz.
*   **Robustez de Saída:** Desenvolva a lógica downstream (parsing da resposta do LLM) para ser robusta a pequenas variações ou erros que podem surgir de diferentes modelos.

---

**Autores:** Equipe Hermes Agent / AfiliAds
**Data:** 2026-08-01
