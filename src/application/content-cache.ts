import { DEFAULT_AUTHOR, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS } from '../domain/defaults';
import type { Article, Author, Category, ContactMessage, SiteSettings } from '../domain/models';
import { localJsonStorage, sessionJsonStorage } from '../infrastructure/storage/json-storage';

export class ContentCache {
  public articles(): Article[] {
    return localJsonStorage.get<Article[]>(STORAGE_KEYS.articles, [])
      .sort((left, right) => this.dateValue(right) - this.dateValue(left));
  }

  public publishedArticles(): Article[] {
    return this.articles().filter((article) => article.status === 'published');
  }

  public saveArticles(articles: Article[]): void {
    localJsonStorage.set(STORAGE_KEYS.articles, articles);
  }

  public findArticle(idOrSlug: string): Article | null {
    return this.articles().find(({ id, slug }) => id === idOrSlug || slug === idOrSlug) ?? null;
  }

  public categories(): Category[] {
    const custom = localJsonStorage.get<Category[]>(STORAGE_KEYS.categories, [])
      .filter((category) => category.slug && category.name)
      .map((category) => ({ ...category, locked: false }));
    return [...DEFAULT_CATEGORIES, ...custom];
  }

  public saveCustomCategories(categories: Category[]): void {
    localJsonStorage.set(
      STORAGE_KEYS.categories,
      categories.filter(({ locked }) => !locked).map(({ slug, name }) => ({ slug, name, locked: false }))
    );
  }

  public authors(): Author[] {
    const authors = localJsonStorage.get<Author[]>(STORAGE_KEYS.authors, [])
      .filter((author) => Boolean(author.id && author.name));
    return authors.length > 0 ? authors : [{ ...DEFAULT_AUTHOR }];
  }

  public saveAuthors(authors: Author[]): void {
    localJsonStorage.set(STORAGE_KEYS.authors, authors);
  }

  public findAuthor(id: string): Author | null {
    const authors = this.authors();
    return authors.find((author) => author.id === id)
      ?? authors.find((author) => author.isDefault)
      ?? authors[0]
      ?? null;
  }

  public settings(): SiteSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...localJsonStorage.get<Partial<SiteSettings>>(STORAGE_KEYS.settings, {})
    };
  }

  public saveSettings(settings: SiteSettings): void {
    localJsonStorage.set(STORAGE_KEYS.settings, settings);
  }

  public contacts(): ContactMessage[] {
    return sessionJsonStorage.get<ContactMessage[]>(STORAGE_KEYS.contacts, [])
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  public saveContacts(contacts: ContactMessage[]): void {
    sessionJsonStorage.set(STORAGE_KEYS.contacts, contacts);
  }

  public clearPrivateContent(): void {
    sessionJsonStorage.remove(STORAGE_KEYS.contacts);
  }

  private dateValue(article: Article): number {
    return Date.parse(article.updatedAt || article.createdAt) || 0;
  }
}

export const contentCache = new ContentCache();
