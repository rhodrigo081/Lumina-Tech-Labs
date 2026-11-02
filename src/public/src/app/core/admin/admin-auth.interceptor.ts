import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from '../config';
import { AdminAuthService } from './admin-auth.service';

const ADMIN_API = `${API_BASE}/admin/`;
const LOGIN = `${API_BASE}/admin/auth/login`;
const LOGOUT = `${API_BASE}/admin/auth/logout`;

export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(ADMIN_API) || req.url === LOGIN) return next(req);
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const token = auth.token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && req.url !== LOGOUT) auth.logout(router.url);
      return throwError(() => err);
    }),
  );
};
