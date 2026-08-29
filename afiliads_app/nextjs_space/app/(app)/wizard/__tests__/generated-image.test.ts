import { describe, it, expect } from 'vitest';
import { normalizeGeneratedImage, buildVisualPrompt } from '../_components/step-creative-gen';

describe('normalizeGeneratedImage', () => {
  it('lê imageUrl na raiz', () => {
    expect(normalizeGeneratedImage({ imageUrl: 'https://cdn.x/a.png', model: 'flux-1.1' }, 'facebook-ad')).toEqual({
      url: 'https://cdn.x/a.png', kind: 'facebook-ad', model: 'flux-1.1', prompt: null, mock: false,
    });
  });

  it('aceita caminho servido pelo próprio app', () => {
    expect(normalizeGeneratedImage({ path: '/generated/capa-3d.png' }, 'ebook-cover')?.url)
      .toBe('/generated/capa-3d.png');
  });

  it('aceita a forma aninhada em images[]', () => {
    const out = normalizeGeneratedImage(
      { images: [{ url: 'https://cdn.x/b.png', prompt: 'capa 3d premium', model: 'comfy-sdxl' }] },
      'ebook-cover',
    );
    expect(out).toMatchObject({ url: 'https://cdn.x/b.png', prompt: 'capa 3d premium', model: 'comfy-sdxl' });
  });

  it('lê a forma real da rota: { success, mock, path }', () => {
    const out = normalizeGeneratedImage(
      { success: true, mock: true, path: '/images/mocks/ebook-cover-placeholder.png' },
      'ebook-cover',
    );
    expect(out).toEqual({
      url: '/images/mocks/ebook-cover-placeholder.png', kind: 'ebook-cover',
      model: null, prompt: null, mock: true,
    });
  });

  it('recusa esquema que o browser não deve renderizar', () => {
    expect(normalizeGeneratedImage({ imageUrl: 'file:///Users/x/a.png' }, 'facebook-ad')).toBeNull();
    expect(normalizeGeneratedImage({ imageUrl: 'data:image/png;base64,AAA' }, 'facebook-ad')).toBeNull();
    expect(normalizeGeneratedImage({ imageUrl: 'javascript:alert(1)' }, 'facebook-ad')).toBeNull();
  });

  it('devolve null quando o 200 não traz caminho de imagem', () => {
    expect(normalizeGeneratedImage({ status: 'queued' }, 'facebook-ad')).toBeNull();
    expect(normalizeGeneratedImage(null, 'facebook-ad')).toBeNull();
  });

  it('monta prompts distintos por tipo, sem quebrar sem produto ou vertical', () => {
    const cover = buildVisualPrompt('ebook-cover', 'Femicore', 'saúde feminina', 'Alerta de Fraude');
    const banner = buildVisualPrompt('facebook-ad', 'Femicore', 'saúde feminina', 'Alerta de Fraude');
    expect(cover).toContain('Capa 3D');
    expect(banner).toContain('1.91:1');
    expect(banner).toContain('Alerta de Fraude');
    expect(buildVisualPrompt('ebook-cover', '  ', '  ', '')).toContain('produto digital');
  });
});
