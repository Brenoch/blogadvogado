import './styles/fonts.css';
import './styles/tailwind.css';
import './styles/mobile-nav.css';
import './styles/common.css';
import { contentService } from './application/content-service';
import { CookieConsent } from './presentation/cookie-consent';
import { MobileNavigation } from './presentation/mobile-navigation';
import { SettingsPresenter } from './presentation/settings-presenter';
import { SeoPresenter } from './presentation/seo-presenter';
import { onReady } from './shared/dom';

const page = resolvePage();
const isAdmin = page.startsWith('admin-');

onReady(async () => {
  if (isAdmin) {
    await mountAdminPage();
    return;
  }

  new SettingsPresenter().mount();
  new SeoPresenter().apply();
  new MobileNavigation().mount();
  new CookieConsent().mount();
  mountHeaderEffect();

  if (['area-detail', 'direito-civil', 'direito-previdenciario', 'direito-trabalhista'].includes(page)) {
    await import('./styles/area-detalhe.css');
  }

  if (page === 'article') {
    const { ArticlePage } = await import('./pages/public/article-page');
    await new ArticlePage().mount();
    return;
  }

  if (page === 'blog') {
    const { BlogPage } = await import('./pages/public/blog-page');
    new BlogPage().mount();
  } else if (page === 'contact') {
    const { ContactPage } = await import('./pages/public/contact-page');
    new ContactPage().mount();
  } else if (page === 'area-detail') {
    const { mountAreaDetailPage } = await import('./pages/public/area-detail-page');
    mountAreaDetailPage();
  }

  try {
    await contentService.refreshPublic();
  } catch (error) {
    console.error('Não foi possível atualizar o conteúdo.', error);
  }
});

async function mountAdminPage(): Promise<void> {
  await import('./styles/admin-responsive.css');
  if (page === 'admin-login') {
    const { LoginPage } = await import('./pages/admin/login-page');
    await new LoginPage().mount();
    return;
  }
  if (page === 'admin-panel') {
    const [{ PanelPage }, { AdminNavigation }] = await Promise.all([
      import('./pages/admin/panel-page'),
      import('./presentation/admin-navigation')
    ]);
    new AdminNavigation().mount();
    await new PanelPage().mount();
    return;
  }
  if (page === 'admin-editor') {
    const { EditorPage } = await import('./pages/admin/editor-page');
    await new EditorPage().mount();
  }
}

function mountHeaderEffect(): void {
  const header = document.querySelector<HTMLElement>('body > header');
  if (!header) return;
  const update = (): void => {
    header.classList.toggle('shadow-md', scrollY > 20);
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

function resolvePage(): string {
  const basePath = new URL(import.meta.env.BASE_URL, location.origin).pathname.replace(/\/+$/, '');
  const relative = location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length)
    : location.pathname;
  const [first, second] = relative.split('/').filter(Boolean);

  if (!first || first === 'index.html') return 'home';
  if (first === 'admin') {
    if (second === 'login' || second === 'login.html') return 'admin-login';
    if (second === 'editor' || second === 'editor.html') return 'admin-editor';
    return 'admin-panel';
  }
  if (first === 'blog') return second ? 'article' : 'blog';
  if (first === 'areas-de-atuacao') return second ? 'area-detail' : 'areas';

  return ({
    'areas-de-atuacao.html': 'areas',
    'area-detalhe.html': 'area-detail',
    'direito-previdenciario.html': 'direito-previdenciario',
    'direito-previdenciario': 'direito-previdenciario',
    'direito-trabalhista.html': 'direito-trabalhista',
    'direito-trabalhista': 'direito-trabalhista',
    'direito-civil.html': 'direito-civil',
    'direito-civil': 'direito-civil',
    'blog.html': 'blog',
    'artigo.html': 'article',
    artigo: 'article',
    'contato.html': 'contact',
    contato: 'contact'
  } as Record<string, string>)[first] ?? 'home';
}
