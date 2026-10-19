import { Injectable, computed, signal } from '@angular/core';
import { Booking, DiagnosticInput, Identification, LeadSummary, Report } from './models';
import { DEFAULT_INPUT, DEFAULT_LEAD, calcDiagnostic } from './calc';

/** Estado da jornada (diagnóstico → relatório → agendamento). Defaults permitem abrir qualquer rota direto. */
@Injectable({ providedIn: 'root' })
export class JourneyStore {
  readonly input = signal<DiagnosticInput>(DEFAULT_INPUT);
  readonly lead = signal<LeadSummary>(DEFAULT_LEAD);
  readonly booking = signal<Booking | null>(null);
  /** Última identificação preenchida: pré-preenche os próximos formulários (o cliente informa os dados uma vez só). */
  readonly client = signal<Identification | null>(null);
  /** Verdadeiro depois que o usuário clica em "Gerar relatório": é o único caminho de acesso à página de relatório. */
  readonly reportRequested = signal(false);
  readonly result = computed(() => calcDiagnostic(this.input()));
  /** Último relatório carregado: evita nova consulta (e skeleton) quando o dado já está em memória. */
  readonly report = signal<Report | null>(null);
  setReport(r: Report) { this.report.set(r); this.lead.set(r.lead); this.input.set(r.input); }
}

/** Contador de requisições em andamento — alimenta a barra global de progresso. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly active = computed(() => this.count() > 0);
  readonly pending = this.count.asReadonly();
  inc() { this.count.update((n) => n + 1); }
  dec() { this.count.update((n) => Math.max(0, n - 1)); }
}

export interface Toast { title: string; message: string; tone: 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  show(title: string, message: string, tone: Toast['tone'] = 'success') {
    clearTimeout(this.timer);
    this.toast.set({ title, message, tone });
    this.timer = setTimeout(() => this.dismiss(), 5000);
  }
  dismiss() { this.toast.set(null); }
}
