import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JourneyStore } from './state.services';

/** A página de relatório só abre depois do clique em "Gerar relatório" (acesso direto volta ao diagnóstico). */
export const reportFlowGuard: CanActivateFn = () =>
  inject(JourneyStore).reportRequested() || inject(Router).createUrlTree(['/diagnostico']);
