import { contentService } from '../../application/content-service';
import { requiredById, setBusy, setFeedback } from '../../shared/dom';

export class ContactPage {
  public mount(): void {
    const form = requiredById<HTMLFormElement>('contact-form');
    const subject = requiredById<HTMLSelectElement>('assunto');
    const requestedSubject = new URLSearchParams(location.search).get('assunto');
    if (requestedSubject && [...subject.options].some((option) => option.value === requestedSubject)) {
      subject.value = requestedSubject;
    }
    this.addMapAction();
    form.addEventListener('submit', (event) => void this.submit(event, form));
  }

  private async submit(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const feedback = document.getElementById('contact-feedback');
    if (!button) return;
    setBusy(button, true, 'Enviando...');
    setFeedback(feedback, 'Enviando mensagem...', true);
    try {
      await contentService.submitContact({
        name: requiredById<HTMLInputElement>('nome').value,
        email: requiredById<HTMLInputElement>('email').value,
        phone: requiredById<HTMLInputElement>('telefone').value,
        subject: requiredById<HTMLSelectElement>('assunto').value,
        message: requiredById<HTMLTextAreaElement>('mensagem').value,
        website: requiredById<HTMLInputElement>('website').value
      });
      setFeedback(feedback, 'Mensagem enviada. Em breve entraremos em contato.', true);
      form.reset();
    } catch (error) {
      console.error('Falha ao enviar contato.', error);
      setFeedback(feedback, 'Não foi possível enviar. Tente novamente.');
    } finally {
      setBusy(button, false);
    }
  }

  private addMapAction(): void {
    const map = document.querySelector<HTMLIFrameElement>('[data-google-map]');
    const container = map?.parentElement;
    if (!container || container.querySelector('[data-google-maps-link]')) return;
    const link = document.createElement('a');
    link.dataset.googleMapsLink = '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const query = encodeURIComponent(contentService.settings().address.replace(/\s*\n\s*/g, ', '));
    link.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
    link.className = 'map-open-link absolute bottom-6 bg-primary text-on-primary h-12 px-gutter flex items-center justify-center gap-xs font-label shadow-lg hover:opacity-90 transition-opacity';
    link.innerHTML = '<span class="material-symbols-outlined text-[20px]">directions</span>Abrir no Google Maps';
    container.appendChild(link);
  }
}
