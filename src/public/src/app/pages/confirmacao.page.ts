import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ApiError, Booking, Report } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { brDate } from '../core/utils';
import { ErrorCardComponent } from '../shared/error-card.component';

@Component({
  selector: 'ecm-confirmacao',
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, ErrorCardComponent],
  template: `
    @if (error(); as e) {
      <div class="max-w-[720px] mx-auto px-gutter py-space-xl">
        <ecm-error-card [badge]="'HTTP ' + e.status" [code]="e.code" [icon]="e.status === 404 ? 'event_busy' : 'cloud_off'" [tone]="e.status === 404 ? 'neutral' : 'error'"
          [title]="e.status === 404 ? 'Reserva não localizada' : 'Não foi possível carregar a reserva'"
          [message]="e.status === 404 ? 'Não encontramos um agendamento com esse protocolo. Você pode escolher um novo horário.' : 'Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos.'">
          <ng-container actions>
            <button type="button" (click)="load()" class="px-space-md h-10 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg hover:bg-secondary-fixed">Tentar novamente</button>
            <a [routerLink]="['/agendamento']" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>Escolher horário</a>
          </ng-container>
        </ecm-error-card>
      </div>
    } @else {
    <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <header class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md min-h-[168px]" [attr.aria-busy]="!b()">
        @if (b(); as bk) {
          <div class="flex flex-col gap-space-xs max-w-3xl">
            <div class="flex items-center gap-space-sm flex-wrap">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-mono text-label-mono" [class]="cancelled() ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'">
                <span class="w-2 h-2 rounded-full" [class]="cancelled() ? 'bg-error' : 'bg-tertiary'"></span>{{ cancelled() ? 'Status: Cancelado (CANCELLED)' : 'Status: Agendado (SCHEDULED)' }}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">tag</span>Protocolo: #{{ bk.protocol }}</span>
              <span class="hidden sm:inline-flex items-center gap-1 text-on-surface-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px] text-fg-tertiary" aria-hidden="true">lock</span>Idempotency Verified</span>
            </div>
            <h1 class="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight mt-1">{{ cancelled() ? 'Sessão técnica cancelada' : 'Diagnóstico Técnico Confirmado com Sucesso!' }}</h1>
            <p class="font-body-md text-body-md text-on-surface-variant">
              @if (cancelled()) { O horário foi liberado e o consultor foi notificado. Você pode escolher uma nova data quando quiser. }
              @else { Sua reunião estratégica com a equipe técnica da Lumina Tech Labs foi reservada e sincronizada com nossa esteira de auditoria. Os convites oficiais e as instruções de acesso foram enviados para o e-mail informado, e o consultor responsável será definido pela Lumina e informado antes da reunião. }
            </p>
          </div>
          <div class="no-print flex sm:flex-col items-center sm:items-end gap-space-xs shrink-0">
            <button type="button" (click)="print()" class="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-surface-container-low text-fg-primary font-label-lg text-label-lg hover:bg-surface-container shadow-sm"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>Imprimir Recibo</button>
            <span class="font-label-mono text-label-mono text-on-surface-variant">Emitido: {{ bk.issuedAt | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
          </div>
        } @else {
          <div class="flex flex-col gap-space-sm flex-1" role="status" aria-label="Carregando reserva">
            <div class="flex gap-space-sm"><div class="sk h-7 w-44 rounded-full"></div><div class="sk h-7 w-56"></div></div>
            <div class="sk h-9 w-3/4 mt-1"></div><div class="sk h-4 w-full max-w-2xl"></div><div class="sk h-4 w-2/3 max-w-xl"></div>
          </div>
          <div class="flex flex-col items-end gap-space-xs shrink-0"><div class="sk h-10 w-36"></div><div class="sk h-3 w-40"></div></div>
        }
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div class="xl:col-span-7 flex flex-col gap-space-lg">
          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md" [class.opacity-60]="cancelled()" [attr.aria-busy]="!b()">
            @if (b(); as bk) {
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[28px]" aria-hidden="true">calendar_clock</span></div>
                  <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider block">Data e Horário Reservado</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ brDate(bk.date) }} às {{ bk.time }}</span></div>
                </div>
                <div class="sm:text-right"><span class="inline-flex items-center gap-1 font-label-mono text-label-mono px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>45 min ({{ bk.time }} - {{ bk.endTime }})</span>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Horário de Brasília (GMT-3)</p></div>
              </div>

              <div class="rounded-xl p-space-md bg-surface-container-low flex flex-col gap-space-sm">
                <div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-fg-primary text-[20px]" aria-hidden="true">videocam</span><span class="font-label-lg text-label-lg text-fg-primary font-bold">Videochamada Corporativa Criptografada</span></div>
                  <span class="font-label-mono text-label-mono text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-lowest">E2EE TLS 1.3</span></div>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Conexão via Google Meet corporativo integrado à infraestrutura de segurança EcoMetric.</p>
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-xs">
                  <div class="flex-1 flex items-center justify-between px-3 h-12 rounded-lg bg-surface-container-lowest text-fg-primary shadow-inner min-w-0">
                    <span class="font-mono text-body-sm font-medium select-all truncate">{{ host(bk) }}</span>
                    <button type="button" (click)="copy(bk.meetUrl, 'Link da videochamada copiado.')" aria-label="Copiar link da reunião" class="text-on-surface-variant hover:text-fg-primary ml-2 p-1"><span class="material-symbols-outlined text-[18px]">content_copy</span></button>
                  </div>
                  <a [href]="bk.meetUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary shadow-sm shrink-0"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">video_call</span>Entrar na Sala Virtual</a>
                </div>
                <div class="flex items-start gap-2 pt-1 text-on-surface-variant font-body-sm text-body-sm"><span class="material-symbols-outlined text-[16px] text-fg-primary shrink-0 mt-0.5" aria-hidden="true">info</span><span>A sala virtual será aberta <strong>10 minutos antes</strong> do horário oficial. A tolerância para início é de 10 minutos após as {{ bk.time }}.</span></div>
              </div>

              <div class="no-print flex flex-col gap-space-xs pt-space-xs">
                <span class="font-label-lg text-label-lg text-fg-primary font-semibold">Sincronizar com sua Agenda Pessoal ou Corporativa</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
                  <a [href]="gcal(bk)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">event</span>Google Agenda</a>
                  <button type="button" (click)="downloadIcs(bk)" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">calendar_add_on</span>Outlook / Apple (.ics)</button>
                  <button type="button" (click)="copy(invite(bk), 'Texto do convite copiado.')" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">share</span>Compartilhar Link</button>
                </div>
              </div>
            } @else {
              <div class="flex flex-col gap-space-md" role="status" aria-label="Carregando detalhes da reunião">
                <div class="flex items-center gap-3"><div class="sk w-12 h-12 rounded-xl"></div><div class="flex flex-col gap-2"><div class="sk h-3 w-40"></div><div class="sk h-6 w-48"></div></div></div>
                <div class="sk h-40 w-full rounded-xl"></div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-xs"><div class="sk h-10"></div><div class="sk h-10"></div><div class="sk h-10"></div></div>
              </div>
            }
          </section>

          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-fg-primary text-[22px]" aria-hidden="true">checklist</span><h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Roteiro &amp; Checklist Pré-Reunião</h2></div>
              <span class="font-label-mono text-label-mono px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant">Recomendado</span></div>
            <p class="font-body-md text-body-md text-on-surface-variant">Para garantir que a modelagem financeira e técnica saia da sessão com validação imediata, orientamos disponibilizar:</p>
            <ol class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              @for (c of checklist; track c.title; let i = $index) {
                <li class="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                  <div class="w-8 h-8 rounded-full bg-secondary-container text-fg-primary font-bold flex items-center justify-center font-label-mono text-label-mono">{{ i + 1 }}</div>
                  <h3 class="font-label-lg text-label-lg text-fg-primary font-bold mt-1">{{ c.title }}</h3><p class="font-body-sm text-body-sm text-on-surface-variant">{{ c.text }}</p>
                </li>
              }
            </ol>
            <div class="p-space-md rounded-xl bg-surface-container flex items-center gap-space-md"><span class="material-symbols-outlined text-fg-tertiary text-[28px] shrink-0" aria-hidden="true">task_alt</span>
              <div class="flex flex-col gap-0.5"><span class="font-label-lg text-label-lg text-fg-primary font-bold">O que será entregue na reunião:</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Apresentaremos a planilha de Capex editável (.xlsx), o dossiê regulatório ANEEL 2026 e a minuta de enquadramento na linha <strong class="text-on-surface">BNDES Finame Verde</strong> com carência de até 12 meses.</p></div></div>
          </section>
        </div>

        <div class="xl:col-span-5 flex flex-col gap-space-lg">
          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md" [attr.aria-busy]="!b()">
            <div class="flex items-center justify-between gap-2"><span class="font-label-mono text-label-mono uppercase tracking-wider text-on-surface-variant">Quem comparecerá</span>
              <span class="inline-flex items-center gap-1 font-label-mono text-label-mono px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant"><span class="material-symbols-outlined text-[13px]" aria-hidden="true">badge</span>Participante</span></div>
            @if (b(); as bk) {
              <div class="flex items-center gap-space-md">
                <div class="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shrink-0" aria-hidden="true">{{ initials(bk.attendee.name) }}</div>
                <div class="flex flex-col min-w-0"><span class="font-headline-sm text-headline-sm text-fg-primary font-bold truncate">{{ bk.attendee.name }}</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant truncate">{{ bk.attendee.role }} • {{ bk.attendee.company }}</span></div>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
                <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">E-mail</dt><dd class="font-medium text-on-surface truncate">{{ bk.attendee.email }}</dd></div>
                <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Telefone / WhatsApp</dt><dd class="font-medium text-on-surface">{{ bk.attendee.phone }}</dd></div>
              </dl>
              <p class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2"><span class="material-symbols-outlined text-[18px] text-fg-primary shrink-0" aria-hidden="true">groups</span>O consultor responsável será definido pela equipe da Lumina Tech Labs e informado por e-mail antes da reunião.</p>
            } @else {
              <div class="flex flex-col gap-space-md" role="status" aria-label="Carregando participante">
                <div class="flex items-center gap-space-md"><div class="sk w-16 h-16 rounded-full"></div><div class="flex flex-col gap-2"><div class="sk h-6 w-44"></div><div class="sk h-4 w-56"></div></div></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm"><div class="sk h-9"></div><div class="sk h-9"></div></div>
              </div>
            }
          </section>

          @if (b()?.leadId) {
          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md" [attr.aria-busy]="!rep()">
            <div class="flex items-center justify-between"><h2 class="font-label-lg text-label-lg text-fg-primary font-bold">Diagnóstico vinculado</h2>
              @if (b(); as bk) { <span class="font-label-mono text-label-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">Ref: #{{ bk.leadId }}</span> }</div>
            @if (rep(); as d) {
              <dl class="grid grid-cols-2 gap-space-sm font-body-sm text-body-sm">
                @for (f of fields(d); track f.k) { <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">{{ f.k }}</dt><dd class="font-medium text-on-surface truncate">{{ f.v }}</dd></div> }
              </dl>
              <div class="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                <div class="flex items-center justify-between gap-2 flex-wrap"><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Potencial Auditado em Sistema</span><span class="font-label-mono text-label-mono text-fg-primary font-bold">Fatura Base: {{ d.input.monthlyBill | currency: 'BRL' }}/mês</span></div>
                <div class="grid grid-cols-2 gap-space-xs">
                  <div class="p-space-xs px-space-sm rounded-lg bg-surface-container-lowest flex flex-col"><span class="font-label-mono text-label-mono text-on-surface-variant">Economia Anual</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ d.result.annualSavings | currency: 'BRL' }}</span><span class="font-label-mono text-label-mono text-fg-tertiary font-semibold">-{{ d.result.reductionPct | number: '1.2-2' }}% consumo</span></div>
                  <div class="p-space-xs px-space-sm rounded-lg bg-surface-container-lowest flex flex-col"><span class="font-label-mono text-label-mono text-on-surface-variant">Payback Estimado</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ d.result.paybackMonths | number: '1.1-1' }} meses</span><span class="font-label-mono text-label-mono text-on-surface-variant">Capex: {{ d.result.capex | currency: 'BRL' }}</span></div>
                </div>
                <div class="flex items-center justify-between p-space-xs px-3 rounded-lg bg-tertiary-fixed/40"><span class="flex items-center gap-1.5 text-on-tertiary-fixed-variant font-label-md text-label-md font-semibold"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">eco</span>Redução de CO₂ Estimada</span><span class="font-label-mono text-label-mono font-bold text-on-tertiary-fixed">{{ d.result.co2Tons | number: '1.2-2' }} t/ano</span></div>
              </div>
            } @else {
              <div class="flex flex-col gap-space-md" role="status" aria-label="Carregando dados do diagnóstico">
                <div class="grid grid-cols-2 gap-space-sm">@for (n of [1,2,3,4,5,6]; track n) { <div class="flex flex-col gap-1.5"><div class="sk h-2.5 w-24"></div><div class="sk h-4 w-36"></div></div> }</div>
                <div class="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm"><div class="sk h-3 w-full"></div><div class="grid grid-cols-2 gap-space-xs"><div class="sk h-[78px] rounded-lg"></div><div class="sk h-[78px] rounded-lg"></div></div><div class="sk h-8 w-full rounded-lg"></div></div>
              </div>
            }
          </section>
          }

          <section class="no-print bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
            <span class="font-label-lg text-label-lg text-fg-primary font-bold">Gerenciamento da Reserva</span>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Imprevistos na agenda? Você pode alterar a data ou cancelar a sessão sem custo com até 2 horas de antecedência.</p>
            @if (b(); as bk) {
              @if (confirmingCancel()) {
                <div class="p-space-sm rounded-lg bg-error-container/40 flex flex-col gap-space-xs" role="alertdialog" aria-label="Confirmar cancelamento">
                  <p class="font-body-sm text-body-sm text-on-error-container font-semibold">Cancelar a sessão técnica? O horário será liberado para outros clientes.</p>
                  <div class="flex gap-space-xs"><button type="button" (click)="cancel()" class="px-3 py-2 rounded-lg bg-error text-on-error font-label-md text-label-md">Cancelar agendamento</button>
                    <button type="button" (click)="confirmingCancel.set(false)" class="px-3 py-2 rounded-lg bg-surface-container-lowest text-fg-primary font-label-md text-label-md">Manter reserva</button></div>
                </div>
              } @else if (!cancelled()) {
                <div class="flex flex-col sm:flex-row items-center gap-space-xs pt-space-xs">
                  <a [routerLink]="agendarLink(bk)" class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest text-fg-primary font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">edit_calendar</span>Reagendar Reunião</a>
                  <button type="button" (click)="confirmingCancel.set(true)" class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-fg-error hover:bg-error-container/20 font-label-md text-label-md"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">cancel</span>Cancelar Agendamento</button>
                </div>
              } @else {
                <a [routerLink]="agendarLink(bk)" class="inline-flex w-max items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_month</span>Escolher nova data</a>
              }
            } @else { <div class="sk h-10 w-56 mt-space-xs" role="status" aria-label="Carregando ações"></div> }
          </section>
        </div>
      </div>

      <aside class="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-secondary-container text-fg-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">security</span></div>
        <div class="flex flex-col"><span class="font-label-lg text-label-lg text-fg-primary font-bold">Governança LGPD &amp; Não-Divulgação Automática (NDA)</span><span class="font-body-sm text-body-sm text-on-surface-variant">Os dados da planta informados estão protegidos sob cláusula de confidencialidade padrão ABNT NBR ISO 50001.</span></div>
      </aside>
    </div>
    }
  `,
})
export class ConfirmacaoPage implements OnChanges {
  readonly protocol = input.required<string>();
  readonly store = inject(JourneyStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly brDate = brDate;
  readonly encode = encodeURIComponent;

  readonly b = signal<Booking | null>(null);
  readonly rep = signal<Report | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly cancelled = signal(false);
  readonly confirmingCancel = signal(false);

  readonly checklist = [
    { title: '3 Últimas Faturas', text: 'Contas completas da concessionária de energia, incluindo memória de cálculo de demanda ponta / fora de ponta.' },
    { title: 'Cargas & HVAC', text: 'Relação básica de centrais de climatização, subestações, iluminação industrial e regime de turnos operacionais.' },
    { title: 'Decisores Internos', text: 'Presença recomendada de Facilities, Manutenção Técnica e Controladoria Financeira para validação do Capex.' },
  ];

  ngOnChanges() { this.load(); }

  /** Reserva e relatório: só consulta a API quando o dado ainda não está em memória. */
  load() {
    this.error.set(null);
    const cur = this.store.booking();
    if (cur?.protocol === this.protocol()) { this.b.set(cur); if (cur.leadId) this.loadReport(cur.leadId); return; }
    this.b.set(null); this.rep.set(null);
    this.api.getBooking(this.protocol()).subscribe({
      next: (bk) => { this.b.set(bk); this.store.booking.set(bk); if (bk.leadId) this.loadReport(bk.leadId); },
      error: (e: ApiError) => this.error.set(e),
    });
  }

  private loadReport(leadId: string) {
    const cached = this.store.report();
    if (cached?.id === leadId) { this.rep.set(cached); return; }
    this.rep.set(null);
    this.api.getReport(leadId).subscribe({
      next: (r) => { this.store.setReport(r); this.rep.set(r); },
      error: (e: ApiError) => this.error.set(e),
    });
  }

  host = (b: Booking) => b.meetUrl.replace('https://', '');
  invite = (b: Booking) => `Alinhamento Energético EcoMetric — ${brDate(b.date)} às ${b.time} (Brasília). Link: ${b.meetUrl}`;
  fields(d: Report) {
    return [
      { k: 'Área construída', v: d.input.areaM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' m²' },
      { k: 'Postos de trabalho', v: d.input.workstations + ' colaboradores' },
    ];
  }
  agendarLink = (b: Booking) => (b.leadId ? ['/agendamento', b.leadId] : ['/agendamento']);
  initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

  private startEnd(b: Booking) {
    const fmt = (t: string) => new Date(`${b.date}T${t}:00-03:00`).toISOString().replace(/[-:]|\.\d{3}/g, '');
    return { start: fmt(b.time), end: fmt(b.endTime) };
  }
  gcal(b: Booking) {
    const { start, end } = this.startEnd(b);
    const q = new URLSearchParams({ action: 'TEMPLATE', text: `Diagnóstico Técnico EcoMetric #${b.protocol}`, dates: `${start}/${end}`, details: `Sessão de alinhamento técnico com a equipe da Lumina Tech Labs. Participante: ${b.attendee.name} (${b.attendee.company}). Link: ${b.meetUrl}`, location: 'Google Meet' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  async copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); this.toast.show('Copiado', ok); }
    catch { this.toast.show('Não foi possível copiar', 'Copie manualmente o texto exibido na tela.', 'error'); }
  }
  downloadIcs(b: Booking) {
    const { start, end } = this.startEnd(b);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EcoMetric//Agendamento//PT', 'BEGIN:VEVENT', `UID:${b.protocol}@ecometric.corp`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`, `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:Diagnóstico Técnico EcoMetric #${b.protocol}`, `DESCRIPTION:Participante: ${b.attendee.name} (${b.attendee.company}). Link: ${b.meetUrl}`, `LOCATION:${b.meetUrl}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `ecometric-${b.protocol}.ics`; a.click(); URL.revokeObjectURL(a.href);
  }
  print() { window.print(); }
  cancel() { this.cancelled.set(true); this.confirmingCancel.set(false); this.toast.show('Reserva cancelada', 'O horário foi liberado e o consultor foi notificado.'); }
}
