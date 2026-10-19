import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { JourneyStore, LoadingService, ToastService } from '../core/state.services';
import { ThemeMode, ThemeService } from '../core/theme.service';

const STORAGE_KEY = 'ecm.sidebar.collapsed';

@Component({
  selector: 'ecm-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (loading.active()) {
      <div class="fixed top-0 inset-x-0 h-1 z-[60] bg-surface-container-high overflow-hidden no-print" role="progressbar" aria-label="Carregando dados">
        <div class="h-full bg-gradient-to-r from-primary via-primary-container to-secondary-fixed loader-bar"></div>
      </div>
    }

    <!-- Botão flutuante (somente mobile): não há header -->
    <button type="button" (click)="mobileOpen.set(true)" aria-label="Abrir menu" aria-controls="sidebar" [attr.aria-expanded]="mobileOpen()" data-chrome
      class="lg:hidden fixed top-3 left-3 z-40 w-11 h-11 rounded-xl bg-surface-container-lowest text-fg-primary shadow-md flex items-center justify-center">
      <span class="material-symbols-outlined" aria-hidden="true">menu</span>
    </button>
    @if (mobileOpen()) { <div class="lg:hidden fixed inset-0 z-40 bg-black/50" (click)="mobileOpen.set(false)" aria-hidden="true"></div> }

    <aside id="sidebar" data-chrome aria-label="Menu principal"
      class="fixed inset-y-0 left-0 z-50 w-[264px] flex flex-col bg-surface-container-lowest shadow-[1px_0_8px_rgba(0,0,0,0.05)] transition-[width,transform] duration-200"
      [class]="(mobileOpen() ? 'translate-x-0 ' : '-translate-x-full ') + 'lg:translate-x-0 ' + (collapsed() ? 'lg:w-[76px]' : 'lg:w-[264px]')">

      <div class="h-20 px-4 flex items-center gap-space-sm shrink-0" [class]="collapsed() ? 'lg:justify-center' : ''">
        <span class="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">bolt</span></span>
        <span class="font-headline-sm text-headline-sm text-fg-primary font-bold tracking-tight" [class]="collapsed() ? 'lg:hidden' : ''">Lumina Tech Labs</span>
      </div>

      <nav class="flex-1 px-3 py-space-sm flex flex-col gap-1 overflow-y-auto" aria-label="Principal">
        @for (item of nav(); track item.label) {
          <a [routerLink]="item.link" routerLinkActive="bg-secondary-container text-fg-primary font-bold" (click)="mobileOpen.set(false)"
            [attr.title]="collapsed() ? item.label : null" [attr.aria-label]="item.label"
            class="flex items-center gap-space-sm h-11 px-3 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-lg text-label-lg transition-colors"
            [class]="collapsed() ? 'lg:justify-center lg:px-0' : ''">
            <span class="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">{{ item.icon }}</span>
            <span class="truncate" [class]="collapsed() ? 'lg:hidden' : ''">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="p-3 flex flex-col gap-space-sm shrink-0">
        <div class="items-center gap-space-xs px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-mono text-label-mono w-max"
          [class]="collapsed() ? 'hidden' : 'hidden lg:flex'">
          <span class="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span><span>Tarifa ANEEL 2026</span>
        </div>
        <div role="group" aria-label="Tema da interface" class="flex rounded-lg bg-surface-container p-1 gap-1" [class]="collapsed() ? 'lg:hidden' : ''">
          @for (o of themes; track o.mode) {
            <button type="button" (click)="theme.set(o.mode)" [attr.aria-pressed]="theme.mode() === o.mode" [attr.aria-label]="'Tema ' + o.label" [attr.title]="'Tema ' + o.label"
              class="flex-1 h-9 rounded-md flex items-center justify-center gap-1 font-label-md text-label-md transition-colors"
              [class]="theme.mode() === o.mode ? 'bg-surface-container-lowest text-fg-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ o.icon }}</span>
            </button>
          }
        </div>  
        <button type="button" (click)="theme.cycle()" [attr.aria-label]="'Tema: ' + currentLabel() + '. Clique para alternar'" [attr.title]="'Tema: ' + currentLabel()"
          class="hidden items-center justify-center h-11 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" [class]="collapsed() ? 'lg:flex' : ''">
          <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ currentIcon() }}</span>
        </button>
        <button type="button" (click)="toggle()" [attr.aria-expanded]="!collapsed()" aria-controls="sidebar"
          [attr.aria-label]="collapsed() ? 'Expandir menu' : 'Recolher menu'" [attr.title]="collapsed() ? 'Expandir menu' : null"
          class="hidden lg:flex items-center gap-space-sm h-11 px-3 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-lg text-label-lg transition-colors"
          [class]="collapsed() ? 'justify-center px-0' : ''">
          <span class="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">{{ collapsed() ? 'left_panel_open' : 'left_panel_close' }}</span>
          <span [class]="collapsed() ? 'hidden' : ''">Recolher menu</span>
        </button>
      </div>
    </aside>

    @if (toast.toast(); as t) {
      <div class="fixed top-4 right-4 z-[55] max-w-sm w-[calc(100%-2rem)] bg-surface-container-lowest shadow-xl rounded-xl p-space-md flex items-start gap-space-sm no-print" [attr.role]="t.tone === 'error' ? 'alert' : 'status'">
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [class]="t.tone === 'error' ? 'bg-error-container text-fg-error' : 'bg-tertiary-fixed text-on-tertiary-fixed'">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ t.tone === 'error' ? 'cloud_off' : 'verified' }}</span>
        </div>
        <div class="flex-1"><h4 class="font-label-lg text-label-lg text-fg-primary font-bold">{{ t.title }}</h4><p class="font-body-sm text-body-sm text-on-surface-variant">{{ t.message }}</p></div>
        <button type="button" class="text-on-surface-variant hover:text-fg-primary" (click)="toast.dismiss()" aria-label="Fechar aviso"><span class="material-symbols-outlined text-[18px]">close</span></button>
      </div>
    }

    <main class="min-h-screen bg-surface transition-[padding] duration-200 pt-16 lg:pt-0 flex flex-col" [class]="collapsed() ? 'lg:pl-[76px]' : 'lg:pl-[264px]'">
      <div class="flex-1"><router-outlet /></div>
      <footer data-chrome class="mt-space-xl bg-surface-container-low px-gutter py-space-lg">
        <div class="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-space-sm">
          <p class="font-body-sm text-body-sm text-on-surface-variant">© 2026 Lumina Tech Labs • DPO: dpo&#64;lumina.tech.labs.com.br</p>
          <div class="flex items-center gap-space-sm flex-wrap justify-center">
            <span class="inline-flex items-center gap-1 px-space-sm py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>ISO 50001 Aligned</span>
            <span class="inline-flex items-center gap-1 px-space-sm py-1 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">shield</span>GHG Protocol Scope 2</span>
          </div>
        </div>
      </footer>
    </main>
  `,
})
export class ShellComponent {
  readonly loading = inject(LoadingService);
  readonly toast = inject(ToastService);
  readonly store = inject(JourneyStore);
  readonly theme = inject(ThemeService);
  readonly themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'claro', icon: 'light_mode' },
    { mode: 'dark', label: 'escuro', icon: 'dark_mode' },
  ];
  readonly currentIcon = computed(() => this.themes.find((t) => t.mode === this.theme.mode())!.icon);
  readonly currentLabel = computed(() => this.themes.find((t) => t.mode === this.theme.mode())!.label);

  readonly mobileOpen = signal(false);
  /** Preferência salva; sem preferência, começa recolhida em telas menores que 1280px. */
  readonly collapsed = signal(this.initialCollapsed());

  readonly nav = computed(() => {
    const id = this.store.lead().id;
    const items = [
      { label: 'Diagnóstico', icon: 'calculate', link: '/diagnostico' },
      { label: 'Agendamento', icon: 'calendar_month', link: `/agendamento` },
    ];
    const b = this.store.booking();
    if (b) items.push({ label: 'Confirmação', icon: 'event_available', link: `/confirmacao/${b.protocol}` });
    items.push({ label: 'Sobre', icon: 'info', link: '/sobre' }, { label: 'Contato', icon: 'contact_support', link: '/contato' });
    return items;
  });

  toggle() {
    this.collapsed.update((v) => !v);
    try { localStorage.setItem(STORAGE_KEY, String(this.collapsed())); } catch { /* storage indisponível */ }
  }

  @HostListener('document:keydown.escape') closeMobile() { this.mobileOpen.set(false); }

  private initialCollapsed(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch { /* ignora */ }
    return typeof window !== 'undefined' && window.innerWidth < 1280;
  }
}
