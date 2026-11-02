import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, retry, throwError, timer } from 'rxjs';
import { SILENT } from './config';
import { ApiError } from './models';
import { LoadingService } from './state.services';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' && !req.url.endsWith('/diagnostics/preview')) return next(req);
  const loading = inject(LoadingService);
  loading.inc();
  return next(req).pipe(finalize(() => loading.dec()));
};

const safeToRetry = (req: HttpRequest<unknown>) => req.method === 'GET' || (req.method === 'POST' && req.url.endsWith('/leads'));

const toApiError = (err: HttpErrorResponse): ApiError => {
  const body: Record<string, unknown> = err.error && typeof err.error === 'object' ? err.error : {};
  const raw = typeof err.error === 'string' ? err.error.trim() : '';
  const text = raw && !raw.startsWith('<') && !/exception|stack|\bat [\w.$]+\(/i.test(raw) ? raw : '';
  const pick = (...keys: string[]) => keys.map((k) => body[k]).find((v) => typeof v === 'string' && v) as string | undefined;
  const list = (body['errors'] ?? body['fieldErrors'] ?? body['details'] ?? body['violations']) as unknown;
  const details = Array.isArray(list)
    ? list.map((i) => (typeof i === 'string' ? i : [(i as Record<string, string>)?.['field'], (i as Record<string, string>)?.['message'] ?? (i as Record<string, string>)?.['defaultMessage']].filter(Boolean).join(': '))).filter(Boolean)
    : undefined;
  return {
    status: err.status,
    code: pick('code', 'errorCode', 'error') ?? (err.status === 0 ? 'NETWORK_ERROR' : `HTTP_${err.status}`),
    message: pick('message', 'detail') ?? (text && text.length < 300 ? text : ''),
    details,
    traceId: pick('traceId', 'requestId'),
  };
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const retries = req.context.get(SILENT) || !safeToRetry(req) ? 0 : 3;
  return next(req).pipe(
    retry({
      count: retries,
      delay: (err: HttpErrorResponse, n) => (err.status >= 500 || err.status === 0 ? timer(400 * 2 ** n) : throwError(() => err)),
    }),
    catchError((err: HttpErrorResponse) => throwError(() => toApiError(err))),
  );
};
