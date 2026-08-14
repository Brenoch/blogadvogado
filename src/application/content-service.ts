import { DEFAULT_CATEGORIES } from '../domain/defaults';
import type {
  Article,
  ArticleDraft,
  Author,
  Category,
  ContactSubmission,
  SiteSettings
} from '../domain/models';
import { newUuid, slugify } from '../domain/text';
import { contentCache, type ContentCache } from './content-cache';
import type { ContentGateway } from './ports/content-gateway';
import { SupabaseContentGateway } from '../infrastructure/supabase/supabase-content-gateway';

export class ContentService {
  public constructor(
    private readonly gateway: ContentGateway,
    private readonly cache: ContentCache
  ) {}

  public articles(publishedOnly = false): Article[] {
    return publishedOnly ? this.cache.publishedArticles() : this.cache.articles();
  }

  public article(idOrSlug: string): Article | null {
    return this.cache.findArticle(idOrSlug);
  }

  public categories(): Category[] {
    return this.cache.categories();
  }

  public authors(): Author[] {
    return this.cache.authors();
  }

  public author(id: string): Author | null {
    return this.cache.findAuthor(id);
  }

  public settings(): SiteSettings {
    return this.cache.settings();
  }

  public contacts() {
    return this.cache.contacts();
  }

  public async refreshPublic(): Promise<void> {
    const content = await this.gateway.loadPublic();
    this.cache.saveArticles(content.articles);
    this.cache.saveCustomCategories(content.categories);
    this.cache.saveAuthors(content.authors);
    this.cache.saveSettings(content.settings);
    window.dispatchEvent(new CustomEvent('content:ready', { detail: { scope: 'public' } }));
  }

  public async refreshAdmin(): Promise<void> {
    const content = await this.gateway.loadAdmin();
    this.cache.saveArticles(content.articles);
    this.cache.saveCustomCategories(content.categories);
    this.cache.saveAuthors(content.authors);
    this.cache.saveSettings(content.settings);
    this.cache.saveContacts(content.contacts);
    window.dispatchEvent(new CustomEvent('content:ready', { detail: { scope: 'admin' } }));
  }

  public async isAdmin(): Promise<boolean> {
    return this.gateway.isAdmin();
  }

  public async signIn(email: string, password: string): Promise<void> {
    await this.gateway.signIn(email, password);
  }

  public async signOut(): Promise<void> {
    await this.gateway.signOut();
    this.cache.clearPrivateContent();
  }

  public createArticleDraft(partial: Partial<ArticleDraft> = {}): ArticleDraft {
    return {
      id: partial.id || newUuid(),
      title: partial.title || '',
      slug: partial.slug || '',
      summary: partial.summary || '',
      content: partial.content || '',
      category: partial.category || DEFAULT_CATEGORIES[0]?.slug || 'direito-previdenciario',
      coverImage: partial.coverImage || '',
      coverThumbnail: partial.coverThumbnail || '',
      videoUrl: partial.videoUrl || '',
      authorId: partial.authorId || this.authors().find(({ isDefault }) => isDefault)?.id || this.authors()[0]?.id || '',
      status: partial.status || 'draft',
      createdAt: partial.createdAt,
      updatedAt: partial.updatedAt,
      publishedAt: partial.publishedAt
    };
  }

  public async saveArticle(article: ArticleDraft): Promise<Article> {
    const saved = await this.gateway.saveArticle(article);
    this.cache.saveArticles([...this.cache.articles().filter(({ id }) => id !== saved.id), saved]);
    return saved;
  }

  public async deleteArticle(id: string): Promise<void> {
    await this.gateway.deleteArticle(id);
    this.cache.saveArticles(this.cache.articles().filter((article) => article.id !== id));
  }

  public async saveAuthor(author: Partial<Author> & Pick<Author, 'name' | 'role'>): Promise<Author> {
    const id = author.id || newUuid();
    const saved = await this.gateway.saveAuthor({
      id,
      slug: author.slug || slugify(author.name),
      name: author.name.trim(),
      role: author.role.trim() || 'Advogado(a)',
      avatarUrl: author.avatarUrl || '',
      isDefault: Boolean(author.isDefault),
      createdAt: author.createdAt,
      updatedAt: author.updatedAt
    });
    this.cache.saveAuthors([...this.cache.authors().filter(({ id: currentId }) => currentId !== saved.id), saved]);
    return saved;
  }

  public async deleteAuthor(id: string): Promise<void> {
    await this.gateway.deleteAuthor(id);
    this.cache.saveAuthors(this.cache.authors().filter((author) => author.id !== id));
  }

  public async addCategory(name: string): Promise<Category> {
    const category = { slug: slugify(name), name: name.trim(), locked: false };
    if (!category.slug || !category.name) throw new Error('Informe um nome válido.');
    if (this.categories().some(({ slug }) => slug === category.slug)) throw new Error('Essa categoria já existe.');
    await this.gateway.saveCategory(category);
    this.cache.saveCustomCategories([...this.categories(), category]);
    return category;
  }

  public async deleteCategory(slug: string): Promise<void> {
    const category = this.categories().find((item) => item.slug === slug);
    if (!category || category.locked) throw new Error('Categorias padrão não podem ser removidas.');
    if (this.articles().some((article) => article.category === slug)) {
      throw new Error('Altere os artigos desta categoria antes de removê-la.');
    }
    await this.gateway.deleteCategory(slug);
    this.cache.saveCustomCategories(this.categories().filter((item) => item.slug !== slug));
  }

  public async saveSettings(settings: SiteSettings): Promise<SiteSettings> {
    const saved = await this.gateway.saveSettings(settings);
    this.cache.saveSettings(saved);
    return saved;
  }

  public async submitContact(contact: ContactSubmission): Promise<string> {
    return this.gateway.submitContact(contact);
  }

  public async markContactRead(id: string): Promise<void> {
    await this.gateway.markContactRead(id);
    this.cache.saveContacts(this.contacts().map((contact) => contact.id === id ? { ...contact, status: 'read' } : contact));
  }

  public async deleteContact(id: string): Promise<void> {
    await this.gateway.deleteContact(id);
    this.cache.saveContacts(this.contacts().filter((contact) => contact.id !== id));
  }
}

export const contentService = new ContentService(new SupabaseContentGateway(), contentCache);
