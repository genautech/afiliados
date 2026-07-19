# Rastreamento, Pixel e Postback

Princípio: **sem conversão rastreada não existe otimização** — só achismo. A página de pré-venda é o ponto de captura: todo clique pago passa por um domínio SEU antes da plataforma, e é aí que tag/pixel vivem.

## Arquitetura padrão

```
Anúncio → Página-ponte (SEU domínio: tag Google + GTM + pixel)
        → Checkout da plataforma (Hotmart/ClickBank...)
        → Venda confirmada → POSTBACK/integração devolve a conversão ao Google Ads
```

Dois níveis de conversão a configurar:
1. **Micro (na sua página):** clique no CTA de afiliado — conversão secundária, serve de sinal precoce. Via GTM (acionador de clique no link) → tag de conversão do Google Ads.
2. **Macro (a venda):** conversão primária para lances inteligentes. Vem da integração/postback da plataforma.

## Configuração por método

### A) Tag do Google direto na página
1. Google Ads → Metas → Conversões → Nova ação de conversão → Site
2. Instalar a tag global (gtag.js) no `<head>` da pré-venda + snippet de evento no clique do CTA
3. O template `assets/template-prevenda.html` já tem os placeholders `GOOGLE_ADS_ID` e `CONVERSION_LABEL`

### B) Google Tag Manager (recomendado)
1. Container GTM na página (head + body)
2. Tag "Conversão do Google Ads" + tag de "Vinculador de conversões"
3. Acionador: clique em elementos cujo link contenha o domínio da plataforma (ex.: `hotmart`)
4. Testar no modo Visualização antes de publicar

### C) Venda real — integrações por plataforma
- **Hotmart:** área do afiliado → Ferramentas → integração nativa com Google Ads (conecta a conta e envia a conversão de compra automaticamente) OU webhook/postback para solução própria. É a fonte de verdade do ROAS.
- **Monetizze / Eduzz / Kiwify / Braip:** postback/webhook nas configurações da conta → apontar para o pixel/ferramenta intermediária ou usar a integração com Google Ads quando existir. Passar o `gclid` na URL de afiliado quando a plataforma suportar parâmetros.
- **ClickBank:** parâmetro de rastreamento `tid` no hoplink (até 24 caracteres — use para identificar campanha/grupo) + postback via "Integrated Sales Reporting"/pixel de terceiros. Conversões offline: importar no Google Ads com o gclid capturado.
- **Amazon Associates:** sem postback por venda para o Google Ads; rastreie o micro (clique) e use os relatórios da Amazon por tracking ID (crie um ID por campanha).

**Passagem do gclid:** ative a codificação automática (auto-tagging) na conta; na página-ponte, capture o `gclid` da URL e anexe ao link de afiliado como parâmetro (o template já traz o script pronto). Sem isso, conversão offline não casa com o clique.

### D) Conversões aprimoradas
Ative "conversões aprimoradas" na ação de conversão (usa dados como e-mail com hash quando a página captura lead) — melhora a atribuição, especialmente iOS.

## Árvore de diagnóstico ("a conversão não aparece")

1. **A tag dispara?** Tag Assistant / modo Preview do GTM na própria página. Não dispara → erro de instalação (snippet ausente, acionador errado, publicação pendente no GTM).
2. **Dispara mas não registra?** Conferir ID/label da conversão; status da ação de conversão na conta ("inativa" = nunca recebeu ping); janela de até 24h de atraso no relatório.
3. **Micro registra, venda não?** Problema na integração da plataforma: reconectar integração Hotmart↔Google Ads; conferir postback URL; testar com compra de teste/reembolsável quando possível.
4. **Números divergem da plataforma?** Normal haver diferença (janela de atribuição, modelo, fuso). Divergência >20–30% → conferir dupla contagem (tag + integração contando a mesma venda: manter UMA como primária).
5. **Tudo certo e mesmo assim nada?** Volume: com poucos cliques, zero conversão não é bug (ver regra de amostra da metodologia).

## Checklist de verificação (antes de considerar rastreio OK)

1. Auto-tagging ativado; 2. Conversão de teste registrada na conta; 3. Micro e macro separadas (primária = venda); 4. gclid passando no link de afiliado; 5. GTM publicado (não só salvo); 6. Aviso de cookies/privacidade na página (LGPD/GDPR).
