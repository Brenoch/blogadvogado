import type { Article, ArticleDraft, Author, ContactMessage, SiteSettings } from '../../domain/models';

type Row = Record<string, unknown>;

const stringValue = (value: unknown): string => typeof value === 'string' ? value : '';

export function articleFromRow(row: Row): Article {
  return {
    id: stringValue(row.id),
    title: stringValue(row.title),
    slug: stringValue(row.slug),
    summary: stringValue(row.summary),
    content: stringValue(row.content),
    category: stringValue(row.category),
    coverImage: stringValue(row.cover_image),
    coverThumbnail: stringValue(row.cover_thumbnail),
    videoUrl: stringValue(row.video_url),
    authorId: stringValue(row.author_id),
    status: row.status === 'published' ? 'published' : 'draft',
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null
  };
}

export function articleToRow(article: ArticleDraft): Row {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary || '',
    content: article.content || '',
    category: article.category,
    cover_image: article.coverImage || null,
    cover_thumbnail: article.coverThumbnail || null,
    video_url: article.videoUrl || null,
    author_id: article.authorId,
    status: article.status,
    published_at: article.status === 'published'
      ? article.publishedAt || new Date().toISOString()
      : null
  };
}

export function authorFromRow(row: Row): Author {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    name: stringValue(row.name),
    role: stringValue(row.role) || 'Advogado(a)',
    avatarUrl: stringValue(row.avatar_url),
    isDefault: Boolean(row.is_default),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

export function authorToRow(author: Author): Row {
  return {
    id: author.id,
    slug: author.slug,
    name: author.name,
    role: author.role || 'Advogado(a)',
    avatar_url: author.avatarUrl || null,
    is_default: author.isDefault,
    updated_at: new Date().toISOString()
  };
}

export function contactFromRow(row: Row): ContactMessage {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    email: stringValue(row.email),
    phone: stringValue(row.phone),
    subject: stringValue(row.subject),
    message: stringValue(row.message),
    status: row.status === 'read' ? 'read' : 'new',
    createdAt: stringValue(row.created_at)
  };
}

export function settingsFromRow(row: Row): SiteSettings {
  return {
    siteName: stringValue(row.site_name),
    email: stringValue(row.email),
    oab: stringValue(row.oab),
    address: stringValue(row.address),
    phone: stringValue(row.phone),
    officeHours: stringValue(row.office_hours)
  };
}

export function settingsToRow(settings: SiteSettings): Row {
  return {
    id: 1,
    site_name: settings.siteName,
    email: settings.email,
    oab: settings.oab,
    address: settings.address,
    phone: settings.phone,
    office_hours: settings.officeHours
  };
}
