import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../../core/admin/admin-api.service';
import {
  AdminDashboard, AdminLeadSummary, LeadFilters, MEETING_LABEL, PRIORITY_LABEL, Page, Priority,
} from '../../core/admin/admin.models';
import { dateTimeOf } from '../../core/datetime';
import { friendly } from '../../core/errors';
import { ApiError } from '../../core/models';

@Component({
  selector: 'ecm-admin-leads',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="max-w-[1280px] mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <header class="flex flex-col gap-1">
        <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-wider font-bold">Comercial</span>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-fg-primary font-extrabold tracking-tight">Leads</h1>
        <p class="font-body-md text-body-md text-on-surface-variant">Diagnósticos recebidos pelo site, com prioridade e situação do agendamento.</p>
      </header>

      <!-- Indicadores -->
      <section class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm" aria-label="Indicadores">
        @for (k of kpis(); track k.label) {
          <div class="adm-card !p-space-md flex flex-col gap-1">
            <span class="flex items-center gap-1.5 font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              <span class="material-symbols-outlined text-[16px]" [class]="k.tone" aria-hidden="true">{{ k.icon }}</span>{{ k.label }}
            </span>
            @if (dashboard()) { <span class="font-metric-numeral-sm text-metric-numeral-sm text-fg-primary">{{ k.value }}</span> }
            @else { <span class="sk h-[30px] w-16"></span> }
          </div>
        }
      </section>

      <!-- Filtros -->
      <section class="adm-card !p-space-md flex flex-col lg:flex-row gap-space-sm lg:items-end" aria-label="Filtros">
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <label for="f-search" class="adm-label">Buscar</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-on-surface-variant" aria-hidden="true">search</span>
            <input id="f-search" type="search" class="adm-input pl-10" placeholder="Nome, e-mail ou empresa" [value]="filters().search ?? ''"
              (input)="search$.next($any($event.target).value)" />
          </div>
        </div>
        <div class="flex flex-col gap-1 lg:w-48">
          <label for="f-priority" class="adm-label">Prioridade</label>
          <select id="f-priority" class="adm-input" (change)="patch({ priority: $any($event.target).value })">
            <option value="" [selected]="!filters().priority">Todas</option>
            @for (p of priorities; track p) { <option [value]="p" [selected]="filters().priority === p">{{ priorityLabel[p] }}</option> }
          </select>
        </div>
        <div class="flex flex-col gap-1 lg:w-52">
          <label for="f-meeting" class="adm-label">Reunião</label>
          <select id="f-meeting" class="adm-input" (change)="patch({ scheduled: $any($event.target).value })">
            <option value="" [selected]="!filters().scheduled">Todas</option>
            <option value="true" [selected]="filters().scheduled === 'true'">Com reunião agendada</option>
            <option value="false" [selected]="filters().scheduled === 'false'">Sem reunião</option>
          </select>
        </div>
        @if (hasFilters()) {
          <button type="button" class="adm-btn-ghost" (click)="clear()"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">filter_alt_off</span>Limpar</button>
        }
      </section>

      <!-- Lista -->
      <section class="adm-card !p-0 overflow-hidden" aria-label="Lista de leads" [attr.aria-busy]="loading()">
        @if (error(); as e) {
          <div class="p-space-lg flex flex-col items-start gap-space-sm" role="alert">
            <p class="font-label-lg text-label-lg text-fg-error font-bold">{{ e.title }}</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">{{ e.message }}</p>
            <button type="button" class="adm-btn-primary" (click)="load()"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">replay</span>Tentar novamente</button>
          </div>
        } @else if (!page() && loading()) {
          <div class="p-space-md flex flex-col gap-space-sm" role="status" aria-label="Carregando leads">
            @for (n of [1, 2, 3, 4, 5]; track n) { <div class="sk h-12 w-full"></div> }
          </div>
        } @else if (page()?.content?.length === 0) {
          <div class="p-space-xl flex flex-col items-center text-center gap-space-sm">
            <span class="material-symbols-outlined text-[40px] text-fg-secondary" aria-hidden="true">person_search</span>
            <h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ hasFilters() ? 'Nenhum lead encontrado' : 'Nenhum lead ainda' }}</h2>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-md">{{ hasFilters() ? 'Ajuste os filtros para ver outros resultados.' : 'Os diagnósticos enviados pelo site aparecerão aqui.' }}</p>
          </div>
        } @else {
          @let p = page()!;
          <!-- Tabela (telas médias e grandes) -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full">
              <thead class="bg-surface-container-low">
                <tr>
                  <th class="adm-th">Lead</th><th class="adm-th">Empresa</th><th class="adm-th">Prioridade</th>
                  <th class="adm-th text-right">Economia/ano</th><th class="adm-th">Reunião</th><th class="adm-th">Recebido em</th>
                </tr>
              </thead>
              <tbody>
                @for (l of p.content; track l.id) {
                  <tr class="border-t border-outline-variant/40 hover:bg-surface-container-low cursor-pointer" (click)="open(l)" tabindex="0" (keydown.enter)="open(l)" [attr.aria-label]="'Abrir ' + l.fullName">
                    <td class="adm-td"><div class="flex flex-col min-w-0"><span class="font-label-lg text-label-lg text-fg-primary">{{ l.fullName }}</span><span class="text-on-surface-variant truncate">{{ l.corporateEmail }}</span></div></td>
                    <td class="adm-td"><div class="flex flex-col"><span>{{ l.companyName }}</span><span class="text-on-surface-variant">{{ l.jobTitle }}</span></div></td>
                    <td class="adm-td"><span class="adm-chip" [class]="priorityTone(l.priority)">{{ priorityLabel[l.priority] }}</span></td>
                    <td class="adm-td text-right font-label-lg text-label-lg text-fg-primary">{{ l.annualSavings != null ? (l.annualSavings | currency: 'BRL' : 'symbol' : '1.0-0') : '—' }}</td>
                    <td class="adm-td">
                      @if (l.meeting; as m) {
                        <div class="flex flex-col"><span class="adm-chip w-max" [class]="meetingTone(m.status)">{{ meetingLabel[m.status] }}</span>
                          <span class="text-on-surface-variant mt-0.5">{{ when(m.meetingTime) }} · {{ m.technicianName ?? '—' }}</span></div>
                      } @else { <span class="text-on-surface-variant">—</span> }
                    </td>
                    <td class="adm-td whitespace-nowrap text-on-surface-variant">{{ when(l.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <!-- Cartões (celular) -->
          <ul class="md:hidden flex flex-col">
            @for (l of p.content; track l.id) {
              <li class="border-t border-outline-variant/40 first:border-t-0">
                <a [routerLink]="['/admin/leads', l.id]" class="flex flex-col gap-1 p-space-md hover:bg-surface-container-low">
                  <div class="flex items-center justify-between gap-space-sm">
                    <span class="font-label-lg text-label-lg text-fg-primary truncate">{{ l.fullName }}</span>
                    <span class="adm-chip" [class]="priorityTone(l.priority)">{{ priorityLabel[l.priority] }}</span>
                  </div>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">{{ l.companyName }} · {{ when(l.createdAt) }}</span>
                  @if (l.meeting; as m) { <span class="font-body-sm text-body-sm text-fg-secondary">{{ meetingLabel[m.status] }}: {{ when(m.meetingTime) }}</span> }
                </a>
              </li>
            }
          </ul>

          <footer class="flex flex-col sm:flex-row items-center justify-between gap-space-sm px-space-md py-space-sm border-t border-outline-variant/40">
            <span class="font-body-sm text-body-sm text-on-surface-variant">{{ rangeLabel() }}</span>
            <div class="flex items-center gap-space-xs">
              <button type="button" class="adm-btn-ghost !h-9" [disabled]="p.page === 0 || loading()" (click)="goTo(p.page - 1)" aria-label="Página anterior"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span></button>
              <span class="font-label-md text-label-md text-fg-primary px-2">{{ p.page + 1 }} / {{ p.totalPages || 1 }}</span>
              <button type="button" class="adm-btn-ghost !h-9" [disabled]="p.page + 1 >= p.totalPages || loading()" (click)="goTo(p.page + 1)" aria-label="Próxima página"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span></button>
            </div>
          </footer>
        }
      </section>
    </div>
  `,
})
export class AdminLeadsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly priorityLabel = PRIORITY_LABEL;
  readonly meetingLabel = MEETING_LABEL;
  readonly priorities: Priority[] = ['HIGH_PRIORITY', 'MEDIUM_PRIORITY', 'LOW_PRIORITY'];
  readonly when = dateTimeOf;

  readonly dashboard = signal<AdminDashboard | null>(null);
  readonly page = signal<Page<AdminLeadSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<{ title: string; message: string } | null>(null);
  readonly filters = signal<LeadFilters>({});
  readonly search$ = new Subject<string>();

  readonly hasFilters = computed(() => { const f = this.filters(); return !!(f.search || f.priority || f.scheduled); });
  readonly rangeLabel = computed(() => {
    const p = this.page();
    if (!p || p.totalElements === 0) return '';
    const start = p.page * p.size + 1;
    return `${start}–${start + p.content.length - 1} de ${p.totalElements} leads`;
  });
  readonly kpis = computed(() => {
    const d = this.dashboard();
    return [
      { label: 'Leads', icon: 'groups', tone: 'text-fg-primary', value: d?.totalLeads ?? 0 },
      { label: 'Últimos 7 dias', icon: 'trending_up', tone: 'text-fg-tertiary', value: d?.leadsLast7Days ?? 0 },
      { label: 'Alta prioridade', icon: 'priority_high', tone: 'text-fg-error', value: d?.highPriorityLeads ?? 0 },
      { label: 'Reuniões futuras', icon: 'event_available', tone: 'text-fg-secondary', value: d?.upcomingMeetings ?? 0 },
      { label: 'Horários livres', icon: 'event', tone: 'text-fg-secondary', value: d?.openSlots ?? 0 },
      { label: 'Técnicos ativos', icon: 'engineering', tone: 'text-fg-primary', value: d?.activeTechnicians ?? 0 },
    ];
  });

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe((search) => this.patch({ search }));
  }

  ngOnInit() {
    // Os filtros ficam na URL: voltar do detalhe mantém a mesma busca e página.
    const q = this.route.snapshot.queryParamMap;
    this.filters.set({
      search: q.get('search') ?? '', priority: (q.get('priority') as Priority) ?? '',
      scheduled: (q.get('scheduled') as 'true' | 'false') ?? '', page: Number(q.get('page') ?? 0) || 0,
    });
    this.api.dashboard().subscribe({ next: (d) => this.dashboard.set(d), error: () => { /* indicadores são opcionais */ } });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.leads(this.filters()).subscribe({
      next: (p) => { this.page.set(p); this.loading.set(false); },
      error: (e: ApiError) => { this.loading.set(false); this.error.set(friendly(e, 'admin')); },
    });
  }

  patch(p: Partial<LeadFilters>) {
    this.filters.update((f) => ({ ...f, ...p, page: 0 }));
    this.syncUrl();
    this.load();
  }

  goTo(page: number) {
    this.filters.update((f) => ({ ...f, page }));
    this.syncUrl();
    this.load();
  }

  clear() { this.filters.set({}); this.syncUrl(); this.load(); }

  open(l: AdminLeadSummary) { this.router.navigate(['/admin/leads', l.id]); }

  priorityTone(p: Priority) {
    return p === 'HIGH_PRIORITY' ? 'bg-error-container text-on-error-container' : p === 'MEDIUM_PRIORITY' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant';
  }

  meetingTone(s: string) {
    return s === 'SCHEDULED' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : s === 'COMPLETED' ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant';
  }

  private syncUrl() {
    const f = this.filters();
    this.router.navigate([], {
      relativeTo: this.route, replaceUrl: true,
      queryParams: { search: f.search || null, priority: f.priority || null, scheduled: f.scheduled || null, page: f.page || null },
    });
  }
}
