# Briefs de Pesquisa para Agentes — Implementação no AfiliAds

**Fonte:** Aulão "Páginas para Afiliados" de Thiago Laprovitera  
**Vídeo:** https://www.youtube.com/watch?v=2SUv--KhWB0  
**Data da extração:** 2026-08-19  
**Objetivo:** Transformar o conhecimento do vídeo em funcionalidades reais no AfiliAds, delegando pesquisas específicas aos agentes certos.

---

## Sistemas, ferramentas e URLs identificadas no vídeo

| # | Sistema/Ferramenta | O que é | Menção no vídeo | Relevância para AfiliAds |
|---|-------------------|---------|-----------------|-------------------------|
| 1 | **Flow Pages** | Gerador de páginas de afiliado a partir do HopLink | "como essa que é a Flow Pages" | Alta — modelo de negócio e UX do seletor de páginas |
| 2 | **Flow Spy** | Espionagem de páginas e anúncios de concorrentes | "ferramenta de espionagem... Flow Spy" | Alta — integração com Market Intelligence Analyst |
| 3 | **Hostinger** | Hospedagem com domínios ilimitados | "uso e recomendo a da Hostinger" | Média/Alta — já existe campo no wizard, mas pode integrar melhor |
| 4 | **Microsoft Clarity** | Heatmap e gravações de sessão gratuitas | "sabe usar o clarity da Microsoft" | Alta — indicador de maturidade para página Review/Robusta |
| 5 | **ClickBank** | Plataforma de afiliados internacional | marketplace mostrado ao vivo | Já integrada parcialmente — precisa de validador de HopLink |
| 6 | **Digistore24** | Plataforma de afiliados internacional | "a mais fácil de cadastrar" | Média — expandir integrações de produto |
| 7 | **BuyGoods** | Plataforma de afiliados internacional | painel de vendas mostrado | Já parcial — validador de link e postback |
| 8 | **MaxWeb** | Plataforma de afiliados internacional | mencionada junto com outras | Já parcial — postback e smartlink |
| 9 | **Google Ads** | Plataforma de anúncios | criação de campanha ao vivo | Já integrado — alertas de bid strategy e URL final |
| 10 | **Lot Rush** | Conta digital para receber dólares | "conta da Lot Rush" | Baixa para o app — contexto financeiro, não funcionalidade |

---

## Mapeamento: Sistema → Agente → Tarefa de pesquisa

### 1. Flow Pages → Presell Builder + Campaign Setup Strategist

**Agentes responsáveis:** `presell-builder`, `campaign-strategist`

**O que pesquisar:**
- Como o Flow Pages gera páginas a partir de um HopLink (URL de entrada, parsing da oferta, templates disponíveis).
- Quais templates de página existem (cookie, review, VSL, TSL, etc.).
- Como é o fluxo de edição: campos editáveis, preview, publicação.
- Modelo de precificação (assinatura, créditos, limites).
- Se existe API pública ou webhooks.
- Qual o critério para sugerir um template vs outro.

**Entregável esperado:**
- Especificação para o AfiliAds replicar o fluxo essencial: colar HopLink → escolher tipo de página → gerar HTML → preview → publicar.
- Sugestão de templates mínimos viáveis (cookie_popup, tsl, review) com estrutura HTML base.
- Decisão: integrar com Flow Pages via API (se houver) ou replicar funcionalidade interna.

**Restrições:**
- Não copiar textos, imagens ou código proprietário do Flow Pages.
- Replicar apenas a *mecânica* e a *estrutura* (conceito abstrato).

---

### 2. Flow Spy / AdSpy → Market Intelligence Analyst

**Agente responsável:** `market-intelligence-analyst`

**O que pesquisar:**
- Como essas ferramentas descobrem páginas de concorrentes para um produto/vertical.
- Quais filtros são úteis: geo, vertical, plataforma, tipo de página, tempo de veiculação.
- Como classificar uma página encontrada (VSL, TSL, Cookie, Review, Advertorial).
- Limitações: taxa de atualização, cobertura de redes, custo.
- Se existe API ou só interface web.

**Entregável esperado:**
- Especificação de integração para o AfiliAds buscar/analisar páginas de concorrentes de forma automatizada.
- Critérios de classificação estrutural (não textual) das páginas encontradas.
- Proposta de como usar os achados para sugerir tipo de página e ângulo no wizard.

**Restrições:**
- Não copiar páginas inteiras nem textos literais.
- Usar apenas como referência estrutural/anti-cópia.

---

### 3. Hostinger → Campaign Setup Strategist + Wizard Validator

**Agentes responsáveis:** `campaign-strategist`, `wizard-validator`

**O que pesquisar:**
- Planos da Hostinger relevantes para afiliados (domínios ilimitados, SSL, WordPress, FTP, API).
- Como funciona o painel de hospedagem compartilhada hoje (HPanel).
- Se existe API para criar subdomínios/domínios adicionais automaticamente.
- Fluxo de publicação de uma página HTML estática via FTP/File Manager.
- Como ativar SSL em domínios adicionais.

**Entregável esperado:**
- Melhoria no campo `hostingerDomain` do wizard: validação, sugestão de domínio, verificação de SSL.
- Fluxo de publicação direta da presell HTML gerada para a Hostinger (FTP ou API).
- Checklist automático: domínio ativo, SSL OK, página acessível.

---

### 4. Microsoft Clarity → Paid Ads Auditor + Compliance Sentinel

**Agentes responsáveis:** `ads-auditor`, `compliance-sentinel`

**O que pesquisar:**
- Como integrar Microsoft Clarity em uma página (script de instalação).
- Como acessar dados via API (heatmaps, gravações, métricas de engajamento).
- Quais métricas indicam que uma página Review/Robusta está pronta para escala: scroll depth, dead clicks, rage clicks, tempo na página.
- Se é possível correlacionar dados do Clarity com decisões de campanha (KILL/OTIMIZAR/SCALE).

**Entregável esperado:**
- Adicionar campo de "Clarity Project ID" na campanha.
- Gerar snippet de instalação automático nas presells.
- Criar critérios de maturidade: "Página Review recomendada apenas se Clarity estiver ativo e coletando dados há X dias".
- Sugestão de otimização baseada em métricas de heatmap.

---

### 5. ClickBank / BuyGoods / MaxWeb / Digistore24 → Affiliate Page Analyst + Wizard Validator

**Agentes responsáveis:** `affiliate-page-analyst`, `wizard-validator`

**O que pesquisar (por plataforma):**
- Formato real do HopLink/Smartlink de afiliado.
- Como identificar se uma URL é HopLink válido vs URL da página final do produtor.
- Se existe endpoint de "affiliate support page" ou "affiliate tools" com links alternativos (VSL, TSL).
- Padrões de URLs criptografadas e como detectá-las.
- Tokens de tracking disponíveis (subid, clickid, etc.).

**Entregável esperado:**
- Validador de HopLink por plataforma no wizard.
- Alerta quando o usuário colar URL da página do produtor em vez do HopLink.
- Campo para URL da página oficial (para referência e comparação).
- Integração com checklist: "HopLink válido identificado" (auto).

**Plataformas prioritárias:**
1. ClickBank (já integrada, maior uso).
2. BuyGoods (já parcialmente integrada).
3. MaxWeb (já parcialmente integrada).
4. Digistore24 (crescendo, mencionada como fácil de cadastrar).

---

### 6. Google Ads (URLs finais e bid strategies) → Compliance Sentinel + Wizard Validator

**Agentes responsáveis:** `compliance-sentinel`, `wizard-validator`

**O que pesquisar:**
- Política atual do Google Ads sobre URLs finais criptografadas/encurtadas.
- Regras de redirecionamento permitidas/proibidas.
- Quando "Maximizar conversões" é apropriado vs perigoso para iniciantes.
- Melhores práticas para URL final em campanhas de afiliados (domínio próprio, conteúdo útil, sem doorway).

**Entregável esperado:**
- Alerta no wizard quando o usuário tentar usar HopLink como URL final.
- Bloqueio ou aviso forte para "Maximizar conversões" em contas novas.
- Sugestão padrão de bid strategy: Manual CPC → tCPA (CPA desejado).
- Checklist: "URL final é domínio próprio limpo, não HopLink criptografado".

---

## Sugestão de prioridade de implementação

| Rank | Funcionalidade | Agente principal | Esforço estimado | Impacto |
|------|---------------|------------------|------------------|---------|
| 1 | Validador de HopLink no wizard | `wizard-validator` | Baixo | Alto |
| 2 | Seletor de tipo de página (VSL/TSL/Cookie/Review) | `campaign-strategist` + `presell-builder` | Médio | Alto |
| 3 | Alerta contra Maximizar conversões | `compliance-sentinel` | Baixo | Médio |
| 4 | Templates Cookie/Popup e Review | `presell-builder` | Médio | Alto |
| 5 | Integração Microsoft Clarity | `ads-auditor` | Médio | Médio |
| 6 | Integração Flow Spy / Market Intel aprimorada | `market-intelligence-analyst` | Alto | Médio |
| 7 | Publicação Hostinger via FTP/API | `campaign-strategist` | Médio | Médio |
| 8 | Expansão Digistore24 | `affiliate-page-analyst` | Baixo | Médio |

---

## Referências do vídeo para citação

> "Flow Pages... as páginas já estão no molde validado, ela não fica alucinando igual as ferramentas de IA."

> "Eu uso e recomendo a da Hostinger... ela hoje também tem domínios ilimitados."

> "Quando você sabe usar aquele sistema da Microsoft... o Clarity da Microsoft."

> "O link de afiliado é sempre esse link aqui... não me inventa de pegar o link da página final."

> "Não roda maximizar conversões. Maximizar conversões eu não ensino porque não é uma estratégia saudável."

> "Sempre tu vai olhar pelo menos uma vez por semana o teu bendito link de afiliado na página."

---

## Próximos passos

1. Distribuir cada brief para o agente correspondente via `/api/orchestrate-agent-task` ou sessão dedicada.
2. Consolidar os entregáveis em especificações técnicas dentro de `docs/conhecimento-aplicado/`.
3. Converter as especificações em tasks no `TASK_BOARD.md` e iniciar implementação por prioridade.

---

## Tags
#afiliads #agentes #pesquisa #flowpages #flowspy #hostinger #clarity #hoplink #google-ads #presell
