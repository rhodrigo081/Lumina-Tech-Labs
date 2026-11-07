import { AbstractControl, ValidationErrors } from '@angular/forms';
import { WHATSAPP_NUMBER } from './config';

export const MAX = { name: 150, role: 150, company: 150, email: 255, phone: 15, search: 100, password: 72, number: 16 } as const;

export const notBlank = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && !c.value.trim() ? { required: true } : null;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const fmtNum = (v: number, d = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
export const parseCents = (raw: string) => parseInt(raw.replace(/\D/g, '').slice(0, 10) || '0', 10) / 100;

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  const m = d.length <= 10 ? d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  return m.replace(/-$/, '');
}

/** `(input)` handler: masks the typed phone and stores it without re-emitting valueChanges. */
export function onPhoneInput(e: Event, control: AbstractControl<string>) {
  const el = e.target as HTMLInputElement;
  el.value = maskPhone(el.value);
  control.setValue(el.value, { emitEvent: false });
}

/** Message for the first validation error of a touched control (null when valid or untouched). */
export function fieldError(c: AbstractControl, minLengthMessage = 'Texto muito curto.'): string | null {
  if (!c.invalid || !c.touched) return null;
  if (c.hasError('required')) return 'Campo obrigatório.';
  if (c.hasError('email') || c.hasError('pattern')) return 'Informe um e-mail válido.';
  if (c.hasError('maxlength')) return `Máximo de ${c.getError('maxlength').requiredLength} caracteres.`;
  if (c.hasError('minlength')) return minLengthMessage;
  return 'Valor inválido.';
}

export const shortId = (id: string | null | undefined) => (id ?? '').slice(0, 8).toUpperCase();
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

export const whatsappUrl = (text: string) =>
  `${WHATSAPP_NUMBER ? 'https://wa.me/' + WHATSAPP_NUMBER : 'https://api.whatsapp.com/send'}?text=${encodeURIComponent(text)}`;
export const uuid = () => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(16).slice(2)}`);
