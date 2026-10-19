import { Component, input } from '@angular/core';

/** Cartão de erro contextual: badge HTTP + código + título + explicação, com corpo e ações projetados. */
@Component({
  selector: 'ecm-error-card',
  template: `
    <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between gap-space-md" role="alert">
      <div class="flex flex-col gap-space-sm">
        <div class="flex items-center justify-between gap-space-sm flex-wrap">
          <span class="px-space-sm py-0.5 rounded font-label-mono text-label-mono font-bold tracking-wider"
            [class]="tone() === 'error' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface'">{{ badge() }}</span>
          <span class="font-label-mono text-label-mono text-on-surface-variant">{{ code() }}</span>
        </div>
        <div class="flex items-start gap-space-sm mt-space-xs">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            [class]="tone() === 'error' ? 'bg-error-container text-fg-error' : 'bg-surface-container-high text-on-surface-variant'">
            <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ icon() }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ title() }}</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">{{ message() }}</p>
          </div>
        </div>
        <ng-content />
      </div>
      <div class="flex items-center justify-end flex-wrap gap-space-sm pt-space-xs"><ng-content select="[actions]" /></div>
    </article>
  `,
})
export class ErrorCardComponent {
  readonly badge = input.required<string>();
  readonly code = input('');
  readonly icon = input('error');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly tone = input<'error' | 'neutral'>('neutral');
}
