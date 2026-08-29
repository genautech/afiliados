// Gate de claims — porte das regras bloqueantes de checar_claims() do EBOOK-OS
// (frameworks/ebook-os/scripts/validate_product.py) para o que o app realmente
// guarda: linhas de ClaimLedgerEntry produzidas pelo fact-steward.
//
// O validador Python roda sobre um diretório de produto com claim-ledger.csv e
// checa campos que o app não persiste (validade, forca_evidencia, limite). Aqui
// ficam só as regras que os dados do app sustentam — as outras continuam valendo
// no validador de arquivo, e não são simuladas com palpite.
//
// Equivalência de status: FATO ↔ verificado, PROIBIDO ↔ nao-usar,
// INFERENCIA ↔ qualquer status não verificado.

export type ClaimStatus = 'FATO' | 'INFERENCIA' | 'PROIBIDO';

/** Canais que o fact-steward pode autorizar. Fora desta lista o agente saiu do contrato. */
export const CANAIS_CONHECIDOS = ['organico', 'email', 'landing', 'google-ads', 'meta-ads'] as const;

/** Mídia paga: onde uma claim errada vira strike de conta, não só copy ruim. */
export const CANAIS_PAGOS = ['google-ads', 'meta-ads'] as const;

export interface ClaimGateRow {
  id?: string;
  claim: string;
  status: ClaimStatus;
  source?: string | null;
  allowedChannels: unknown;
}

export type ClaimGateCode =
  | 'CLAIM_PROIBIDA_EM_COPY'
  | 'CLAIM_PAGA_NAO_VERIFICADA'
  | 'FONTE_SEM_ORIGEM'
  | 'CANAL_DESCONHECIDO';

export interface ClaimGateIssue {
  code: ClaimGateCode;
  claim: string;
  message: string;
}

export interface ClaimGateResult {
  allowed: boolean;
  issues: ClaimGateIssue[];
}

function canaisDe(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((c): c is string => typeof c === 'string');
}

function resumo(claim: string): string {
  return claim.length > 80 ? `${claim.slice(0, 77)}...` : claim;
}

/**
 * Avalia o ledger de claims de uma campanha. Bloqueia o lançamento quando uma
 * afirmação que a operação não consegue sustentar está autorizada onde ela
 * chega no comprador ou no revisor de política.
 */
export function evaluateClaimGate(rows: ClaimGateRow[]): ClaimGateResult {
  const issues: ClaimGateIssue[] = [];

  for (const row of rows) {
    const canais = canaisDe(row.allowedChannels);
    const desconhecidos = canais.filter((c) => !(CANAIS_CONHECIDOS as readonly string[]).includes(c));
    const pagos = canais.filter((c) => (CANAIS_PAGOS as readonly string[]).includes(c));

    if (row.status === 'PROIBIDO' && canais.length > 0) {
      issues.push({
        code: 'CLAIM_PROIBIDA_EM_COPY',
        claim: row.claim,
        message: `"${resumo(row.claim)}" está marcada como PROIBIDO mas autorizada em ${canais.join(', ')}`,
      });
    }

    if (pagos.length > 0 && row.status !== 'FATO') {
      issues.push({
        code: 'CLAIM_PAGA_NAO_VERIFICADA',
        claim: row.claim,
        message: `"${resumo(row.claim)}" vai para mídia paga (${pagos.join(', ')}) com status ${row.status}`,
      });
    }

    if (row.status === 'FATO' && (!row.source || row.source.trim() === '')) {
      issues.push({
        code: 'FONTE_SEM_ORIGEM',
        claim: row.claim,
        message: `"${resumo(row.claim)}" está classificada como FATO sem fonte`,
      });
    }

    if (desconhecidos.length > 0) {
      issues.push({
        code: 'CANAL_DESCONHECIDO',
        claim: row.claim,
        message: `"${resumo(row.claim)}" autoriza canal fora do contrato: ${desconhecidos.join(', ')}`,
      });
    }
  }

  return { allowed: issues.length === 0, issues };
}
