import { describe, it, expect } from 'vitest';
import { buildPurchaseEvents } from '../_components/step-launch';

describe('buildPurchaseEvents', () => {
  it('emite o par CAPI + Browser Pixel com o mesmo transaction id', () => {
    const [capi, pixel] = buildPurchaseEvents('trx_129k9a', 200);
    expect(capi).toMatchObject({ channel: 'CAPI', name: 'Purchase', transactionId: 'trx_129k9a', status: 'ok', detail: 'Sucesso (200 OK)' });
    expect(pixel).toMatchObject({ channel: 'Browser Pixel', transactionId: 'trx_129k9a', status: 'dedup', detail: 'Desduplicado' });
  });

  it('marca os dois lados como falha quando o webhook não volta 2xx', () => {
    const [capi, pixel] = buildPurchaseEvents('trx_err', 502, 'Kiwify indisponível');
    expect(capi.status).toBe('fail');
    expect(capi.detail).toContain('502');
    expect(capi.detail).toContain('Kiwify indisponível');
    expect(pixel.status).toBe('fail');
    expect(pixel.detail).toBe('Não disparado (CAPI falhou)');
  });

  it('não desduplica em cima de erro de rede (status 0)', () => {
    expect(buildPurchaseEvents('trx_net', 0).every((e) => e.status === 'fail')).toBe(true);
  });

  it('dá ids distintos por canal para servirem de key de lista', () => {
    const [capi, pixel] = buildPurchaseEvents('trx_1', 200);
    expect(capi.id).not.toBe(pixel.id);
  });

  it('carimba a hora no formato do console', () => {
    expect(buildPurchaseEvents('trx_1', 200)[0].at).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
