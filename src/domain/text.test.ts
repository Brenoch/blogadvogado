import { describe, expect, it } from 'vitest';
import { escapeHtml, safeImageUrl, slugify, youtubeEmbedUrl } from './text';

describe('text utilities', () => {
  it('creates stable Portuguese slugs', () => {
    expect(slugify('Direito Previdenciário')).toBe('direito-previdenciario');
  });

  it('escapes user-provided markup', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });

  it('accepts safe image URLs only', () => {
    expect(safeImageUrl('https://example.com/image.webp')).toBe('https://example.com/image.webp');
    expect(safeImageUrl('/clientes/blogadvogado/images/187376365d715245.png'))
      .toBe('/clientes/blogadvogado/images/187376365d715245.webp');
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
  });

  it('uses the privacy-enhanced YouTube player', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbedUrl('https://example.com/video')).toBe('');
  });
});
