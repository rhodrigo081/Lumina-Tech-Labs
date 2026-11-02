import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingRecord } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { addMinutes, brDateOf, compactUtc, dayKey, timeOf } from '../core/datetime';
import { whatsappUrl } from '../core/utils';
import { ErrorCardComponent } from '../shared/error-card.component';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, string> = { SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído' };

@Component({
  selector: 'ecm-confirmacao',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, ErrorCardComponent],
  template: `
    @if (!b()) {
      <div class="max-w-[720px] mx-auto px-gutter py-space-xl">
        <ecm-error-card badge="Reserva não encontrada" code="" icon="event_busy" tone="neutral"
          title="Não encontramos esta reserva nesta sessão"
          message="Por segurança, mostramos o comprovante apenas no navegador em que o agendamento foi feito. O convite também foi enviado para o seu e-mail.">
          <ng-container actions>
            <a routerLink="/agendamento" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>Agendar uma reunião</a>
          </ng-container>
        </ecm-error-card>
      </div>
    } @else {
    @let bk = b()!;
    <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <header class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div class="flex flex-col gap-space-xs max-w-3xl">
          <div class="flex items-center gap-space-sm flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-mono text-label-mono" [class]="cancelled() ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'">
              <span class="w-2 h-2 rounded-full" [class]="cancelled() ? 'bg-error' : 'bg-tertiary'"></span>Status: {{ statusLabel() }}
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">tag</span>Protocolo: #{{ shortId() }}</span>
          </div>
          <h1 class="font-headline-lg-mobile md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight mt-1">{{ cancelled() ? 'Sessão técnica cancelada' : 'Agendamento confirmado com sucesso!' }}</h1>
          <p class="font-body-md text-body-md text-on-surface-variant">
            @if (cancelled()) { Esta reserva consta como cancelada. Você pode escolher uma nova data quando quiser. }
            @else { Sua reunião com a equipe técnica da Lumina Tech Labs foi reservada. Os convites e as instruções de acesso foram enviados para <strong class="text-on-surface font-semibold">{{ lead().email || 'o e-mail informado' }}</strong>. }
          </p>
        </div>
        <div class="no-print shrink-0">
          <button type="button" (click)="print()" class="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-surface-container-low text-fg-primary font-label-lg text-label-lg hover:bg-surface-container shadow-sm"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>Imprimir comprovante</button>
        </div>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div class="xl:col-span-7 flex flex-col gap-space-lg">
          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md" [class.opacity-60]="cancelled()">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[28px]" aria-hidden="true">calendar_clock</span></div>
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider block">Data e horário reservado</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ dateLabel() }} às {{ startTime() }}</span></div>
              </div>
              <div class="sm:text-right"><span class="inline-flex items-center gap-1 font-label-mono text-label-mono px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>{{ startTime() }} - {{ endTime() }}</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Horário de Brasília (GMT-3)</p></div>
            </div>

            <div class="rounded-xl p-space-md bg-surface-container-low flex flex-col gap-space-sm">
              <div class="flex items-center gap-2"><span class="material-symbols-outlined text-fg-primary text-[20px]" aria-hidden="true">videocam</span><span class="font-label-lg text-label-lg text-fg-primary font-bold">Videochamada</span></div>
              @if (bk.videoLink) {
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-xs">
                  <div class="flex-1 flex items-center justify-between px-3 h-12 rounded-lg bg-surface-container-lowest text-fg-primary shadow-inner min-w-0">
                    <span class="font-mono text-body-sm font-medium select-all truncate">{{ host() }}</span>
                    <button type="button" (click)="copy(bk.videoLink!, 'Link da videochamada copiado.')" aria-label="Copiar link da reunião" class="text-on-surface-variant hover:text-fg-primary ml-2 p-1"><span class="material-symbols-outlined text-[18px]">content_copy</span></button>
                  </div>
                  <a [href]="bk.videoLink" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary shadow-sm shrink-0"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">video_call</span>Entrar na sala virtual</a>
                </div>
                <div class="flex items-start gap-2 pt-1 text-on-surface-variant font-body-sm text-body-sm"><span class="material-symbols-outlined text-[16px] text-fg-primary shrink-0 mt-0.5" aria-hidden="true">info</span><span>O link também está no convite enviado por e-mail.</span></div>
              } @else {
                <p class="font-body-sm text-body-sm text-on-surface-variant">O link da videochamada será enviado por e-mail antes da reunião.</p>
              }
            </div>

            <div class="no-print flex flex-col gap-space-xs pt-space-xs">
              <span class="font-label-lg text-label-lg text-fg-primary font-semibold">Adicionar à sua agenda</span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
                <a [href]="gcal()" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">event</span>Google Agenda</a>
                <button type="button" (click)="downloadIcs()" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">calendar_add_on</span>Outlook / Apple (.ics)</button>
                <button type="button" (click)="copy(invite(), 'Texto do convite copiado.')" class="inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">share</span>Compartilhar convite</button>
              </div>
            </div>
          </section>

          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center gap-2"><span class="material-symbols-outlined text-fg-primary text-[22px]" aria-hidden="true">checklist</span><h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Para aproveitar melhor a reunião</h2></div>
            <ol class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              @for (c of checklist; track c.title; let i = $index) {
                <li class="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
                  <div class="w-8 h-8 rounded-full bg-secondary-container text-fg-primary font-bold flex items-center justify-center font-label-mono text-label-mono">{{ i + 1 }}</div>
                  <h3 class="font-label-lg text-label-lg text-fg-primary font-bold mt-1">{{ c.title }}</h3><p class="font-body-sm text-body-sm text-on-surface-variant">{{ c.text }}</p>
                </li>
              }
            </ol>
          </section>
        </div>

        <div class="xl:col-span-5 flex flex-col gap-space-lg">
          <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <span class="font-label-mono text-label-mono uppercase tracking-wider text-on-surface-variant">Quem comparecerá</span>
            <div class="flex items-center gap-space-md">
              <div class="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shrink-0" aria-hidden="true">{{ initials() }}</div>
              <div class="flex flex-col min-w-0"><span class="font-headline-sm text-headline-sm text-fg-primary font-bold truncate">{{ lead().name }}</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant truncate">{{ lead().role }}{{ lead().role && lead().company ? ' • ' : '' }}{{ lead().company }}</span></div>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
              <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">E-mail</dt><dd class="font-medium text-on-surface truncate">{{ lead().email || '—' }}</dd></div>
              <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Telefone / WhatsApp</dt><dd class="font-medium text-on-surface">{{ lead().phone || '—' }}</dd></div>
            </dl>
            <p class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2"><span class="material-symbols-outlined text-[18px] text-fg-primary shrink-0" aria-hidden="true">groups</span>
              @if (responsible(); as r) { Responsável pela reunião na Lumina: <strong class="text-on-surface">{{ r }}</strong>. } @else { O consultor responsável é definido pela equipe da Lumina Tech Labs. }</p>
          </section>

          @if (report(); as rp) {
            <section class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div class="flex items-center justify-between"><h2 class="font-label-lg text-label-lg text-fg-primary font-bold">Diagnóstico vinculado</h2>
                <span class="font-label-mono text-label-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">Ref: #{{ rp.id.slice(0, 8).toUpperCase() }}</span></div>
              <dl class="grid grid-cols-2 gap-space-sm font-body-sm text-body-sm">
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Área</dt><dd class="font-medium text-on-surface">{{ rp.diagnostic.areaM2 | number: '1.2-2' }} m²</dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Estações</dt><dd class="font-medium text-on-surface">{{ rp.diagnostic.workstations }}</dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Economia anual</dt><dd class="font-medium text-on-surface">{{ rp.diagnostic.annualSavings | currency: 'BRL' }}</dd></div>
                <div class="flex flex-col"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase">Payback</dt><dd class="font-medium text-on-surface">{{ rp.diagnostic.paybackMonths | number: '1.1-1' }} meses</dd></div>
              </dl>
            </section>
          }

          <section class="no-print bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
            <span class="font-label-lg text-label-lg text-fg-primary font-bold">Precisa alterar ou cancelar?</span>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Fale com a nossa equipe informando o protocolo <strong>#{{ shortId() }}</strong> e ajustamos o agendamento para você.</p>
            <div class="flex flex-col sm:flex-row gap-space-xs pt-space-xs">
              <a [href]="changeWhatsapp()" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">chat</span>Chamar no WhatsApp</a>
              <a routerLink="/contato" class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest text-fg-primary font-label-md text-label-md hover:bg-surface-container-high shadow-sm"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">mail</span>Enviar mensagem</a>
            </div>
          </section>
        </div>
      </div>
    </div>
    }
  `,
})
export class ConfirmacaoPage {
  readonly protocol = input.required<string>();
  private readonly store = inject(JourneyStore);
  private readonly toast = inject(ToastService);

  readonly b = computed<BookingRecord | null>(() => { const cur = this.store.booking(); return cur && cur.protocol === this.protocol() ? cur : null; });
  readonly report = this.store.report;
  readonly lead = this.store.lead;

  readonly shortId = computed(() => this.protocol().slice(0, 8).toUpperCase());
  readonly cancelled = computed(() => (this.b()?.status ?? '').toUpperCase() === 'CANCELLED');
  readonly statusLabel = computed(() => STATUS[(this.b()?.status ?? '').toUpperCase()] ?? this.b()?.status ?? '—');
  readonly startTime = computed(() => timeOf(this.b()!.meetingTime));
  readonly endIso = computed(() => this.b()!.endTime ?? addMinutes(this.b()!.meetingTime, 45));
  readonly endTime = computed(() => timeOf(this.endIso()));
  readonly dateLabel = computed(() => brDateOf(dayKey(this.b()!.meetingTime)));
  readonly host = computed(() => (this.b()?.videoLink ?? '').replace(/^https?:\/\//, ''));
  readonly initials = computed(() => this.lead().name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join(''));
  readonly responsible = computed(() => { const r = this.b()?.sdrAssigned?.trim(); return r && !UUID.test(r) ? r : null; });

  readonly checklist = [
    { title: 'Tenha as faturas à mão', text: 'As últimas contas de energia ajudam a validar o consumo informado no diagnóstico.' },
    { title: 'Liste os principais consumos', text: 'Climatização, iluminação e equipamentos de maior carga, além dos turnos de operação.' },
    { title: 'Convide quem decide', text: 'Facilities, manutenção e financeiro costumam acelerar a avaliação do investimento.' },
  ];

  invite = () => `Reunião Lumina Tech Labs — ${this.dateLabel()} às ${this.startTime()} (Brasília). Link: ${this.b()?.videoLink ?? 'enviado por e-mail'}`;
  changeWhatsapp = () => whatsappUrl(`Olá! Preciso alterar/cancelar o agendamento de protocolo #${this.shortId()} (${this.dateLabel()} às ${this.startTime()}).`);
  gcal = computed(() => {
    const b = this.b()!;
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: `Reunião Lumina Tech Labs #${this.shortId()}`, dates: `${compactUtc(b.meetingTime)}/${compactUtc(this.endIso())}`,
      details: `Sessão de alinhamento técnico com a equipe da Lumina Tech Labs. Participante: ${this.lead().name} (${this.lead().company}).${b.videoLink ? ' Link: ' + b.videoLink : ''}`,
      location: b.videoLink ?? 'Videochamada',
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  });

  async copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); this.toast.show('Copiado', ok); }
    catch { this.toast.show('Não foi possível copiar', 'Copie manualmente o texto exibido na tela.', 'error'); }
  }

  downloadIcs() {
    const b = this.b()!;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lumina Tech Labs//Agendamento//PT', 'BEGIN:VEVENT', `UID:${b.protocol}@luminatechlabs.com`,
      `DTSTAMP:${compactUtc(new Date().toISOString())}`, `DTSTART:${compactUtc(b.meetingTime)}`, `DTEND:${compactUtc(this.endIso())}`,
      `SUMMARY:Reunião Lumina Tech Labs #${this.shortId()}`, `DESCRIPTION:Participante: ${this.lead().name} (${this.lead().company}).${b.videoLink ? ' Link: ' + b.videoLink : ''}`,
      `LOCATION:${b.videoLink ?? 'Videochamada'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `reuniao-lumina-${this.shortId()}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  print() { window.print(); }
}
