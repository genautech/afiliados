import { describe, expect, it } from 'vitest';
import { CATALOGO_VERTICAIS, CATALOGO_OPERACAO, VERTICAIS, verticalPorLabel } from '@/lib/generated/catalogo';
import { CVR_DEFAULTS, VERTICALS, PLATFORMS, CHANNELS, GEOS, KEYWORDS_BY_VERTICAL, NEGATIVES_BY_VERTICAL, cvrDefaultComProcedencia } from '@/lib/wizard-data';

describe('catálogo de subsídios', () => {
  it('todo número que a campanha usa carrega procedência', () => {
    for (const v of VERTICAIS) {
      expect(v.cvr_default.origem, `${v.label}: cvr sem origem`).toBeTruthy();
      expect(v.cvr_default.nota, `${v.label}: cvr sem nota`).toBeTruthy();
    }
  });

  it('origem dado-proprio exige amostra declarada', () => {
    for (const v of VERTICAIS) {
      if (v.cvr_default.origem === 'dado-proprio') {
        expect(v.cvr_default.amostra, `${v.label}: dado próprio sem amostra`).toBeTruthy();
      }
    }
  });

  it('origem fonte-externa exige url', () => {
    for (const v of VERTICAIS) {
      const alvos = [v.cvr_default, v.negativas, ...(v.keywords ? [v.keywords] : [])];
      for (const alvo of alvos) {
        if (alvo.origem === 'fonte-externa') expect(alvo.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('wizard-data continua exportando o que a UI consome', () => {
    expect(VERTICALS.length).toBe(VERTICAIS.length);
    expect(PLATFORMS.length).toBeGreaterThan(0);
    expect(CHANNELS.length).toBe(CATALOGO_OPERACAO.canais.length);
    expect(GEOS.length).toBe(CATALOGO_OPERACAO.geos.length);
    for (const label of VERTICALS) expect(CVR_DEFAULTS[label]).toBeGreaterThan(0);
  });

  it('keywords e negativas vêm do catálogo, não de literal no código', () => {
    for (const v of VERTICAIS) {
      expect(NEGATIVES_BY_VERTICAL[v.label]).toEqual([...v.negativas.termos]);
      if (v.keywords) expect(KEYWORDS_BY_VERTICAL[v.label].A).toEqual([...v.keywords.A]);
    }
  });

  it('cvrDefaultComProcedencia devolve valor e justificativa juntos', () => {
    const r = cvrDefaultComProcedencia(VERTICAIS[0].label);
    expect(r).not.toBeNull();
    expect(r!.valor).toBe(VERTICAIS[0].cvr_default.valor);
    expect(r!.origem).toBe(VERTICAIS[0].cvr_default.origem);
  });

  it('verticalPorLabel encontra pelo rótulo exibido na UI', () => {
    expect(verticalPorLabel('Weight Loss')?.id).toBeTruthy();
    expect(verticalPorLabel('nao-existe')).toBeNull();
  });

  it('catálogo declara versão de schema', () => {
    expect(CATALOGO_VERTICAIS.schema).toBe(1);
    expect(CATALOGO_OPERACAO.schema).toBe(1);
  });
});
