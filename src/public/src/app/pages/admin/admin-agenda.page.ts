import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/admin/admin-api.service';
import { AdminSlot, Technician } from '../../core/admin/admin.models';
import { addDaysKey, brDateOf, brtInstant, dayKey, mondayOf, shortDayLabel, timeOf, todayKey, weekdayIndex, weekdayOf } from '../../core/datetime';
import { friendly } from '../../core/errors';
import { ApiError } from '../../core/models';
import { ToastService } from '../../core/state.services';
import { LoadingButtonComponent } from '../../shared/loading-button.component';

interface DayGroup { key: string; label: string; weekday: string; slots: AdminSlot[]; }

const WEEKDAYS = [
  { idx: 1, short: 'Seg' }, { idx: 2, short: 'Ter' }, { idx: 3, short: 'Qua' }, { idx: 4, short: 'Qui' },
  { idx: 5, short: 'Sex' }, { idx: 6, short: 'Sáb' }, { idx: 0, short: 'Dom' },
];
const MAX_RANGE_DAYS = 62;
const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

@Component({
  selector: 'ecm-admin-agenda',
  imports: [ReactiveFormsModule, RouterLink, LoadingButtonComponent],
  template: `
    <div class="max-w-[1280px] mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <header class="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div class="flex flex-col gap-1">
          <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-wider font-bold">Agendamento</span>
          <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-fg-primary font-extrabold tracking-tight">Agenda de horários</h1>
          <p class="font-body-md text-body-md text-on-surface-variant">Crie os horários que os clientes podem reservar com cada técnico. Todos os horários estão no fuso de Brasília.</p>
        </div>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <!-- Semana -->
        <section class="xl:col-span-8 adm-card flex flex-col gap-space-md" aria-labelledby="week-h" [attr.aria-busy]="loading()">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div class="flex items-center gap-space-xs">
              <button type="button" class="adm-btn-ghost !h-9 !px-2" (click)="shiftWeek(-7)" aria-label="Semana anterior"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span></button>
              <h2 id="week-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold min-w-[210px] text-center">{{ weekLabel() }}</h2>
              <button type="button" class="adm-btn-ghost !h-9 !px-2" (click)="shiftWeek(7)" aria-label="Próxima semana"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span></button>
              @if (monday() !== thisMonday) { <button type="button" class="adm-btn-ghost !h-9" (click)="goToday()">Hoje</button> }
            </div>
            <div class="flex items-center gap-space-xs">
              <label for="week-tech" class="sr-only">Filtrar por técnico</label>
              <select id="week-tech" class="adm-input !h-9 md:w-56" (change)="filterTechnician($any($event.target).value)">
                <option value="">Todos os técnicos</option>
                @for (t of technicians(); track t.id) { <option [value]="t.id" [selected]="techFilter() === t.id">{{ t.name }}{{ t.active ? '' : ' (inativo)' }}</option> }
              </select>
            </div>
          </div>

          <div class="flex flex-wrap gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>{{ counts().open }} livres</span>
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-primary"></span>{{ counts().booked }} reservados</span>
          </div>

          @if (error(); as e) {
            <div class="p-space-md rounded-lg bg-error-container text-on-error-container flex flex-col items-start gap-space-xs" role="alert">
              <p class="font-label-lg text-label-lg font-bold">{{ e.title }}</p><p class="font-body-sm text-body-sm">{{ e.message }}</p>
              <button type="button" class="adm-btn-ghost" (click)="loadWeek()">Tentar novamente</button>
            </div>
          } @else if (loading() && !slots().length) {
            <div class="flex flex-col gap-space-sm" role="status" aria-label="Carregando horários">@for (n of [1, 2, 3]; track n) { <div class="sk h-20 w-full"></div> }</div>
          } @else {
            <ol class="flex flex-col gap-space-sm">
              @for (d of days(); track d.key) {
                <li class="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-space-xs" [class.opacity-60]="d.key < today">
                  <div class="flex items-center justify-between gap-2 px-1">
                    <span class="font-label-lg text-label-lg text-fg-primary font-bold">{{ d.weekday }}, {{ d.label }}@if (d.key === today) { <span class="adm-chip bg-secondary-container text-on-secondary-container ml-1">Hoje</span> }</span>
                    <span class="font-label-mono text-label-mono text-on-surface-variant">{{ d.slots.length }} {{ d.slots.length === 1 ? 'horário' : 'horários' }}</span>
                  </div>
                  @if (d.slots.length) {
                    <ul class="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                      @for (s of d.slots; track s.id) {
                        <li class="rounded-lg bg-surface-container-lowest px-space-sm py-2 flex items-center gap-space-sm border-l-4"
                          [class]="s.status === 'BOOKED' ? 'border-primary' : 'border-tertiary-container'">
                          <div class="flex flex-col min-w-0 flex-1">
                            <span class="font-label-lg text-label-lg text-fg-primary">{{ time(s.startTime) }} – {{ time(s.endTime) }}</span>
                            <span class="font-body-sm text-body-sm text-on-surface-variant truncate">{{ s.technicianName }}</span>
                            @if (s.booking; as b) {
                              <a [routerLink]="['/admin/leads', b.leadId]" class="font-body-sm text-body-sm text-fg-primary font-semibold hover:underline truncate">
                                {{ b.leadName }} · {{ b.companyName }}
                              </a>
                            }
                          </div>
                          @if (s.status === 'BOOKED') {
                            <span class="adm-chip bg-primary text-on-primary">Reservado</span>
                            @if (s.booking && s.startTime > nowIso()) {
                              <button type="button" class="adm-btn-danger !h-8 !px-2" [disabled]="busyId() === s.id" (click)="cancelMeeting(s)"
                                [attr.aria-label]="confirming() === s.id ? 'Confirmar cancelamento da reunião' : 'Cancelar reunião'">
                                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">event_busy</span>
                                @if (confirming() === s.id) { <span>Confirmar</span> }
                              </button>
                            }
                          } @else {
                            <span class="adm-chip bg-tertiary-fixed text-on-tertiary-fixed">Livre</span>
                            <button type="button" class="!h-8 !px-2" [class]="confirming() === s.id ? 'adm-btn-danger' : 'adm-btn-ghost'" [disabled]="busyId() === s.id" (click)="remove(s)"
                              [attr.aria-label]="confirming() === s.id ? 'Confirmar remoção do horário' : 'Remover horário'">
                              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                              @if (confirming() === s.id) { <span>Remover</span> }
                            </button>
                          }
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="px-1 font-body-sm text-body-sm text-on-surface-variant">Sem horários.</p>
                  }
                </li>
              }
            </ol>
          }
        </section>

        <!-- Criar horários -->
        <section class="xl:col-span-4 adm-card flex flex-col gap-space-md xl:sticky xl:top-6" aria-labelledby="new-h">
          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">add_task</span></div>
            <div><h2 id="new-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Criar horários</h2>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Gere vários horários de uma vez para um técnico.</p></div>
          </div>

          @if (activeTechnicians().length === 0) {
            <div class="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
              <p class="font-body-sm text-body-sm text-on-surface">Cadastre um técnico ativo antes de criar horários.</p>
              <a routerLink="/admin/tecnicos" class="adm-btn-primary w-max"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>Cadastrar técnico</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="create()" class="flex flex-col gap-space-md" novalidate>
              <div class="flex flex-col gap-1">
                <label for="n-tech" class="adm-label">Técnico</label>
                <select id="n-tech" formControlName="technicianId" class="adm-input" [attr.aria-invalid]="form.controls.technicianId.touched && form.controls.technicianId.invalid">
                  <option value="" disabled>Selecione</option>
                  @for (t of activeTechnicians(); track t.id) { <option [value]="t.id">{{ t.name }}{{ t.specialty ? ' — ' + t.specialty : '' }}</option> }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-space-sm">
                <div class="flex flex-col gap-1"><label for="n-from" class="adm-label">De</label>
                  <input id="n-from" type="date" formControlName="fromDate" [min]="today" class="adm-input" /></div>
                <div class="flex flex-col gap-1"><label for="n-to" class="adm-label">Até</label>
                  <input id="n-to" type="date" formControlName="toDate" [min]="v().fromDate || today" class="adm-input" /></div>
              </div>

              <fieldset class="flex flex-col gap-1">
                <legend class="adm-label mb-1">Dias da semana</legend>
                <div class="flex flex-wrap gap-1">
                  @for (w of weekdays; track w.idx) {
                    <button type="button" (click)="toggleWeekday(w.idx)" [attr.aria-pressed]="selectedWeekdays().has(w.idx)"
                      class="h-9 min-w-[44px] px-2 rounded-lg font-label-md text-label-md"
                      [class]="selectedWeekdays().has(w.idx) ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-fg-primary hover:bg-surface-container'">{{ w.short }}</button>
                  }
                </div>
              </fieldset>

              <div class="grid grid-cols-2 gap-space-sm">
                <div class="flex flex-col gap-1"><label for="n-start" class="adm-label">Das</label>
                  <input id="n-start" type="time" step="900" formControlName="startTime" class="adm-input" /></div>
                <div class="flex flex-col gap-1"><label for="n-end" class="adm-label">Às</label>
                  <input id="n-end" type="time" step="900" formControlName="endTime" class="adm-input" /></div>
              </div>

              <div class="grid grid-cols-2 gap-space-sm">
                <div class="flex flex-col gap-1"><label for="n-dur" class="adm-label">Duração</label>
                  <select id="n-dur" formControlName="durationMinutes" class="adm-input">
                    @for (d of durations; track d) { <option [ngValue]="d">{{ d }} min</option> }
                  </select></div>
                <div class="flex flex-col gap-1"><label for="n-break" class="adm-label">Intervalo</label>
                  <select id="n-break" formControlName="breakMinutes" class="adm-input">
                    @for (b of breaks; track b) { <option [ngValue]="b">{{ b === 0 ? 'Sem intervalo' : b + ' min' }}</option> }
                  </select></div>
              </div>

              <div class="p-space-sm rounded-lg flex items-start gap-space-xs" [class]="planError() ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-surface'" aria-live="polite">
                <span class="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{{ planError() ? 'error' : 'info' }}</span>
                <p class="font-body-sm text-body-sm">
                  @if (planError(); as pe) { {{ pe }} }
                  @else { Até <strong>{{ plan().total }}</strong> horários em <strong>{{ plan().dates.length }}</strong> {{ plan().dates.length === 1 ? 'dia' : 'dias' }} ({{ plan().perDay }} por dia). Horários que já passaram ou que se sobrepõem a outros do mesmo técnico são ignorados. }
                </p>
              </div>

              <ecm-loading-button type="submit" label="Criar horários" icon="event_available" loadingLabel="Criando horários..." [loading]="creating()" [disabled]="!!planError()" />
            </form>
          }
        </section>
      </div>
    </div>
  `,
})
export class AdminAgendaPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly weekdays = WEEKDAYS;
  readonly durations = [30, 45, 60, 90, 120];
  readonly breaks = [0, 10, 15, 30];
  readonly time = timeOf;
  readonly today = todayKey();
  readonly thisMonday = mondayOf(this.today);

  readonly technicians = signal<Technician[]>([]);
  readonly activeTechnicians = computed(() => this.technicians().filter((t) => t.active));
  readonly monday = signal(this.thisMonday);
  readonly techFilter = signal('');
  readonly slots = signal<AdminSlot[]>([]);
  readonly loading = signal(false);
  readonly error = signal<{ title: string; message: string } | null>(null);
  readonly confirming = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly creating = signal(false);
  readonly selectedWeekdays = signal(new Set([1, 2, 3, 4, 5]));
  private confirmTimer?: ReturnType<typeof setTimeout>;

  readonly form = this.fb.group({
    technicianId: ['', Validators.required],
    fromDate: [this.today, Validators.required],
    toDate: [addDaysKey(this.today, 6), Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required],
    durationMinutes: [45, Validators.required],
    breakMinutes: [15, Validators.required],
  });
  readonly v = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly weekLabel = computed(() => `${brDateOf(this.monday()).slice(0, 5)} – ${brDateOf(addDaysKey(this.monday(), 6))}`);
  readonly nowIso = signal(new Date().toISOString());

  readonly days = computed<DayGroup[]>(() => {
    const byDay = new Map<string, AdminSlot[]>();
    for (const s of this.slots()) {
      const k = dayKey(s.startTime);
      byDay.set(k, [...(byDay.get(k) ?? []), s]);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysKey(this.monday(), i);
      return { key, label: brDateOf(key).slice(0, 5), weekday: weekdayOf(key + 'T15:00:00Z'), slots: byDay.get(key) ?? [] };
    });
  });
  readonly counts = computed(() => ({
    open: this.slots().filter((s) => s.status === 'AVAILABLE').length,
    booked: this.slots().filter((s) => s.status === 'BOOKED').length,
  }));

  /** Prévia do que será gerado (o backend é quem valida de fato). */
  readonly plan = computed(() => {
    const v = { ...this.form.getRawValue(), ...this.v() };
    const dates: string[] = [];
    if (v.fromDate && v.toDate && v.fromDate <= v.toDate) {
      for (let k = v.fromDate, n = 0; k <= v.toDate && n <= MAX_RANGE_DAYS; k = addDaysKey(k, 1), n++) {
        if (this.selectedWeekdays().has(weekdayIndex(k))) dates.push(k);
      }
    }
    const window = v.startTime && v.endTime ? toMinutes(v.endTime) - toMinutes(v.startTime) : 0;
    const duration = Number(v.durationMinutes) || 0;
    const step = duration + (Number(v.breakMinutes) || 0);
    const perDay = window >= duration && duration > 0 ? Math.floor((window - duration) / step) + 1 : 0;
    const spanDays = v.fromDate && v.toDate ? (Date.parse(v.toDate) - Date.parse(v.fromDate)) / 86_400_000 + 1 : 0;
    return { dates, perDay, total: dates.length * perDay, spanDays, window, duration };
  });
  readonly planError = computed(() => {
    const p = this.plan();
    const v = { ...this.form.getRawValue(), ...this.v() };
    if (!v.fromDate || !v.toDate || v.fromDate > v.toDate) return 'Informe um período válido (data final igual ou posterior à inicial).';
    if (v.toDate < this.today) return 'O período informado já passou.';
    if (p.spanDays > MAX_RANGE_DAYS) return `O período pode ter no máximo ${MAX_RANGE_DAYS} dias.`;
    if (!this.selectedWeekdays().size) return 'Escolha pelo menos um dia da semana.';
    if (!p.dates.length) return 'Nenhum dia do período corresponde aos dias da semana escolhidos.';
    if (p.window <= 0) return 'O horário final deve ser depois do inicial.';
    if (p.window < p.duration) return 'A janela de horário é menor que a duração de uma reunião.';
    if (p.total > 500) return 'São mais de 500 horários: reduza o período ou a janela.';
    return null;
  });

  constructor() {
    this.form.controls.fromDate.valueChanges.pipe(takeUntilDestroyed()).subscribe((from) => {
      if (from && this.form.controls.toDate.value < from) this.form.controls.toDate.setValue(from);
    });
  }

  ngOnInit() {
    this.api.technicians().subscribe({
      next: (t) => {
        this.technicians.set(t);
        const active = t.filter((x) => x.active);
        if (active.length === 1) this.form.controls.technicianId.setValue(active[0].id);
      },
      error: (e: ApiError) => { const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); },
    });
    this.loadWeek();
  }

  loadWeek() {
    this.loading.set(true);
    this.error.set(null);
    this.nowIso.set(new Date().toISOString());
    const from = brtInstant(this.monday());
    const to = brtInstant(addDaysKey(this.monday(), 7));
    this.api.slots(from, to, this.techFilter() || undefined).subscribe({
      next: (s) => { this.slots.set(s); this.loading.set(false); },
      error: (e: ApiError) => { this.loading.set(false); this.error.set(friendly(e, 'admin')); },
    });
  }

  shiftWeek(days: number) { this.monday.set(addDaysKey(this.monday(), days)); this.slots.set([]); this.loadWeek(); }
  goToday() { this.monday.set(this.thisMonday); this.slots.set([]); this.loadWeek(); }
  filterTechnician(id: string) { this.techFilter.set(id); this.loadWeek(); }

  toggleWeekday(idx: number) {
    this.selectedWeekdays.update((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  create() {
    if (this.creating()) return;
    if (this.form.invalid || this.planError()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.creating.set(true);
    this.api.createSlots({
      technicianId: v.technicianId, dates: this.plan().dates, startTime: v.startTime, endTime: v.endTime,
      durationMinutes: Number(v.durationMinutes), breakMinutes: Number(v.breakMinutes),
    }).subscribe({
      next: (r) => {
        this.creating.set(false);
        const created = r.created.length;
        this.toast.show(created ? `${created} ${created === 1 ? 'horário criado' : 'horários criados'}` : 'Nenhum horário criado',
          r.skipped ? `${r.skipped} ignorado(s) por já terem passado ou se sobreporem a horários existentes.` : 'Os clientes já podem reservar.',
          created ? 'success' : 'error');
        // Mostra a semana do primeiro horário criado.
        if (created) this.monday.set(mondayOf(dayKey(r.created[0].startTime)));
        this.loadWeek();
      },
      error: (e: ApiError) => { this.creating.set(false); const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); },
    });
  }

  remove(s: AdminSlot) {
    if (!this.askConfirm(s.id)) return;
    this.busyId.set(s.id);
    this.api.deleteSlot(s.id).subscribe({
      next: () => { this.busyId.set(null); this.slots.update((all) => all.filter((x) => x.id !== s.id)); this.toast.show('Horário removido', `${shortDayLabel(dayKey(s.startTime))} às ${timeOf(s.startTime)}`); },
      error: (e: ApiError) => { this.busyId.set(null); const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); this.loadWeek(); },
    });
  }

  cancelMeeting(s: AdminSlot) {
    if (!s.booking || !this.askConfirm(s.id)) return;
    this.busyId.set(s.id);
    this.api.setMeetingStatus(s.booking.scheduleId, 'CANCELLED').subscribe({
      next: () => { this.busyId.set(null); this.toast.show('Reunião cancelada', 'O horário voltou a ficar livre e o cliente foi avisado por e-mail.'); this.loadWeek(); },
      error: (e: ApiError) => { this.busyId.set(null); const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); },
    });
  }

  /** Ações destrutivas em dois cliques: o primeiro arma a confirmação (por 5 s), o segundo executa. */
  private askConfirm(id: string): boolean {
    if (this.confirming() === id) { this.confirming.set(null); return true; }
    this.confirming.set(id);
    clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => this.confirming.set(null), 5000);
    return false;
  }
}
