// Infraestrutura HTTP compartilhada da Google Ads API: versão centralizada/configurável,
// headers (incl. login-customer-id de MCC), OAuth2, request wrapper com erro tratado/redigido
// e retry opcional só pra chamadas idempotentes (search/read — nunca :mutate).
//
// Extraído de lib/google-ads.ts na Tarefa 4 do plano de experimentos
// (.hermes/plans/2026-07-29_023051-google-ads-experiments-wizard.md, seção 7) sem mudar o
// comportamento das funções que já existiam lá — mutateGoogleCampaign/createGoogleCampaign
// continuam com sua própria lógica de fetch por enquanto (migração pro googleAdsRequest()
// abaixo fica pra quando lib/google-ads/campaigns.ts e experiments.ts forem escritos, Tarefas
// 6+ — "gradualmente", como o plano pede, não tudo de uma vez).

import { GoogleAdsApiError } from './errors';

export const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v25';
const GOOGLE_ADS_BASE_URL = 'https://googleads.googleapis.com';

export interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
}

// amount_micros precisa ser múltiplo de 10.000 (1 centavo) — a Google Ads API rejeita frações
// de centavo.
export function toAmountMicros(dollars: number): number {
  return Math.round(dollars * 100) * 10_000;
}

export function isMockMode(config: GoogleAdsCredentials): boolean {
  return (
    config.developerToken.startsWith('DEV_TOKEN_MOCK') ||
    config.clientId.startsWith('CLIENT_ID_MOCK') ||
    config.customerId.includes('@') // Se o ID for um e-mail do seed
  );
}

// login-customer-id é obrigatório quando as credenciais são de uma conta MCC (gerenciadora)
// operando sobre uma conta filha — sem ele a API responde USER_PERMISSION_DENIED mesmo com
// token/developer-token válidos.
export function buildApiHeaders(
  token: string,
  config: GoogleAdsCredentials
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'developer-token': config.developerToken,
  };
  if (config.loginCustomerId) headers['login-customer-id'] = config.loginCustomerId;
  return headers;
}

export function buildApiUrl(config: GoogleAdsCredentials, resourcePath: string): string {
  return `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers/${config.customerId}/${resourcePath}`;
}

// Custom methods de lifecycle (scheduleExperiment/promoteExperiment/endExperiment/...) são
// chamados no próprio resource name da instância (`customers/X/experiments/999:metodo`), não
// no padrão `customers/X/{recurso}:mutate` — resourceName já vem com "customers/..." incluso.
export function buildResourceMethodUrl(resourceName: string, method: string): string {
  return `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/${resourceName}:${method}`;
}

// ---------------------------------------------------------------------------------------------
// Capability de mutação (A5, checkpoint pós-Tarefa 8 / .hermes/handoffs/2026-07-29_task8-
// cross-flow-quality-gate.md): antes desta correção, `googleAdsRequest`/`googleAdsResourceRequest`
// aceitavam QUALQUER resourcePath/method e faziam rede sem passar pelo mutation guard — nada
// impedia importar `googleAdsRequest(token, config, 'campaigns:mutate', {...})` direto,
// ignorando `assertMutationAllowed`. Agora, qualquer mutação real só é possível de posse de um
// `MutationCapability`, que só `assertMutationAllowed` (lib/google-ads/mutation-guard.ts) pode
// emitir — e só quando `allowed: true`. Branding runtime (não só tipo TS) porque o guard
// verdadeiro é o `isMutationCapability()` abaixo, checado em runtime pelas funções de mutate.
// ---------------------------------------------------------------------------------------------

const MUTATION_CAPABILITY_BRAND = 'GoogleAdsMutationCapability' as const;

export interface MutationCapability {
  readonly brand: typeof MUTATION_CAPABILITY_BRAND;
  readonly operation: string;
}

// Só mutation-guard.ts deve chamar isto (é o único lugar com acesso a `assertMutationAllowed`
// retornando allowed:true) — exportado pra permitir o teste unitário do guard sem duplicar a
// string da marca aqui e lá.
export function createMutationCapability(operation: string): MutationCapability {
  return { brand: MUTATION_CAPABILITY_BRAND, operation };
}

export function isMutationCapability(value: unknown): value is MutationCapability {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { brand?: unknown }).brand === MUTATION_CAPABILITY_BRAND
  );
}

function assertCapability(capability: MutationCapability, resourcePath: string): void {
  if (!isMutationCapability(capability)) {
    throw new Error(
      `Mutação em "${resourcePath}" bloqueada: nenhum MutationCapability válido foi fornecido (deve vir de assertMutationAllowed com allowed:true).`
    );
  }
}

export async function getAccessToken(config: GoogleAdsCredentials): Promise<string> {
  if (isMockMode(config)) {
    return 'mock_access_token_123';
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new GoogleAdsApiError('oauth2/token', res.status, await res.text());
  }

  const data = await res.json();
  return data.access_token;
}

export interface GoogleAdsRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  // Só usar em chamadas idempotentes (search/read). Nunca em :mutate — reenviar um create
  // por timeout pode duplicar recurso real na conta do Google Ads.
  retry?: { attempts: number; delayMs: number };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeRequest(
  url: string,
  headers: Record<string, string>,
  method: 'GET' | 'POST',
  body: unknown,
  retry: { attempts: number; delayMs: number } | undefined,
  errorLabel: string
): Promise<any> {
  const maxAttempts = retry ? Math.max(1, retry.attempts) : 1;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const rawBody = await res.text();
        // 5xx é o único caso tratado como transiente; 4xx (payload/auth/permissão) nunca se
        // resolve tentando de novo.
        if (retry && attempt < maxAttempts && res.status >= 500) {
          lastError = new GoogleAdsApiError(errorLabel, res.status, rawBody);
          await sleep(retry.delayMs);
          continue;
        }
        throw new GoogleAdsApiError(errorLabel, res.status, rawBody);
      }

      return res.json();
    } catch (err) {
      if (err instanceof GoogleAdsApiError) throw err;
      // Erro de rede (fetch rejeitou) — só faz sentido re-tentar em chamada marcada retry.
      if (retry && attempt < maxAttempts) {
        lastError = err;
        await sleep(retry.delayMs);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha desconhecida na Google Ads API');
}

// Chamada de LEITURA no padrão `customers/{id}/{recurso}:ação` — search e qualquer custom
// method só-consulta. Bloqueia em runtime qualquer resourcePath `:mutate` (A5): mutação real
// só passa por `googleAdsMutateRequest`, que exige um MutationCapability emitido pelo guard.
export async function googleAdsRequest(
  token: string,
  config: GoogleAdsCredentials,
  resourcePath: string,
  options: GoogleAdsRequestOptions = {}
): Promise<any> {
  if (resourcePath.includes(':mutate')) {
    throw new Error(
      `googleAdsRequest() não permite paths de mutate ("${resourcePath}") — use googleAdsMutateRequest() com um MutationCapability.`
    );
  }
  const { method = 'POST', body, retry } = options;
  return executeRequest(
    buildApiUrl(config, resourcePath),
    buildApiHeaders(token, config),
    method,
    body,
    retry,
    resourcePath
  );
}

// Chamada de MUTAÇÃO no padrão `customers/{id}/{recurso}:mutate` (coleção) — createExperiment,
// createExperimentArms, updateAdFinalUrls/batch. Exige `capability` vindo de
// `assertMutationAllowed({...}).capability` (só existe quando allowed:true); sem ela, lança
// antes de qualquer fetch. Nunca aceita retry — reenviar um create/mutate por timeout pode
// duplicar recurso real na conta do Google Ads.
export async function googleAdsMutateRequest(
  token: string,
  config: GoogleAdsCredentials,
  resourcePath: string,
  capability: MutationCapability,
  options: Omit<GoogleAdsRequestOptions, 'retry'> = {}
): Promise<any> {
  assertCapability(capability, resourcePath);
  const { method = 'POST', body } = options;
  return executeRequest(
    buildApiUrl(config, resourcePath),
    buildApiHeaders(token, config),
    method,
    body,
    undefined,
    resourcePath
  );
}

// Custom method MUTANTE na instância de um resource já existente (`customers/X/experiments/999:
// scheduleExperiment`) — usado pelo lifecycle assíncrono/síncrono de Experiment (Tarefa 8).
// Exige capability (mesmo contrato de `googleAdsMutateRequest`). Nunca tem retry.
export async function googleAdsResourceMutateRequest(
  token: string,
  config: GoogleAdsCredentials,
  resourceName: string,
  method: string,
  capability: MutationCapability,
  body: unknown = {}
): Promise<any> {
  const label = `${resourceName}:${method}`;
  assertCapability(capability, label);
  return executeRequest(
    buildResourceMethodUrl(resourceName, method),
    buildApiHeaders(token, config),
    'POST',
    body,
    undefined,
    label
  );
}

// Custom method SÓ-LEITURA na instância de um resource já existente, com query string opcional
// (ex.: `experiments/999:listAsyncErrors?pageToken=...`, A1) — GET, sem guard (mesmo critério de
// `googleAdsGetResource`), com retry porque é idempotente por natureza.
export async function googleAdsResourceGetRequest(
  token: string,
  config: GoogleAdsCredentials,
  resourceName: string,
  method: string,
  query: Record<string, string> = {}
): Promise<any> {
  const qs = new URLSearchParams(query).toString();
  const url = `${buildResourceMethodUrl(resourceName, method)}${qs ? `?${qs}` : ''}`;
  return executeRequest(
    url,
    buildApiHeaders(token, config),
    'GET',
    undefined,
    { attempts: 3, delayMs: 500 },
    `${resourceName}:${method}`
  );
}

// GET bruto num resource name completo (ex.: polling de long-running operation) — sem `:método`.
export async function googleAdsGetResource(
  token: string,
  config: GoogleAdsCredentials,
  resourceName: string
): Promise<any> {
  return executeRequest(
    `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/${resourceName}`,
    buildApiHeaders(token, config),
    'GET',
    undefined,
    { attempts: 3, delayMs: 500 }, // polling de status é idempotente — GET, sempre seguro re-tentar
    resourceName
  );
}
