export interface ComplianceIssue {
  line: number;
  text: string;
  matchedPattern: string;
  riskLevel: 'MEDIUM' | 'HIGH';
  explanation: string;
  suggestion: string;
}

export interface ComplianceResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: ComplianceIssue[];
  passed: boolean;
}

// Predefined heuristics against prohibited affiliate ad claims
const RULES = [
  {
    pattern: /(?:curar?|cure|cura definitiva|reverta totalmente|reverter o diabetes|cura o diabetes|cura a gastrite|cura de|curado)/i,
    riskLevel: 'HIGH' as const,
    explanation: 'Alegação de cura de patologias é expressamente proibida pelo Google Ads e Meta Ads. Dispara reprovação de conta imediata.',
    suggestion: 'Use termos preventivos ou de bem-estar, como "apoia a saúde de", "auxilia no controle de" ou "contribui para o bem-estar".'
  },
  {
    pattern: /(?:perca \d+\s?(?:kg|lbs|quilos) em \d+\s?(?:dias|semanas)|emagre[cç]a? sem esforço|perder peso dormindo|perca peso sem dieta|fórmula mágica|derrete gordura sem|emagreça em \d+\s?dias)/i,
    riskLevel: 'HIGH' as const,
    explanation: 'Promessas de emagrecimento rápido ou sem esforço físico/dieta violam diretamente as políticas de saúde do Google e Meta.',
    suggestion: 'Use termos realistas como "auxilia no processo de queima calórica saudável" ou "aliado da sua rotina de hábitos saudáveis".'
  },
  {
    pattern: /(?:de r\$\s?\d+ por apenas r\$\s?\d+|de \$?999 por \$?29|ganhe r\$\s?\d+ por dia|ganhar dinheiro fácil|dinheiro sem trabalhar|trabalhe \d+ minutos por dia|fique rico)/i,
    riskLevel: 'HIGH' as const,
    explanation: 'Promessas de ganho financeiro rápido ou descontos fictícios extremos (preços falsos de ancoragem) violam diretrizes de publicidade enganosa.',
    suggestion: 'Use chamadas baseadas em custo-benefício honesto: "Excelente relação custo-benefício" ou "Acesso promocional no site oficial".'
  },
  {
    pattern: /(?:depoimento de quem usou|testemunho real|meu depoimento real|eu usei e me curei|revelado por um médico|depoimento de \w+ que se curou|depoimento (?:real |sincero )?de \w+ que se curou)/i,
    riskLevel: 'HIGH' as const,
    explanation: 'Depoimentos fabricados ou de autoridade fictícia sem comprovação são de alto risco e violam diretrizes de publicidade.',
    suggestion: 'Prefira focar em descrições realistas de resultados individuais, como "Estudos sugerem que..." ou "Resultados individuais variam".'
  },
  {
    pattern: /(?:100% garantido|garantia absoluta|resultado garantido|certeza absoluta de|recompensa garantida)/i,
    riskLevel: 'MEDIUM' as const,
    explanation: 'Garantias absolutas de resultados de saúde ou financeiros são consideradas claims agressivos com alto potencial de strike.',
    suggestion: 'Prefira mencionar a política de reembolso oficial: "Garantia de reembolso de 60 dias assegurada pelo fabricante" ou "Satisfação resguardada".'
  },
  {
    pattern: /(?:única chance|últimos minutos|compre agora ou perca para sempre|restam apenas \d+ unidades)/i,
    riskLevel: 'MEDIUM' as const,
    explanation: 'Gatilhos de escassez extrema ou urgência artificial desonesta podem irritar revisores automáticos ou causar strikes de UX agressiva.',
    suggestion: 'Suavize para: "Condição promocional disponível por tempo limitado" ou "Aproveite os lotes promocionais enquanto durarem".'
  }
];

/**
 * Validates any ad copy/presell content against compliance rules.
 * Computes a score out of 100 and points out risky lines with suggestions.
 */
export function validateCompliance(content: string): ComplianceResult {
  if (!content || content.trim().length === 0) {
    return { score: 100, riskLevel: 'LOW', issues: [], passed: true };
  }

  const lines = content.split('\n');
  const issues: ComplianceIssue[] = [];

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;

    RULES.forEach((rule) => {
      const match = rule.pattern.exec(lineText);
      if (match) {
        issues.push({
          line: lineNumber,
          text: lineText,
          matchedPattern: rule.pattern.source,
          riskLevel: rule.riskLevel,
          explanation: rule.explanation,
          suggestion: rule.suggestion
        });
      }
    });
  });

  // Calculate compliance score
  // High risk issues deduct 30 points, Medium risk deduct 15 points
  let score = 100;
  issues.forEach((issue) => {
    if (issue.riskLevel === 'HIGH') {
      score -= 30;
    } else {
      score -= 15;
    }
  });

  score = Math.max(0, Math.min(100, score));

  // Determine overall risk level
  let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (issues.some((i) => i.riskLevel === 'HIGH')) {
    overallRisk = 'HIGH';
  } else if (issues.some((i) => i.riskLevel === 'MEDIUM')) {
    overallRisk = 'MEDIUM';
  }

  return {
    score,
    riskLevel: overallRisk,
    issues,
    passed: overallRisk !== 'HIGH',
  };
}

/**
 * Auto-corrects offending compliance claims using standard friendly rewrites.
 */
export function autoCorrectClaims(content: string): string {
  if (!content) return '';

  let corrected = content;

  // Simple sequential string replacements for extreme triggers to prove compliance sentinel works
  const corrections = [
    { bad: /cura sua diabetes/gi, good: 'apoia o controle saudável da glicemia' },
    { bad: /cure sua diabetes/gi, good: 'apoia o controle saudável da glicemia' },
    { bad: /cura de diabetes/gi, good: 'controle de glicemia de forma natural' },
    { bad: /perca 10kg em 3 dias/gi, good: 'auxilie o seu processo de queima calórica' },
    { bad: /emagrecer sem esforço/gi, good: 'potencializar sua rotina active de exercícios' },
    { bad: /de R\$999 por R\$29/gi, good: 'desconto promocional exclusivo direto da fábrica' },
    { bad: /100% garantido/gi, good: 'recoberto por garantia de satisfação de 60 dias' },
    { bad: /garantia absoluta/gi, good: 'garantia de reembolso' }
  ];

  corrections.forEach((c) => {
    corrected = corrected.replace(c.bad, c.good);
  });

  return corrected;
}
