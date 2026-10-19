import { LOCALE_ID, ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { USE_MOCK } from './core/config';
import { errorInterceptor, idempotencyInterceptor, loadingInterceptor } from './core/interceptors';
import { mockBackendInterceptor } from './core/mock-backend.interceptor';

// Ordem: loading → idempotência → erros/retry → (mock | rede)
const interceptors = [loadingInterceptor, idempotencyInterceptor, errorInterceptor, ...(USE_MOCK ? [mockBackendInterceptor] : [])];

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors(interceptors)),
  ],
};
