import { describe, it, expect } from 'vitest';
import { applyRewritesToHtml } from '../_components/step-landing-page';

describe('applyRewritesToHtml', () => {
  it('troca o trecho preservando as tags ao redor', () => {
    const html = '<h1 class="hero">Solução inovadora</h1><p>Compre agora</p>';
    const out = applyRewritesToHtml(html, [
      { excerpt: 'Solução inovadora', rewrite: 'Aprenda a vender em 7 dias' },
    ]);
    expect(out.applied).toBe(1);
    expect(out.missed).toEqual([]);
    expect(out.html).toBe('<h1 class="hero">Aprenda a vender em 7 dias</h1><p>Compre agora</p>');
  });

  it('não reescreve conteúdo de script, style ou atributo', () => {
    const html =
      '<style>.x{content:"Solução inovadora"}</style>' +
      '<script>var t = "Solução inovadora";</script>' +
      '<img alt="Solução inovadora" src="/a.png">' +
      '<p>Solução inovadora</p>';
    const out = applyRewritesToHtml(html, [{ excerpt: 'Solução inovadora', rewrite: 'Método X' }]);
    expect(out.applied).toBe(1);
    expect(out.html).toContain('<style>.x{content:"Solução inovadora"}</style>');
    expect(out.html).toContain('var t = "Solução inovadora";');
    expect(out.html).toContain('alt="Solução inovadora"');
    expect(out.html).toContain('<p>Método X</p>');
  });

  it('tolera diferença de espaço e quebra de linha entre o excerpt e o HTML', () => {
    const html = '<p>\n  Resultados    garantidos\n</p>';
    const out = applyRewritesToHtml(html, [
      { excerpt: 'Resultados garantidos', rewrite: 'Resultados variam por pessoa' },
    ]);
    expect(out.applied).toBe(1);
    expect(out.html).toContain('Resultados variam por pessoa');
  });

  it('reporta em missed o trecho que atravessa tags, sem corromper o HTML', () => {
    const html = '<p>Ganhe <strong>muito</strong> dinheiro</p>';
    const out = applyRewritesToHtml(html, [
      { excerpt: 'Ganhe muito dinheiro', rewrite: 'Aumente seu faturamento' },
    ]);
    expect(out.applied).toBe(0);
    expect(out.missed).toEqual(['Ganhe muito dinheiro']);
    expect(out.html).toBe(html);
  });

  it('escapa o texto reescrito para não injetar markup', () => {
    const html = '<p>Clique aqui</p>';
    const out = applyRewritesToHtml(html, [
      { excerpt: 'Clique aqui', rewrite: '<script>alert(1)</script> & pronto' },
    ]);
    expect(out.applied).toBe(1);
    expect(out.html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; pronto</p>');
  });

  it('aplica cada rewrite uma única vez e ignora entradas vazias', () => {
    const html = '<p>Oferta única</p><p>Oferta única</p>';
    const out = applyRewritesToHtml(html, [
      { excerpt: 'Oferta única', rewrite: 'Oferta de lançamento' },
      { excerpt: '  ', rewrite: 'ignorado' },
    ]);
    expect(out.applied).toBe(1);
    expect(out.html).toBe('<p>Oferta de lançamento</p><p>Oferta única</p>');
  });

  it('devolve o html intacto quando não há rewrites', () => {
    const html = '<p>a &amp; b</p>';
    expect(applyRewritesToHtml(html, [])).toEqual({ html, applied: 0, missed: [] });
  });
});
