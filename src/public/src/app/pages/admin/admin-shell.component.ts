import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../core/admin/admin-auth.service';
import { AdminIdleService } from '../../core/admin/admin-idle.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { LoadingService, ToastService } from '../../core/state.services';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'ecm-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent],
  providers: [AdminIdleService],
  template: `
    @if (loading.active()) {
      <div class="fixed top-0 inset-x-0 h-1 z-[60] bg-surface-container-high overflow-hidden" role="progressbar" aria-label="Carregando dados">
        <div class="h-full bg-gradient-to-r from-primary via-primary-container to-secondary-fixed loader-bar"></div>
      </div>
    }

    <button type="button" (click)="mobileOpen.set(true)" aria-label="Abrir menu" aria-controls="admin-sidebar" [attr.aria-expanded]="mobileOpen()"
      class="lg:hidden fixed top-3 left-3 z-40 w-11 h-11 rounded-xl bg-surface-container-lowest text-fg-primary shadow-md flex items-center justify-center">
      <span class="material-symbols-outlined" aria-hidden="true">menu</span>
    </button>
    @if (mobileOpen()) { <div class="lg:hidden fixed inset-0 z-40 bg-black/50" (click)="mobileOpen.set(false)" aria-hidden="true"></div> }

    <aside id="admin-sidebar" aria-label="Menu administrativo"
      class="fixed inset-y-0 left-0 z-50 w-[248px] flex flex-col bg-primary text-on-primary transition-transform duration-200 lg:translate-x-0"
      [class.translate-x-0]="mobileOpen()" [class.-translate-x-full]="!mobileOpen()">
      <div class="h-20 px-4 flex items-center gap-space-sm shrink-0">
        <img src="assets/logo-mark.png" alt="" width="40" height="40" class="w-10 h-10 object-contain shrink-0" />
        <div class="flex flex-col leading-tight">
          <span class="font-headline-sm text-headline-sm font-bold tracking-tight">Lumina Admin</span>
          <span class="font-label-mono text-[10px] text-primary-fixed-dim uppercase tracking-wider">Painel interno</span>
        </div>
      </div>

      <nav class="flex-1 px-3 py-space-sm flex flex-col gap-1 overflow-y-auto" aria-label="Administração">
        @for (item of nav; track item.link) {
          <a [routerLink]="item.link" routerLinkActive="!bg-primary-container !text-on-primary font-bold" (click)="mobileOpen.set(false)"
            class="flex items-center gap-space-sm h-11 px-3 rounded-lg text-primary-fixed hover:bg-primary-container/60 hover:text-on-primary font-label-lg text-label-lg transition-colors">
            <span class="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">{{ item.icon }}</span>
            <span class="truncate">{{ item.label }}</span>
          </a>
        }
        <a routerLink="/diagnostico" target="_blank" rel="noopener"
          class="mt-space-md flex items-center gap-space-sm h-11 px-3 rounded-lg text-primary-fixed-dim hover:bg-primary-container/60 hover:text-on-primary font-label-lg text-label-lg transition-colors">
          <span class="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">open_in_new</span><span>Ver site público</span>
        </a>
      </nav>

      <div class="p-3 flex flex-col gap-space-sm shrink-0">
        @if (auth.admin(); as a) {
          <div class="flex items-center gap-space-sm px-2 py-2 rounded-lg bg-primary-container/50">
            <span class="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-lg text-label-lg font-bold shrink-0">{{ initials(a.name) }}</span>
            <div class="flex flex-col min-w-0"><span class="font-label-lg text-label-lg truncate">{{ a.name }}</span><span class="text-[11px] text-primary-fixed-dim truncate">{{ a.email }}</span></div>
          </div>
        }
        <div class="flex gap-space-xs">
          <button type="button" (click)="theme.cycle()" [attr.aria-label]="theme.isDark() ? 'Usar tema claro' : 'Usar tema escuro'"
            class="h-10 w-10 shrink-0 rounded-lg text-primary-fixed hover:bg-primary-container/60 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</span>
          </button>
          <button type="button" (click)="auth.logout()"
            class="flex-1 h-10 rounded-lg text-primary-fixed hover:bg-primary-container/60 hover:text-on-primary flex items-center justify-center gap-space-xs font-label-lg text-label-lg">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>Sair
          </button>
        </div>
      </div>
    </aside>

    @if (toast.toast(); as t) {
      <div class="fixed top-4 right-4 z-[55] max-w-sm w-[calc(100%-2rem)] bg-surface-container-lowest shadow-xl rounded-xl p-space-md flex items-start gap-space-sm" [attr.role]="t.tone === 'error' ? 'alert' : 'status'">
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [class]="t.tone === 'error' ? 'bg-error-container text-fg-error' : 'bg-tertiary-fixed text-on-tertiary-fixed'">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ t.tone === 'error' ? 'error' : 'check_circle' }}</span>
        </div>
        <div class="flex-1"><h4 class="font-label-lg text-label-lg text-fg-primary font-bold">{{ t.title }}</h4><p class="font-body-sm text-body-sm text-on-surface-variant">{{ t.message }}</p></div>
        <button type="button" class="text-on-surface-variant hover:text-fg-primary" (click)="toast.dismiss()" aria-label="Fechar aviso"><span class="material-symbols-outlined text-[18px]">close</span></button>
      </div>
    }

    <ecm-confirm-dialog />

    @if (idle.secondsLeft() !== null) {
      <div class="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-gutter">
        <div class="w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-xl p-space-lg flex flex-col gap-space-md" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-msg">
          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-surface-container text-fg-primary">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">timer</span>
            </div>
            <div class="flex flex-col gap-1">
              <h2 id="idle-title" class="font-headline-sm text-headline-sm text-fg-primary font-bold">Sessão inativa</h2>
              <p id="idle-msg" class="font-body-sm text-body-sm text-on-surface-variant">Por segurança, você será desconectado em <strong class="text-fg-primary">{{ idle.secondsLeft() }}s</strong> por falta de atividade.</p>
            </div>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-xs">
            <button type="button" class="adm-btn-ghost" (click)="idle.logoutNow()">Sair agora</button>
            <button type="button" class="adm-btn-primary" (click)="idle.keepAlive()">Continuar conectado</button>
          </div>
        </div>
      </div>
    }

    <main class="min-h-screen bg-surface pt-16 lg:pt-0 lg:pl-[248px]" [attr.inert]="idle.secondsLeft() !== null ? '' : null">
      <router-outlet />
    </main>
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AdminAuthService);
  readonly idle = inject(AdminIdleService);
  readonly loading = inject(LoadingService);
  readonly toast = inject(ToastService);
  readonly theme = inject(ThemeService);
  readonly mobileOpen = signal(false);

  readonly nav = [
    { label: 'Leads', icon: 'groups', link: '/admin/leads' },
    { label: 'Agenda de horários', icon: 'calendar_month', link: '/admin/agenda' },
    { label: 'Técnicos', icon: 'engineering', link: '/admin/tecnicos' },
  ];

  initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  @HostListener('document:keydown.escape') closeMobile() { this.mobileOpen.set(false); }
}
