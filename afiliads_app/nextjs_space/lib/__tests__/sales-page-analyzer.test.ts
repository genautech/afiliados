import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import { fetchPageContent } from '../salesPageAnalyzer';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

async function requestUsingFetch(url: URL) {
  const response = await fetch(url, { redirect: 'manual' });
  const body = response.body
    ? (async function* () {
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      })()
    : undefined;
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body,
    cancel: async () => {
      if (!response.body) return;
      if (typeof response.body.cancel === 'function') await response.body.cancel();
      else await response.body.getReader().cancel();
    },
  };
}

function fetchWithMockTransport(url: string) {
  const lookupAll = lookup as unknown as (
    hostname: string,
    options: { all: true; verbatim: true },
  ) => Promise<Array<{ address: string; family: number }>>;
  return fetchPageContent(url, {
    lookup: lookupAll,
    request: requestUsingFetch,
  });
}

describe('fetchPageContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('rejeita endereço de loopback antes de executar fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchWithMockTransport('https://127.0.0.1:3000/api/admin/users');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejeita loopback IPv4 mapeado em IPv6', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('não deveria chamar'));

    const result = await fetchWithMockTransport('https://[::ffff:127.0.0.1]/internal');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejeita IPv6 site-local fec0::/10 antes do transporte', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('não deveria chamar'));

    const result = await fetchWithMockTransport('https://[fec0::1]/internal');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('vincula o transporte ao endereço público validado por DNS', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      body: (async function* () { yield new TextEncoder().encode('<html>ok</html>'); })(),
      cancel: vi.fn(),
    });

    const result = await fetchPageContent('https://rebinding.example/path', {
      lookup: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
      request,
    } as never);

    expect(request).toHaveBeenCalledWith(
      new URL('https://rebinding.example/path'),
      { address: '93.184.216.34', family: 4 },
    );
    expect(result).toBe('<html>ok</html>');
  });

  it('rejeita hostname que resolve para endereço privado', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: '169.254.169.254', family: 4 },
    ] as never);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchWithMockTransport('https://metadata.example/path');

    expect(result).toBeNull();
    expect(lookup).toHaveBeenCalledWith('metadata.example', { all: true, verbatim: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('desabilita redirect automático para revalidar cada destino', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    const cancel = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: 'Found',
      headers: new Headers({ location: 'https://127.0.0.1/internal' }),
      body: { cancel, getReader: () => ({ read: vi.fn() }) },
    } as unknown as Response);

    const result = await fetchWithMockTransport('https://example.com/start');

    expect(result).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('https://example.com/start'),
      expect.objectContaining({ redirect: 'manual' }),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('rejeita Content-Length acima do limite sem materializar o corpo', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    const text = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '2000001' }),
      text,
    } as unknown as Response);

    const result = await fetchWithMockTransport('https://example.com/large');

    expect(result).toBeNull();
    expect(text).not.toHaveBeenCalled();
  });

  it('interrompe corpo chunked quando ultrapassa o limite', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    const cancel = vi.fn();
    const read = vi.fn()
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(2_000_000) })
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(1) });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: { getReader: () => ({ read, cancel }) },
      text: vi.fn(),
    } as unknown as Response);

    const result = await fetchWithMockTransport('https://example.com/chunked');

    expect(result).toBeNull();
    expect(cancel).toHaveBeenCalled();
  });
});
