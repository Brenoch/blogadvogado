import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'public');
const site = 'https://brenochaves.dev/clientes/blogadvogado';

await mkdir(publicDir, { recursive: true });
await Promise.all([
  copyFile(resolve(root, '.htaccess'), resolve(publicDir, '.htaccess')),
  copyFile(resolve(root, 'robots.txt'), resolve(publicDir, 'robots.txt'))
]);

const staticPages = [
  '/',
  '/areas-de-atuacao/',
  '/areas-de-atuacao/consumidor/',
  '/areas-de-atuacao/militar/',
  '/areas-de-atuacao/penal/',
  '/direito-previdenciario/',
  '/direito-trabalhista/',
  '/direito-civil/',
  '/blog/',
  '/contato/',
  '/politica-de-privacidade/',
  '/politica-de-cookies/',
  '/termos-de-uso/'
].map((path) => ({ loc: `${site}${path}`, lastmod: null }));

const env = await readEnvironment(resolve(root, '.env.production'));
const articles = await loadArticles(env).catch((error) => {
  console.warn(`Sitemap: artigos indisponíveis (${error.message}).`);
  return [];
});

const urls = [
  ...staticPages,
  ...articles.map((article) => ({
    loc: `${site}/blog/${encodeURIComponent(article.slug || article.id)}/`,
    lastmod: article.updated_at || article.published_at || null
  }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, lastmod }) => `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

await writeFile(resolve(publicDir, 'sitemap.xml'), xml, 'utf8');

async function loadArticles(env) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const response = await fetch(`${url}/rest/v1/articles?select=id,slug,updated_at,published_at&status=eq.published&order=published_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Prefere variáveis já presentes no processo (é assim que Cloudflare Pages,
// Vercel e qualquer CI moderno injetam segredos de build) e usa o arquivo
// .env.production só como conveniência local, quando ele existir. Nenhuma
// das duas fontes é obrigatória: sem credenciais, o sitemap sai só com as
// páginas estáticas, exatamente como o catch abaixo já esperava.
async function readEnvironment(path) {
  const fromProcess = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  };
  if (fromProcess.VITE_SUPABASE_URL && fromProcess.VITE_SUPABASE_PUBLISHABLE_KEY) return fromProcess;

  const content = await readFile(path, 'utf8').catch(() => '');
  const fromFile = Object.fromEntries(content.split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
  return { ...fromFile, ...fromProcess };
}

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[character]);
}
