import { contentService } from '../../application/content-service';
import { route } from '../../domain/defaults';
import { requiredById, setBusy, setFeedback } from '../../shared/dom';

export class LoginPage {
  public async mount(): Promise<void> {
    if (await contentService.isAdmin()) {
      location.replace(route('admin/'));
      return;
    }
    const form = requiredById<HTMLFormElement>('admin-login-form');
    form.addEventListener('submit', (event) => void this.submit(event, form));
  }

  private async submit(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const feedback = document.getElementById('login-feedback');
    if (!button) return;
    setBusy(button, true, 'Verificando acesso...');
    setFeedback(feedback, 'Verificando acesso...', true);
    try {
      await contentService.signIn(
        requiredById<HTMLInputElement>('email').value,
        requiredById<HTMLInputElement>('password').value
      );
      location.assign(route('admin/'));
    } catch (error) {
      setFeedback(feedback, error instanceof Error ? error.message : 'Não foi possível entrar.');
      setBusy(button, false);
    }
  }
}
