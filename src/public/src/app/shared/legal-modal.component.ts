import { Component, ElementRef, computed, effect, input, output, viewChild } from '@angular/core';
import { LEGAL_DOCS, LegalDocKind } from '../core/legal-texts';

@Component({
  selector: 'ecm-legal-modal',
  template: `
    <dialog #dlg (close)="closed.emit()" (click)="onBackdrop($event)" aria-labelledby="legal-modal-title"
      class="m-auto w-[calc(100%-32px)] max-w-2xl max-h-[85vh] p-0 rounded-2xl bg-surface-container-lowest text-fg-primary shadow-xl backdrop:bg-black/50">
      @if (doc(); as d) {
        <div class="flex flex-col max-h-[85vh]">
          <header class="flex items-start justify-between gap-space-sm px-space-lg pt-space-lg pb-space-sm border-b border-outline-variant/40">
            <div>
              <h2 id="legal-modal-title" class="font-headline-sm text-headline-sm font-bold">{{ d.title }}</h2>
              <p class="font-label-mono text-label-mono text-fg-secondary">Versão {{ d.version }} • Atualizado em {{ d.updatedAt }}</p>
            </div>
            <button type="button" (click)="close()" aria-label="Fechar"
              class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-surface-container-low">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>
          <div class="overflow-y-auto px-space-lg py-space-md flex flex-col gap-space-md">
            <p class="font-body-sm text-body-sm text-on-surface-variant">{{ d.intro }}</p>
            @for (c of d.clauses; track c.title) {
              <section class="flex flex-col gap-1">
                <h3 class="font-label-lg text-label-lg font-bold">{{ c.title }}</h3>
                @for (p of c.paragraphs; track $index) {
                  <p class="font-body-sm text-body-sm text-on-surface-variant">{{ p }}</p>
                }
              </section>
            }
          </div>
          <footer class="px-space-lg py-space-sm border-t border-outline-variant/40 flex justify-end">
            <button type="button" (click)="close()"
              class="px-space-md h-10 rounded-lg bg-fg-primary text-on-primary font-label-lg text-label-lg font-semibold">Entendi</button>
          </footer>
        </div>
      }
    </dialog>
  `,
})
export class LegalModalComponent {
  readonly kind = input<LegalDocKind | null>(null);
  readonly closed = output<void>();

  readonly doc = computed(() => {
    const k = this.kind();
    return k ? LEGAL_DOCS[k] : null;
  });

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.kind() && !el.open) el.showModal();
      else if (!this.kind() && el.open) el.close();
    });
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  onBackdrop(ev: MouseEvent): void {
    if (ev.target === this.dlg().nativeElement) this.close();
  }
}
