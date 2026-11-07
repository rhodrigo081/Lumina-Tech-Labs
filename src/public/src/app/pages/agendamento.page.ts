import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { brDateOf, dayKey, hourOf, monthYearOf, timeOf, weekdayOf } from '../core/datetime';
import { FriendlyError, friendly } from '../core/errors';
import { ApiError, Slot } from '../core/models';
import { JourneyStore } from '../core/state.services';
import { shortId } from '../core/utils';
import { ErrorCardComponent } from '../shared/error-card.component';
import { LoadingButtonComponent } from '../shared/loading-button.component';

interface SlotView { id: string; startTime: string; endTime: string; time: string; technicianId: string; technicianName: string; technicianSpecialty?: string | null; }
interface TechnicianOption { id: string; name: string; }
interface DayView { key: string; weekday: string; day: string; slots: SlotView[]; }

@Component({
  selector: 'ecm-agendamento',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, ErrorCardComponent, LoadingButtonComponent],
  template: `
    @if (!report()) {
      <div class="max-w-[720px] mx-auto px-gutter py-space-xl">
        <ecm-error-card badge="Antes de agendar" code="" icon="calculate" tone="neutral"
          title="Faça o diagnóstico para agendar a reunião"
          message="O agendamento usa os dados do seu diagnóstico e da sua identificação, para que a nossa equipe chegue à reunião já preparada. Leva menos de 1 minuto.">
          <ng-container actions>
            <a routerLink="/diagnostico" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">calculate</span>Fazer diagnóstico</a>
          </ng-container>
        </ecm-error-card>
      </div>
    } @else {
    <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md">
        <div class="max-w-3xl flex flex-col gap-space-xs">
          <span class="font-label-mono text-label-mono text-fg-primary uppercase tracking-wider font-bold">Relatório #{{ shortId() }} • Engenharia Consultiva</span>
          <h1 class="font-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight font-extrabold">Agende sua sessão estratégica de diagnóstico técnico</h1>
          <p class="font-body-md text-body-md text-on-surface-variant">Escolha a data e o horário mais convenientes para validar o seu diagnóstico com a equipe técnica da Lumina Tech Labs.</p>
        </div>
        <div class="flex items-center gap-space-sm bg-surface-container px-space-md py-2.5 rounded-lg shrink-0">
          <span class="relative flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span></span>
          <div class="flex flex-col"><span class="font-label-mono text-label-mono text-fg-primary font-bold">Brasília (GMT-3)</span><span class="text-[11px] text-on-surface-variant">Todos os horários seguem o horário de Brasília</span></div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div class="xl:col-span-7 flex flex-col gap-space-lg">
          <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md" [attr.aria-busy]="status() === 'loading'">
            <div class="flex items-center justify-between pb-space-xs gap-space-sm flex-wrap">
              <div class="flex items-center gap-2"><span class="material-symbols-outlined text-fg-primary text-[22px]" aria-hidden="true">calendar_month</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ monthLabel() }}</span></div>
              <button type="button" (click)="reloadSlots()" [disabled]="status() === 'loading'" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-fg-primary font-label-md text-label-md disabled:opacity-60">
                <span class="material-symbols-outlined text-[16px]" [class.animate-spin]="status() === 'loading'" aria-hidden="true">sync</span>Atualizar horários
              </button>
            </div>

            @switch (status()) {
              @case ('loading') {
                <div role="status" aria-label="Carregando horários" class="flex flex-col gap-space-md">
                  <div class="flex gap-space-xs overflow-hidden">@for (n of [1,2,3,4]; track n) { <div class="sk h-[104px] min-w-[104px] flex-1 rounded-lg"></div> }</div>
                  <div class="flex flex-col gap-space-xs"><div class="sk h-5 w-48"></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-space-xs">@for (n of [1,2,3,4]; track n) { <div class="sk h-[50px] rounded-lg"></div> }</div></div>
                </div>
              }
              @case ('error') {
                <ecm-error-card [badge]="'HTTP ' + (slotsError()?.status ?? 0)" [code]="slotsError()?.code ?? ''" icon="cloud_off" tone="error" [title]="slotsMsg()?.title ?? ''" [message]="slotsMsg()?.message ?? ''">
                  <ng-container actions><button type="button" (click)="reloadSlots()" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">replay</span>Tentar agora</button></ng-container>
                </ecm-error-card>
              }
              @default {
                @if (days().length === 0) {
                  <div class="p-space-lg rounded-xl bg-surface-container-low flex flex-col items-center text-center gap-space-sm">
                    <span class="material-symbols-outlined text-[36px] text-fg-secondary" aria-hidden="true">event_busy</span>
                    <h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Nenhum horário disponível no momento</h2>
                    <p class="font-body-md text-body-md text-on-surface-variant max-w-md">Novos horários são liberados com frequência. Atualize a grade mais tarde ou fale com a nossa equipe.</p>
                    <a routerLink="/contato" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs">Falar com a equipe</a>
                  </div>
                } @else {
                  <div class="flex gap-space-xs overflow-x-auto pb-1" role="tablist" aria-label="Datas disponíveis">
                    @for (d of days(); track d.key) {
                      <button type="button" role="tab" [attr.aria-selected]="d.key === dayK()" (click)="pickDay(d)"
                        class="flex flex-col items-center justify-center p-3 rounded-lg text-center min-w-[108px] flex-1"
                        [class]="d.key === dayK() ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'">
                        <span class="font-label-mono text-[10px] uppercase tracking-wider" [class]="d.key === dayK() ? 'text-primary-fixed' : 'text-on-surface-variant'">{{ d.weekday }}</span>
                        <span class="font-headline-md text-headline-md font-extrabold my-0.5" [class]="d.key === dayK() ? 'text-on-primary' : 'text-fg-primary'">{{ d.day }}</span>
                        <span class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold" [class]="d.key === dayK() ? 'bg-primary-container text-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'">{{ d.slots.length }} {{ d.slots.length === 1 ? 'horário' : 'horários' }}</span>
                      </button>
                    }
                  </div>

                  @if (conflict()) {
                    <div class="p-space-sm rounded-lg bg-secondary-container/40 flex items-center gap-2" role="alert">
                      <span class="material-symbols-outlined text-fg-primary text-[20px]" aria-hidden="true">autorenew</span>
                      <span class="font-body-sm text-body-sm text-fg-primary font-bold">Esse horário acabou de ser reservado por outro executivo. Atualizamos a grade — escolha outro horário.</span>
                    </div>
                  }

                  @if (technicians().length > 1) {
                    <div class="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Filtrar por técnico">
                      <span class="font-label-md text-label-md text-on-surface-variant mr-1">Técnico:</span>
                      <button type="button" (click)="pickTechnician('')" [attr.aria-pressed]="!technicianFilter()"
                        class="px-3 py-1.5 rounded-full font-label-md text-label-md"
                        [class]="!technicianFilter() ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container text-fg-primary'">Qualquer técnico</button>
                      @for (t of technicians(); track t.id) {
                        <button type="button" (click)="pickTechnician(t.id)" [attr.aria-pressed]="technicianFilter() === t.id"
                          class="px-3 py-1.5 rounded-full font-label-md text-label-md"
                          [class]="technicianFilter() === t.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container text-fg-primary'">{{ t.name }}</button>
                      }
                    </div>
                  }

                  @for (g of groups(); track g.label) {
                    @if (g.slots.length) {
                      <div class="flex flex-col gap-space-xs pt-space-xs">
                        <div class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px] text-fg-secondary" aria-hidden="true">{{ g.icon }}</span><span class="font-label-lg text-label-lg text-fg-primary font-bold">{{ g.label }}</span></div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-xs">
                          @for (s of g.slots; track s.id) {
                            <button type="button" (click)="pickSlot(s)" [attr.aria-pressed]="s.id === selected()" [attr.aria-label]="s.time + ' com ' + s.technicianName"
                              class="flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-lg font-label-lg text-label-lg text-left"
                              [class]="s.id === selected() ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low hover:bg-surface-container text-fg-primary'">
                              <span class="flex w-full items-center justify-between gap-2">
                                <span>{{ s.time }}</span>
                                <span class="font-label-mono text-[10px]" [class]="s.id === selected() ? 'px-2 py-0.5 rounded bg-primary-container text-primary-fixed font-bold' : 'text-fg-secondary'">{{ s.id === selected() ? 'Selecionado' : 'Livre' }}</span>
                              </span>
                              <span class="font-body-sm text-[12px] truncate max-w-full" [class]="s.id === selected() ? 'text-primary-fixed' : 'text-on-surface-variant'">{{ s.technicianName }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  }
                }
              }
            }
          </div>

          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md" aria-labelledby="quem-h">
            <div class="flex items-start gap-space-sm">
              <div class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">badge</span></div>
              <div>
                <h2 id="quem-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Reunião em nome de</h2>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Usamos os dados informados ao gerar o relatório. Os convites serão enviados para este e-mail.</p>
              </div>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
              @for (f of attendee(); track f.k) { <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">{{ f.k }}</dt><dd class="font-medium text-on-surface truncate" [title]="f.v">{{ f.v || '—' }}</dd></div> }
            </dl>
          </section>

          <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-fg-primary text-[22px]" aria-hidden="true">format_list_bulleted</span><h3 class="font-headline-sm text-headline-sm text-fg-primary font-bold">O que será abordado nesta sessão técnica</h3></div>
            <ol class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              @for (a of agenda(); track a.title; let i = $index) {
                <li class="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low min-h-[84px]">
                  <div class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold font-label-mono text-label-mono">{{ i + 1 }}</div>
                  <div><span class="font-label-lg text-label-lg text-fg-primary font-bold">{{ a.title }}</span><p class="font-body-sm text-body-sm text-on-surface-variant pt-0.5">{{ a.text }}</p></div>
                </li>
              }
            </ol>
          </div>
        </div>

        <div class="xl:col-span-5 flex flex-col gap-space-lg xl:sticky xl:top-6">
          <div class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md">
            <span class="font-label-mono text-label-mono text-fg-secondary font-bold uppercase tracking-wider">Resumo do agendamento</span>
            <div class="p-space-md rounded-lg bg-primary text-on-primary flex items-center gap-space-sm min-h-[84px]" aria-live="polite">
              <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-primary-fixed shrink-0"><span class="material-symbols-outlined text-[24px]" aria-hidden="true">event_available</span></div>
              <div class="flex flex-col"><span class="font-label-md text-label-md text-primary-fixed">Data e horário selecionados</span>
                @if (status() === 'loading') { <span class="sk sk-sage h-7 w-44 my-0.5"></span> }
                @else { <span class="font-headline-sm text-headline-sm text-on-primary font-extrabold">{{ selectedLabel() }}</span> }
                <span class="text-[11px] text-primary-fixed-dim">Horário oficial de Brasília (GMT-3)</span></div>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2"><span class="material-symbols-outlined text-[18px] text-fg-primary shrink-0" aria-hidden="true">engineering</span>
              @if (selectedSlot(); as s) { <span>Técnico responsável: <strong class="text-fg-primary">{{ s.technicianName }}</strong>@if (s.technicianSpecialty) { — {{ s.technicianSpecialty }} }</span> }
              @else { <span>Cada horário mostra o técnico da Lumina Tech Labs que conduzirá a reunião.</span> }
            </p>

            <div class="grid grid-cols-2 gap-space-xs">
              <div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col"><span class="font-label-mono text-[10px] text-on-surface-variant uppercase">Economia anual</span>
                <span class="font-headline-sm text-headline-sm text-fg-primary font-extrabold mt-0.5">{{ report()!.diagnostic.annualSavings | currency: 'BRL' : 'symbol' : '1.0-0' }}</span>
                <span class="font-label-mono text-[11px] text-fg-tertiary font-bold mt-1">-{{ report()!.diagnostic.consumptionReductionPct | number: '1.2-2' }}% de consumo</span></div>
              <div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col"><span class="font-label-mono text-[10px] text-on-surface-variant uppercase">Payback</span>
                <span class="font-headline-sm text-headline-sm text-fg-primary font-extrabold mt-0.5">{{ report()!.diagnostic.paybackMonths | number: '1.1-1' }} <span class="text-sm font-normal">meses</span></span>
                <span class="font-label-mono text-[11px] text-fg-secondary font-bold mt-1">estimado</span></div>
            </div>

            @if (bookError(); as be) {
              <div class="p-space-sm rounded-lg bg-error-container text-on-error-container flex items-start gap-space-sm" role="alert">
                <span class="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
                <div class="flex-1"><p class="font-label-lg text-label-lg font-bold">{{ be.title }}</p><p class="font-body-sm text-body-sm">{{ be.message }}</p>
                  @if (be.details) { <ul class="list-disc pl-5 font-body-sm text-body-sm">@for (d of be.details; track d) { <li>{{ d }}</li> }</ul> }</div>
              </div>
            }
            <div class="flex flex-col gap-space-xs">
              <ecm-loading-button label="Confirmar agendamento" icon="verified_user" loadingLabel="Confirmando agendamento..." [loading]="booking()" [disabled]="status() !== 'ready' || !selected()" (click)="confirm()" />
              @if (status() === 'ready' && !selected() && days().length) { <p class="font-body-sm text-body-sm text-center text-on-surface-variant">Escolha um horário para continuar.</p> }
            </div>
          </div>

          <div class="bg-surface-container rounded-xl p-space-md flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 text-fg-primary"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">shield</span></div>
            <div class="flex-1"><span class="font-label-lg text-label-lg text-fg-primary font-bold">Seus dados protegidos</span>
              <p class="text-[12px] text-on-surface-variant">Os dados informados são tratados conforme a LGPD e usados apenas para esta reunião.</p></div>
          </div>
        </div>
      </div>
    </div>
    }
  `,
})
export class AgendamentoPage implements OnInit {
  private readonly store = inject(JourneyStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly report = this.store.report;
  readonly shortId = computed(() => shortId(this.report()?.id));

  readonly days = signal<DayView[]>([]);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly slotsError = signal<ApiError | null>(null);
  readonly slotsMsg = computed<FriendlyError | null>(() => { const e = this.slotsError(); return e ? friendly(e, 'slots') : null; });
  readonly dayK = signal('');
  readonly selected = signal('');
  readonly technicianFilter = signal('');
  private readonly allSlots = signal<Slot[]>([]);
  readonly technicians = computed<TechnicianOption[]>(() => {
    const map = new Map<string, string>();
    for (const s of this.allSlots()) map.set(s.technicianId, s.technicianName);
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });
  readonly booking = signal(false);
  readonly conflict = signal(false);
  readonly bookError = signal<FriendlyError | null>(null);

  readonly currentDay = computed(() => this.days().find((d) => d.key === this.dayK()));
  readonly monthLabel = computed(() => (this.dayK() ? monthYearOf(this.dayK()) : 'Horários disponíveis'));
  readonly groups = computed(() => {
    const slots = this.currentDay()?.slots ?? [];
    return [
      { label: 'Turno matutino', icon: 'wb_twilight', slots: slots.filter((s) => hourOf(s.startTime) < 12) },
      { label: 'Turno vespertino', icon: 'wb_sunny', slots: slots.filter((s) => hourOf(s.startTime) >= 12) },
    ];
  });
  readonly selectedSlot = computed(() => this.currentDay()?.slots.find((s) => s.id === this.selected()));
  readonly selectedLabel = computed(() => { const s = this.selectedSlot(); return s ? `${brDateOf(this.dayK())} às ${s.time}` : 'Escolha um horário'; });

  readonly attendee = computed(() => {
    const l = this.store.lead();
    return [{ k: 'Nome', v: l.name }, { k: 'Cargo', v: l.role }, { k: 'Empresa', v: l.company }, { k: 'E-mail', v: l.email }, { k: 'Telefone / WhatsApp', v: l.phone }];
  });
  readonly agenda = computed(() => {
    const d = this.report()?.diagnostic;
    return [
      { title: 'Curva de carga & tarifa', text: `Validação do perfil de consumo da planta de ${(d?.areaM2 ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m².` },
      { title: 'Investimento & payback', text: `Detalhamento do investimento e da amortização estimada em ${(d?.paybackMonths ?? 0).toFixed(1).replace('.', ',')} meses.` },
      { title: 'Plano de implantação', text: 'Priorização das ações de retorno mais rápido e cronograma sem interromper a operação.' },
      { title: 'Próximos passos', text: 'Definição de escopo, responsáveis e proposta comercial, se fizer sentido para a sua empresa.' },
    ];
  });

  ngOnInit() { if (this.report()) this.reloadSlots(); }

  reloadSlots() {
    this.status.set('loading');
    this.api.getSlots().subscribe({
      next: (slots) => {
        this.allSlots.set(slots);
        if (this.technicianFilter() && !slots.some((s) => s.technicianId === this.technicianFilter())) this.technicianFilter.set('');
        this.regroup();
        this.slotsError.set(null);
        this.status.set('ready');
      },
      error: (e: ApiError) => { this.slotsError.set(e); this.status.set('error'); },
    });
  }

  pickTechnician(id: string) { this.technicianFilter.set(id); this.conflict.set(false); this.bookError.set(null); this.regroup(); }

  private regroup() {
    const filter = this.technicianFilter();
    const days = this.group(filter ? this.allSlots().filter((s) => s.technicianId === filter) : this.allSlots());
    this.days.set(days);
    const day = days.find((d) => d.key === this.dayK()) ?? days[0];
    this.dayK.set(day?.key ?? '');
    if (!day?.slots.some((s) => s.id === this.selected())) this.selected.set('');
  }

  private group(slots: Slot[]): DayView[] {
    const now = Date.now();
    const map = new Map<string, DayView>();
    for (const s of [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      if (new Date(s.startTime).getTime() <= now) continue;
      const key = dayKey(s.startTime);
      const day = map.get(key) ?? { key, weekday: weekdayOf(s.startTime), day: key.slice(8), slots: [] };
      day.slots.push({ id: s.id, startTime: s.startTime, endTime: s.endTime, time: timeOf(s.startTime),
        technicianId: s.technicianId, technicianName: s.technicianName, technicianSpecialty: s.technicianSpecialty });
      map.set(key, day);
    }
    return [...map.values()];
  }

  pickDay(d: DayView) { this.dayK.set(d.key); this.selected.set(''); this.conflict.set(false); this.bookError.set(null); }
  pickSlot(s: SlotView) { this.selected.set(s.id); this.conflict.set(false); this.bookError.set(null); }

  confirm() {
    const slot = this.selectedSlot();
    const lead = this.report();
    if (this.booking() || !slot || !lead) return;
    this.booking.set(true);
    this.bookError.set(null);
    this.api.book({ leadId: lead.id, slotId: slot.id }).subscribe({
      next: (b) => {
        this.store.booking.set({
          protocol: b.id, leadId: lead.id, sdrAssigned: b.technicianName ?? b.sdrAssigned, technicianName: b.technicianName ?? slot.technicianName,
          meetingTime: b.meetingTime || slot.startTime, endTime: b.endTime ?? slot.endTime, videoLink: b.videoLink, status: b.status,
        });
        this.booking.set(false);
        this.router.navigate(['/confirmacao', b.id]);
      },
      error: (e: ApiError) => {
        this.booking.set(false);
        this.bookError.set(friendly(e, 'book'));
        const slotGone = (e.status === 409 && e.code !== 'LEAD_ALREADY_SCHEDULED') || (e.status === 404 && e.code === 'SLOT_NOT_FOUND');
        if (slotGone) { this.conflict.set(true); this.selected.set(''); this.bookError.set(null); this.reloadSlots(); }
      },
    });
  }
}
