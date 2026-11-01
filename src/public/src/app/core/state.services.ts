import { Injectable, computed, effect, signal } from '@angular/core';
import { BookingRecord, DiagnosticInput, Identification, LeadResponse } from './models';
import { DEFAULT_INPUT } from './infrastructure';

const KEY = 'ecm.session.v1';

interface Persisted { input?: DiagnosticInput; client?: Identification | null; report?: LeadResponse | null; booking?: BookingRecord | null; }

const isInput = (x: unknown): x is DiagnosticInput => {
  const i = x as DiagnosticInput;
  return !!i && typeof i.areaM2 === 'number' && typeof i.workstations === 'number' && typeof i.monthlyEnergyBill === 'number' && typeof i.currentInfrastructure === 'string';
};

function restore(): Persisted {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Persisted; } catch { return {}; }
}

/**
 * Estado da jornada (diagnóstico → relatório → agendamento → confirmação).
 * Fica salvo no sessionStorage da aba: recarregar a página não perde o andamento (fechar a aba limpa tudo).
 */
@Injectable({ providedIn: 'root' })
export class JourneyStore {
  private readonly saved = restore();

  readonly input = signal<DiagnosticInput>(isInput(this.saved.input) ? this.saved.input : DEFAULT_INPUT);
  /** Última identificação preenchida: pré-preenche os próximos formulários. */
  readonly client = signal<Identification | null>(this.saved.client ?? null);
  /** Lead criado no backend, com o diagnóstico calculado. */
  readonly report = signal<LeadResponse | null>(this.saved.report ?? null);
  readonly booking = signal<BookingRecord | null>(this.saved.booking ?? null);
  /** Verdadeiro depois do clique em "Gerar relatório" (libera a rota do relatório). */
  readonly reportRequested = signal(false);

  /** Atalho de compatibilidade: identificação + id do lead. */
  readonly lead = computed(() => ({
    id: this.report()?.id ?? '',
    name: this.client()?.name ?? this.report()?.fullName ?? '',
    role: this.client()?.role ?? '', company: this.client()?.company ?? this.report()?.companyName ?? '',
    phone: this.client()?.phone ?? '', email: this.client()?.email ?? this.report()?.corporateEmail ?? '',
  }));

  constructor() {
    effect(() => {
      const data: Persisted = { input: this.input(), client: this.client(), report: this.report(), booking: this.booking() };
      try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage indisponível */ }
    });
  }
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
