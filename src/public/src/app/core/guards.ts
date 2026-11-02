import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JourneyStore } from './state.services';

export const reportFlowGuard: CanActivateFn = () => {
  const store = inject(JourneyStore);
  return store.reportRequested() || !!store.report() || inject(Router).createUrlTree(['/diagnostico']);
};
