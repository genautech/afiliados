# Wireframe: Seletor de Tipo de Página no Wizard (Passo 4 — Pré-sell)

## Objetivo
Permitir que o usuário escolha qual tipo de página usar entre o anúncio do Google e a página de vendas do produtor, com base na classificação ensinada no aulão do Thiago Laprovitera.

## Local no app
`app/(app)/wizard/page.tsx`, dentro do **Passo 4 — Pré-sell**, antes ou substituindo o seletor atual `pageType` (`advertorial | pogo | vsl | interstitial | authority`).

## Enum proposto

```ts
export type LandingPageType =
  | 'vsl'           // VSL (Video Sales Letter)
  | 'tsl'           // TSL (Text Sales Letter)
  | 'cookie_popup'  // Página de Cookie / Popup
  | 'review'        // Review / Robusta
  | 'advertorial'   // manter compatibilidade
  | 'pogo'          // manter compatibilidade
  | 'authority'     // manter compatibilidade
  | 'interstitial'; // manter compatibilidade (YouTube/DGen only)
```

> A ideia é **mapear** os tipos novos para os templates existentes quando possível:
> - `review` → pode reutilizar/adaptar template `advertorial` e `authority`
> - `cookie_popup` → novo template simples
> - `tsl` → novo template de texto longo com CTAs
> - `vsl` → já existe

---

## Layout sugerido (4 cards em grid)

```
┌─────────────────────────────────────────────────────────────────┐
│  Passo 4 — Pré-sell                                             │
│  Escolha o tipo de página que será usada como destino do anúncio│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────┐│
│  │   🎬 VSL     │  │   📄 TSL     │  │  🍪 Cookie   │  │  ⭐   ││
│  │              │  │              │  │   / Popup    │  │ Review││
│  │ Vídeo como   │  │ Texto longo  │  │ Marca cookie │  │ Artigo││
│  │ protagonista │  │ com CTAs     │  │ e redireciona│  │ review││
│  │              │  │              │  │              │  │ robust││
│  │ [Selecionar] │  │ [Selecionar] │  │ [Selecionar] │  │ [...] ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────┘│
│                                                                 │
│  Tipo selecionado: Cookie / Popup                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️  Recomendação do agente                              │   │
│  │ Para iniciantes no mercado internacional, o formato     │   │
│  │ Cookie/Popup é o mais usado porque é rápido de criar    │   │
│  │ e funciona bem para produtos com marca já pesquisada.   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Configurações do tipo]                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ URL do HopLink de afiliado *                            │   │
│  │ [https://...hoplink...                                ] │   │
│  │ ✅ Detectado: HopLink ClickBank                         │   │
│  │                                                         │   │
│  │ URL da página oficial (opcional)                        │   │
│  │ [https://...                                          ] │   │
│  │                                                         │   │
│  │ Redirecionamento automático após cookie? [x]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Gerar template]  [Preview]  [Analisar com IA]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Regras de UI/UX

1. **Cards clicáveis** com ícone, título curto, descrição de 1 linha e badge de recomendação por perfil.
2. **Recomendação contextual:**
   - Se `funnel === 'DIRECT'` → alerta vermelho: "Direct link é bloqueado no Google Ads para a maioria das ofertas internacionais. Use uma página própria."
   - Se `channel === 'SEARCH'` → desabilitar `interstitial` (já existe essa lógica).
   - Se `experienceLevel === 'beginner'` → destacar `cookie_popup`.
   - Se `experienceLevel === 'advanced'` → destacar `review`.
3. **Validador de HopLink:**
   - Ao colar a URL, detectar se é um hop link válido da plataforma selecionada.
   - Se parecer URL de página final do produtor, mostrar aviso amarelo: "Essa URL parece ser da página do produtor, não do seu link de afiliado. Seu HopLink normalmente vem do botão 'Promote' na plataforma."
4. **Preview:** iframe ou visualização textual do template escolhido.
5. **Análise IA:** manter botão existente, mas adaptar os critérios por tipo de página.

---

## Estados do componente

```ts
interface PageTypeSelectorState {
  selectedType: LandingPageType;
  hopLink: string;
  officialPageUrl?: string;
  autoRedirect: boolean;
  validation: 'idle' | 'valid' | 'invalid' | 'warning';
  validationMessage?: string;
}
```

---

## Integração com checklist

Adicionar itens ao `BRIDGE_CHECKLIST` em `lib/wizard-data.ts`:

```ts
{ key: 'hoplink_valido', label: 'Link de afiliado (HopLink) válido identificado', critical: true, verificationType: 'auto' as const },
{ key: 'tipo_pagina_escolhido', label: 'Tipo de página de destino escolhido (VSL/TSL/Cookie/Review)', critical: true, verificationType: 'self_attested' as const },
{ key: 'pagina_oficial_diferente_hoplink', label: 'URL da página oficial não confundida com link de afiliado', critical: true, verificationType: 'auto' as const },
```

---

## Próximos passos técnicos

1. Expandir enum `pageType` no schema Prisma e nos tipos TypeScript.
2. Criar componente `PageTypeSelector` em `components/wizard/PageTypeSelector.tsx`.
3. Criar templates `COOKIE_POPUP_TEMPLATE` e `TSL_TEMPLATE` em `lib/wizard-data.ts`.
4. Implementar validador de HopLink em `lib/affiliate-link-validator.ts`.
5. Atualizar `complianceVerifier.ts` para reconhecer os novos tipos.
6. Adicionar testes unitários para o validador e para o seletor.
