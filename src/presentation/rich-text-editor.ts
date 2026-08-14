import { sanitizeArticleHtml } from '../domain/text';

export class RichTextEditor {
  public constructor(
    private readonly content: HTMLElement,
    private readonly toolbar: HTMLElement,
    private readonly feedback: HTMLElement | null
  ) {}

  public mount(): void {
    this.toolbar.addEventListener('mousedown', (event) => event.preventDefault());
    this.toolbar.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
      button.addEventListener('click', () => this.execute(button));
    });
    ['keyup', 'mouseup', 'focus'].forEach((event) => this.content.addEventListener(event, () => this.updateToolbar()));
  }

  public value(): string {
    return sanitizeArticleHtml(this.content.innerHTML);
  }

  public setValue(value: string): void {
    this.content.innerHTML = sanitizeArticleHtml(value);
  }

  private execute(button: HTMLButtonElement): void {
    this.content.focus();
    const command = button.dataset.command ?? '';
    if (command === 'autoFormat') {
      this.autoFormat();
      return;
    }
    if (command === 'createLink') {
      const href = prompt('Informe a URL do link:')?.trim();
      if (!href) return;
      if (!/^(https?:\/\/|mailto:)/i.test(href)) {
        this.announce('Use um link iniciado por https:// ou mailto:.');
        return;
      }
      document.execCommand('createLink', false, href);
    } else if (command === 'formatBlock') {
      const value = button.dataset.value;
      if (value) document.execCommand('formatBlock', false, value);
    } else if (['bold', 'italic', 'underline', 'insertUnorderedList'].includes(command)) {
      document.execCommand(command);
    }
    this.normalizeLinks();
    this.updateToolbar();
  }

  private autoFormat(): void {
    const raw = this.content.innerText.trim();
    if (!raw) {
      this.announce('Escreva ou cole um texto antes de formatar.');
      return;
    }
    const fragment = document.createDocumentFragment();
    raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).forEach((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const first = lines[0] ?? '';
      if (/^#{1,2}\s+/.test(first)) {
        const heading = document.createElement('h2');
        heading.textContent = first.replace(/^#{1,2}\s+/, '');
        fragment.appendChild(heading);
        return;
      }
      if (/^(aviso|nota|importante)\b[:\s]/i.test(first)) {
        const notice = document.createElement('aside');
        notice.className = 'article-notice';
        const title = document.createElement('strong');
        title.textContent = 'Aviso jurídico informativo';
        const paragraph = document.createElement('p');
        paragraph.textContent = lines.join(' ').replace(/^(aviso|nota|importante)\b[:\s]*/i, '');
        notice.append(title, paragraph);
        fragment.appendChild(notice);
        return;
      }
      if (/^>\s+/.test(first)) {
        const quote = document.createElement('blockquote');
        quote.textContent = lines.map((line) => line.replace(/^>\s?/, '')).join(' ');
        fragment.appendChild(quote);
        return;
      }
      if (lines.every((line) => /^[-*•]\s+/.test(line))) {
        const list = document.createElement('ul');
        lines.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line.replace(/^[-*•]\s+/, '');
          list.appendChild(item);
        });
        fragment.appendChild(list);
        return;
      }
      if (lines.length === 1 && first.length <= 90 && !/[.!?;:]$/.test(first)) {
        const heading = document.createElement('h2');
        heading.textContent = first;
        fragment.appendChild(heading);
        return;
      }
      const paragraph = document.createElement('p');
      paragraph.textContent = lines.join(' ');
      fragment.appendChild(paragraph);
    });
    this.content.replaceChildren(fragment);
    this.announce('Texto formatado em parágrafos, títulos, listas e citações.');
    this.updateToolbar();
  }

  private normalizeLinks(): void {
    this.content.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }

  private updateToolbar(): void {
    this.toolbar.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
      const command = button.dataset.command ?? '';
      let active = false;
      if (command === 'formatBlock') {
        active = String(document.queryCommandValue('formatBlock')).replace(/[<>]/g, '').toLowerCase() === button.dataset.value;
      } else if (!['createLink', 'autoFormat'].includes(command)) {
        active = document.queryCommandState(command);
      }
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('bg-surface-variant', active);
    });
  }

  private announce(message: string): void {
    if (this.feedback) this.feedback.textContent = message;
  }
}
