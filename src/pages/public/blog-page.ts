import { contentService } from '../../application/content-service';
import { articleRoute } from '../../domain/defaults';
import type { Article } from '../../domain/models';
import { escapeHtml, formatArticleDate, safeImageUrl } from '../../domain/text';
import { requiredById } from '../../shared/dom';

export class BlogPage {
  private readonly search = requiredById<HTMLInputElement>('article-search');
  private readonly filterContainer = requiredById<HTMLElement>('category-filter-container');
  private readonly grid = requiredById<HTMLElement>('article-grid');
  private readonly featured = requiredById<HTMLElement>('featured-article');
  private readonly empty = requiredById<HTMLElement>('article-empty');
  private readonly pagination = requiredById<HTMLElement>('article-pagination');
  private activeFilter = 'todos';
  private currentPage = 1;
  private readonly pageSize = 6;

  public mount(): void {
    document.querySelectorAll('[data-article-item]').forEach((item) => item.remove());
    this.search.addEventListener('input', () => {
      this.currentPage = 1;
      this.renderArticles();
    });
    window.addEventListener('content:ready', () => this.render());
    this.render();
  }

  private render(): void {
    this.renderFilters();
    this.renderArticles();
  }

  private renderFilters(): void {
    const activeCategories = new Set(contentService.articles(true).map(({ category }) => category));
    if (this.activeFilter !== 'todos' && !activeCategories.has(this.activeFilter)) this.activeFilter = 'todos';
    const categories = contentService.categories().filter(({ slug }) => activeCategories.has(slug));
    const button = (slug: string, name: string): string => {
      const active = this.activeFilter === slug;
      const colors = active
        ? 'border-primary bg-primary text-on-primary'
        : 'border-outline-variant bg-transparent text-on-surface hover:border-primary hover:text-primary';
      return `<button type="button" data-article-filter="${escapeHtml(slug)}" aria-pressed="${String(active)}" class="px-4 h-10 border ${colors} font-label rounded transition-colors">${escapeHtml(name)}</button>`;
    };
    this.filterContainer.innerHTML = [button('todos', 'Todos'), ...categories.map(({ slug, name }) => button(slug, name))].join('');
    this.filterContainer.querySelectorAll<HTMLButtonElement>('[data-article-filter]').forEach((element) => {
      element.addEventListener('click', () => {
        this.activeFilter = element.dataset.articleFilter ?? 'todos';
        this.currentPage = 1;
        this.render();
      });
    });
  }

  private renderArticles(): void {
    const search = this.normalize(this.search.value);
    const matching = contentService.articles(true)
      .filter((article) => (!search || this.normalize(article.title).includes(search))
        && (this.activeFilter === 'todos' || article.category === this.activeFilter))
      .sort((left, right) => Date.parse(right.publishedAt ?? right.createdAt) - Date.parse(left.publishedAt ?? left.createdAt));

    const [featured, ...cards] = matching;
    const totalPages = Math.max(1, Math.ceil(cards.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, totalPages);
    const offset = (this.currentPage - 1) * this.pageSize;
    this.renderFeatured(featured);
    this.grid.innerHTML = cards.slice(offset, offset + this.pageSize).map((article) => this.card(article)).join('');
    this.empty.classList.toggle('hidden', matching.length > 0);
    this.renderPagination(totalPages);
  }

  private renderFeatured(article?: Article): void {
    if (!article) {
      this.featured.hidden = true;
      this.featured.innerHTML = '';
      return;
    }
    const title = escapeHtml(article.title);
    const summary = escapeHtml(article.summary || 'Conteúdo jurídico publicado pela Andre Oliveira Advocacia.');
    const category = escapeHtml(this.categoryName(article.category));
    const cover = safeImageUrl(article.coverImage);
    const image = cover
      ? `<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${escapeHtml(cover)}" alt="${title}" width="1200" height="750" loading="eager" decoding="async" fetchpriority="high">`
      : '<span class="material-symbols-outlined text-5xl text-outline/50">article</span>';
    this.featured.innerHTML = `<a class="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-outline-variant/20 bg-surface-container-lowest clip-angular group hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary" href="${articleRoute(article)}"><div class="relative h-64 lg:h-auto min-h-[320px] overflow-hidden bg-surface-container-low flex items-center justify-center">${image}<div class="absolute inset-0 bg-primary/10 pointer-events-none"></div></div><div class="p-lg lg:p-xl flex flex-col justify-center"><div class="flex items-center gap-4 mb-4"><span class="font-label text-primary tracking-widest uppercase text-xs border border-primary/20 px-2 py-1">${category}</span><span class="font-caption text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">schedule</span>${formatArticleDate(article.publishedAt)}</span></div><h2 class="font-h2-mobile md:font-h2 text-primary mb-4 group-hover:text-tertiary-container transition-colors">${title}</h2><p class="font-body text-on-surface-variant mb-6 line-clamp-4">${summary}</p><div class="mt-auto flex items-center gap-2 font-label text-label text-primary">Ler artigo</div></div></a>`;
    this.featured.hidden = false;
  }

  private card(article: Article): string {
    const title = escapeHtml(article.title);
    const summary = escapeHtml(article.summary || 'Conteúdo jurídico publicado pela Andre Oliveira Advocacia.');
    const cover = safeImageUrl(article.coverThumbnail || article.coverImage);
    const image = cover
      ? `<img class="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" src="${escapeHtml(cover)}" alt="${title}" width="600" height="375" loading="lazy" decoding="async">`
      : '<span class="material-symbols-outlined text-4xl text-outline/50">article</span>';
    return `<article class="flex flex-col bg-surface-container-lowest border border-outline-variant/20 clip-angular group hover:border-primary/50 transition-colors"><a class="flex flex-col flex-grow focus:outline-none focus:ring-2 focus:ring-primary" href="${articleRoute(article)}"><div class="relative w-full aspect-[16/10] overflow-hidden bg-surface-container-low flex items-center justify-center">${image}</div><div class="p-6 flex flex-col flex-grow"><div class="flex justify-between items-center mb-3"><span class="font-label text-primary text-xs uppercase tracking-wider">${escapeHtml(this.categoryName(article.category))}</span><span class="font-caption text-on-surface-variant">${formatArticleDate(article.publishedAt)}</span></div><h3 class="font-h3 text-primary mb-3 line-clamp-2 group-hover:text-tertiary-container transition-colors">${title}</h3><p class="font-body text-on-surface-variant mb-4 line-clamp-3">${summary}</p></div></a></article>`;
  }

  private renderPagination(totalPages: number): void {
    this.pagination.innerHTML = '';
    this.pagination.hidden = totalPages <= 1;
    if (totalPages <= 1) return;
    this.pagination.append(this.pageButton(this.currentPage - 1, 'chevron_left', 'Página anterior', this.currentPage === 1));
    for (let page = 1; page <= totalPages; page += 1) {
      this.pagination.append(this.pageButton(page, String(page), `Página ${page}`, false, page === this.currentPage));
    }
    this.pagination.append(this.pageButton(this.currentPage + 1, 'chevron_right', 'Próxima página', this.currentPage === totalPages));
  }

  private pageButton(page: number, label: string, ariaLabel: string, disabled: boolean, active = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = disabled;
    button.setAttribute('aria-label', ariaLabel);
    if (active) button.setAttribute('aria-current', 'page');
    button.className = active
      ? 'w-10 h-10 bg-primary text-on-primary font-label'
      : 'w-10 h-10 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary font-label transition-colors disabled:opacity-50';
    button.innerHTML = /^chevron_/.test(label)
      ? `<span class="material-symbols-outlined text-sm">${label}</span>`
      : label;
    button.addEventListener('click', () => {
      if (disabled) return;
      this.currentPage = page;
      this.renderArticles();
      document.getElementById('article-grid-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return button;
  }

  private categoryName(slug: string): string {
    return contentService.categories().find((category) => category.slug === slug)?.name ?? 'Sem categoria';
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
