import { route } from '../../domain/defaults';
import { escapeHtml } from '../../domain/text';
import { contentService } from '../../application/content-service';
import { SeoPresenter } from '../../presentation/seo-presenter';

interface AreaContent {
  title: string;
  lead: string;
  intro: string;
  method: string;
  documents: string;
  services: string[];
  subject: string;
}

const AREAS: Record<string, AreaContent> = {
  penal: {
    title: 'Direito Penal',
    lead: 'Defesa técnica em procedimentos e processos criminais, com atenção aos fatos, às provas e às garantias legais.',
    intro: 'A atuação penal exige análise cuidadosa desde o primeiro contato. Cada decisão é orientada pelo momento do caso e pelos elementos disponíveis.',
    method: 'São avaliados os documentos, as informações disponíveis e as medidas adequadas para cada fase do procedimento ou processo.',
    documents: 'Reúna intimações, boletins de ocorrência, documentos recebidos e demais registros relacionados ao caso.',
    services: ['Acompanhamento em inquéritos', 'Defesa em processos criminais', 'Análise de medidas cautelares', 'Orientação sobre audiências'],
    subject: 'penal'
  },
  bancario: {
    title: 'Direito Bancário',
    lead: 'Análise jurídica de contratos bancários, operações de crédito e relações financeiras.',
    intro: 'Relações bancárias envolvem contratos, encargos e obrigações que precisam ser lidos com precisão antes de qualquer medida.',
    method: 'O atendimento considera o instrumento contratual, os comprovantes e a evolução da relação financeira para identificar os caminhos possíveis.',
    documents: 'Separe contratos, faturas, extratos, notificações e comprovantes de pagamento.',
    services: ['Revisão de contratos bancários', 'Análise de operações de crédito', 'Cobranças e renegociação', 'Orientação sobre garantias'],
    subject: 'bancario'
  },
  consumidor: {
    title: 'Direito do Consumidor',
    lead: 'Orientação em relações de consumo, contratos, cobranças e defesa de direitos.',
    intro: 'A experiência em Direito do Consumidor apoia a análise de problemas em compras, serviços e contratos de consumo.',
    method: 'São avaliados os fatos, a oferta, os documentos e os canais de solução disponíveis antes de definir a estratégia.',
    documents: 'Tenha contratos, notas fiscais, comprovantes, protocolos de atendimento e mensagens.',
    services: ['Contratos de consumo', 'Cobranças indevidas', 'Falhas na prestação de serviços', 'Negociações e defesa de direitos'],
    subject: 'consumidor'
  },
  administrativo: {
    title: 'Direito Administrativo',
    lead: 'Orientação em processos administrativos, relações com órgãos públicos e licitações.',
    intro: 'Demandas administrativas dependem de prazos, documentos e regras específicas do órgão envolvido.',
    method: 'A análise verifica os atos recebidos, os prazos aplicáveis e a documentação necessária para uma resposta tecnicamente adequada.',
    documents: 'Reúna notificações, processos, editais, contratos e comunicações oficiais.',
    services: ['Processos administrativos', 'Licitações e contratos públicos', 'Defesas e recursos administrativos', 'Orientação perante órgãos públicos'],
    subject: 'administrativo'
  }
};

export function mountAreaDetailPage(): void {
  const key = new URLSearchParams(location.search).get('area') ?? areaSlugFromPath();
  const area = AREAS[key];
  if (!area) {
    location.replace(route('areas-de-atuacao/'));
    return;
  }

  const settings = contentService.settings();
  const title = `${area.title} | ${settings.siteName}`;
  const canonical = `${location.origin}${route(`areas-de-atuacao/${encodeURIComponent(key)}/`)}`;
  new SeoPresenter().apply({
    title,
    description: area.lead,
    canonical
  });
  setText('breadcrumb-area', area.title.replace('Direito ', ''));
  setText('area-title', area.title);
  setText('area-lead', area.lead);
  setText('area-intro', area.intro);
  setText('area-method', area.method);
  setText('area-documents', area.documents);
  setText('area-cta', `Apresente sua questão em ${area.title.replace('Direito ', '')}.`);

  const list = document.getElementById('area-services');
  if (list) list.innerHTML = area.services.map((service) => `<li>${escapeHtml(service)}</li>`).join('');

  const contact = route(`contato/?assunto=${encodeURIComponent(area.subject)}`);
  setHref('area-hero-link', contact);
  setHref('area-contact-link', contact);
  setHref('area-whatsapp-link', `https://wa.me/5511333333333?text=${encodeURIComponent(`Olá, preciso de orientação em ${area.title}.`)}`);
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setHref(id: string, value: string): void {
  const element = document.getElementById(id) as HTMLAnchorElement | null;
  if (element) element.href = value;
}

function areaSlugFromPath(): string {
  const pathname = location.pathname.replace(/\/+$/, '');
  const match = pathname.match(/\/areas-de-atuacao\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}
