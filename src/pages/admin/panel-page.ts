import { contentService } from '../../application/content-service';
import { route } from '../../domain/defaults';
import type { Author, ContactMessage, SiteSettings } from '../../domain/models';
import { escapeHtml, formatArticleDate, formatContactDate, safeImageUrl } from '../../domain/text';
import { imageCompressor } from '../../infrastructure/images/image-compressor';
import { requiredById, setFeedback } from '../../shared/dom';

type PanelName = 'overview' | 'articles' | 'categories' | 'authors' | 'contacts' | 'settings';

const PANEL_TITLES: Record<PanelName, string> = {
  overview: 'Visão Geral',
  articles: 'Artigos',
  categories: 'Categorias',
  authors: 'Advogados',
  contacts: 'Contatos',
  settings: 'Configurações'
};

export class PanelPage {
  private currentPage = 1;
  private readonly pageSize = 10;
  private authorAvatar = '';

  public async mount(): Promise<void> {
    try {
      if (!await contentService.isAdmin()) {
        location.replace(route('admin/login/'));
        return;
      }
      await contentService.refreshAdmin();
    } catch {
      location.replace(route('admin/login/'));
      return;
    }

    this.bindNavigation();
    this.bindArticles();
    this.bindCategories();
    this.bindAuthors();
    this.bindSettings();
    this.bindContacts();
    this.bindLogout();
    this.renderArticles();
    this.renderAuthors();
    this.setPanel(this.panelFromHash(), false);
    window.addEventListener('hashchange', () => this.setPanel(this.panelFromHash(), false));
  }

  private bindNavigation(): void {
    document.querySelectorAll<HTMLAnchorElement>('[data-panel-target]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.setPanel(this.asPanel(link.dataset.panelTarget), true);
      });
    });
    document.querySelectorAll<HTMLButtonElement>('[data-open-panel]').forEach((button) => {
      button.addEventListener('click', () => this.setPanel(this.asPanel(button.dataset.openPanel), true));
    });
  }

  private bindArticles(): void {
    const search = requiredById<HTMLInputElement>('search');
    const status = requiredById<HTMLSelectElement>('status-filter');
    const apply = (): void => {
      this.currentPage = 1;
      this.renderArticles();
    };
    search.addEventListener('input', apply);
    search.addEventListener('search', apply);
    status.addEventListener('change', apply);
    requiredById<HTMLButtonElement>('apply-filters').addEventListener('click', apply);
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        apply();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        apply();
      }
    });
  }

  private bindCategories(): void {
    requiredById<HTMLFormElement>('category-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = requiredById<HTMLInputElement>('category-name');
      const feedback = document.getElementById('category-feedback');
      try {
        await contentService.addCategory(input.value);
        input.value = '';
        setFeedback(feedback, 'Categoria adicionada.', true);
        this.renderCategories();
        this.renderOverview();
      } catch (error) {
        setFeedback(feedback, this.message(error, 'Não foi possível salvar.'));
      }
    });
    requiredById<HTMLElement>('category-list').addEventListener('click', async (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-remove-category]');
      if (!button?.dataset.removeCategory) return;
      try {
        await contentService.deleteCategory(button.dataset.removeCategory);
        setFeedback(document.getElementById('category-feedback'), 'Categoria removida.', true);
        this.renderCategories();
        this.renderOverview();
      } catch (error) {
        setFeedback(document.getElementById('category-feedback'), this.message(error, 'Não foi possível remover.'));
      }
    });
  }

  private bindAuthors(): void {
    const input = requiredById<HTMLInputElement>('author-avatar-input');
    const dropzone = requiredById<HTMLElement>('author-avatar-dropzone');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.loadAvatar(file);
    });
    ['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('border-primary', 'bg-primary/10');
    }));
    ['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('border-primary', 'bg-primary/10');
    }));
    dropzone.addEventListener('drop', (event) => {
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/'));
      if (file) void this.loadAvatar(file);
    });
    requiredById<HTMLButtonElement>('author-cancel').addEventListener('click', () => this.resetAuthorForm());
    requiredById<HTMLFormElement>('author-form').addEventListener('submit', (event) => void this.saveAuthor(event));
    requiredById<HTMLElement>('author-list').addEventListener('click', (event) => void this.handleAuthorAction(event));
  }

  private bindSettings(): void {
    requiredById<HTMLFormElement>('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const settings: SiteSettings = {
        siteName: requiredById<HTMLInputElement>('setting-site-name').value.trim(),
        email: requiredById<HTMLInputElement>('setting-email').value.trim(),
        oab: requiredById<HTMLInputElement>('setting-oab').value.trim(),
        address: requiredById<HTMLTextAreaElement>('setting-address').value.trim(),
        phone: requiredById<HTMLInputElement>('setting-phone').value.trim(),
        officeHours: requiredById<HTMLInputElement>('setting-office-hours').value.trim()
      };
      try {
        await contentService.saveSettings(settings);
        setFeedback(document.getElementById('settings-feedback'), 'Configurações salvas.', true);
      } catch (error) {
        setFeedback(document.getElementById('settings-feedback'), this.message(error, 'Não foi possível salvar.'));
      }
    });
  }

  private bindContacts(): void {
    requiredById<HTMLElement>('contacts-list').addEventListener('click', async (event) => {
      const target = event.target as Element | null;
      const readButton = target?.closest<HTMLButtonElement>('[data-read-contact]');
      const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-contact]');
      try {
        if (readButton?.dataset.readContact) await contentService.markContactRead(readButton.dataset.readContact);
        if (deleteButton?.dataset.deleteContact && confirm('Excluir este contato?')) {
          await contentService.deleteContact(deleteButton.dataset.deleteContact);
        }
        this.renderContacts();
      } catch (error) {
        alert(this.message(error, 'Não foi possível atualizar o contato.'));
      }
    });
  }

  private bindLogout(): void {
    requiredById<HTMLButtonElement>('admin-logout').addEventListener('click', async () => {
      await contentService.signOut();
      location.replace(route('admin/login/'));
    });
  }

  private setPanel(panel: PanelName, updateHash: boolean): void {
    const names = Object.keys(PANEL_TITLES) as PanelName[];
    names.forEach((name) => {
      const element = document.getElementById(`${name}-panel`);
      if (element) element.hidden = name !== panel;
    });
    document.querySelectorAll<HTMLElement>('[data-panel-target]').forEach((link) => {
      const selected = link.dataset.panelTarget === panel;
      link.setAttribute('aria-current', selected ? 'page' : 'false');
      ['bg-white/10', 'text-on-secondary', 'relative', 'before:absolute', 'before:left-0', 'before:top-0', 'before:bottom-0', 'before:w-1', 'before:bg-primary-fixed']
        .forEach((className) => link.classList.toggle(className, selected));
      link.classList.toggle('text-moon-breeze', !selected);
    });
    requiredById<HTMLElement>('panel-title').textContent = PANEL_TITLES[panel];
    const newArticle = document.querySelector<HTMLElement>('header a[href*="admin/editor/"]');
    if (newArticle) newArticle.hidden = !['overview', 'articles'].includes(panel);
    if (panel === 'overview') this.renderOverview();
    if (panel === 'categories') this.renderCategories();
    if (panel === 'authors') this.renderAuthors();
    if (panel === 'contacts') this.renderContacts();
    if (panel === 'settings') this.renderSettings();
    if (updateHash) location.hash = panel;
  }

  private renderOverview(): void {
    const articles = contentService.articles();
    requiredById<HTMLElement>('overview-published').textContent = String(articles.filter(({ status }) => status === 'published').length);
    requiredById<HTMLElement>('overview-drafts').textContent = String(articles.filter(({ status }) => status === 'draft').length);
    requiredById<HTMLElement>('overview-categories').textContent = String(contentService.categories().length);
    const recent = articles.slice(0, 5);
    requiredById<HTMLElement>('overview-recent').innerHTML = recent.length
      ? recent.map((article) => `<a class="flex items-center justify-between gap-sm border-t border-outline-variant/20 pt-sm text-primary hover:text-tertiary-container" href="${route(`admin/editor/?id=${encodeURIComponent(article.id)}`)}"><span class="font-label text-label truncate">${escapeHtml(article.title)}</span><span class="font-caption text-on-surface-variant shrink-0">${formatArticleDate(article.status === 'published' ? article.publishedAt : article.updatedAt)}</span></a>`).join('')
      : '<p class="text-on-surface-variant">Nenhum artigo criado.</p>';
  }

  private renderCategories(): void {
    requiredById<HTMLElement>('category-list').innerHTML = contentService.categories().map((category) => {
      const action = category.locked
        ? '<span class="font-caption text-on-surface-variant">Padrão</span>'
        : `<button type="button" data-remove-category="${escapeHtml(category.slug)}" class="text-error font-label text-label">Remover</button>`;
      return `<div class="bg-surface-container-lowest border border-outline-variant/20 p-sm flex items-center justify-between gap-sm"><div><p class="font-label text-label text-primary">${escapeHtml(category.name)}</p><p class="font-caption text-on-surface-variant">${escapeHtml(category.slug)}</p></div>${action}</div>`;
    }).join('');
  }

  private renderArticles(): void {
    const search = this.normalize(requiredById<HTMLInputElement>('search').value);
    const status = requiredById<HTMLSelectElement>('status-filter').value;
    const all = contentService.articles();
    const filtered = all.filter((article) => (!search || this.normalize(article.title).includes(search)) && (!status || article.status === status));
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    const page = filtered.slice(start, start + this.pageSize);
    requiredById<HTMLElement>('total-count').textContent = String(all.length);
    requiredById<HTMLElement>('published-count').textContent = String(all.filter(({ status }) => status === 'published').length);
    requiredById<HTMLElement>('draft-count').textContent = String(all.filter(({ status }) => status === 'draft').length);
    requiredById<HTMLElement>('articles-summary').textContent = filtered.length
      ? `Mostrando ${start + 1}-${start + page.length} de ${filtered.length}`
      : 'Nenhum artigo encontrado';
    const body = requiredById<HTMLTableSectionElement>('articles-table-body');
    body.innerHTML = page.length ? page.map((article) => this.articleRow(article)).join('') : '<tr><td colspan="5" class="py-xl px-gutter text-center text-on-surface-variant">Nenhum artigo criado.</td></tr>';
    body.querySelectorAll<HTMLButtonElement>('[data-delete-article]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.deleteArticle;
        if (!id || !confirm('Excluir este artigo?')) return;
        try {
          await contentService.deleteArticle(id);
          this.renderArticles();
          this.renderOverview();
        } catch (error) {
          alert(this.message(error, 'Não foi possível excluir o artigo.'));
        }
      });
    });
    this.renderPagination(totalPages);
  }

  private articleRow(article: ReturnType<typeof contentService.articles>[number]): string {
    const published = article.status === 'published';
    const category = contentService.categories().find(({ slug }) => slug === article.category)?.name ?? 'Sem categoria';
    return `<tr class="hover:bg-surface-container/50 transition-colors group"><td class="py-md px-gutter"><p class="font-label text-label text-primary truncate max-w-[200px] sm:max-w-xs md:max-w-md">${escapeHtml(article.title)}</p></td><td class="py-md px-gutter hidden md:table-cell text-on-surface-variant">${escapeHtml(category)}</td><td class="py-md px-gutter"><span class="inline-flex items-center px-2 py-1 rounded font-caption text-caption ${published ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'}">${published ? 'Publicado' : 'Rascunho'}</span></td><td class="py-md px-gutter hidden sm:table-cell text-on-surface-variant text-sm">${formatArticleDate(published ? article.publishedAt : article.updatedAt)}</td><td class="py-md px-gutter text-right"><a class="text-outline hover:text-primary transition-colors p-1 inline-block" title="Editar artigo" href="${route(`admin/editor/?id=${encodeURIComponent(article.id)}`)}"><span class="material-symbols-outlined text-[20px]">edit</span></a><button data-delete-article="${escapeHtml(article.id)}" class="text-outline hover:text-error transition-colors p-1" type="button" title="Excluir artigo"><span class="material-symbols-outlined text-[20px]">delete</span></button></td></tr>`;
  }

  private renderPagination(totalPages: number): void {
    const pagination = requiredById<HTMLElement>('admin-pagination');
    pagination.innerHTML = '';
    pagination.hidden = totalPages <= 1;
    if (totalPages <= 1) return;
    const add = (label: string, page: number, disabled: boolean, active = false): void => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.className = active
        ? 'w-8 h-8 flex items-center justify-center border border-outline-variant/20 bg-primary text-on-primary font-label'
        : 'w-8 h-8 flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container disabled:opacity-50';
      button.addEventListener('click', () => {
        this.currentPage = page;
        this.renderArticles();
      });
      pagination.appendChild(button);
    };
    add('‹', this.currentPage - 1, this.currentPage === 1);
    for (let page = 1; page <= totalPages; page += 1) add(String(page), page, false, page === this.currentPage);
    add('›', this.currentPage + 1, this.currentPage === totalPages);
  }

  private async loadAvatar(file: File): Promise<void> {
    try {
      this.authorAvatar = await imageCompressor.avatar(file);
      this.renderAvatarPreview(this.authorAvatar);
      requiredById<HTMLElement>('author-avatar-instruction').textContent = 'Foto pronta para salvar';
    } catch (error) {
      setFeedback(document.getElementById('author-feedback'), this.message(error, 'Não foi possível processar a foto.'));
    }
  }

  private renderAvatarPreview(source: string): void {
    const preview = requiredById<HTMLImageElement>('author-avatar-preview');
    const placeholder = requiredById<HTMLElement>('author-avatar-placeholder');
    const avatar = safeImageUrl(source);
    preview.classList.toggle('hidden', !avatar);
    placeholder.classList.toggle('hidden', Boolean(avatar));
    preview.src = avatar;
  }

  private async saveAuthor(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const name = requiredById<HTMLInputElement>('author-name').value.trim();
    const role = requiredById<HTMLInputElement>('author-role').value.trim();
    const id = requiredById<HTMLInputElement>('author-id').value;
    const feedback = document.getElementById('author-feedback');
    if (!name || !role) {
      setFeedback(feedback, 'Informe nome e cargo.');
      return;
    }
    if (!this.authorAvatar) {
      setFeedback(feedback, 'Adicione uma foto do advogado.');
      return;
    }
    const existing = contentService.authors().find((author) => author.id === id);
    setFeedback(feedback, 'Salvando advogado...', true);
    try {
      await contentService.saveAuthor({
        id: existing?.id,
        slug: existing?.slug,
        name,
        role,
        avatarUrl: this.authorAvatar,
        isDefault: existing?.isDefault ?? false,
        createdAt: existing?.createdAt,
        updatedAt: existing?.updatedAt
      });
      this.resetAuthorForm();
      this.renderAuthors();
      this.renderOverview();
      setFeedback(feedback, 'Advogado salvo.', true);
    } catch (error) {
      setFeedback(feedback, this.message(error, 'Não foi possível salvar o advogado.'));
    }
  }

  private async handleAuthorAction(event: Event): Promise<void> {
    const target = event.target as Element | null;
    const edit = target?.closest<HTMLButtonElement>('[data-edit-author]');
    const remove = target?.closest<HTMLButtonElement>('[data-remove-author]');
    if (edit?.dataset.editAuthor) {
      const author = contentService.authors().find(({ id }) => id === edit.dataset.editAuthor);
      if (author) this.editAuthor(author);
    }
    if (remove?.dataset.removeAuthor) {
      const author = contentService.authors().find(({ id }) => id === remove.dataset.removeAuthor);
      if (!author || !confirm(`Remover ${author.name}?`)) return;
      try {
        await contentService.deleteAuthor(author.id);
        this.renderAuthors();
      } catch (error) {
        const message = this.message(error, 'Não foi possível remover o advogado.');
        alert(message.includes('23503') || message.toLowerCase().includes('foreign key')
          ? 'Não é possível remover um advogado vinculado a artigos.'
          : message);
      }
    }
  }

  private editAuthor(author: Author): void {
    requiredById<HTMLInputElement>('author-id').value = author.id;
    requiredById<HTMLInputElement>('author-name').value = author.name;
    requiredById<HTMLInputElement>('author-role').value = author.role;
    this.authorAvatar = author.avatarUrl;
    this.renderAvatarPreview(this.authorAvatar);
    requiredById<HTMLElement>('author-avatar-instruction').textContent = 'Selecione outra foto para substituir';
    requiredById<HTMLButtonElement>('author-cancel').classList.remove('hidden');
    setFeedback(document.getElementById('author-feedback'), `Editando ${author.name}.`, true);
    requiredById<HTMLInputElement>('author-name').focus();
  }

  private resetAuthorForm(): void {
    requiredById<HTMLFormElement>('author-form').reset();
    requiredById<HTMLInputElement>('author-id').value = '';
    requiredById<HTMLInputElement>('author-role').value = 'Advogado(a)';
    requiredById<HTMLInputElement>('author-avatar-input').value = '';
    this.authorAvatar = '';
    this.renderAvatarPreview('');
    requiredById<HTMLElement>('author-avatar-instruction').textContent = 'Arraste uma foto ou clique para enviar';
    requiredById<HTMLButtonElement>('author-cancel').classList.add('hidden');
  }

  private renderAuthors(): void {
    const authors = contentService.authors();
    requiredById<HTMLElement>('author-list').innerHTML = authors.length
      ? authors.map((author) => this.authorCard(author)).join('')
      : '<div class="bg-surface-container-lowest border border-outline-variant/20 p-gutter text-on-surface-variant">Nenhum advogado cadastrado.</div>';
  }

  private authorCard(author: Author): string {
    const avatar = safeImageUrl(author.avatarUrl);
    const photo = avatar
      ? `<img src="${escapeHtml(avatar)}" alt="Foto de ${escapeHtml(author.name)}" class="w-14 h-14 rounded-full object-cover bg-surface-container">`
      : '<div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"><span class="material-symbols-outlined">person</span></div>';
    const action = author.isDefault
      ? '<span class="font-caption text-on-surface-variant">Autor padrão</span>'
      : `<button type="button" data-remove-author="${escapeHtml(author.id)}" class="font-label text-label text-error">Remover</button>`;
    return `<article class="bg-surface-container-lowest border border-outline-variant/20 p-md flex items-start gap-sm"><div class="shrink-0">${photo}</div><div class="min-w-0 flex-1"><p class="font-label text-label text-primary truncate">${escapeHtml(author.name)}</p><p class="font-caption text-caption text-on-surface-variant mt-1">${escapeHtml(author.role)}</p><div class="mt-sm flex items-center gap-sm"><button type="button" data-edit-author="${escapeHtml(author.id)}" class="font-label text-label text-primary underline underline-offset-4">Editar</button>${action}</div></div></article>`;
  }

  private renderSettings(): void {
    const settings = contentService.settings();
    requiredById<HTMLInputElement>('setting-site-name').value = settings.siteName;
    requiredById<HTMLInputElement>('setting-email').value = settings.email;
    requiredById<HTMLInputElement>('setting-oab').value = settings.oab;
    requiredById<HTMLTextAreaElement>('setting-address').value = settings.address;
    requiredById<HTMLInputElement>('setting-phone').value = settings.phone;
    requiredById<HTMLInputElement>('setting-office-hours').value = settings.officeHours;
  }

  private renderContacts(): void {
    const contacts = contentService.contacts();
    const newCount = contacts.filter(({ status }) => status === 'new').length;
    requiredById<HTMLElement>('contacts-summary').textContent = contacts.length
      ? `${contacts.length} contato(s) • ${newCount} novo(s)`
      : 'Nenhum contato recebido.';
    requiredById<HTMLElement>('contacts-list').innerHTML = contacts.length
      ? contacts.map((contact) => this.contactCard(contact)).join('')
      : '<div class="bg-surface-container-lowest border border-outline-variant/20 p-gutter text-on-surface-variant">Os novos envios aparecerão aqui.</div>';
  }

  private contactCard(contact: ContactMessage): string {
    const isNew = contact.status === 'new';
    const status = isNew
      ? '<span class="font-caption text-caption bg-secondary-container/50 text-on-secondary-container px-2 py-1">Novo</span>'
      : '<span class="font-caption text-caption bg-surface-container-high text-on-surface-variant px-2 py-1">Lido</span>';
    const readAction = isNew
      ? `<button type="button" data-read-contact="${escapeHtml(contact.id)}" class="font-label text-label text-primary underline underline-offset-4">Marcar como lido</button>`
      : '';
    return `<article class="bg-surface-container-lowest border border-outline-variant/20 p-gutter"><div class="flex flex-col md:flex-row md:items-start md:justify-between gap-sm"><div><div class="flex items-center gap-sm mb-xs"><h3 class="font-h3 text-h3 text-primary">${escapeHtml(contact.name)}</h3>${status}</div><p class="font-body text-body text-on-surface-variant">${escapeHtml(contact.email)} • ${escapeHtml(contact.phone)}</p><p class="font-caption text-caption text-on-surface-variant mt-xs">${escapeHtml(contact.subject || 'Sem assunto')} • ${formatContactDate(contact.createdAt)}</p></div><div class="flex items-center gap-sm shrink-0">${readAction}<button type="button" data-delete-contact="${escapeHtml(contact.id)}" class="font-label text-label text-error">Excluir</button></div></div><p class="mt-md pt-md border-t border-outline-variant/20 whitespace-pre-wrap text-on-surface">${escapeHtml(contact.message)}</p></article>`;
  }

  private panelFromHash(): PanelName {
    return this.asPanel(location.hash.replace('#', ''));
  }

  private asPanel(value?: string): PanelName {
    return value && value in PANEL_TITLES ? value as PanelName : 'articles';
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
