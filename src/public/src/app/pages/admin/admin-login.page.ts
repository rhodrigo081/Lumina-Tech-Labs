import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../core/admin/admin-auth.service';
import { ApiError } from '../../core/models';
import { LoadingButtonComponent } from '../../shared/loading-button.component';

@Component({
  selector: 'ecm-admin-login',
  imports: [ReactiveFormsModule, RouterLink, LoadingButtonComponent],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center px-gutter py-space-xl">
      <div class="w-full max-w-[420px] flex flex-col gap-space-lg">
        <div class="flex items-center gap-space-sm justify-center">
          <img src="assets/logo-mark.png" alt="" width="48" height="48" class="w-12 h-12 object-contain" />
          <div class="flex flex-col leading-tight">
            <span class="font-headline-sm text-headline-sm text-fg-primary font-bold">Lumina Tech Labs</span>
            <span class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">Área administrativa</span>
          </div>
        </div>

        <form class="adm-card flex flex-col gap-space-md" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div>
            <h1 class="font-headline-md text-headline-md text-fg-primary font-bold">Entrar</h1>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Acesso restrito à equipe da Lumina Tech Labs.</p>
          </div>

          @if (error(); as e) {
            <div class="p-space-sm rounded-lg bg-error-container text-on-error-container flex items-start gap-space-sm" role="alert">
              <span class="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
              <p class="font-body-sm text-body-sm">{{ e }}</p>
            </div>
          }

          <div class="flex flex-col gap-1">
            <label for="adm-email" class="adm-label">E-mail</label>
            <input id="adm-email" type="email" formControlName="email" autocomplete="username" class="adm-input"
              [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid" />
            @if (form.controls.email.touched && form.controls.email.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Informe um e-mail válido.</p> }
          </div>
          <div class="flex flex-col gap-1">
            <label for="adm-password" class="adm-label">Senha</label>
            <div class="relative">
              <input id="adm-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" class="adm-input pr-11"
                [attr.aria-invalid]="form.controls.password.touched && form.controls.password.invalid" />
              <button type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'"
                class="absolute right-1 top-1 w-9 h-9 rounded-md text-on-surface-variant hover:text-fg-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (form.controls.password.touched && form.controls.password.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Informe a senha.</p> }
          </div>

          <ecm-loading-button type="submit" label="Entrar" icon="login" loadingLabel="Entrando..." [loading]="submitting()" />
        </form>

        <a routerLink="/diagnostico" class="self-center font-label-lg text-label-lg text-fg-secondary hover:text-fg-primary inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>Voltar ao site
        </a>
      </div>
    </div>
  `,
})
export class AdminLoginPage {
  /** Página que o administrador tentou abrir antes do login (query param ?redirect=). */
  readonly redirect = input<string>('');

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  submit() {
    if (this.submitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        this.submitting.set(false);
        const target = this.redirect()?.startsWith('/admin') ? this.redirect() : '/admin/leads';
        this.router.navigateByUrl(target);
      },
      error: (e: ApiError) => {
        this.submitting.set(false);
        this.form.controls.password.reset();
        this.error.set(
          e.status === 401 ? 'E-mail ou senha incorretos.'
            : e.status === 429 ? 'Muitas tentativas sem sucesso. Aguarde 15 minutos e tente novamente.'
              : e.status === 0 ? 'Sem conexão com o servidor. Verifique sua internet.'
                : 'Não foi possível entrar agora. Tente novamente em instantes.');
      },
    });
  }
}
