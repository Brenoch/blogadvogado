import { route, STORAGE_KEYS } from '../domain/defaults';

type ConsentChoice = 'accept' | 'reject';

export class CookieConsent {
  public mount(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const link = target?.closest('[data-manage-cookies]');
      if (!link) return;
      event.preventDefault();
      localStorage.removeItem(STORAGE_KEYS.cookieConsent);
      this.show();
    });
    if (!localStorage.getItem(STORAGE_KEYS.cookieConsent)) this.show();
  }

  private show(): void {
    if (document.getElementById('lgpd-cookie-banner')) return;
    const banner = document.createElement('section');
    banner.id = 'lgpd-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferências de cookies');
    banner.innerHTML = `
      <div class="lgpd-cookie-copy">
        <strong>Sua privacidade importa</strong>
        <p>Usamos apenas recursos essenciais. Não usamos publicidade ou análise sem autorização. Consulte a <a href="${route('politica-de-cookies/')}">Política de Cookies</a> e a <a href="${route('politica-de-privacidade/')}">Política de Privacidade</a>.</p>
      </div>
      <div class="lgpd-cookie-actions">
        <button type="button" data-consent="reject">Recusar não essenciais</button>
        <button type="button" data-consent="accept" class="lgpd-accept">Aceitar essenciais</button>
      </div>`;
    banner.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('[data-consent]');
      if (!button) return;
      const choice = button.dataset.consent as ConsentChoice;
      localStorage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify({ choice, updatedAt: new Date().toISOString() }));
      banner.remove();
    });
    document.body.appendChild(banner);
  }
}
