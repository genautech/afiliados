export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { presellUrl, presellHtml, keyword, vertical, platform, offerUrl } = body ?? {};

    const systemPrompt = `Você é um especialista em compliance, SEO semântico e otimização de conversão (CRO) para afiliados que operam com Google Ads.
Sua função é auditar e analisar páginas de pré-sell (bridge pages / review pages) estruturadas para ClickBank, BuyGoods, MaxWeb e Hotmart.

DIRETRIZES DE ANÁLISE SEMÂNTICA E PALAVRAS-CHAVE:
- **Densidade da Keyword Principal:** Deve estar entre 0.5% e 1.5%. Acima de 2.0% deve ser marcado como risco de Keyword Stuffing (Super-otimização).
- **Termos Semânticos e LSI:** Verifique se o conteúdo contém termos relacionados ao nicho (ex: para perda de peso: metabolismo, calorias, queima de gordura, ingredientes naturais) que aumentam a relevância tópica (topical authority) e o Quality Score no Google Ads.
- **Message Match:** H1 e parágrafo de introdução devem estar alinhados perfeitamente com a Keyword de busca e o anúncio.

DIRETRIZES DE COMPLIANCE E ANTI-STRIKE (CRÍTICO):
- **Disclaimers Obrigatórios:** A página DEVE conter um disclaimer de afiliado visível ("Como afiliado, posso receber comissão...") e um disclaimer de isenção de responsabilidade médica/financeira ("Resultados individuais variam...").
- **Links Obrigatórios:** Deve conter links funcionais para "Política de Privacidade", "Termos de Uso" e "Contato" no rodapé.
- **Claims Proibidos:** Identifique alegações de saúde absolutas ("cura definitiva", "perda de peso rápida sem esforço", "renda garantida de X reais"). Isto gera reprovação imediata da conta do Google.
- **Cloaking e Doorway:** Garanta que a página não faça redirecionamentos automáticos imediatos (doorway spam) e que ofereça conteúdo útil real antes do CTA de compra.

ANALISE os seguintes aspectos e dê uma NOTA de 0-100 para cada:
1. **COMPLIANCE** (peso 30%): Claims proibidos, disclaimer de afiliado, privacy policy, sem cloaking, sem promessas enganosas.
2. **CONVERSÃO** (peso 25%): CTA claro e único, message match com keyword, FAQ, prova social legítima, prós/contras.
3. **GOOGLE ADS** (peso 20%): Quality Score potencial, densidade de keyword (0.5% - 1.5%), LSI/co-ocorrência, experiência mobile.
4. **ANTI-STRIKE** (peso 15%): Riscos de ban no Google Ads, violação dos termos das redes de afiliados (ClickBank, MaxWeb, BuyGoods), uso de Trademark proibido.
5. **UX/DESIGN** (peso 10%): Mobile-first, legibilidade, legibilidade do disclaimer de rodapé.

Responda APENAS com JSON válido:
{
  "overall_score": number (0-100),
  "compliance": { "score": number, "issues": ["issue1"], "passed": ["item1"] },
  "conversion": { "score": number, "issues": ["issue1"], "passed": ["item1"] },
  "google_ads": { "score": number, "issues": ["issue1"], "passed": ["item1"], "keyword_density": string (ex: "1.2% - Ideal") },
  "anti_strike": { "score": number, "issues": ["issue1"], "passed": ["item1"], "risk_level": "LOW|MEDIUM|HIGH|CRITICAL" },
  "ux_design": { "score": number, "issues": ["issue1"], "passed": ["item1"] },
  "recommendations": ["rec1", "rec2"],
  "blockers": ["blocker1 se houver"],
  "verdict": "APROVADA|PRECISA_AJUSTES|REPROVADA"
}`;

    let content = '';
    if (presellHtml) {
      content = `Analise este HTML de pré-sell page:\n\n${presellHtml.slice(0, 8000)}`;
    } else if (presellUrl) {
      try {
        const { fetchPageText } = await import('@/lib/html');
        const pageText = await fetchPageText(presellUrl, 10000);
        if (pageText.length < 200) {
          return new Response(JSON.stringify({ error: 'A página da presell não retornou conteúdo útil (JS-only?). Cole o HTML no campo presellHtml.' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
        }
        content = `Analise o CONTEÚDO REAL desta pré-sell page (${presellUrl}):\n\n${pageText}`;
      } catch (e: any) {
        return new Response(JSON.stringify({ error: `Não consegui acessar a presell (${e?.message}). Verifique a URL ou cole o HTML no campo presellHtml.` }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Informe presellUrl ou presellHtml — a análise só roda sobre conteúdo real.' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
    }

    content += `\n\nContexto:\n- Keyword principal: ${keyword ?? 'não informada'}\n- Vertical: ${vertical ?? 'não informada'}\n- Plataforma: ${platform ?? 'não informada'}\n- URL da oferta: ${offerUrl ?? 'não informada'}`;

    const content_text = await callLLM(userId, { agent: 'compliance-sentinel', systemPrompt, userPrompt: content });
    let result;
    try {
      result = JSON.parse(content_text);
    } catch {
      result = { overall_score: 0, error: 'Falha ao parsear resposta da IA' };
    }

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Presell analysis error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
