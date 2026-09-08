# Andre Oliveira Advocacia

Site institucional e blog jurídico em Vite e TypeScript.

## Comandos

```bash
npm install
npm run dev
npm run check
npm run test
npm run build
npm run preview
npm run test:browser
```

## Configuração

Copie `.env.example` para `.env.local` e informe a URL e a chave publicável do Supabase. Nunca use uma chave `service_role` no navegador.

## Arquitetura

- `src/domain`: modelos e regras puras.
- `src/application`: casos de uso e portas.
- `src/infrastructure`: Supabase, armazenamento e imagens.
- `src/presentation`: componentes compartilhados.
- `src/pages`: controladores de cada página.
- `src/styles`: estilos globais e responsivos.
- `scripts`: automação de imagens, fontes, sitemap e verificação.
- `public`: arquivos públicos, SEO técnico e mídia otimizada.

Os arquivos HTML na raiz são entradas multipágina do Vite. A hospedagem converte essas entradas em URLs limpas por meio do `.htaccess`.

## SEO e desempenho

- Metadados, canonical, Open Graph e dados estruturados.
- `robots.txt` e `sitemap.xml` gerados no build; `llms.txt` mantido em `public/`.
- Imagens estáticas convertidas para WebP.
- Fontes locais com preload e `font-display: swap`.
- Integração Supabase carregada sem bloquear a primeira renderização.

## Publicação

O projeto usa a base `/clientes/blogadvogado/`. Execute `npm run build` e publique somente o conteúdo de `dist/` nesse diretório do servidor. O build gera também o sitemap com artigos publicados.
