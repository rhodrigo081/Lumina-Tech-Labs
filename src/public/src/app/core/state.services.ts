import { Injectable, computed, effect, signal } from '@angular/core';
import { BookingRecord, DiagnosticInput, Identification, LeadResponse } from './models';
import { DEFAULT_INPUT } from './infrastructure';
import { FriendlyError } from './errors';

const KEY = 'ecm.session.v1';

interface Persisted { input?: DiagnosticInput; client?: Identification | null; report?: LeadResponse | null; booking?: BookingRecord | null; }

const isInput = (x: unknown): x is DiagnosticInput => {
  const i = x as DiagnosticInput;
  return !!i && typeof i.areaM2 === 'number' && typeof i.workstations === 'number' && typeof i.monthlyEnergyBill === 'number' && typeof i.currentInfrastructure === 'string';
};

function restore(): Persisted {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Persisted; } catch { return {}; }
}

@Injectable({ providedIn: 'root' })
export class JourneyStore {
  private readonly saved = restore();

  readonly input = signal<DiagnosticInput>(isInput(this.saved.input) ? this.saved.input : DEFAULT_INPUT);
  readonly client = signal<Identification | null>(this.saved.client ?? null);
  readonly report = signal<LeadResponse | null>(this.saved.report ?? null);
  readonly booking = signal<BookingRecord | null>(this.saved.booking ?? null);
  readonly reportRequested = signal(false);

  readonly lead = computed(() => ({
    id: this.report()?.id ?? '',
    name: this.client()?.name ?? this.report()?.fullName ?? '',
    role: this.client()?.role ?? '', company: this.client()?.company ?? this.report()?.companyName ?? '',
    phone: this.client()?.phone ?? '', email: this.client()?.email ?? this.report()?.corporateEmail ?? '',
  }));

  constructor() {
    effect(() => {
      const data: Persisted = { input: this.input(), client: this.client(), report: this.report(), booking: this.booking() };
      try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { }
    });
  }
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly active = computed(() => this.count() > 0);
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
  error(e: FriendlyError) { this.show(e.title, e.message, 'error'); }
  dismiss() { this.toast.set(null); }

  async copy(text: string, title: string, message: string) {
    try { await navigator.clipboard.writeText(text); this.show(title, message); }
    catch { this.show('Não foi possível copiar', 'Selecione o texto e copie manualmente.', 'error'); }
  }
}
