// Erro tipado + redação de segredo pra qualquer chamada à Google Ads API. Extraído na Tarefa 4
// do plano de experimentos — objetivo explícito do plano (seção 10): "logs sem developer
// token, refresh token ou Authorization".

const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/(Bearer\s+)[A-Za-z0-9\-_.]+/gi, '$1[REDACTED]'],
  [/("?developer-token"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?developerToken"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?refresh_token"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?refreshToken"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?access_token"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?client_secret"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
  [/("?clientSecret"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[REDACTED]'],
];

export function redactSensitive(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export class GoogleAdsApiError extends Error {
  readonly status: number;
  readonly resource: string;

  constructor(resource: string, status: number, rawBody: string) {
    super(`Erro em ${resource} (HTTP ${status}): ${redactSensitive(rawBody)}`);
    this.name = 'GoogleAdsApiError';
    this.status = status;
    this.resource = resource;
  }
}
