import { Component, input } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Identification } from '../core/models';
import { maskPhone } from '../core/utils';

type Field = 'name' | 'role' | 'company' | 'phone' | 'email';

/** Cria o grupo de campos de identificação do cliente (mesmas regras em todas as telas). */
export function buildIdentificationGroup(fb: NonNullableFormBuilder, opts: { initial?: Partial<Identification> } = {}) {
  const i = opts.initial ?? {};
  return fb.group({
    name: [i.name ?? '', Validators.required],
    role: [i.role ?? '', Validators.required],
    company: [i.company ?? '', Validators.required],
    phone: [i.phone ?? '', [Validators.required, Validators.minLength(14)]],
    email: [i.email ?? '', [Validators.required, Validators.email]],
  });
}
export type IdentificationGroup = ReturnType<typeof buildIdentificationGroup>;

/** Campos de identificação reutilizáveis: nome, cargo, empresa, telefone e e-mail. */
@Component({
  selector: 'ecm-identification-form',
  imports: [ReactiveFormsModule],
  template: `
    <div [formGroup]="group()" class="flex flex-col gap-space-md">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <div class="flex flex-col gap-1">
          <label [for]="prefix() + '-name'" class="font-label-lg text-label-lg text-fg-primary font-semibold">{{ nameLabel() }} *</label>
          <input [id]="prefix() + '-name'" formControlName="name" autocomplete="name" placeholder="Ex: Carlos Eduardo Silva"
            class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('name')" [attr.aria-describedby]="err('name') ? prefix() + '-name-err' : null" />
          @if (err('name'); as m) { <p [id]="prefix() + '-name-err'" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }
        </div>
        <div class="flex flex-col gap-1">
          <label [for]="prefix() + '-role'" class="font-label-lg text-label-lg text-fg-primary font-semibold">Cargo / Função *</label>
          <input [id]="prefix() + '-role'" formControlName="role" autocomplete="organization-title" placeholder="Ex: Diretor de Operações / CFO"
            class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('role')" [attr.aria-describedby]="err('role') ? prefix() + '-role-err' : null" />
          @if (err('role'); as m) { <p [id]="prefix() + '-role-err'" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <div class="flex flex-col gap-1">
          <label [for]="prefix() + '-company'" class="font-label-lg text-label-lg text-fg-primary font-semibold">Empresa que representa *</label>
          <input [id]="prefix() + '-company'" formControlName="company" autocomplete="organization" placeholder="Ex: Indústrias Reunidas S.A."
            class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('company')" [attr.aria-describedby]="err('company') ? prefix() + '-company-err' : null" />
          @if (err('company'); as m) { <p [id]="prefix() + '-company-err'" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }
        </div>
        <div class="flex flex-col gap-1">
          <label [for]="prefix() + '-phone'" class="font-label-lg text-label-lg text-fg-primary font-semibold">Telefone / WhatsApp *</label>
          <input [id]="prefix() + '-phone'" type="tel" formControlName="phone" (input)="onPhone($event)" autocomplete="tel" placeholder="(81) 99999-0001"
            class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('phone')" [attr.aria-describedby]="err('phone') ? prefix() + '-phone-err' : null" />
          @if (err('phone'); as m) { <p [id]="prefix() + '-phone-err'" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label [for]="prefix() + '-email'" class="font-label-lg text-label-lg text-fg-primary font-semibold">E-mail *</label>
        <div class="relative">
          <input [id]="prefix() + '-email'" type="email" formControlName="email" autocomplete="email" placeholder="seunome&#64;email.com.br"
            class="w-full h-12 px-4 pr-10 rounded-lg bg-surface-container-low text-fg-primary" [attr.aria-invalid]="!!err('email')" [attr.aria-describedby]="err('email') ? prefix() + '-email-err' : null" />
          <span class="absolute right-3.5 top-3 material-symbols-outlined text-[20px]" [class]="err('email') ? 'text-fg-error' : 'text-fg-secondary'" aria-hidden="true">{{ err('email') ? 'error' : 'mail' }}</span>
        </div>
        @if (err('email'); as m) { <p [id]="prefix() + '-email-err'" class="font-body-sm text-body-sm text-fg-error" role="alert">{{ m }}</p> }
      </div>
    </div>
  `,
})
export class IdentificationFormComponent {
  readonly group = input.required<IdentificationGroup>();
  /** Prefixo dos ids dos campos (evita ids repetidos quando há mais de um formulário na tela). */
  readonly prefix = input('cli');
  readonly nameLabel = input('Nome completo');
  /** Mensagem vinda do servidor para o campo de e-mail (ex.: HTTP 400). */
  readonly serverError = input<string | null>(null);

  err(f: Field): string | null {
    const c = this.group().controls[f];
    if (f === 'email') {
      if (this.serverError()) return this.serverError();
    }
    if (!c.invalid || !c.touched) return null;
    if (c.hasError('required')) return 'Campo obrigatório.';
    if (c.hasError('email')) return 'Informe um e-mail válido.';
    if (c.hasError('minlength')) return 'Informe o telefone com DDD.';
    return 'Valor inválido.';
  }

  onPhone(e: Event) {
    const el = e.target as HTMLInputElement;
    el.value = maskPhone(el.value);
    this.group().controls.phone.setValue(el.value, { emitEvent: false });
  }

  focusField(f: Field) { document.getElementById(`${this.prefix()}-${f}`)?.focus(); }
  focusFirstInvalid() {
    const first = (['name', 'role', 'company', 'phone', 'email'] as const).find((k) => this.group().controls[k].invalid);
    if (first) this.focusField(first);
  }
}
