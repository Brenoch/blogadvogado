import { route } from '../domain/defaults';
import type { SiteSettings } from '../domain/models';
import { contentService } from '../application/content-service';

const knownNames = ['Andres Oliveira Advocacia', 'Andre Oliveira Advocacia'];
const knownEmails = ['contato@andresoliveira.adv.br', 'admin@ao.adv.br'];

export class SettingsPresenter {
  private previous = contentService.settings();

  public mount(): void {
    this.render(contentService.settings());
    window.addEventListener('content:ready', () => this.render(contentService.settings()));
    window.addEventListener('storage', (event) => {
      if (event.key === 'andres_oliveira_settings_v1') this.render(contentService.settings());
    });
  }

  private render(settings: SiteSettings): void {
    document.title = this.replaceKnown(document.title, settings);
    this.updateText(settings);
    this.updateAttributes(settings);
    this.updateStructuredData(settings);
    this.updateLocation(settings);
    this.updateContactDetails(settings);
    this.updateWhatsApp(settings);
    this.renderFooter(settings);
    this.previous = settings;
  }

  private updateText(settings: SiteSettings): void {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return;
      node.nodeValue = this.replaceKnown(node.nodeValue ?? '', settings);
    });
  }

  private updateAttributes(settings: SiteSettings): void {
    document.querySelectorAll<HTMLElement>('[title],[alt],[aria-label],[content],a[href^="mailto:"]').forEach((element) => {
      ['title', 'alt', 'aria-label', 'content', 'href'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, this.replaceKnown(value, settings));
      });
    });
  }

  private updateStructuredData(settings: SiteSettings): void {
    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((script) => {
      script.textContent = this.replaceKnown(script.textContent ?? '', settings);
    });
  }

  private updateLocation(settings: SiteSettings): void {
    const addressText = settings.address.trim();
    if (!addressText) return;
    document.querySelectorAll<HTMLElement>('[data-contact-address]').forEach((element) => {
      element.textContent = addressText;
    });
    const query = encodeURIComponent(addressText.replace(/\s*\n\s*/g, ', '));
    document.querySelectorAll<HTMLIFrameElement>('[data-google-map]').forEach((map) => {
      map.src = `https://www.google.com/maps?q=${query}&output=embed`;
    });
    document.querySelectorAll<HTMLAnchorElement>('[data-google-maps-link]').forEach((link) => {
      link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    });
  }

  // A página de contato repete telefone e horário fora do rodapé; sem isto os
  // valores do painel chegariam ao rodapé e ao link do WhatsApp, mas não aos
  // cartões, que continuariam mostrando os dados de exemplo do HTML.
  private updateContactDetails(settings: SiteSettings): void {
    const phone = settings.phone.trim();
    if (phone) {
      document.querySelectorAll<HTMLAnchorElement>('[data-contact-phone]').forEach((element) => {
        element.textContent = phone;
        element.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
      });
      document.querySelectorAll<HTMLElement>('[data-contact-whatsapp]').forEach((element) => {
        element.textContent = phone;
      });
    }

    const hours = settings.officeHours.trim();
    if (hours) {
      document.querySelectorAll<HTMLElement>('[data-contact-hours]').forEach((element) => {
        element.textContent = hours;
      });
    }
  }

  private updateWhatsApp(settings: SiteSettings): void {
    const number = settings.phone.replace(/\D/g, '');
    if (!number) return;
    document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me/"]').forEach((link) => {
      const current = new URL(link.href);
      const text = current.searchParams.get('text');
      link.href = `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    });
  }

  private renderFooter(settings: SiteSettings): void {
    const year = new Date().getFullYear();
    document.querySelectorAll<HTMLElement>('footer').forEach((footer) => {
      footer.className = 'site-footer-standard';
      footer.dataset.standardFooter = '';
      footer.innerHTML = `
        <div class="site-footer-wrap">
          <div class="site-footer-grid">
            <div>
              <strong class="site-footer-name"></strong>
              <p>Advocacia estratégica e estruturada.<br>Precisão técnica para resoluções complexas.</p>
            </div>
            <div><h2>Endereço</h2><p data-footer-address></p></div>
            <div><h2>Contato</h2><p><a data-footer-email></a><br><a data-footer-phone></a><br><span data-footer-hours></span></p></div>
            <div>
              <h2>Legal</h2>
              <nav>
                <a href="${route('politica-de-privacidade/')}">Privacidade</a>
                <a href="${route('politica-de-cookies/')}">Cookies</a>
                <a href="${route('termos-de-uso/')}">Termos de Uso</a>
                <a href="#" data-manage-cookies>Gerenciar cookies</a>
                <span data-footer-oab></span>
              </nav>
            </div>
          </div>
          <div class="site-footer-bottom">
            <p class="site-copyright">© ${year} ${settings.siteName}. Todos os direitos reservados.</p>
            <a class="site-developer" href="https://www.linkedin.com/in/brenochaves-" target="_blank" rel="noopener noreferrer">Desenvolvido por Breno Chaves</a>
          </div>
        </div>`;

      const name = footer.querySelector<HTMLElement>('.site-footer-name');
      const address = footer.querySelector<HTMLElement>('[data-footer-address]');
      const email = footer.querySelector<HTMLAnchorElement>('[data-footer-email]');
      const phone = footer.querySelector<HTMLAnchorElement>('[data-footer-phone]');
      const hours = footer.querySelector<HTMLElement>('[data-footer-hours]');
      const oab = footer.querySelector<HTMLElement>('[data-footer-oab]');
      if (name) name.textContent = settings.siteName;
      if (address) address.textContent = settings.address;
      if (email) {
        email.textContent = settings.email;
        email.href = `mailto:${settings.email}`;
      }
      if (phone) {
        phone.textContent = settings.phone;
        phone.href = `tel:${settings.phone.replace(/[^+\d]/g, '')}`;
      }
      if (hours) hours.textContent = settings.officeHours;
      if (oab) oab.textContent = settings.oab;
    });
  }

  private replaceKnown(value: string, settings: SiteSettings): string {
    let updated = value;
    [...knownNames, this.previous.siteName].forEach((term) => {
      if (term) updated = updated.split(term).join(settings.siteName);
    });
    [...knownEmails, this.previous.email].forEach((term) => {
      if (term) updated = updated.split(term).join(settings.email);
    });
    [this.previous.oab, 'OAB/SP 000.000'].forEach((term) => {
      if (term) updated = updated.split(term).join(settings.oab);
    });
    return updated;
  }
}
