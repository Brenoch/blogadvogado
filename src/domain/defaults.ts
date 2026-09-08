import type { Article, Author, Category, SiteSettings } from './models';

export const STORAGE_KEYS = {
  articles: 'andres_oliveira_articles_v1',
  categories: 'andres_oliveira_categories_v3',
  authors: 'andres_oliveira_authors_v1',
  settings: 'andres_oliveira_settings_v1',
  contacts: 'andres_oliveira_contacts_v1',
  cookieConsent: 'aoa_cookie_consent_v1'
} as const;

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { slug: 'direito-previdenciario', name: 'Direito Previdenciário', locked: true },
  { slug: 'direito-trabalhista', name: 'Direito Trabalhista', locked: true },
  { slug: 'direito-do-consumidor', name: 'Direito do Consumidor', locked: true },
  { slug: 'direito-civil', name: 'Direito Civil', locked: true },
  { slug: 'direito-militar', name: 'Direito Militar', locked: true },
  { slug: 'direito-penal', name: 'Direito Penal', locked: true }
] as const;

export const DEFAULT_AUTHOR: Author = {
  id: '',
  slug: 'andres-oliveira',
  name: 'Dr. Andre Oliveira',
  role: 'Sócio Fundador',
  avatarUrl: '/clientes/blogadvogado/images/da0602dd94c3e7a7.webp',
  isDefault: true
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Andre Oliveira Advocacia',
  email: 'contato@andresoliveira.adv.br',
  oab: 'OAB/SP 000.000',
  address: 'Av. Paulista, 1000\nConjunto 152\nBela Vista, São Paulo - SP\nCEP 01310-100',
  phone: '+55 11 3000-0000',
  officeHours: 'Segunda a Sexta: 09h às 18h'
};

export const BASE_PATH = import.meta.env.BASE_URL;

export function route(path = ''): string {
  return `${BASE_PATH}${path.replace(/^\//, '')}`;
}

export function articleRoute(article: Pick<Article, 'id' | 'slug'>): string {
  return route(`blog/${encodeURIComponent(article.slug || article.id)}/`);
}

export function areaRoute(slug: string): string {
  return route(`areas-de-atuacao/${encodeURIComponent(slug)}/`);
}
