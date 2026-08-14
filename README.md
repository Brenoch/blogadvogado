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

## Publicação

O projeto usa a base `/clientes/blogadvogado/`. Execute `npm run build` e publique somente o conteúdo de `dist/` nesse diretório do servidor. O build gera também o sitemap com artigos publicados.
