import { describe, expect, it } from 'vitest';
import { ACTIVE_PROVIDERS } from './llm';
import {
  isNoLlmKeyError,
  LLM_PROVIDER_DISPLAY_ORDER,
  LLM_PROVIDER_LABELS,
  LLM_PROVIDER_LIST,
  NO_LLM_KEY_ERROR,
} from './llm-errors';

describe('llm-errors', () => {
  it('tem rótulo para todo provedor ativo (trava a divergência que omitia OpenRouter)', () => {
    for (const p of ACTIVE_PROVIDERS) {
      expect(LLM_PROVIDER_LABELS[p], `provedor ativo sem rótulo: ${p}`).toBeTruthy();
      expect(LLM_PROVIDER_DISPLAY_ORDER, `provedor ativo fora da mensagem: ${p}`).toContain(p);
    }
    expect(LLM_PROVIDER_DISPLAY_ORDER.length).toBe(ACTIVE_PROVIDERS.length);
  });

  it('cita OpenRouter, que é o provedor padrão', () => {
    expect(LLM_PROVIDER_LIST).toContain('OpenRouter');
    expect(NO_LLM_KEY_ERROR).toContain('OpenRouter');
  });

  it('reconhece o erro real de cadeia vazia', () => {
    expect(isNoLlmKeyError(NO_LLM_KEY_ERROR)).toBe(true);
  });

  it('não classifica falha de provedor/quota/infra como falta de chave', () => {
    for (const msg of [
      'quota exceeded on provider openrouter',
      'openrouter: 401 No auth credentials found',
      'OpenAI error: Incorrect API key provided',
      'FIRECRAWL_API_KEY não configurada no .env',
      'INTEGRATION_ENCRYPTION_KEY não configurada',
      'fetch failed: ETIMEDOUT',
    ]) {
      expect(isNoLlmKeyError(msg), `classificou errado: ${msg}`).toBe(false);
    }
  });
});
