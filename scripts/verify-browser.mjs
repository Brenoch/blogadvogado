import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/clientes/blogadvogado';
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDirectory = resolve('artifacts');
const routes = [
  ['inicio', '/'],
  ['areas', '/areas-de-atuacao/'],
  ['blog', '/blog/'],
  ['contato', '/contato/'],
  ['login', '/admin/login/'],
];

await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const failures = [];

async function verifyViewport(name, viewport) {
  const context = await browser.newContext({ viewport, locale: 'pt-BR' });

  for (const [routeName, path] of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()} ${message.location().url}`.trim());
    });
    page.on('response', (item) => {
      if (item.status() >= 400) errors.push(`response: HTTP ${item.status()} ${item.url()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? 'falha desconhecida';
      if (!failure.includes('ERR_ABORTED')) errors.push(`request: ${request.url()} (${failure})`);
    });

    const response = await page.goto(`${origin}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    const bodyText = await page.locator('body').innerText();
    const title = await page.title();

    if (!response?.ok()) errors.push(`HTTP ${response?.status() ?? 'sem resposta'}`);
    if (!title.trim()) errors.push('título vazio');
    const rawIconText = await page.evaluate(() => {
      const iterator = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const rawIcons = /^(chevron_(left|right)|arrow_forward(_ios)?)$/i;
      let node = iterator.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (rawIcons.test(node.textContent?.trim() ?? '') && !parent?.classList.contains('material-symbols-outlined')) return true;
        node = iterator.nextNode();
      }
      return false;
    });
    if (/Cannot read properties|Erro 404/i.test(bodyText) || rawIconText) {
      errors.push('texto de erro ou ícone bruto visível');
    }

    if (routeName === 'blog') {
      await page.waitForTimeout(700);
      const articleLinks = await page.locator('a[href*="/blog/"]').count();
      if (articleLinks === 0 && !/Nenhum artigo/i.test(bodyText)) errors.push('blog sem artigos e sem estado vazio');
    }

    if (routeName === 'contato') {
      const mapLinks = await page.locator('a[href*="google.com/maps"], a[href*="maps.google"]').count();
      const maps = await page.locator('iframe[src*="google.com/maps"]').count();
      if (mapLinks === 0) errors.push('link do Google Maps ausente');
      if (maps === 0) errors.push('mapa incorporado ausente');
    }

    if (routeName === 'login') {
      const email = await page.locator('input[type="email"]').count();
      const password = await page.locator('input[type="password"]').count();
      if (email !== 1 || password !== 1) errors.push('formulário de login incompleto');
    }

    if (name === 'mobile' && routeName === 'inicio') {
      const logo = page.locator('header img, nav img').first();
      if (!(await logo.isVisible())) errors.push('logo móvel ausente');
    }

    await page.screenshot({ path: resolve(artifactDirectory, `${name}-${routeName}.png`), fullPage: true });
    if (errors.length) failures.push({ viewport: name, route: path, errors });
    await page.close();
  }

  await context.close();
}

await verifyViewport('desktop', { width: 1440, height: 900 });
await verifyViewport('mobile', { width: 390, height: 844 });
await browser.close();

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('10 verificações visuais concluídas sem erros.');
}
