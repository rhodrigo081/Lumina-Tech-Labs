import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';

const SLOW_AFTER_MS = 8000;

@Component({
  selector: 'ecm-loading-button',
  template: `
    <button [type]="type()" [disabled]="loading() || disabled()" [attr.aria-busy]="loading()"
      class="w-full h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors shadow-sm"
      [class]="loading() ? 'bg-primary-container/85 text-on-primary opacity-90 cursor-not-allowed' : disabled() ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-primary-container hover:bg-primary text-on-primary cursor-pointer'">
      @if (loading()) {
        <svg class="animate-spin h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="truncate">{{ loadingLabel() }}</span>
      } @else {
        @if (icon()) { <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ icon() }}</span> }
        <span>{{ label() }}</span>
      }
    </button>
    @if (slow()) {
      <p class="mt-2 font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5" role="status">
        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">hourglass_top</span>
        A conexão está lenta. Aguarde, não é preciso clicar de novo.
      </p>
    }
  `,
})
export class LoadingButtonComponent {
  readonly label = input.required<string>();
  readonly loadingLabel = input('Processando...');
  readonly icon = input('');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');

  readonly slow = signal(false);
  private slowTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      clearTimeout(this.slowTimer);
      if (this.loading()) this.slowTimer = setTimeout(() => this.slow.set(true), SLOW_AFTER_MS);
      else this.slow.set(false);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.slowTimer));
  }
}
