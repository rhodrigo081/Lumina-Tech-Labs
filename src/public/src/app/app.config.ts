import { LOCALE_ID, ApplicationConfig } from '@angular/core';
import { NavigationError, provideRouter, withComponentInputBinding, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { errorInterceptor, loadingInterceptor } from './core/interceptors';
import { adminAuthInterceptor } from './core/admin/admin-auth.interceptor';

const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_KEY = 'ecm.chunk-reload';

function reloadOnStaleChunk(e: NavigationError): void {
  if (!STALE_CHUNK.test(String((e.error as Error)?.message ?? e.error))) return;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  location.assign(e.url);
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' }), withNavigationErrorHandler(reloadOnStaleChunk)),
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor, errorInterceptor, adminAuthInterceptor])),
  ],
};
