# Compliance Google Ads para Afiliados

Políticas mudam: para casos-limite, **busque na web a política atual** (support.google.com/adspolicy) antes de afirmar. O que segue é o núcleo estável.

## Por que o link direto reprova (e a solução)

O Google trata o link direto de afiliado como "ponte sem valor" (bridge page/insufficient original content) e frequentemente como URL de destino divergente. Resultado: reprovação e, reincidindo, suspensão. **Solução obrigatória: página-ponte própria** que:

1. Está em domínio SEU, rápido (<3s mobile), com navegação real (menu, política de privacidade, termos, contato — o Google verifica);
2. Tem conteúdo original genuíno (review honesto, comparativo, artigo educativo) — não uma cópia da página do produtor;
3. Divulga a relação de afiliado (uma linha de disclosure);
4. Não usa redirecionamento enganoso, cloaking, pop-ups agressivos, botão falso;
5. Só então leva ao link de afiliado no CTA.

A pré-venda também é o **ponto de captura do pixel**: toda a arquitetura de rastreamento depende de o tráfego passar por ela (ver rastreamento-e-pixel.md).

## Copy segura: o padrão mental

Anuncie o **método/produto/informação**, nunca o **resultado garantido**.

| ✖ Reprova/suspende | ✔ Versão segura |
|---|---|
| "Emagreça 10kg em 30 dias" | "Conheça o protocolo de emagrecimento" |
| "Nunca mais seja vítima" | "Aprenda o protocolo de prevenção" |
| "Renda garantida de R$5.000/mês" | "Método de renda extra passo a passo" |
| "Cura a ansiedade" | "Técnicas para lidar com a ansiedade" |
| "O segredo que os médicos escondem" | (sem versão — clickbait conspiratório é política de deturpação) |

Gatilhos de reprovação em qualquer nicho: promessas com prazo/valor específico, "garantido", superlativo médico ("cura", "elimina", "trata"), medo gráfico, antes/depois em saúde, alegações de renda, urgência falsa ("só hoje" sem ser verdade), CAIXA ALTA excessiva, exclamações em excesso, símbolos no título.

## Nichos com regras extras

- **Saúde:** sem alegação de cura/tratamento/prevenção de doença; suplemento não pode prometer efeito farmacológico; termos de medicamentos/substâncias listadas = bloqueio. Emagrecimento: sem promessas quantificadas, sem imagem corporal negativa.
- **Finanças:** alegações de retorno = violação; alguns países exigem verificação/certificação do anunciante para serviços financeiros (verificar exigência atual por país na web); cripto e empréstimos têm políticas próprias restritas.
- **Produtos regulados:** armas e itens de defesa regulamentados (ex.: spray de pimenta) NÃO são anunciáveis no Google/Meta independentemente de mudança na lei local. Estratégia correta: ofertas adjacentes permitidas (alarmes pessoais, câmeras, cursos de prevenção) + construção de audiência própria.
- **Marca do produtor:** muitos programas proíbem bid na marca ("nome do produto + comprar"). Violar = comissão estornada e expulsão do programa. Sempre checar as regras do produtor.

## Checklist pré-subida (rodar em toda campanha)

1. URL final é a página-ponte própria (nunca o hotlink)?
2. Página tem: conteúdo original, disclosure, privacidade/termos/contato, <3s mobile?
3. Copy passou no `scripts/validar_copy.py` sem termos de risco?
4. Nicho regulado? → dupla checagem na política atual via web
5. Regras do produtor sobre tráfego pago e bid de marca lidas?
6. Sem cloaking, sem redirect enganoso, sem coleta de dados sem consentimento (LGPD/GDPR na página)?

## Se o anúncio for reprovado

1. Ler o motivo exato na conta (não adivinhar); 2. Corrigir a causa (página ou copy) — não apenas reenviar; 3. Reenviar para revisão; 4. Reincidência do mesmo motivo = risco de suspensão: mudar abordagem, não insistir; 5. Suspensão: apelar apenas com a causa corrigida e documentada.
