import type {
  AdminContent,
  Article,
  ArticleDraft,
  Author,
  Category,
  ContactSubmission,
  PublicContent,
  SiteSettings
} from '../../domain/models';

export interface ContentGateway {
  loadPublic(): Promise<PublicContent>;
  loadAdmin(): Promise<AdminContent>;
  isAdmin(): Promise<boolean>;
  saveArticle(article: ArticleDraft): Promise<Article>;
  deleteArticle(id: string): Promise<void>;
  saveAuthor(author: Author): Promise<Author>;
  deleteAuthor(id: string): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(slug: string): Promise<void>;
  saveSettings(settings: SiteSettings): Promise<SiteSettings>;
  submitContact(contact: ContactSubmission): Promise<string>;
  markContactRead(id: string): Promise<void>;
  deleteContact(id: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
