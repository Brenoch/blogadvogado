import { resolve } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';

const page = (name: string) => resolve(import.meta.dirname, name);

const BASE = '/clientes/blogadvogado/';

const CLEAN_URL_ROUTES: [RegExp, string][] = [
  [/^areas-de-atuacao\/$/, 'areas-de-atuacao.html'],
  [/^area\/$/, 'area-detalhe.html'],
  [/^direito-previdenciario\/$/, 'direito-previdenciario.html'],
  [/^direito-trabalhista\/$/, 'direito-trabalhista.html'],
  [/^direito-civil\/$/, 'direito-civil.html'],
  [/^blog\/$/, 'blog.html'],
  [/^blog\/[^/]+\/$/, 'artigo.html'],
  [/^artigo\/$/, 'artigo.html'],
  [/^contato\/$/, 'contato.html'],
  [/^politica-de-privacidade\/$/, 'politica-de-privacidade.html'],
  [/^politica-de-cookies\/$/, 'politica-de-cookies.html'],
  [/^termos-de-uso\/$/, 'termos-de-uso.html'],
  [/^admin\/login\/$/, 'admin/login.html'],
  [/^admin\/editor\/$/, 'admin/editor.html'],
  [/^admin\/$/, 'admin/painel.html'],
  [/^areas-de-atuacao\/[^/]+\/$/, 'area-detalhe.html']
];

// Reproduces locally (dev + preview) the clean-URL rewrites that .htaccess
// only applies on the real Apache host, so links behave the same in both.
function cleanUrlsMiddleware(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(BASE)) return next();
    const [path = '', search = ''] = url.slice(BASE.length).split('?');
    const match = CLEAN_URL_ROUTES.find(([pattern]) => pattern.test(path));
    if (match) req.url = BASE + match[1] + (search ? `?${search}` : '');
    next();
  };
  return {
    name: 'clean-url-routes',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  base: BASE,
  plugins: [cleanUrlsMiddleware()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    sourcemap: false,
    rollupOptions: {
      input: {
        home: page('index.html'),
        areas: page('areas-de-atuacao.html'),
        areaDetail: page('area-detalhe.html'),
        previdenciario: page('direito-previdenciario.html'),
        trabalhista: page('direito-trabalhista.html'),
        civil: page('direito-civil.html'),
        blog: page('blog.html'),
        article: page('artigo.html'),
        contact: page('contato.html'),
        privacy: page('politica-de-privacidade.html'),
        cookies: page('politica-de-cookies.html'),
        terms: page('termos-de-uso.html'),
        adminLogin: page('admin/login.html'),
        adminPanel: page('admin/painel.html'),
        adminEditor: page('admin/editor.html'),
        notFound: page('404.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase';
          return undefined;
        }
      }
    }
  }
});
