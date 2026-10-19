import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, retry, throwError, timer } from 'rxjs';
import { SILENT } from './config';
import { ApiError } from './models';
import { LoadingService, ToastService } from './state.services';
import { uuid } from './utils';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // A barra global representa apenas consultas de dados (GET e preview da calculadora).
  if (req.method !== 'GET' && !req.url.endsWith('/diagnostics/preview')) return next(req);
  const loading = inject(LoadingService);
  loading.inc();
  return next(req).pipe(finalize(() => loading.dec()));
};

/** Toda mutação recebe X-Idempotency-Key (o retry reenvia a mesma chave). */
export const idempotencyInterceptor: HttpInterceptorFn = (req, next) =>
  req.method === 'POST' && !req.headers.has('X-Idempotency-Key')
    ? next(req.clone({ setHeaders: { 'X-Idempotency-Key': uuid() } }))
    : next(req);

/** 5xx/rede: backoff exponencial (3 tentativas). Depois converte para ApiError — 400/404/409 ficam para o componente tratar. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const silent = req.context.get(SILENT);
  return next(req).pipe(
    retry({
      count: silent ? 0 : 3,
      delay: (err: HttpErrorResponse, n) => (err.status >= 500 || err.status === 0 ? timer(400 * 2 ** n) : throwError(() => err)),
    }),
    catchError((err: HttpErrorResponse) => {
      const apiError: ApiError = {
        status: err.status,
        code: err.error?.code ?? (err.status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN'),
        message: err.error?.message ?? 'Não foi possível concluir a requisição.',
        traceId: err.error?.traceId,
      };
      if (!silent && (err.status >= 500 || err.status === 0)) {
        toast.show('Serviço indisponível', 'Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos.', 'error');
      }
      return throwError(() => apiError);
    }),
  );
};
