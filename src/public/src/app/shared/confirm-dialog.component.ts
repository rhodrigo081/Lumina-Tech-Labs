import { Component, ElementRef, Injectable, effect, inject, signal, viewChild } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions { resolve: (ok: boolean) => void; }

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(opts: ConfirmOptions): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...opts, resolve }));
  }

  answer(ok: boolean) {
    const p = this.pending();
    this.pending.set(null);
    p?.resolve(ok);
  }
}

@Component({
  selector: 'ecm-confirm-dialog',
  template: `
    <dialog #dlg (cancel)="$event.preventDefault(); svc.answer(false)" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-msg"
      class="m-auto w-[calc(100%-32px)] max-w-md p-0 rounded-2xl bg-surface-container-lowest text-fg-primary shadow-xl backdrop:bg-black/50">
      @if (svc.pending(); as p) {
        <div class="p-space-lg flex flex-col gap-space-md">
          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" [class]="p.danger ? 'bg-error-container text-fg-error' : 'bg-surface-container text-fg-primary'">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ p.danger ? 'warning' : 'help' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <h2 id="confirm-title" class="font-headline-sm text-headline-sm font-bold">{{ p.title }}</h2>
              <p id="confirm-msg" class="font-body-sm text-body-sm text-on-surface-variant">{{ p.message }}</p>
            </div>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-xs">
            <button type="button" autofocus class="adm-btn-ghost" (click)="svc.answer(false)">{{ p.cancelLabel ?? 'Voltar' }}</button>
            <button type="button" [class]="p.danger ? 'adm-btn-danger' : 'adm-btn-primary'" (click)="svc.answer(true)">{{ p.confirmLabel }}</button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly svc = inject(ConfirmService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.svc.pending() && !el.open) {
        el.showModal();
        setTimeout(() => el.querySelector<HTMLElement>('[autofocus]')?.focus());
      }
      else if (!this.svc.pending() && el.open) el.close();
    });
  }
}
