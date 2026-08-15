export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character] ?? character);
}

export function safeImageUrl(value: unknown): string {
  const url = String(value ?? '').trim();
  if (!/^(https?:\/\/|\/(?!\/)|data:image\/(jpeg|png|webp);base64,)/i.test(url)) return '';
  return optimizeLegacyImageUrl(url);
}

const optimizedStaticImages = new Set([
  '041cbf2d42c6d15f',
  '187376365d715245',
  '1fb1e1048c240597',
  '89021c88bdf02655',
  '9dfe3dde7dcebb7c',
  'da0602dd94c3e7a7'
]);

function optimizeLegacyImageUrl(url: string): string {
  return url.replace(/\/images\/([a-f0-9]+)\.(?:png|jpe?g)(?=\?|#|$)/i, (match, id: string) => (
    optimizedStaticImages.has(id.toLowerCase()) ? `/images/${id}.webp` : match
  ));
}

export function youtubeEmbedUrl(value: unknown): string {
  try {
    const url = new URL(String(value ?? '').trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (/(^|\.)youtube\.com$/.test(host)) {
      id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? '';
    }
    return /^[A-Za-z0-9_-]{6,}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
      : '';
  } catch {
    return '';
  }
}

export function formatArticleDate(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatContactDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function newUuid(): string {
  return crypto.randomUUID();
}

export function isUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ''));
}
