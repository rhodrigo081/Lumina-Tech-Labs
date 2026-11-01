import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from '../config';
import { AdminAuthService } from './admin-auth.service';

const ADMIN_API = `${API_BASE}/admin/`;
const LOGIN = `${API_BASE}/admin/auth/login`;

/**
 * Anexa o Bearer token apenas nas chamadas da API administrativa (o funil público
 * continua anônimo). Um 401 nessas chamadas significa sessão inválida/expirada:
 * encerra a sessão e leva ao login.
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(ADMIN_API) || req.url === LOGIN) return next(req);
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const token = auth.token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) auth.logout(router.url);
      return throwError(() => err);
    }),
  );
};
