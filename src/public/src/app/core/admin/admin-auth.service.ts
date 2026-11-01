import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_BASE } from '../config';
import { AdminSession } from './admin.models';

const KEY = 'ecm.admin.session';

/**
 * Sessão do administrador. O token fica no sessionStorage (some ao fechar a aba)
 * e a sessão é encerrada automaticamente quando o JWT expira.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly session = signal<AdminSession | null>(null);
  readonly admin = computed(() => this.session()?.admin ?? null);
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && Date.parse(s.expiresAt) > Date.now();
  });

  constructor() {
    const saved = this.restore();
    if (saved && Date.parse(saved.expiresAt) > Date.now()) this.start(saved);
    else this.clear();
  }

  token(): string | null {
    return this.isAuthenticated() ? this.session()!.accessToken : null;
  }

  login(email: string, password: string) {
    return this.http.post<AdminSession>(`${API_BASE}/admin/auth/login`, { email, password }).pipe(tap((s) => this.start(s)));
  }

  /** Encerra a sessão e volta para o login (guardando a página atual para retornar depois). */
  logout(returnUrl?: string) {
    this.clear();
    this.router.navigate(['/admin/login'], { queryParams: returnUrl && returnUrl !== '/admin/login' ? { redirect: returnUrl } : {} });
  }

  private start(s: AdminSession) {
    this.session.set(s);
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage indisponível */ }
    clearTimeout(this.expiryTimer);
    const ms = Date.parse(s.expiresAt) - Date.now();
    // setTimeout aceita no máximo ~24,8 dias; o token dura horas.
    this.expiryTimer = setTimeout(() => this.logout(this.router.url), Math.min(Math.max(ms, 0), 2_000_000_000));
  }

  private clear() {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    try { sessionStorage.removeItem(KEY); } catch { /* storage indisponível */ }
  }

  private restore(): AdminSession | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      const s = raw ? (JSON.parse(raw) as AdminSession) : null;
      return s?.accessToken && s.expiresAt ? s : null;
    } catch { return null; }
  }
}
