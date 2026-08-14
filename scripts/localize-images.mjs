import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  'index.html',
  'areas-de-atuacao.html',
  'area-detalhe.html',
  'artigo.html',
  'blog.html',
  'contato.html',
  'direito-civil.html',
  'direito-previdenciario.html',
  'direito-trabalhista.html',
  'src/domain/defaults.ts',
];
const outputDirectory = resolve('public/images');
const remoteImagePattern = /https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9_?&=./%-]+?(?=["'<\s]|&quot;)/g;

await mkdir(outputDirectory, { recursive: true });

for (const file of files) {
  const path = resolve(file);
  let source = await readFile(path, 'utf8');
  const urls = [...new Set(source.match(remoteImagePattern) ?? [])];

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Imagem indisponível mantida para substituição: HTTP ${response.status}`);
      continue;
    }
    const type = response.headers.get('content-type') ?? '';
    const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${createHash('sha256').update(url).digest('hex').slice(0, 16)}.${extension}`;
    await writeFile(resolve(outputDirectory, fileName), Buffer.from(await response.arrayBuffer()));
    source = source.replaceAll(url, `/clientes/blogadvogado/images/${fileName}`);
  }

  await writeFile(path, source, 'utf8');
}

console.log('Imagens externas copiadas para public/images.');
