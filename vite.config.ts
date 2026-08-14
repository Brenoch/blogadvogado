import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name: string) => resolve(import.meta.dirname, name);

export default defineConfig({
  base: '/clientes/blogadvogado/',
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
          if (id.includes('@fontsource')) return 'fonts';
          return undefined;
        }
      }
    }
  }
});
