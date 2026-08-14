import { contentService } from '../../application/content-service';
import { articleRoute, route } from '../../domain/defaults';
import type { Article } from '../../domain/models';
import {
  escapeHtml,
  formatArticleDate,
  safeImageUrl,
  sanitizeArticleHtml,
  slugify,
  youtubeEmbedUrl
} from '../../domain/text';
import { requiredById } from '../../shared/dom';
import { SeoPresenter } from '../../presentation/seo-presenter';

const BOOKMARKS_KEY = 'andres_saved_articles';

export class ArticlePage {
  public async mount(): Promise<void> {
    const parameters = new URLSearchParams(location.search);
    const articleId = parameters.get('id') ?? parameters.get('slug') ?? this.articleSlugFromPath();
    const preview = parameters.get('preview') === '1';

    try {
      if (preview) {
        if (!await contentService.isAdmin()) {
          location.replace(route('admin/login/'));
          return;
        }
        await contentService.refreshAdmin();
      } else {
        await contentService.refreshPublic();
      }
    } catch (error) {
      console.error('Falha ao carregar o artigo.', error);
      location.replace(preview ? route('admin/login/') : route('blog/'));
      return;
    }

    const article = articleId ? contentService.article(articleId) : null;
    if (!article || (!preview && article.status !== 'published')) {
      location.replace(route('blog/'));
      return;
    }
    this.render(article, preview);
  }

  private render(article: Article, preview: boolean): void {
    const settings = contentService.settings();
    const author = contentService.author(article.authorId);
    const canonical = `${location.origin}${articleRoute(article)}`;
    const seo = new SeoPresenter();
    seo.apply({
      title: `${article.title} | ${settings.siteName}`,
      description: article.summary,
      canonical,
      image: safeImageUrl(article.coverImage),
      type: 'article'
    });
    seo.structuredData('article-json-ld', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.summary,
      image: safeImageUrl(article.coverImage) || undefined,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: { '@type': 'Person', name: author?.name || 'Andres Oliveira' },
      publisher: { '@type': 'LegalService', name: settings.siteName },
      mainEntityOfPage: canonical
    });

    const title = document.querySelector<HTMLElement>('main header h1');
    const category = document.querySelector<HTMLElement>('main header .flex span');
    const content = document.querySelector<HTMLElement>('article.article-content');
    if (!title || !category || !content) throw new Error('Estrutura do artigo incompleta.');
    title.textContent = article.title;
    category.textContent = this.categoryName(article.category);

    const authorName = requiredById<HTMLElement>('article-author-name');
    const authorAvatar = requiredById<HTMLImageElement>('article-author-avatar');
    const meta = requiredById<HTMLElement>('article-meta');
    if (author) {
      authorName.textContent = author.name;
      const photo = safeImageUrl(author.avatarUrl);
      if (photo) authorAvatar.src = photo;
      authorAvatar.alt = author.name;
    }
    meta.textContent = preview && article.status !== 'published'
      ? 'Prévia de rascunho'
      : `${author?.role || 'Advogado(a)'} • Publicado em ${formatArticleDate(article.publishedAt)}`;

    content.innerHTML = article.content.trim()
      ? sanitizeArticleHtml(article.content)
      : `<p>${escapeHtml(article.summary || 'Conteúdo em atualização.')}</p>`;
    content.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });

    this.renderTableOfContents(content);
    this.mountShare(article);
    this.mountBookmark(article);
    this.renderMedia(article);
    this.renderRelated(article);
  }

  private renderTableOfContents(content: HTMLElement): void {
    const table = requiredById<HTMLElement>('article-toc');
    const headings = [...content.querySelectorAll<HTMLHeadingElement>('h2')];
    const used = new Map<string, number>();
    table.innerHTML = '';
    headings.forEach((heading, index) => {
      const base = slugify(heading.textContent ?? '') || `secao-${index + 1}`;
      const count = (used.get(base) ?? 0) + 1;
      used.set(base, count);
      heading.id = count > 1 ? `${base}-${count}` : base;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = 'pl-sm py-1 text-sm text-on-surface-variant hover:text-primary hover:border-l-2 hover:border-primary -ml-px transition-colors';
      link.textContent = heading.textContent;
      table.appendChild(link);
    });
    const aside = table.closest<HTMLElement>('aside');
    if (aside) aside.hidden = headings.length === 0;
  }

  private mountShare(article: Article): void {
    const button = requiredById<HTMLButtonElement>('share-article');
    button.addEventListener('click', async () => {
      const data = { title: article.title, text: article.summary || article.title, url: location.href };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(location.href);
          button.title = 'Link copiado';
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) button.title = 'Não foi possível compartilhar';
      }
    });
  }

  private mountBookmark(article: Article): void {
    const button = requiredById<HTMLButtonElement>('bookmark-article');
    const icon = button.querySelector<HTMLElement>('.material-symbols-outlined');
    let bookmarks: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? '[]') as unknown;
      bookmarks = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
    } catch {
      bookmarks = [];
    }
    const render = (): void => {
      const saved = bookmarks.includes(article.id);
      if (icon) icon.textContent = saved ? 'bookmark' : 'bookmark_border';
      button.setAttribute('aria-label', saved ? 'Remover artigo dos salvos' : 'Salvar artigo');
      button.title = saved ? 'Artigo salvo' : 'Salvar artigo';
    };
    button.addEventListener('click', () => {
      bookmarks = bookmarks.includes(article.id)
        ? bookmarks.filter((id) => id !== article.id)
        : [...bookmarks, article.id];
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      render();
    });
    render();
  }

  private renderMedia(article: Article): void {
    const featuredMedia = requiredById<HTMLElement>('article-featured-media');
    const featuredImage = requiredById<HTMLImageElement>('article-featured-image');
    const cover = safeImageUrl(article.coverImage);
    if (cover) {
      featuredImage.src = cover;
      featuredImage.alt = article.title;
      featuredMedia.hidden = false;
    } else {
      featuredMedia.hidden = true;
    }

    const videoPlayer = requiredById<HTMLElement>('article-video-player');
    const embed = youtubeEmbedUrl(article.videoUrl);
    const frameContainer = videoPlayer.querySelector<HTMLElement>('.aspect-video');
    if (embed && frameContainer) {
      frameContainer.innerHTML = `<iframe class="w-full h-full" src="${embed}" title="Vídeo do artigo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      videoPlayer.hidden = false;
    } else {
      videoPlayer.hidden = true;
    }
  }

  private renderRelated(article: Article): void {
    const section = requiredById<HTMLElement>('related-articles-section');
    const grid = requiredById<HTMLElement>('related-articles-grid');
    const related = contentService.articles(true)
      .filter((item) => item.id !== article.id && item.category === article.category)
      .slice(0, 3);
    section.hidden = related.length === 0;
    grid.innerHTML = related.map((item) => this.relatedCard(item)).join('');
  }

  private relatedCard(article: Article): string {
    const title = escapeHtml(article.title);
    const summary = escapeHtml(article.summary || 'Conteúdo jurídico publicado pela Andre Oliveira Advocacia.');
    const cover = safeImageUrl(article.coverThumbnail || article.coverImage);
    const image = cover
      ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${escapeHtml(cover)}" alt="${title}" width="600" height="375" loading="lazy" decoding="async">`
      : '<span class="material-symbols-outlined text-4xl text-outline/50">article</span>';
    return `<a class="group block bg-surface border border-outline-variant/30 hover:border-primary/50 transition-colors angular-cut-sm overflow-hidden flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-primary" href="${articleRoute(article)}"><div class="w-full aspect-[16/10] overflow-hidden bg-surface-container flex items-center justify-center">${image}</div><div class="p-md flex flex-col flex-grow bg-white"><div class="flex items-center gap-xs mb-sm"><span class="font-label text-[10px] uppercase tracking-widest text-surface-tint">${escapeHtml(this.categoryName(article.category))}</span><span class="text-outline-variant text-[10px]">•</span><span class="font-label text-[10px] uppercase tracking-widest text-outline">${formatArticleDate(article.publishedAt)}</span></div><h4 class="font-h2-mobile text-[20px] leading-[28px] font-bold text-primary mb-sm line-clamp-3">${title}</h4><p class="font-body text-body text-on-surface-variant line-clamp-3">${summary}</p></div></a>`;
  }

  private articleSlugFromPath(): string | null {
    const pathname = location.pathname.replace(/\/+$/, '');
    const match = pathname.match(/\/blog\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  private categoryName(slug: string): string {
    return contentService.categories().find((category) => category.slug === slug)?.name ?? 'Sem categoria';
  }
}
