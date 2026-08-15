interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
}

export class SeoPresenter {
  public apply(data: SeoData = {}): void {
    const canonical = data.canonical ?? `${location.origin}${location.pathname}`;
    const title = data.title ?? document.title;
    const description = data.description
      ?? document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content
      ?? '';
    const image = data.image ? new URL(data.image, location.origin).href : '';
    if (data.title) document.title = title;
    if (description) this.meta('name', 'description', description);
    this.link('canonical', canonical);
    this.meta('property', 'og:url', canonical);
    this.meta('property', 'og:type', data.type ?? 'website');
    this.meta('property', 'og:locale', 'pt_BR');
    const siteName = document.head.querySelector<HTMLMetaElement>('meta[name="author"]')?.content
      ?? document.title.split('|').at(-1)?.trim()
      ?? 'Andre Oliveira Advocacia';
    this.meta('property', 'og:site_name', siteName);
    if (title) {
      this.meta('property', 'og:title', title);
      this.meta('name', 'twitter:title', title);
    }
    if (description) {
      this.meta('property', 'og:description', description);
      this.meta('name', 'twitter:description', description);
    }
    if (image) {
      this.meta('property', 'og:image', image);
      this.meta('name', 'twitter:image', image);
    }
    this.meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  }

  public structuredData(id: string, data: Record<string, unknown>): void {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private meta(attribute: 'name' | 'property', key: string, content: string): void {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.content = content;
  }

  private link(rel: string, href: string): void {
    let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!element) {
      element = document.createElement('link');
      element.rel = rel;
      document.head.appendChild(element);
    }
    element.href = href;
  }
}
