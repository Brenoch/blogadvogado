import { route } from '../domain/defaults';

export class MobileNavigation {
  public mount(): void {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    document.body.appendChild(menu);
    this.addBrand(menu);

    const openButton = document.querySelector<HTMLButtonElement>('button[aria-label="Abrir menu"]');
    const closeButton = menu.querySelector<HTMLButtonElement>('button[aria-label="Fechar menu"]');

    const setOpen = (open: boolean): void => {
      menu.classList.toggle('hidden', !open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('mobile-nav-open', open);
      openButton?.setAttribute('aria-expanded', String(open));
      if (open) closeButton?.focus();
    };

    openButton?.removeAttribute('onclick');
    openButton?.setAttribute('aria-controls', 'mobile-menu');
    openButton?.setAttribute('aria-expanded', 'false');
    openButton?.addEventListener('click', () => setOpen(true));

    closeButton?.removeAttribute('onclick');
    closeButton?.addEventListener('click', () => {
      setOpen(false);
      openButton?.focus();
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.classList.contains('hidden')) setOpen(false);
    });
  }

  private addBrand(menu: HTMLElement): void {
    const title = menu.firstElementChild?.querySelector('span');
    const desktopBrand = document.querySelector<HTMLAnchorElement>(`header a[href="${route()}"]`);
    if (!title || !desktopBrand) return;
    const mobileBrand = desktopBrand.cloneNode(true) as HTMLAnchorElement;
    mobileBrand.className = 'mobile-menu-brand';
    mobileBrand.setAttribute('aria-label', 'Andres Oliveira Advocacia — início');
    title.replaceWith(mobileBrand);
  }
}
