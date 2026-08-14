export function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function requiredById<T extends HTMLElement>(id: string): T {
  const element = byId<T>(id);
  if (!element) throw new Error(`Elemento obrigatório ausente: #${id}`);
  return element;
}

export function onReady(callback: () => void | Promise<void>): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void callback(), { once: true });
    return;
  }
  void callback();
}

export function setFeedback(element: HTMLElement | null, message: string, success = false): void {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('text-error', !success);
  element.classList.toggle('text-primary', success);
}

export function setBusy(button: HTMLButtonElement, busy: boolean, label?: string): void {
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    if (label) button.textContent = label;
  } else if (button.dataset.originalLabel) {
    button.innerHTML = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}
