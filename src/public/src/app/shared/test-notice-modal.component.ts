import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';

// Acknowledgement lasts for the browser session: each new visit shows the notice again,
// but reloads and route changes within the same tab do not.
const STORAGE_KEY = 'ecm.test-notice.ack';

@Component({
  selector: 'ecm-test-notice-modal',
  template: `
    <dialog #dlg (cancel)="$event.preventDefault()" role="alertdialog" aria-labelledby="test-notice-title" aria-describedby="test-notice-msg"
      class="m-auto w-[calc(100%-32px)] max-w-md p-0 rounded-2xl bg-surface-container-lowest text-fg-primary shadow-xl backdrop:bg-black/60">
      <div class="p-space-lg flex flex-col gap-space-md">
        <div class="flex items-start gap-space-sm">
          <div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-surface-container text-fg-primary">
            <span class="material-symbols-outlined text-[22px]" aria-hidden="true">info</span>
          </div>
          <div class="flex flex-col gap-1">
            <h2 id="test-notice-title" class="font-headline-sm text-headline-sm font-bold">Projeto de demonstração</h2>
            <p id="test-notice-msg" class="font-body-sm text-body-sm text-on-surface-variant">
              Este empreendimento é fictício e esta aplicação é apenas uma <strong class="text-fg-primary">demonstração</strong>, sem fins comerciais.
            </p>
          </div>
        </div>
        <div class="flex justify-end">
          <button type="button" autofocus (click)="acknowledge()"
            class="px-space-md h-10 rounded-lg bg-fg-primary text-on-primary font-label-lg text-label-lg font-semibold">Entendi</button>
        </div>
      </div>
    </dialog>
  `,
})
export class TestNoticeModalComponent implements AfterViewInit {
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  ngAfterViewInit(): void {
    if (this.acknowledged()) return;
    const el = this.dlg().nativeElement;
    el.showModal();
    setTimeout(() => el.querySelector<HTMLElement>('[autofocus]')?.focus());
  }

  acknowledge(): void {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { }
    this.dlg().nativeElement.close();
  }

  private acknowledged(): boolean {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  }
}
