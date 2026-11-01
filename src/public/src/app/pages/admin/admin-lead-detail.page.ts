import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/admin/admin-api.service';
import { AdminLeadDetail, MEETING_LABEL, PRIORITY_LABEL, Priority } from '../../core/admin/admin.models';
import { dateTimeOf, timeOf } from '../../core/datetime';
import { friendly } from '../../core/errors';
import { INFRA_OPTIONS } from '../../core/infrastructure';
import { ApiError } from '../../core/models';
import { ToastService } from '../../core/state.services';

@Component({
  selector: 'ecm-admin-lead-detail',
  imports: [RouterLink, CurrencyPipe, DecimalPipe],
  template: `
    <div class="max-w-[1100px] mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <a routerLink="/admin/leads" class="w-max font-label-lg text-label-lg text-fg-secondary hover:text-fg-primary inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>Voltar para leads
      </a>

      @if (error(); as e) {
        <div class="adm-card flex flex-col items-start gap-space-sm" role="alert">
          <p class="font-label-lg text-label-lg text-fg-error font-bold">{{ e.title }}</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant">{{ e.message }}</p>
          <button type="button" class="adm-btn-primary" (click)="load()">Tentar novamente</button>
        </div>
      } @else if (!lead()) {
        <div class="flex flex-col gap-space-sm" role="status" aria-label="Carregando lead"><div class="sk h-10 w-80"></div><div class="sk h-40 w-full"></div><div class="sk h-40 w-full"></div></div>
      } @else {
        @let l = lead()!;
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
          <div class="flex flex-col gap-1 min-w-0">
            <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-wider font-bold">Lead #{{ l.id.slice(0, 8).toUpperCase() }}</span>
            <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-fg-primary font-extrabold tracking-tight">{{ l.fullName }}</h1>
            <p class="font-body-md text-body-md text-on-surface-variant">{{ l.jobTitle }} · {{ l.companyName }}</p>
          </div>
          <div class="flex items-center gap-space-xs flex-wrap">
            <span class="adm-chip" [class]="l.priority === 'HIGH_PRIORITY' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'">Prioridade {{ priorityLabel[l.priority] }}</span>
            <span class="adm-chip bg-surface-container-high text-on-surface-variant">Recebido em {{ when(l.createdAt) }}</span>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">
          <div class="lg:col-span-2 flex flex-col gap-space-lg">
            <!-- Contato -->
            <section class="adm-card flex flex-col gap-space-md" aria-labelledby="contact-h">
              <h2 id="contact-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Contato</h2>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">E-mail</dt>
                  <dd class="font-body-md text-body-md text-on-surface break-all"><a class="hover:underline" [href]="'mailto:' + l.corporateEmail">{{ l.corporateEmail }}</a></dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Telefone / WhatsApp</dt>
                  <dd class="font-body-md text-body-md text-on-surface"><a class="hover:underline" [href]="'tel:' + l.phone">{{ l.phone }}</a></dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Empresa</dt><dd class="font-body-md text-body-md text-on-surface">{{ l.companyName }}</dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Domínio</dt><dd class="font-body-md text-body-md text-on-surface">{{ l.companyDomain }}</dd></div>
              </dl>
            </section>

            <!-- Diagnóstico -->
            @if (l.diagnostic; as d) {
              <section class="adm-card flex flex-col gap-space-md" aria-labelledby="diag-h">
                <h2 id="diag-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Diagnóstico</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                  @for (m of [
                    { k: 'Economia anual', v: (d.annualSavings | currency: 'BRL' : 'symbol' : '1.0-0') },
                    { k: 'Redução', v: (d.consumptionReductionPct | number: '1.0-2') + '%' },
                    { k: 'Payback', v: (d.paybackMonths | number: '1.0-1') + ' meses' },
                    { k: 'CO₂ evitado', v: (d.co2ReductionTons | number: '1.0-2') + ' t/ano' }
                  ]; track m.k) {
                    <div class="p-space-sm rounded-lg bg-surface-container-low flex flex-col"><span class="font-label-mono text-[10px] text-on-surface-variant uppercase">{{ m.k }}</span><span class="font-headline-sm text-headline-sm text-fg-primary font-extrabold">{{ m.v }}</span></div>
                  }
                </div>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
                  <div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1"><dt class="text-on-surface-variant">Área</dt><dd class="text-on-surface font-semibold">{{ d.areaM2 | number: '1.0-2' }} m²</dd></div>
                  <div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1"><dt class="text-on-surface-variant">Estações de trabalho</dt><dd class="text-on-surface font-semibold">{{ d.workstations }}</dd></div>
                  <div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1"><dt class="text-on-surface-variant">Fatura mensal</dt><dd class="text-on-surface font-semibold">{{ d.monthlyEnergyBill | currency: 'BRL' : 'symbol' : '1.0-0' }}</dd></div>
                  <div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1"><dt class="text-on-surface-variant">Infraestrutura</dt><dd class="text-on-surface font-semibold text-right">{{ infraLabel(d.currentInfrastructure) }}</dd></div>
                </dl>
              </section>
            }

            <!-- Auditoria -->
            <section class="adm-card flex flex-col gap-space-md" aria-labelledby="audit-h">
              <h2 id="audit-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Consentimento e CRM</h2>
              <div class="flex flex-col gap-space-xs">
                <span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Aceites dos termos (LGPD)</span>
                @for (c of l.consents; track c.acceptedAt) {
                  <p class="font-body-sm text-body-sm text-on-surface">Versão <strong>{{ c.termVersion }}</strong> em {{ when(c.acceptedAt) }} · IP {{ c.sourceIp }}</p>
                } @empty { <p class="font-body-sm text-body-sm text-on-surface-variant">Nenhum registro.</p> }
              </div>
              <div class="flex flex-col gap-space-xs">
                <span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Sincronizações com o CRM</span>
                @for (s of l.crmSyncs; track s.syncedAt) {
                  <p class="font-body-sm text-body-sm text-on-surface flex items-center gap-2 flex-wrap">
                    <span class="adm-chip" [class]="s.status === 'SUCCESS' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : s.status === 'FAILURE' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'">{{ s.status }}</span>
                    {{ s.provider }} · {{ when(s.syncedAt) }}@if (s.externalId) { · {{ s.externalId }} }
                  </p>
                } @empty { <p class="font-body-sm text-body-sm text-on-surface-variant">Nenhuma sincronização registrada.</p> }
              </div>
            </section>
          </div>

          <!-- Reunião -->
          <aside class="adm-card flex flex-col gap-space-md lg:sticky lg:top-6" aria-labelledby="meeting-h">
            <h2 id="meeting-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">event</span>Reunião
            </h2>
            @if (l.meeting; as m) {
              <span class="adm-chip w-max" [class]="m.status === 'SCHEDULED' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : m.status === 'COMPLETED' ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant'">{{ meetingLabel[m.status] }}</span>
              <dl class="flex flex-col gap-space-sm font-body-sm text-body-sm">
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Data e horário (Brasília)</dt>
                  <dd class="font-label-lg text-label-lg text-fg-primary">{{ when(m.meetingTime) }}@if (m.endTime) { – {{ time(m.endTime) }} }</dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Técnico</dt><dd class="text-on-surface">{{ m.technicianName ?? '—' }}</dd></div>
                @if (m.videoLink) {
                  <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Videochamada</dt>
                    <dd><a [href]="m.videoLink" target="_blank" rel="noopener noreferrer" class="text-fg-primary underline break-all">{{ m.videoLink }}</a></dd></div>
                }
              </dl>
              @if (m.status === 'SCHEDULED') {
                <div class="flex flex-col gap-space-xs pt-space-xs">
                  <button type="button" class="adm-btn-ghost" [disabled]="busy()" (click)="setStatus(m.id, 'COMPLETED')">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">task_alt</span>Marcar como realizada
                  </button>
                  <button type="button" class="adm-btn-danger" [disabled]="busy()" (click)="cancel(m.id)">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">event_busy</span>{{ confirmCancel() ? 'Confirmar cancelamento' : 'Cancelar reunião' }}
                  </button>
                  @if (confirmCancel()) { <p class="font-body-sm text-body-sm text-on-surface-variant">O horário volta a ficar livre e o lead recebe um e-mail para reagendar.</p> }
                </div>
              }
            } @else {
              <p class="font-body-sm text-body-sm text-on-surface-variant">Este lead ainda não agendou uma reunião. Garanta que há <a routerLink="/admin/agenda" class="text-fg-primary underline">horários livres na agenda</a>.</p>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class AdminLeadDetailPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);

  readonly priorityLabel = PRIORITY_LABEL;
  readonly meetingLabel = MEETING_LABEL;
  readonly when = dateTimeOf;
  readonly time = timeOf;

  readonly lead = signal<AdminLeadDetail | null>(null);
  readonly error = signal<{ title: string; message: string } | null>(null);
  readonly busy = signal(false);
  readonly confirmCancel = signal(false);
  private confirmTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() { this.load(); }

  load() {
    this.error.set(null);
    this.api.lead(this.id()).subscribe({
      next: (l) => this.lead.set(l),
      error: (e: ApiError) => this.error.set(e.status === 404 ? { title: 'Lead não encontrado', message: 'Ele pode ter sido removido.' } : friendly(e, 'admin')),
    });
  }

  infraLabel(code: string) { return INFRA_OPTIONS.find((o) => o.code === code)?.label ?? code; }

  /** Cancelamento em dois cliques (o segundo confirma), sem diálogo modal. */
  cancel(scheduleId: string) {
    if (!this.confirmCancel()) {
      this.confirmCancel.set(true);
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.confirmCancel.set(false), 6000);
      return;
    }
    this.confirmCancel.set(false);
    this.setStatus(scheduleId, 'CANCELLED');
  }

  setStatus(scheduleId: string, status: 'CANCELLED' | 'COMPLETED') {
    this.busy.set(true);
    this.api.setMeetingStatus(scheduleId, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.show(status === 'CANCELLED' ? 'Reunião cancelada' : 'Reunião concluída',
          status === 'CANCELLED' ? 'O horário foi liberado na agenda.' : 'Status atualizado.');
        this.load();
      },
      error: (e: ApiError) => { this.busy.set(false); const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); },
    });
  }
}
