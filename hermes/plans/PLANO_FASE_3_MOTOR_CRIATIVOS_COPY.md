# 🏗️ Plano de Execução — Fase 3: Motor de Geração de Criativos & Copy (AfiliAds)

> **Status:** Pronto para Delegação (Fase 3)  
> **Orquestração:** Hermes Agent  
> **Atores:** Codex (Backend, LLM Routing & Compliance), Claude (UI/UX, Ad Previews & Interactive Step)  
> **Foco:** Transformar as dores estruturadas do Reddit e Google Autocomplete em ângulos de vendas altamente persuasivos e 100% complacentes.

---

## 📡 1. Escopo do Codex (Backend, IA & Compliance Gates)

O Codex atuará na camada de infraestrutura e serviços, criando as rotas de geração inteligente e os mecanismos de segurança:

### A. Rota Unificada: `/api/creatives/generate`
*   **Input:** 
    ```ts
    {
      campaignId: string;
      productType: 'AFFILIATE' | 'PROPRIETARY_LOW_TICKET' | 'MENTORSHIP';
      productName: string;
      productNiche: string;
      intentQueries: string[]; // Respostas do Autocomplete
      competitorDores: string[]; // Extraídas do Reddit/Ad Scout
      tone: 'critical' | 'scientific' | 'alert' | 'challenge';
    }
    ```
*   **Prompt Engineering Dinâmico (Hallmark Principle):**
    *   Injetar as dores reais coletadas para que a IA não invente depoimentos.
    *   Instruir o LLM a desenhar a copy em torno da **objeção real** (ex: se o Autocomplete detectou "diet caps reclame aqui", a copy foca em "Por que as pessoas reclamam das imitações de Diet Caps?").
*   **Roteamento Eficiente de Custos:**
    *   Geração de Texto: Usar OpenRouter com modelos custo-benefício (e.g., `google/gemini-2.5-flash` ou `meta-llama/llama-3-8b-instruct`) via serviço `lib/llm.ts`.

### B. Compliance Sentinel & Mutation Guard (Filtro Severo)
*   **Validador de Claims:** Criar `lib/validators/complianceValidator.ts`.
*   Passar a cópia gerada por uma varredura heurística contra padrões proibidos:
    *   *Gatilhos de Mentira:* Preços fictícios com "de R$999 por R$29", promessas de emagrecimento rápido sem esforço, ou curas definitivas.
    *   *Nível de Risco:* Retornar `riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'` e apontar a linha exata.
    *   *Kill Switch:* Se o risco for `HIGH`, a API rejeita a cópia e solicita automaticamente regeneração de segurança antes de expor para a UI.

---

## 🎨 2. Escopo do Claude (UI/UX, Ad Previews & Passo 4)

O Claude desenhará uma experiência de usuário imersiva, limpa e responsiva sob o padrão de design do **Originkit/Vercel (Dark-theme)**:

### A. Componente: `app/(app)/wizard/_components/step-creative-gen.tsx`
*   **Seletor de Ângulo & Tom:** Grid de cards táteis com efeitos de hover em esmeralda/azul cobalto para o usuário escolher a estratégia (e.g., "Alerta de Fraude", "Fórmula Científica", "Depoimento Sóbrio").
*   **Live Ad Preview Pane:**
    *   Desenhar mockups realistas e interativos de mock-posts do **Facebook Feed** e **Google Search Ads**.
    *   Atualizar dinamicamente os textos de headline, descrição e imagem de fundo conforme o usuário edita ou regenera os blocos de texto.
*   **Validador de Risco Visual:**
    *   Mostrar um banner sutil de pontuação de conformidade com IA (e.g., "Score de Compliance: 98%").
    *   Se houver um claim de risco médio, sublinhá-lo na tela em amarelo com um popover explicativo para que o usuário possa reescrever.

---

## 🚦 3. Matriz de Atribuição e Handoff

```
[Google Autocomplete] 
       │ (115 sugestões práticas)
       ▼
[Codex: /api/creatives/generate] ───► [Compliance Sentinel (Regex/LLM Gate)]
       │                                     │
       ▼ (Cópia Limpa e Score de Risco)     ▼ (Filtra alegações de cura)
[Claude: step-creative-gen.tsx] ◄───────────┘
       │
       ▼ (Live Preview editável no Facebook/Google Feed)
[Lançamento da Campanha (Fase 5)]
```

---

## 🧪 4. Critérios de Aceitação & Testes (Harness)
1.  **Geração Verde:** `vitest` validando que a rota de geração retorna estruturas JSON rígidas e válidas.
2.  **Compliance Sentinel Test:** Criar testes unitários que injetem frases maliciosas (ex: "cure sua diabetes em 2 dias") e verificar se o validador rebaixa a nota e retorna nível de risco `HIGH`.
3.  **TSX Compile:** Compilação limpa sem erros de união de união JSX em `step-creative-gen.tsx`.
