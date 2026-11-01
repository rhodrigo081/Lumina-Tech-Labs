import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JourneyStore } from './state.services';

/** A página de relatório só abre depois do clique em "Gerar relatório" (ou se já existe um relatório na sessão). */
export const reportFlowGuard: CanActivateFn = () => {
  const store = inject(JourneyStore);
  return store.reportRequested() || !!store.report() || inject(Router).createUrlTree(['/diagnostico']);
};
