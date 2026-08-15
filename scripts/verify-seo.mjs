import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dynamicCanonicalPages = new Set(['area-detalhe.html', 'artigo.html']);
const publicPages = [
  'index.html',
  'areas-de-atuacao.html',
  'area-detalhe.html',
  'direito-previdenciario.html',
  'direito-trabalhista.html',
  'direito-civil.html',
  'blog.html',
  'artigo.html',
  'contato.html',
  'politica-de-privacidade.html',
  'politica-de-cookies.html',
  'termos-de-uso.html'
];

const failures = [];
for (const page of publicPages) {
  const html = await readFile(resolve(root, page), 'utf8');
  requireMatch(page, html, /<title>[^<]{10,}[^<]*<\/title>/i, 'título');
  requireMatch(page, html, /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{25,}["']/i, 'meta description');
  requireMatch(page, html, /<meta[^>]+name=["']robots["'][^>]+content=["']index,follow["']/i, 'robots indexável');
  if (!dynamicCanonicalPages.has(page)) {
    requireMatch(page, html, /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/brenochaves\.dev\/clientes\/blogadvogado\//i, 'canonical absoluto');
  }
  if (/href=["'][^"']+\.html(?:[?#"'])/i.test(html)) failures.push(`${page}: link interno com .html`);
}

await Promise.all(['public/llms.txt', 'public/robots.txt', 'public/sitemap.xml'].map(async (file) => {
  try {
    await access(resolve(root, file));
  } catch {
    failures.push(`${file}: arquivo ausente`);
  }
}));

if (failures.length > 0) {
  throw new Error(`SEO inválido:\n- ${failures.join('\n- ')}`);
}

console.log(`SEO validado em ${publicPages.length} páginas.`);

function requireMatch(page, html, pattern, label) {
  if (!pattern.test(html)) failures.push(`${page}: ${label} ausente`);
}
