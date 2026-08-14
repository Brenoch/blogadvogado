export class AdminNavigation {
  public mount(): void {
    if (!document.body.classList.contains('admin-panel-page')) return;
    const sidebar = document.querySelector<HTMLElement>('body > aside');
    const menuButton = document.querySelector<HTMLButtonElement>('main > header button');
    if (!sidebar || !menuButton) return;
    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'admin-menu-backdrop';
    backdrop.setAttribute('aria-label', 'Fechar menu');
    document.body.appendChild(backdrop);
    menuButton.type = 'button';
    menuButton.setAttribute('aria-label', 'Abrir menu');
    menuButton.setAttribute('aria-expanded', 'false');

    const setOpen = (open: boolean): void => {
      sidebar.classList.toggle('admin-sidebar-open', open);
      backdrop.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuButton.addEventListener('click', () => setOpen(true));
    backdrop.addEventListener('click', () => setOpen(false));
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }
}
