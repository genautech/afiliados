import { describe, it, expect } from 'vitest';
import { normalizeTrackingId, indexCampaignsByTrackingId, TRACKING_ID_MAX } from './tracking-id';

const campanha = (name: string, utmCampaign?: string | null) => ({ id: name, name, utmCampaign });

describe('normalizeTrackingId', () => {
  it('mantém o formato que o ClickBank aceita', () => {
    expect(normalizeTrackingId('CB_WL_US_SEARCH_BRIDGE_v1')).toBe('cb_wl_us_search_bridge_v1');
  });

  it('troca por _ tudo que o ClickBank não aceita', () => {
    expect(normalizeTrackingId('Alpilean US - Search v1')).toBe('alpilean_us___search_v1');
    expect(normalizeTrackingId('Emagrecimento Rápido BR')).toBe('emagrecimento_r_pido_br');
    expect(normalizeTrackingId('CB/WL/US/v1')).toBe('cb_wl_us_v1');
  });

  it('corta em 100 caracteres (limite real do ClickBank)', () => {
    expect(normalizeTrackingId('a'.repeat(150))).toHaveLength(TRACKING_ID_MAX);
  });

  it('aceita nulo e vazio sem explodir', () => {
    expect(normalizeTrackingId(null)).toBe('');
    expect(normalizeTrackingId(undefined)).toBe('');
    expect(normalizeTrackingId('')).toBe('');
  });

  it('é idempotente — normalizar duas vezes não muda nada', () => {
    const uma = normalizeTrackingId('Alpilean US - Search v1');
    expect(normalizeTrackingId(uma)).toBe(uma);
  });
});

describe('indexCampaignsByTrackingId', () => {
  it('casa o TID que a presell enviou com a campanha que o gerou', () => {
    // Regressão do bug: o hoplink levava tid normalizado, o sync procurava a string crua.
    const nome = 'Alpilean US - Search v1';
    const byTid = indexCampaignsByTrackingId([campanha(nome, 'CB_WL_US_SEARCH_BRIDGE_v1')]);
    const tidQueFoiNoHoplink = normalizeTrackingId(nome);
    expect(byTid.get(tidQueFoiNoHoplink)?.name).toBe(nome);
  });

  it('casa também pelo utmCampaign', () => {
    const byTid = indexCampaignsByTrackingId([campanha('Nome Qualquer', 'CB_NUTRA_US_SEARCH_BRIDGE_v1')]);
    expect(byTid.get('cb_nutra_us_search_bridge_v1')?.name).toBe('Nome Qualquer');
  });

  it('utmCampaign vence o name quando os dois normalizam pra mesma chave', () => {
    // name é texto livre que o usuário renomeia; utmCampaign é o campo de tracking.
    const a = campanha('mesma-chave', 'outra_coisa');
    const b = campanha('nome b', 'mesma_chave');
    const byTid = indexCampaignsByTrackingId([a, b]);
    expect(byTid.get('mesma_chave')?.id).toBe('nome b');
  });

  it('ignora campanha sem utmCampaign sem perder o índice por nome', () => {
    const byTid = indexCampaignsByTrackingId([campanha('Só Nome', null)]);
    expect(byTid.get('s__nome')?.name).toBe('Só Nome');
    expect(byTid.has('')).toBe(false);
  });

  it('TID cru vindo de configuração manual antiga também casa', () => {
    // Um tid configurado à mão no ClickBank como "camp-neurovera" passa a casar com a campanha
    // "camp-neurovera" porque os dois lados normalizam para camp_neurovera.
    const byTid = indexCampaignsByTrackingId([campanha('camp-neurovera', 'camp-neurovera')]);
    expect(byTid.get(normalizeTrackingId('camp-neurovera'))?.name).toBe('camp-neurovera');
  });
});
