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
    if (data.title) document.title = data.title;
    if (data.description) this.meta('name', 'description', data.description);
    this.link('canonical', canonical);
    this.meta('property', 'og:url', canonical);
    this.meta('property', 'og:type', data.type ?? 'website');
    if (data.title) this.meta('property', 'og:title', data.title);
    if (data.description) this.meta('property', 'og:description', data.description);
    if (data.image) this.meta('property', 'og:image', data.image);
    this.meta('name', 'twitter:card', data.image ? 'summary_large_image' : 'summary');
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
