import { AbstractControl, ValidationErrors } from '@angular/forms';
import { WHATSAPP_NUMBER } from './config';

export const MAX = { name: 150, role: 150, company: 150, email: 255, phone: 15, search: 100, password: 72, number: 16 } as const;

export const notBlank = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && !c.value.trim() ? { required: true } : null;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const GENERIC_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'yahoo.com.br', 'outlook.com', 'live.com', 'bol.com.br', 'uol.com.br'];

export const isGenericDomain = (email: string) => GENERIC_DOMAINS.includes((email.split('@')[1] ?? '').toLowerCase().trim());
export const fmtNum = (v: number, d = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
export const parseCents = (raw: string) => parseInt(raw.replace(/\D/g, '').slice(0, 10) || '0', 10) / 100;

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  const m = d.length <= 10 ? d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  return m.replace(/-$/, '');
}

export const whatsappUrl = (text: string) =>
  `${WHATSAPP_NUMBER ? 'https://wa.me/' + WHATSAPP_NUMBER : 'https://api.whatsapp.com/send'}?text=${encodeURIComponent(text)}`;
export const uuid = () => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(16).slice(2)}`);
