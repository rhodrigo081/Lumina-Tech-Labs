import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ApiError } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { maskPhone, uuid, whatsappUrl } from '../core/utils';
import { LoadingButtonComponent } from '../shared/loading-button.component';

type Field = 'name' | 'email' | 'phone' | 'company' | 'subject' | 'message';

@Component({
  selector: 'ecm-contato',
  imports: [ReactiveFormsModule, LoadingButtonComponent],
  template: `
    <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
      <header class="max-w-3xl flex flex-col gap-space-xs">
        <span class="font-label-mono text-label-mono text-fg-primary uppercase tracking-widest font-bold">Fale conosco</span>
        <h1 class="font-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight font-extrabold">Contato</h1>
        <p class="font-body-md text-body-md text-on-surface-variant">Conte para a nossa equipe o que você precisa. Preencha o formulário ou, se preferir, converse direto pelo WhatsApp.</p>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <section class="xl:col-span-7 bg-surface-container-lowest rounded-2xl shadow-md p-space-lg flex flex-col gap-space-md" aria-labelledby="form-h">
          @if (sent(); as protocol) {
            <div class="p-space-lg rounded-xl bg-tertiary-fixed/30 text-center flex flex-col gap-space-sm" role="status">
              <div class="w-16 h-16 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mx-auto shadow-sm"><span class="material-symbols-outlined text-[36px]" aria-hidden="true">mark_email_read</span></div>
              <h2 id="form-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Mensagem enviada com sucesso!</h2>
              <p class="font-body-md text-body-md text-fg-secondary max-w-md mx-auto">Recebemos o seu contato e a nossa equipe retornará em breve. Protocolo: <strong class="text-fg-primary">#{{ protocol }}</strong></p>
              <button type="button" (click)="reset()" class="mx-auto px-5 py-2.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary inline-flex items-center gap-2"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit_note</span>Enviar nova mensagem</button>
            </div>
          } @else {
            <div><h2 id="form-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Envie sua mensagem</h2>
              <p class="font-body-sm text-body-sm text-fg-secondary">Os campos com * são obrigatórios.</p></div>
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-space-md" novalidate>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div class="flex flex-col gap-1"><label for="c-name" class="font-label-lg text-label-lg text-fg-primary font-semibold">Nome completo *</label>
                  <input id="c-name" formControlName="name" autocomplete="name" placeholder="Seu nome" class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('name')" [attr.aria-describedby]="err('name') ? 'e-name' : null" />
                  @if (err('name'); as m) { <p id="e-name" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }</div>
                <div class="flex flex-col gap-1"><label for="c-company" class="font-label-lg text-label-lg text-fg-primary font-semibold">Empresa</label>
                  <input id="c-company" formControlName="company" autocomplete="organization" placeholder="Opcional" class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" /></div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div class="flex flex-col gap-1"><label for="c-email" class="font-label-lg text-label-lg text-fg-primary font-semibold">E-mail *</label>
                  <input id="c-email" type="email" formControlName="email" autocomplete="email" placeholder="voce&#64;empresa.com.br" class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('email')" [attr.aria-describedby]="err('email') ? 'e-email' : null" />
                  @if (err('email'); as m) { <p id="e-email" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }</div>
                <div class="flex flex-col gap-1"><label for="c-phone" class="font-label-lg text-label-lg text-fg-primary font-semibold">Telefone / WhatsApp *</label>
                  <input id="c-phone" type="tel" formControlName="phone" (input)="onPhone($event)" autocomplete="tel" placeholder="(81) 99999-0001" class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('phone')" [attr.aria-describedby]="err('phone') ? 'e-phone' : null" />
                  @if (err('phone'); as m) { <p id="e-phone" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }</div>
              </div>
              <div class="flex flex-col gap-1"><label for="c-subject" class="font-label-lg text-label-lg text-fg-primary font-semibold">Assunto *</label>
                <input id="c-subject" formControlName="subject" maxlength="120" placeholder="Ex: Proposta de automação predial" class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('subject')" [attr.aria-describedby]="err('subject') ? 'e-subject' : null" />
                @if (err('subject'); as m) { <p id="e-subject" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }</div>
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between"><label for="c-message" class="font-label-lg text-label-lg text-fg-primary font-semibold">Descrição *</label>
                  <span class="font-label-mono text-label-mono text-on-surface-variant">{{ form.controls.message.value.length }}/1000</span></div>
                <textarea id="c-message" formControlName="message" rows="6" maxlength="1000" placeholder="Descreva sua necessidade com o máximo de detalhes possível" class="w-full px-4 py-3 rounded-lg bg-surface-container-low text-fg-primary resize-y" [attr.aria-invalid]="!!err('message')" [attr.aria-describedby]="err('message') ? 'e-message' : null"></textarea>
                @if (err('message'); as m) { <p id="e-message" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }</div>
              <ecm-loading-button type="submit" label="Enviar mensagem" icon="send" loadingLabel="Enviando mensagem..." [loading]="submitting()" />
            </form>
          }
        </section>

        <aside class="xl:col-span-5 flex flex-col gap-space-lg xl:sticky xl:top-6" aria-label="Contato rápido">
          <div class="bg-primary text-on-primary rounded-2xl shadow-lg p-space-lg flex flex-col gap-space-md">
            <div class="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-lit-tertiary"><span class="material-symbols-outlined text-[28px]" aria-hidden="true">chat</span></div>
            <div class="flex flex-col gap-space-xs">
              <h2 class="font-headline-sm text-headline-sm text-on-primary font-bold">Prefere conversar agora?</h2>
              <p class="font-body-md text-body-md text-primary-fixed-dim">Fale com a nossa equipe pelo WhatsApp. Se você já preencheu o assunto e a descrição, enviamos a mensagem pronta.</p>
            </div>
            <a [href]="waUrl()" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-12 rounded-xl bg-lit-tertiary hover:bg-lit-tertiary-dim text-lit-on-tertiary font-label-lg text-label-lg font-bold shadow-md">
              <span class="material-symbols-outlined text-[20px]" aria-hidden="true">forum</span>Chamar no WhatsApp
            </a>
          </div>
          <div class="bg-surface-container-low rounded-2xl p-space-lg flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container-lowest text-fg-primary flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">shield_person</span></div>
            <div><h3 class="font-label-lg text-label-lg text-fg-primary font-bold mb-1">Seus dados protegidos</h3>
              <p class="font-body-sm text-body-sm text-fg-secondary">Usamos as informações enviadas apenas para responder ao seu contato, em conformidade com a LGPD.</p></div>
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class ContatoPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(14)]],
    company: [''],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });
  private readonly store = inject(JourneyStore);
  readonly submitting = signal(false);
  readonly sent = signal<string | null>(null);
  private key = uuid();

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  /** Mensagem do WhatsApp montada com o que já foi preenchido. */
  readonly waUrl = computed(() => {
    const v = this.value();
    const lines = ['Olá! Gostaria de falar com a equipe da Lumina Tech Labs.'];
    if (v.name) lines.push(`Nome: ${v.name}`);
    if (v.company) lines.push(`Empresa: ${v.company}`);
    if (v.subject) lines.push(`Assunto: ${v.subject}`);
    if (v.message) lines.push('', v.message);
    return whatsappUrl(lines.join('\n'));
  });

  constructor() {
    // quem já se identificou em outra etapa não precisa digitar tudo de novo
    const c = this.store.client();
    if (c) this.form.patchValue({ name: c.name, email: c.email, phone: c.phone, company: c.company });
  }

  err(name: Field): string | null {
    const c = this.form.controls[name];
    if (!c.invalid || !c.touched) return null;
    if (c.hasError('required')) return 'Campo obrigatório.';
    if (c.hasError('email')) return 'Informe um e-mail válido.';
    if (c.hasError('minlength')) return name === 'phone' ? 'Informe o telefone com DDD.' : 'Texto muito curto.';
    return 'Valor inválido.';
  }

  onPhone(e: Event) { const el = e.target as HTMLInputElement; el.value = maskPhone(el.value); this.form.controls.phone.setValue(el.value, { emitEvent: false }); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = (['name', 'email', 'phone', 'subject', 'message'] as const).find((f) => this.form.controls[f].invalid);
      if (first) document.getElementById('c-' + first)?.focus();
      return;
    }
    this.submitting.set(true);
    this.api.sendContact(this.form.getRawValue(), this.key).subscribe({
      next: (r) => { this.submitting.set(false); this.sent.set(r.protocol); this.toast.show('Mensagem enviada', 'Nossa equipe entrará em contato em breve.'); },
      error: (e: ApiError) => { this.submitting.set(false); if (e.status < 500) this.toast.show('Não foi possível enviar', e.message, 'error'); },
    });
  }

  reset() { this.form.reset(); this.sent.set(null); this.key = uuid(); }
}
