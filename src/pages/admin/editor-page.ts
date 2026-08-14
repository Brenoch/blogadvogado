import { contentService } from '../../application/content-service';
import { route } from '../../domain/defaults';
import type { Article, ArticleStatus } from '../../domain/models';
import { escapeHtml, safeImageUrl, slugify, youtubeEmbedUrl } from '../../domain/text';
import { imageCompressor } from '../../infrastructure/images/image-compressor';
import { RichTextEditor } from '../../presentation/rich-text-editor';
import { requiredById, setBusy, setFeedback } from '../../shared/dom';

export class EditorPage {
  private current: Article | null = null;
  private featuredImage = '';
  private featuredThumbnail = '';
  private processingImage = false;
  private slugEdited = false;
  private dragDepth = 0;
  private readonly editor = new RichTextEditor(
    requiredById<HTMLElement>('article-content'),
    requiredById<HTMLElement>('editor-toolbar'),
    document.getElementById('editor-feedback')
  );

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

    const id = new URLSearchParams(location.search).get('id');
    this.current = id ? contentService.article(id) : null;
    this.renderForm();
    this.editor.mount();
    this.bindFields();
    this.bindImageUpload();
    this.bindActions();
    this.bindLogout();
  }

  private renderForm(): void {
    this.renderCategoryOptions();
    this.renderAuthorOptions();
    if (!this.current) {
      this.editor.setValue('');
      return;
    }
    requiredById<HTMLInputElement>('title').value = this.current.title;
    requiredById<HTMLInputElement>('slug').value = this.current.slug;
    requiredById<HTMLTextAreaElement>('summary').value = this.current.summary;
    requiredById<HTMLInputElement>('video-url').value = this.current.videoUrl;
    this.editor.setValue(this.current.content);
    this.setFeaturedImage(this.current.coverImage, this.current.coverThumbnail, this.current.coverImage ? 'Imagem destacada salva' : '');
    this.updateStatus(this.current.status);
  }

  private renderCategoryOptions(): void {
    const select = requiredById<HTMLSelectElement>('article-category');
    select.innerHTML = '<option value="" disabled selected hidden>Selecione uma área...</option>'
      + contentService.categories().map(({ slug, name }) => `<option value="${escapeHtml(slug)}">${escapeHtml(name)}</option>`).join('');
    select.value = this.current?.category ?? '';
  }

  private renderAuthorOptions(): void {
    const select = requiredById<HTMLSelectElement>('article-author');
    const authors = contentService.authors();
    select.innerHTML = '<option value="" disabled>Selecione um advogado...</option>'
      + authors.map(({ id, name }) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join('');
    select.value = this.current?.authorId || authors.find(({ isDefault }) => isDefault)?.id || authors[0]?.id || '';
    this.renderAuthorPreview();
  }

  private renderAuthorPreview(): void {
    const select = requiredById<HTMLSelectElement>('article-author');
    const author = contentService.author(select.value);
    const preview = requiredById<HTMLElement>('article-author-preview');
    if (!author || !select.value) {
      preview.hidden = true;
      return;
    }
    const avatar = requiredById<HTMLImageElement>('article-author-avatar');
    const source = safeImageUrl(author.avatarUrl);
    avatar.src = source;
    avatar.classList.toggle('hidden', !source);
    avatar.alt = author.name;
    preview.hidden = false;
  }

  private bindFields(): void {
    const title = requiredById<HTMLInputElement>('title');
    const slug = requiredById<HTMLInputElement>('slug');
    title.addEventListener('input', () => {
      if (!this.slugEdited) slug.value = slugify(title.value);
    });
    slug.addEventListener('input', () => { this.slugEdited = true; });
    requiredById<HTMLSelectElement>('article-author').addEventListener('change', () => this.renderAuthorPreview());
  }

  private bindImageUpload(): void {
    const input = requiredById<HTMLInputElement>('featured-image-input');
    const dropzone = requiredById<HTMLElement>('featured-image-dropzone');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.loadImage(file);
    });
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });
    dropzone.addEventListener('dragenter', (event) => {
      event.preventDefault();
      this.dragDepth += 1;
      this.setDropzoneActive(true);
    });
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      this.setDropzoneActive(true);
    });
    dropzone.addEventListener('dragleave', (event) => {
      event.preventDefault();
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (this.dragDepth === 0) this.setDropzoneActive(false);
    });
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dragDepth = 0;
      this.setDropzoneActive(false);
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/'));
      if (file) void this.loadImage(file);
    });
    requiredById<HTMLButtonElement>('remove-featured-image').addEventListener('click', () => {
      input.value = '';
      this.setFeaturedImage('', '', '');
      setFeedback(document.getElementById('featured-image-feedback'), '', true);
    });
  }

  private bindActions(): void {
    requiredById<HTMLButtonElement>('save-draft').addEventListener('click', () => void this.saveAndReturn('draft'));
    requiredById<HTMLButtonElement>('publish-article').addEventListener('click', () => void this.saveAndReturn('published'));
    requiredById<HTMLButtonElement>('preview-article').addEventListener('click', () => void this.preview());
  }

  private bindLogout(): void {
    requiredById<HTMLButtonElement>('admin-logout').addEventListener('click', async () => {
      await contentService.signOut();
      location.replace(route('admin/login/'));
    });
  }

  private async loadImage(file: File): Promise<void> {
    const feedback = document.getElementById('featured-image-feedback');
    this.processingImage = true;
    setFeedback(feedback, 'Otimizando imagem...', true);
    try {
      const image = await imageCompressor.articleImage(file);
      this.setFeaturedImage(image.full, image.thumbnail, `${file.name.replace(/\.[^.]+$/, '')}.webp`);
      setFeedback(feedback, `Imagem otimizada: ${Math.max(1, Math.round(image.fullBytes / 1024))} KB.`, true);
    } catch (error) {
      setFeedback(feedback, error instanceof Error ? error.message : 'Não foi possível otimizar a imagem.');
    } finally {
      this.processingImage = false;
    }
  }

  private setFeaturedImage(full: string, thumbnail: string, name: string): void {
    this.featuredImage = full;
    this.featuredThumbnail = thumbnail;
    const preview = requiredById<HTMLImageElement>('featured-image-preview');
    const hasImage = Boolean(full);
    preview.classList.toggle('hidden', !hasImage);
    requiredById<HTMLElement>('featured-image-placeholder').classList.toggle('hidden', hasImage);
    requiredById<HTMLElement>('featured-image-name').classList.toggle('hidden', !hasImage);
    requiredById<HTMLButtonElement>('remove-featured-image').classList.toggle('hidden', !hasImage);
    preview.src = full;
    requiredById<HTMLElement>('featured-image-name').textContent = name;
  }

  private setDropzoneActive(active: boolean): void {
    const dropzone = requiredById<HTMLElement>('featured-image-dropzone');
    dropzone.classList.toggle('border-primary', active);
    dropzone.classList.toggle('bg-primary/10', active);
    if (!this.featuredImage) {
      requiredById<HTMLElement>('featured-image-instruction').textContent = active
        ? 'Solte a imagem para enviar'
        : 'Arraste uma imagem ou clique para fazer upload';
    }
  }

  private async saveAndReturn(status: ArticleStatus): Promise<void> {
    const button = requiredById<HTMLButtonElement>(status === 'published' ? 'publish-article' : 'save-draft');
    setBusy(button, true, status === 'published' ? 'Publicando...' : 'Salvando...');
    const article = await this.save(status);
    if (article) location.assign(route('admin/'));
    else setBusy(button, false);
  }

  private async preview(): Promise<void> {
    const button = requiredById<HTMLButtonElement>('preview-article');
    setBusy(button, true, 'Preparando...');
    const article = await this.save(this.current?.status === 'published' ? 'published' : 'draft');
    setBusy(button, false);
    if (article) window.open(route(`artigo/?id=${encodeURIComponent(article.id)}&preview=1`), '_blank', 'noopener');
  }

  private async save(status: ArticleStatus): Promise<Article | null> {
    if (this.processingImage) {
      alert('Aguarde a otimização da imagem.');
      return null;
    }
    const title = requiredById<HTMLInputElement>('title');
    const category = requiredById<HTMLSelectElement>('article-category');
    const author = requiredById<HTMLSelectElement>('article-author');
    if (!title.value.trim()) {
      alert('Informe o título do artigo.');
      title.focus();
      return null;
    }
    if (!category.value) {
      alert('Selecione uma categoria.');
      category.focus();
      return null;
    }
    if (!author.value) {
      alert('Selecione um advogado.');
      author.focus();
      return null;
    }
    const videoUrl = requiredById<HTMLInputElement>('video-url').value.trim();
    if (videoUrl && !youtubeEmbedUrl(videoUrl)) {
      alert('Informe uma URL válida do YouTube.');
      return null;
    }
    const draft = contentService.createArticleDraft({
      ...this.current,
      id: this.current?.id,
      title: title.value.trim(),
      slug: slugify(requiredById<HTMLInputElement>('slug').value || title.value),
      summary: requiredById<HTMLTextAreaElement>('summary').value.trim().slice(0, 160),
      content: this.editor.value(),
      category: category.value,
      authorId: author.value,
      coverImage: this.featuredImage,
      coverThumbnail: this.featuredThumbnail,
      videoUrl,
      status
    });
    try {
      this.current = await contentService.saveArticle(draft);
      this.featuredImage = this.current.coverImage;
      this.featuredThumbnail = this.current.coverThumbnail;
      this.updateStatus(status);
      return this.current;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar o artigo.');
      return null;
    }
  }

  private updateStatus(status: ArticleStatus): void {
    const label = document.querySelector<HTMLElement>('.bg-secondary-container.text-on-secondary-container');
    if (label) label.textContent = status === 'published' ? 'Publicado' : 'Rascunho';
  }
}
