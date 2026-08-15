import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { ContentGateway } from '../../application/ports/content-gateway';
import { DEFAULT_SETTINGS } from '../../domain/defaults';
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
import { isDataImage, dataUrlToBlob } from '../images/data-image';
import {
  articleFromRow,
  articleToRow,
  authorFromRow,
  authorToRow,
  contactFromRow,
  settingsFromRow,
  settingsToRow
} from './mappers';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function row(value: unknown): Row | null {
  return value && typeof value === 'object' ? value as Row : null;
}

function throwError(error: PostgrestError | Error | null): void {
  if (error) throw error;
}

export class SupabaseContentGateway implements ContentGateway {
  public async loadPublic(): Promise<PublicContent> {
    const supabase = await this.client();
    const [articleResult, categoryResult, settingsResult, authorResult] = await Promise.all([
      supabase.from('articles').select('*').eq('status', 'published').order('published_at', { ascending: false }),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('authors').select('*').order('is_default', { ascending: false }).order('name', { ascending: true })
    ]);

    throwError(articleResult.error);
    throwError(categoryResult.error);
    throwError(settingsResult.error);
    throwError(authorResult.error);

    const settingsRow = row(settingsResult.data);
    return {
      articles: rows(articleResult.data).map(articleFromRow),
      categories: rows(categoryResult.data).map((item) => ({
        slug: String(item.slug ?? ''),
        name: String(item.name ?? ''),
        locked: Boolean(item.locked)
      })),
      authors: rows(authorResult.data).map(authorFromRow),
      settings: settingsRow ? { ...DEFAULT_SETTINGS, ...settingsFromRow(settingsRow) } : { ...DEFAULT_SETTINGS }
    };
  }

  public async loadAdmin(): Promise<AdminContent> {
    await this.requireAdmin();
    const supabase = await this.client();
    const [articleResult, categoryResult, settingsResult, contactResult, authorResult] = await Promise.all([
      supabase.from('articles').select('*').order('updated_at', { ascending: false }),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('authors').select('*').order('is_default', { ascending: false }).order('name', { ascending: true })
    ]);

    [articleResult, categoryResult, settingsResult, contactResult, authorResult]
      .forEach((result) => throwError(result.error));

    const settingsRow = row(settingsResult.data);
    return {
      articles: rows(articleResult.data).map(articleFromRow),
      categories: rows(categoryResult.data).map((item) => ({
        slug: String(item.slug ?? ''),
        name: String(item.name ?? ''),
        locked: Boolean(item.locked)
      })),
      authors: rows(authorResult.data).map(authorFromRow),
      settings: settingsRow ? { ...DEFAULT_SETTINGS, ...settingsFromRow(settingsRow) } : { ...DEFAULT_SETTINGS },
      contacts: rows(contactResult.data).map(contactFromRow)
    };
  }

  public async isAdmin(): Promise<boolean> {
    const supabase = await this.client();
    const userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) return false;
    const profileResult = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userResult.data.user.id)
      .maybeSingle();
    return Boolean(profileResult.data && !profileResult.error);
  }

  public async saveArticle(article: ArticleDraft): Promise<Article> {
    await this.requireAdmin();
    const coverImage = await this.uploadImage(article.coverImage, `articles/${article.id}`, 'cover', 1024 * 1024);
    const coverThumbnail = await this.uploadImage(article.coverThumbnail, `articles/${article.id}`, 'thumbnail', 1024 * 1024);
    const payload = articleToRow({ ...article, coverImage, coverThumbnail });
    const supabase = await this.client();
    const result = await supabase.from('articles').upsert(payload).select().single();
    throwError(result.error);
    const saved = row(result.data);
    if (!saved) throw new Error('O artigo não foi salvo.');
    return articleFromRow(saved);
  }

  public async deleteArticle(id: string): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('articles').delete().eq('id', id);
    throwError(result.error);
    await this.removeFolderFiles(`articles/${id}`);
  }

  public async saveAuthor(author: Author): Promise<Author> {
    await this.requireAdmin();
    const avatarUrl = await this.uploadImage(author.avatarUrl, `authors/${author.id}`, 'avatar', 512 * 1024);
    const supabase = await this.client();
    const result = await supabase.from('authors').upsert(authorToRow({ ...author, avatarUrl })).select().single();
    throwError(result.error);
    const saved = row(result.data);
    if (!saved) throw new Error('O advogado não foi salvo.');
    return authorFromRow(saved);
  }

  public async deleteAuthor(id: string): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('authors').delete().eq('id', id);
    throwError(result.error);
    await this.removeFolderFiles(`authors/${id}`);
  }

  public async saveCategory(category: Category): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('categories').insert({
      slug: category.slug,
      name: category.name,
      locked: false
    });
    throwError(result.error);
  }

  public async deleteCategory(slug: string): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('categories').delete().eq('slug', slug).eq('locked', false);
    throwError(result.error);
  }

  public async saveSettings(settings: SiteSettings): Promise<SiteSettings> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('site_settings').upsert(settingsToRow(settings)).select().single();
    throwError(result.error);
    const saved = row(result.data);
    if (!saved) throw new Error('As configurações não foram salvas.');
    return settingsFromRow(saved);
  }

  public async submitContact(contact: ContactSubmission): Promise<string> {
    const supabase = await this.client();
    const result = await supabase.rpc('submit_contact', {
      p_name: contact.name.trim(),
      p_email: contact.email.trim(),
      p_phone: contact.phone.trim(),
      p_subject: contact.subject.trim(),
      p_message: contact.message.trim(),
      p_website: contact.website.trim()
    });
    throwError(result.error);
    return String(result.data ?? '');
  }

  public async markContactRead(id: string): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('contacts').update({ status: 'read' }).eq('id', id);
    throwError(result.error);
  }

  public async deleteContact(id: string): Promise<void> {
    await this.requireAdmin();
    const supabase = await this.client();
    const result = await supabase.from('contacts').delete().eq('id', id);
    throwError(result.error);
  }

  public async signIn(email: string, password: string): Promise<void> {
    const supabase = await this.client();
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw new Error('E-mail ou senha inválidos.');
    if (!await this.isAdmin()) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Usuário sem acesso administrativo.');
    }
  }

  public async signOut(): Promise<void> {
    const supabase = await this.client();
    const result = await supabase.auth.signOut({ scope: 'local' });
    if (result.error) throw result.error;
  }

  private async requireAdmin(): Promise<void> {
    if (!await this.isAdmin()) throw new Error('Sua sessão expirou. Entre novamente.');
  }

  private async uploadImage(value: string, folder: string, prefix: string, maxBytes: number): Promise<string> {
    if (!isDataImage(value)) return value || '';
    const blob = dataUrlToBlob(value);
    if (blob.size > maxBytes) throw new Error('A imagem excede o limite permitido.');
    const fileName = `${prefix}-${Date.now()}.webp`;
    const path = `${folder}/${fileName}`;
    const supabase = await this.client();
    const upload = await supabase.storage.from('article-images').upload(path, blob, {
      contentType: 'image/webp',
      upsert: false,
      cacheControl: '31536000'
    });
    if (upload.error) throw upload.error;
    await this.removeOldVariants(folder, prefix, fileName);
    return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
  }

  private async removeOldVariants(folder: string, prefix: string, keep: string): Promise<void> {
    const supabase = await this.client();
    const list = await supabase.storage.from('article-images').list(folder, { limit: 100 });
    if (list.error) return;
    const paths = (list.data ?? [])
      .filter(({ name }) => name.startsWith(`${prefix}-`) && name !== keep)
      .map(({ name }) => `${folder}/${name}`);
    if (paths.length > 0) await supabase.storage.from('article-images').remove(paths);
  }

  private async removeFolderFiles(folder: string): Promise<void> {
    const supabase = await this.client();
    const list = await supabase.storage.from('article-images').list(folder, { limit: 100 });
    if (list.error || !list.data?.length) return;
    await supabase.storage.from('article-images').remove(list.data.map(({ name }) => `${folder}/${name}`));
  }

  private async client(): Promise<SupabaseClient> {
    return (await import('./client')).supabase;
  }
}
