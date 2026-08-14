export type ArticleStatus = 'draft' | 'published';

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  coverImage: string;
  coverThumbnail: string;
  videoUrl: string;
  authorId: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ArticleDraft extends Omit<Article, 'createdAt' | 'updatedAt' | 'publishedAt'> {
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface Category {
  slug: string;
  name: string;
  locked: boolean;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string;
  avatarUrl: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSettings {
  siteName: string;
  email: string;
  oab: string;
  address: string;
  phone: string;
  officeHours: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read';
  createdAt: string;
}

export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
}

export interface PublicContent {
  articles: Article[];
  categories: Category[];
  authors: Author[];
  settings: SiteSettings;
}

export interface AdminContent extends PublicContent {
  contacts: ContactMessage[];
}

export interface Result<T> {
  ok: boolean;
  value?: T;
  message?: string;
}
