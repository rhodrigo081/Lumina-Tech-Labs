import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/admin/admin-api.service';
import { Technician, TechnicianRequest } from '../../core/admin/admin.models';
import { friendly } from '../../core/errors';
import { ApiError } from '../../core/models';
import { ToastService } from '../../core/state.services';
import { LoadingButtonComponent } from '../../shared/loading-button.component';
import { EMAIL_PATTERN, notBlank } from '../../core/utils';

@Component({
  selector: 'ecm-admin-technicians',
  imports: [ReactiveFormsModule, RouterLink, LoadingButtonComponent],
  template: `
    <div class="max-w-[1100px] mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <header class="flex flex-col gap-1">
        <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-wider font-bold">Equipe</span>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-fg-primary font-extrabold tracking-tight">Técnicos</h1>
        <p class="font-body-md text-body-md text-on-surface-variant">Quem conduz as reuniões de diagnóstico. Técnicos inativos deixam de aparecer para os clientes, mas as reuniões já marcadas são mantidas.</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-space-lg items-start">
        <section class="lg:col-span-3 adm-card !p-0 overflow-hidden" aria-label="Lista de técnicos">
          @if (loading()) {
            <div class="p-space-md flex flex-col gap-space-sm" role="status" aria-label="Carregando técnicos">@for (n of [1, 2, 3]; track n) { <div class="sk h-14 w-full"></div> }</div>
          } @else {
            <ul>
              @for (t of technicians(); track t.id) {
                <li class="flex items-center gap-space-sm px-space-md py-space-sm border-t border-outline-variant/40 first:border-t-0" [class.bg-secondary-container]="editing()?.id === t.id">
                  <span class="w-10 h-10 rounded-full flex items-center justify-center font-label-lg text-label-lg font-bold shrink-0"
                    [class]="t.active ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface-variant'">{{ initials(t.name) }}</span>
                  <div class="flex flex-col min-w-0 flex-1">
                    <span class="font-label-lg text-label-lg text-fg-primary truncate">{{ t.name }}</span>
                    <span class="font-body-sm text-body-sm text-on-surface-variant truncate">{{ t.email }}{{ t.specialty ? ' · ' + t.specialty : '' }}</span>
                  </div>
                  <span class="adm-chip hidden sm:inline-flex" [class]="t.active ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface-variant'">{{ t.active ? 'Ativo' : 'Inativo' }}</span>
                  <button type="button" class="adm-btn-ghost !h-9 !px-2" (click)="edit(t)" [attr.aria-label]="'Editar ' + t.name"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
                </li>
              } @empty {
                <li class="p-space-xl flex flex-col items-center text-center gap-space-sm">
                  <span class="material-symbols-outlined text-[40px] text-fg-secondary" aria-hidden="true">engineering</span>
                  <p class="font-body-md text-body-md text-on-surface-variant">Nenhum técnico cadastrado. Cadastre o primeiro ao lado.</p>
                </li>
              }
            </ul>
          }
        </section>

        <section class="lg:col-span-2 adm-card flex flex-col gap-space-md lg:sticky lg:top-6" aria-labelledby="tech-form-h">
          <div class="flex items-center justify-between gap-space-sm">
            <h2 id="tech-form-h" class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ editing() ? 'Editar técnico' : 'Novo técnico' }}</h2>
            @if (editing()) { <button type="button" class="adm-btn-ghost !h-9" (click)="reset()">Cancelar</button> }
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-space-md" novalidate>
            <div class="flex flex-col gap-1">
              <label for="t-name" class="adm-label">Nome</label>
              <input #nameInput id="t-name" formControlName="name" autocomplete="off" maxlength="150" class="adm-input" placeholder="Ex: Ana Souza"
                [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid" />
              @if (form.controls.name.touched && form.controls.name.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Informe o nome.</p> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="t-email" class="adm-label">E-mail</label>
              <input id="t-email" type="email" formControlName="email" autocapitalize="off" spellcheck="false" autocomplete="off" maxlength="255" class="adm-input" placeholder="ana@luminatechlabs.com"
                [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid" />
              <span class="font-body-sm text-body-sm text-on-surface-variant">Recebe o convite de cada reunião agendada.</span>
              @if (form.controls.email.touched && form.controls.email.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Informe um e-mail válido.</p> }
            </div>
            <div class="flex flex-col gap-1">
              <label for="t-spec" class="adm-label">Especialidade <span class="font-normal text-on-surface-variant">(opcional)</span></label>
              <input id="t-spec" formControlName="specialty" maxlength="150" class="adm-input" placeholder="Ex: HVAC e climatização" />
            </div>
            <label class="flex items-center gap-space-sm cursor-pointer">
              <input type="checkbox" formControlName="active" class="w-5 h-5 accent-fg-primary" />
              <span class="font-label-lg text-label-lg text-fg-primary">Ativo (aparece para os clientes)</span>
            </label>
            @if (formError(); as e) {
              <div class="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">{{ e }}</div>
            }
            <ecm-loading-button type="submit" [label]="editing() ? 'Salvar alterações' : 'Cadastrar técnico'" [icon]="editing() ? 'save' : 'person_add'" loadingLabel="Salvando..." [loading]="saving()" />
            @if (!editing() && technicians().length) {
              <a routerLink="/admin/agenda" class="self-center font-label-lg text-label-lg text-fg-secondary hover:text-fg-primary inline-flex items-center gap-1">
                Ir para a agenda de horários<span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span></a>
            }
          </form>
        </section>
      </div>
    </div>
  `,
})
export class AdminTechniciansPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly technicians = signal<Technician[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Technician | null>(null);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(255)]],
    specialty: ['', Validators.maxLength(150)],
    active: [true],
  });

  ngOnInit() { this.load(); }

  load() {
    this.api.technicians().subscribe({
      next: (t) => { this.technicians.set(t); this.loading.set(false); },
      error: (e: ApiError) => { this.loading.set(false); const f = friendly(e, 'admin'); this.toast.show(f.title, f.message, 'error'); },
    });
  }

  edit(t: Technician) {
    this.editing.set(t);
    this.formError.set(null);
    this.form.reset({ name: t.name, email: t.email, specialty: t.specialty ?? '', active: t.active });
    this.nameInput()?.nativeElement.focus();
  }

  reset() {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', specialty: '', active: true });
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body: TechnicianRequest = { name: v.name.trim(), email: v.email.trim(), specialty: v.specialty.trim() || null, active: v.active };
    const current = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (current ? this.api.updateTechnician(current.id, body) : this.api.createTechnician(body)).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.toast.show(current ? 'Técnico atualizado' : 'Técnico cadastrado', t.name);
        this.reset();
        this.load();
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.formError.set(e.code === 'TECHNICIAN_EMAIL_IN_USE' ? 'Já existe um técnico com este e-mail.' : friendly(e, 'admin').message);
      },
    });
  }

  initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }
}
