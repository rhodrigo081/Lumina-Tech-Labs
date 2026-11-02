import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

export const IDLE_LIMIT_MS = 15 * 60_000;
export const IDLE_WARNING_MS = 60_000;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const;

@Injectable()
export class AdminIdleService {
  private readonly auth = inject(AdminAuthService);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);

  readonly secondsLeft = signal<number | null>(null);

  private lastActivity = Date.now();
  private ticker?: ReturnType<typeof setInterval>;

  constructor() {
    const onActivity = () => {
      if (this.secondsLeft() === null) this.lastActivity = Date.now();
    };
    this.zone.runOutsideAngular(() => {
      for (const e of ACTIVITY_EVENTS) document.addEventListener(e, onActivity, { passive: true, capture: true });
      this.ticker = setInterval(() => this.check(), 1000);
    });
    inject(DestroyRef).onDestroy(() => {
      for (const e of ACTIVITY_EVENTS) document.removeEventListener(e, onActivity, { capture: true });
      clearInterval(this.ticker);
    });
  }

  keepAlive() {
    this.lastActivity = Date.now();
    this.secondsLeft.set(null);
  }

  logoutNow() {
    this.secondsLeft.set(null);
    this.auth.logout();
  }

  private check() {
    const idle = Date.now() - this.lastActivity;
    if (idle >= IDLE_LIMIT_MS) {
      this.zone.run(() => {
        this.secondsLeft.set(null);
        this.auth.logout(this.router.url);
      });
      return;
    }
    const next = idle >= IDLE_LIMIT_MS - IDLE_WARNING_MS ? Math.ceil((IDLE_LIMIT_MS - idle) / 1000) : null;
    if (next !== this.secondsLeft()) this.zone.run(() => this.secondsLeft.set(next));
  }
}
