import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ApiError, Report } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { uuid, whatsappUrl } from '../core/utils';
import { ErrorCardComponent } from '../shared/error-card.component';
import { IdentificationFormComponent, buildIdentificationGroup } from '../shared/identification-form.component';
import { LoadingButtonComponent } from '../shared/loading-button.component';

@Component({
  selector: 'ecm-relatorio',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe, ErrorCardComponent, LoadingButtonComponent, IdentificationFormComponent],
  template: `
    @if (!id()) {
      <!-- ETAPA 1: formulário de geração do relatório -->
      <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <header class="max-w-3xl flex flex-col gap-space-xs">
          <span class="font-label-mono text-label-mono text-fg-primary uppercase tracking-wider font-bold">Relatório Executivo</span>
          <h1 class="font-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight font-extrabold">Gerar relatório de eficiência energética</h1>
          <p class="font-body-md text-body-md text-on-surface-variant">Informe seus dados profissionais para liberar o dossiê completo, calculado com os parâmetros que você simulou no diagnóstico.</p>
        </header>

        <section class="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 xl:grid-cols-12">
          <div class="xl:col-span-5 bg-primary p-space-lg xl:p-space-xl text-on-primary flex flex-col justify-between gap-space-lg">
            <div class="flex flex-col gap-space-md">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-mono text-label-mono w-max"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">description</span>Relatório Executivo Oficial v2.6</div>
              <h2 class="font-headline-lg text-headline-lg text-on-primary font-bold">Receba o Dossiê de Eficiência e Plano de Capex</h2>
              <p class="font-body-md text-body-md text-primary-fixed-dim">O estudo detalhado inclui curva de amortização mensal, memorial descritivo dos subsistemas avaliados e orientações para submissão à ANEEL e linhas de financiamento verde (ESG Bonds).</p>
              @for (p of dossierItems; track p) {
                <div class="flex items-start gap-space-sm"><span class="material-symbols-outlined text-lit-tertiary text-[20px] shrink-0 mt-0.5" aria-hidden="true">task_alt</span><span class="font-body-sm text-body-sm text-primary-fixed-dim">{{ p }}</span></div>
              }
            </div>
            <div class="rounded-xl bg-primary-container p-space-md flex flex-col gap-space-xs">
              <span class="font-label-mono text-label-mono text-primary-fixed-dim uppercase">Parâmetros considerados</span>
              <div class="grid grid-cols-3 gap-space-sm text-on-primary">
                <div><span class="font-label-mono text-[10px] text-primary-fixed-dim uppercase block">Área</span><span class="font-label-lg text-label-lg font-bold">{{ store.input().areaM2 | number: '1.0-0' }} m²</span></div>
                <div><span class="font-label-mono text-[10px] text-primary-fixed-dim uppercase block">Estações</span><span class="font-label-lg text-label-lg font-bold">{{ store.input().workstations }}</span></div>
                <div><span class="font-label-mono text-[10px] text-primary-fixed-dim uppercase block">Fatura/mês</span><span class="font-label-lg text-label-lg font-bold">{{ store.input().monthlyBill | currency: 'BRL' : 'symbol' : '1.0-0' }}</span></div>
              </div>
            </div>
          </div>

          <div class="xl:col-span-7 p-space-lg xl:p-space-xl flex flex-col justify-center">
            <div class="mb-space-md">
              <h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Dados para Geração e Envio</h2>
              <p class="font-body-sm text-body-sm text-fg-secondary">Insira suas informações profissionais para liberação do acesso e envio da versão PDF assinada digitalmente.</p>
            </div>
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-space-md" novalidate>
              <ecm-identification-form [group]="form.controls.client" prefix="lead" nameLabel="Nome completo" [corporateEmail]="true" [serverError]="serverError()" />
              <div class="flex flex-col gap-1">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" formControlName="terms" class="mt-1 w-5 h-5 rounded accent-fg-primary shrink-0" />
                  <span class="font-body-sm text-body-sm text-fg-secondary">Li e concordo com os <strong class="text-fg-primary">Termos de Uso (v1.0)</strong> e a <strong class="text-fg-primary">Política de Privacidade LGPD</strong>. Autorizo o processamento para fins estritos deste diagnóstico energético.</span>
                </label>
                @if (form.controls.terms.touched && form.controls.terms.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Aceite os termos para continuar.</p> }
              </div>
              <div class="flex flex-col gap-2 pt-space-sm">
                <ecm-loading-button type="submit" label="Gerar relatório" icon="description" loadingLabel="Gerando relatório..." [loading]="submitting()" />
                <div class="flex items-center justify-between text-fg-secondary font-label-mono text-label-mono px-1 flex-wrap gap-1"><span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]" aria-hidden="true">key</span>Idempotency-Key Protegida</span><span>Criptografia TLS 1.3 / 256-bit</span></div>
              </div>
            </form>
          </div>
        </section>
      </div>
    } @else if (error()) {
      @let e = error()!;
      <div class="max-w-[720px] mx-auto px-gutter py-space-xl">
        <ecm-error-card [badge]="'HTTP ' + e.status" [code]="e.traceId ? 'TRACE: ' + e.traceId : e.code" [icon]="e.status === 404 ? 'find_in_page' : 'cloud_off'" [tone]="e.status === 404 ? 'neutral' : 'error'"
          [title]="e.status === 404 ? 'Sessão de diagnóstico não localizada ou expirada' : 'Não foi possível carregar o relatório'"
          [message]="e.status === 404 ? 'O identificador deste laudo expirou ou não existe na base vigente. Nenhum dado financeiro sensível foi comprometido.' : 'Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos.'">
          <ng-container actions>
            <button type="button" (click)="fetchReport()" class="px-space-md h-10 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg hover:bg-secondary-fixed">Tentar novamente</button>
            <a routerLink="/diagnostico" class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>Iniciar Novo Diagnóstico</a>
          </ng-container>
        </ecm-error-card>
      </div>
    } @else {
      <section class="w-full bg-surface-container-lowest shadow-sm" [attr.aria-busy]="!rep()">
        <div class="max-w-[1280px] mx-auto px-gutter py-space-md">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="font-label-mono text-label-mono text-fg-primary font-bold uppercase tracking-wider">Relatório Oficial #{{ id() }}</span>
              <div class="flex flex-wrap items-center gap-x-space-md gap-y-1">
                <h1 class="font-headline-md text-headline-md text-fg-primary">Relatório de Auditoria Energética</h1>
                @if (rep(); as d) { <span class="font-label-lg text-label-lg text-fg-secondary">{{ d.lead.company }}</span> } @else { <span class="sk h-5 w-48"></span> }
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-space-sm shrink-0 no-print">
              <span class="hidden xl:inline-flex items-center gap-1 px-space-sm py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>IPMVP Aprovado</span>
              <span class="hidden xl:inline-flex items-center gap-1 px-space-sm py-1 rounded bg-secondary-container text-on-secondary-container font-label-mono text-label-mono"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">bolt</span>ANEEL 2026</span>
              <button type="button" (click)="print()" [disabled]="!rep()" class="inline-flex items-center gap-space-xs px-space-md h-12 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">picture_as_pdf</span>Salvar como PDF
              </button>
            </div>
          </div>
          <div class="mt-space-md bg-surface-container-low rounded-xl px-space-md py-space-sm flex flex-wrap items-center gap-x-space-lg gap-y-1 text-on-surface-variant font-body-sm text-body-sm min-h-[40px]">
            @if (rep(); as d) {
              <span>Planta Operacional: <strong class="text-on-surface font-semibold">{{ d.input.areaM2 | number: '1.2-2' }} m²</strong></span>
              <span>Tarifa Vigente: <strong class="text-on-surface font-semibold">R$ 0,84 / kWh</strong> (Bandeira Neutra)</span>
              <span>Dados Auditados: <strong class="text-on-surface font-semibold">API Telemetria v1.3</strong></span>
            } @else { <span class="sk h-4 w-44"></span><span class="sk h-4 w-56"></span><span class="sk h-4 w-48"></span> }
          </div>
        </div>
      </section>

      <div class="max-w-[1280px] mx-auto px-gutter py-space-xl flex flex-col gap-space-xl w-full">
        <!-- KPIs -->
        <section class="flex flex-col gap-space-md" aria-labelledby="kpi-h" [attr.aria-busy]="!rep()">
          <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Painel Executivo</span>
            <h2 id="kpi-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Indicadores de Desempenho e Impacto Financeiro</h2></div>
          @if (rep(); as d) {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
              <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>
                <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Redução Projetada</span>
                <div><span class="font-metric-numeral text-metric-numeral text-fg-primary">{{ d.result.reductionPct | number: '1.2-2' }}%</span>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Eficiência agregada sem perda de vazão produtiva</p></div>
              </div>
              <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Economia Anual</span>
                <div><span class="font-metric-numeral text-[30px] leading-[44px] font-extrabold tracking-tight text-fg-primary">{{ d.result.annualSavings | currency: 'BRL' }}</span>
                  <p class="font-body-sm text-body-sm text-fg-secondary mt-1">Impacto direto no Ebitda: <strong class="text-fg-primary font-semibold">{{ d.result.monthlySavings | currency: 'BRL' }}/mês</strong></p></div>
              </div>
              <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-secondary-fixed-dim"></div>
                <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Payback Estimado</span>
                <div><span class="font-metric-numeral text-metric-numeral text-fg-primary">{{ d.result.paybackMonths | number: '1.1-1' }}</span> <span class="font-headline-md text-headline-md text-fg-secondary">meses</span>
                  <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Ponto de equilíbrio no mês {{ d.result.paybackMonths | number: '1.0-0' }}</p></div>
              </div>
              <div class="bg-tertiary-fixed/30 p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
                <div class="absolute top-0 left-0 w-1.5 h-full bg-tertiary-container"></div>
                <span class="font-label-md text-label-md text-fg-tertiary font-bold uppercase tracking-wider">Descarbonização</span>
                <div><span class="font-metric-numeral text-metric-numeral text-fg-tertiary">{{ d.result.co2Tons | number: '1.2-2' }}</span> <span class="font-label-lg text-label-lg text-on-tertiary-fixed-variant font-semibold">tCO2e/ano</span>
                  <p class="font-body-sm text-body-sm text-on-tertiary-fixed-variant mt-1">Equivalente ao plantio de <strong>{{ d.result.trees }} árvores nativas</strong></p></div>
              </div>
            </div>
            <div class="bg-surface-container-low rounded-2xl p-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
              <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">Cenário Base (Sem Gestão)</span>
                <div class="font-metric-numeral-sm text-metric-numeral-sm text-on-surface mt-1">{{ d.result.annualCost | currency: 'BRL' }}</div>
                <span class="font-body-sm text-body-sm text-on-surface-variant">Consumo contínuo de {{ d.kwhBase | number: '1.0-0' }} kWh/mês</span></div>
              <div><span class="font-label-mono text-label-mono text-fg-tertiary font-bold uppercase tracking-wider">Com EcoMetric Intelligence</span>
                <div class="font-metric-numeral-sm text-metric-numeral-sm text-fg-primary mt-1">{{ d.result.optimizedCost | currency: 'BRL' }}</div>
                <span class="font-body-sm text-body-sm text-fg-secondary">Novo patamar auditado: {{ d.kwhOptimized | number: '1.0-0' }} kWh/mês</span></div>
              <div class="bg-surface-container-lowest p-space-md rounded-xl flex flex-col justify-center"><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Margem Operacional Resgatada</span>
                <div class="flex items-center gap-2 mt-1"><span class="material-symbols-outlined text-fg-tertiary text-[24px]" aria-hidden="true">savings</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">+ {{ d.result.annualSavings | currency: 'BRL' }} /ano</span></div></div>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md" role="status" aria-label="Carregando indicadores">
              @for (n of [1,2,3,4]; track n) {
                <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md min-h-[168px]">
                  <div class="sk h-3 w-28"></div><div class="flex flex-col gap-2"><div class="sk h-9 w-40"></div><div class="sk h-3 w-full"></div></div>
                </div>
              }
            </div>
            <div class="bg-surface-container-low rounded-2xl p-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
              @for (n of [1,2,3]; track n) { <div class="flex flex-col gap-2"><div class="sk h-3 w-40"></div><div class="sk h-[30px] w-48"></div><div class="sk h-3 w-44"></div></div> }
            </div>
          }
        </section>

        <!-- SUBSISTEMAS -->
        <section class="flex flex-col gap-space-lg" aria-labelledby="sub-h" [attr.aria-busy]="!rep()">
          <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Desagregação Técnica</span>
            <h2 id="sub-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Oportunidades Mapeadas por Subsistema Operacional</h2></div>
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-space-lg">
            @if (rep(); as d) {
              @for (s of d.subsystems; track s.key) {
                <article class="bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow">
                  <div class="p-space-lg flex flex-col gap-space-md">
                    <div class="flex items-start justify-between gap-space-sm">
                      <div class="flex items-center gap-space-sm">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [class]="s.iconBox"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{ s.icon }}</span></div>
                        <div><h3 class="font-headline-sm text-headline-sm text-fg-primary">{{ s.title }}</h3><span class="font-label-mono text-label-mono text-fg-secondary">{{ s.subtitle }}</span></div>
                      </div>
                      <span class="px-space-sm py-1 rounded font-label-mono text-label-mono shrink-0" [class]="s.chip">{{ s.sharePct | number: '1.0-0' }}% do Total</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <div class="flex justify-between font-label-mono text-label-mono text-on-surface-variant gap-2"><span>Consumo Mensal: <strong>{{ s.kwhMonth | number: '1.0-0' }} kWh</strong></span><span class="font-bold" [class]="s.accent">Redução Potencial: {{ s.reductionPct }}%</span></div>
                      <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="h-full rounded-full" [class]="s.bar" [style.width.%]="s.reductionPct"></div></div>
                    </div>
                    <div class="bg-surface-container-low p-space-md rounded-xl"><span class="font-label-mono text-label-mono text-fg-primary font-bold uppercase">Memorial Diagnóstico:</span><p class="font-body-sm text-body-sm text-on-surface-variant mt-1">{{ s.memo }}</p></div>
                  </div>
                  <div class="bg-surface-container/60 p-space-lg flex items-center justify-between">
                    <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase">Economia Mensal</span><div class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ s.savingsMonth | currency: 'BRL' }}</div></div>
                    <div class="text-right"><span class="font-label-mono text-label-mono text-fg-secondary uppercase">Anual</span><div class="font-label-lg text-label-lg text-on-surface font-semibold">{{ s.savingsYear | currency: 'BRL' }}</div></div>
                  </div>
                </article>
              }
            } @else {
              @for (n of [1,2,3]; track n) {
                <article class="bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden" role="status" aria-label="Carregando subsistema">
                  <div class="p-space-lg flex flex-col gap-space-md">
                    <div class="flex items-center gap-space-sm"><div class="sk w-10 h-10 rounded-xl"></div><div class="flex flex-col gap-2"><div class="sk h-4 w-36"></div><div class="sk h-3 w-24"></div></div></div>
                    <div class="flex flex-col gap-2"><div class="sk h-3 w-full"></div><div class="sk h-2 w-full rounded-full"></div></div>
                    <div class="sk h-28 w-full rounded-xl"></div>
                  </div>
                  <div class="bg-surface-container/60 p-space-lg flex items-center justify-between"><div class="sk h-9 w-28"></div><div class="sk h-9 w-24"></div></div>
                </article>
              }
            }
          </div>
        </section>

        <!-- AMORTIZAÇÃO -->
        <section class="bg-surface-container-lowest rounded-3xl p-space-lg lg:p-space-xl shadow-sm" aria-labelledby="amort-h" [attr.aria-busy]="!rep()">
          <div class="flex flex-col xl:flex-row justify-between xl:items-center gap-space-md pb-space-lg">
            <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Engenharia Econômica</span>
              <h2 id="amort-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Curva de Amortização &amp; Ponto de Equilíbrio</h2>
              <p class="font-body-md text-body-md text-on-surface-variant mt-1">Projeção do fluxo de caixa acumulado em 24 meses</p></div>
            <div class="flex flex-wrap items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded-xl min-h-[68px]">
              @if (rep(); as d) {
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Capex Total</span><div class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ d.result.capex | currency: 'BRL' }}</div></div>
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">TIR Projetada</span><div class="font-headline-sm text-headline-sm text-fg-tertiary font-bold">{{ d.tirAnnualPct | number: '1.0-0' }}% a.a.</div></div>
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Saldo em 24m</span><div class="font-headline-sm text-headline-sm text-fg-primary font-bold">+ {{ d.balance24m | currency: 'BRL' }}</div></div>
              } @else { @for (n of [1,2,3]; track n) { <div class="flex flex-col gap-2"><div class="sk h-3 w-20"></div><div class="sk h-7 w-28"></div></div> } }
            </div>
          </div>
          @if (rep(); as d) {
            <figure class="relative w-full rounded-2xl p-space-md mb-space-lg">
              <figcaption class="flex items-center justify-between mb-space-md text-on-surface-variant font-label-mono text-label-mono flex-wrap gap-2">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-primary-container inline-block"></span>Fluxo Acumulado Líquido</span>
                <span class="flex items-center gap-2 text-fg-tertiary font-bold"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">flag</span>Break-Even: Mês {{ d.result.paybackMonths | number: '1.0-0' }}</span>
              </figcaption>
              <div class="w-full h-64 relative">
                <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 240" role="img" [attr.aria-label]="'Curva de amortização: equilíbrio no mês ' + (d.result.paybackMonths | number: '1.0-0')">
                  <line x1="0" x2="1000" y1="140" y2="140" class="stroke-outline-variant" stroke-dasharray="4 4" stroke-width="1.5" />
                  <line [attr.x1]="bx()" [attr.x2]="bx()" y1="20" y2="220" class="stroke-fg-tertiary" stroke-opacity=".5" stroke-dasharray="2 2" stroke-width="1.5" />
                  <defs><linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color: rgb(var(--c-fg-primary))" stop-opacity=".25" /><stop offset="1" style="stop-color: rgb(var(--c-fg-primary))" stop-opacity="0" /></linearGradient></defs>
                  <path [attr.d]="curve() + ' L 1000 220 L 0 220 Z'" fill="url(#chartGradient)" opacity=".6" />
                  <path [attr.d]="curve()" fill="none" class="stroke-fg-primary" stroke-linecap="round" stroke-width="3.5" />
                  <circle cx="0" cy="210" r="5" class="fill-fg-primary" />
                  <circle [attr.cx]="bx()" cy="140" r="8" class="fill-fg-tertiary stroke-surface-container-lowest" stroke-width="2" />
                  <circle cx="1000" cy="30" r="6" class="fill-fg-primary stroke-surface-container-lowest" stroke-width="2" />
                </svg>
                <div class="absolute left-0 bottom-2 bg-surface-container px-2 py-1 rounded text-on-surface font-label-mono text-label-mono">Mês 0: -{{ d.result.capex | currency: 'BRL' }}</div>
                <div class="absolute top-[45%] bg-tertiary text-on-tertiary px-2.5 py-1 rounded-md font-label-mono text-label-mono shadow-sm" [style.left.%]="Math.min(bx() / 10 + 2, 62)">Mês {{ d.result.paybackMonths | number: '1.0-0' }}: Break-Even</div>
                <div class="absolute right-0 top-2 bg-primary text-on-primary px-2.5 py-1 rounded font-label-mono text-label-mono">Mês 24: +{{ d.balance24m | currency: 'BRL' }}</div>
              </div>
            </figure>
          } @else {
            <div class="w-full rounded-2xl p-space-md mb-space-lg" role="status" aria-label="Carregando curva de amortização">
              <div class="flex items-center justify-between mb-space-md"><div class="sk h-3 w-40"></div><div class="sk h-3 w-32"></div></div>
              <div class="sk w-full h-64 rounded-xl"></div>
            </div>
          }
          <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div class="bg-surface-container-low p-space-md rounded-2xl flex items-start gap-space-sm"><div class="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">eco</span></div>
              <div><h3 class="font-headline-sm text-headline-sm text-fg-primary">Enquadramento BNDES Finame Verde</h3><p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Este projeto atende aos requisitos de taxa subsidiada com carência de até 12 meses, permitindo que as parcelas sejam amortizadas pela própria economia mensal gerada.</p></div></div>
            <div class="bg-surface-container-low p-space-md rounded-2xl flex items-start gap-space-sm"><div class="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">verified_user</span></div>
              <div><h3 class="font-headline-sm text-headline-sm text-fg-primary">Garantia de Performance (Performance Bond)</h3><p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Em caso de desvio superior a 5% da meta de redução de kWh, a diferença de custo operacional é coberta pela apólice de desempenho segurada.</p></div></div>
          </div>
        </section>

        <!-- RESPONSÁVEL TÉCNICO -->
        <section class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-center bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm">
          <div class="xl:col-span-4 flex items-center gap-space-md">
            <div class="w-20 h-20 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center font-headline-md text-headline-md shrink-0" aria-hidden="true">MF</div>
            <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase">Responsável Técnico</span><h3 class="font-headline-sm text-headline-sm text-fg-primary">Eng. Marcelo Fontes</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">CREA/SP 506.128 - Certificação CEM®</p>
              <div class="flex items-center gap-1 text-fg-tertiary font-label-mono text-label-mono mt-1"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">shield_person</span>Auditor Sênior Credenciado</div></div>
          </div>
          <blockquote class="xl:col-span-8 bg-surface-container-low p-space-md rounded-2xl min-h-[96px]"><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Parecer Preliminar da Engenharia:</span>
            @if (rep(); as d) {
              <p class="font-body-md text-body-md text-on-surface-variant mt-1">“A curva de carga da planta da {{ d.lead.company }} apresenta oscilações severas no horário de ponta associadas ao arrefecimento central. A substituição proposta combinada ao Daylighting na nave de produção viabiliza retorno atrativo, classificando o projeto como de prioridade máxima de implantação imediata.”</p>
            } @else { <div class="flex flex-col gap-2 mt-2" role="status" aria-label="Carregando parecer"><div class="sk h-4 w-full"></div><div class="sk h-4 w-full"></div><div class="sk h-4 w-3/4"></div></div> }
          </blockquote>
        </section>

        <!-- CTA -->
        <section class="bg-primary-container text-on-primary rounded-3xl p-space-lg lg:p-space-xl shadow-xl no-print">
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-xl">
            <div class="max-w-2xl flex flex-col gap-space-sm">
              <div class="inline-flex items-center gap-2 px-space-sm py-1 rounded bg-secondary/30 text-lit-secondary font-label-mono text-label-mono w-max"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>Validação Técnica Sem Compromisso</div>
              <h2 class="font-display-mobile text-display-mobile xl:font-display xl:text-display tracking-tight">Pronto para validar o memorial técnico com um engenheiro sênior?</h2>
              <p class="font-body-lg text-body-lg text-on-primary-container">Apresentamos o plano detalhado de capex, cronograma executivo de intervenção sem parada fabril e memorial de engenharia em uma sessão técnica de 30 minutos.</p>
            </div>
            <div class="shrink-0 flex flex-col sm:flex-row xl:flex-col gap-space-sm">
              <a [routerLink]="['/agendamento', id()]" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-14 rounded-xl bg-lit-tertiary hover:bg-lit-tertiary-dim text-lit-on-tertiary font-headline-sm text-headline-sm font-bold shadow-md">Agendar Diagnóstico com Especialista<span class="material-symbols-outlined text-[22px]" aria-hidden="true">arrow_forward</span></a>
              <a [href]="whatsapp()" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-12 rounded-xl hover:bg-white/10 text-on-primary font-label-lg text-label-lg border border-on-primary/20"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>Tirar dúvidas pelo WhatsApp Corporativo</a>
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class RelatorioPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly store = inject(JourneyStore);
  readonly Math = Math;

  /** Vazio = etapa do formulário; preenchido = relatório (com skeleton enquanto carrega). */
  readonly id = signal('');
  readonly rep = signal<Report | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly bx = computed(() => ((this.rep()?.result.paybackMonths ?? 10) / 24) * 1000);
  readonly curve = computed(() => `M 0 210 Q 200 180 ${this.bx()} 140 T 1000 30`);
  readonly whatsapp = computed(() => whatsappUrl('Olá, gostaria de tirar dúvidas sobre o Relatório EcoMetric ' + this.id()));

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  private leadKey = uuid();

  readonly dossierItems = [
    'Diagnóstico desagregado: HVAC, iluminação e automação predial.',
    'Tabela de amortização de Capex e TIR (Taxa Interna de Retorno).',
    'Certificação de emissões evitadas para balanço anual ESG.',
  ];

  private readonly fb = inject(FormBuilder).nonNullable;
  /** Identificação do cliente (compartilhada com o agendamento) + aceite dos termos. */
  readonly form = this.fb.group({
    client: buildIdentificationGroup(this.fb, { corporateEmail: true, initial: this.store.client() ?? {} }),
    terms: [false, Validators.requiredTrue],
  });
  private readonly identification = viewChild(IdentificationFormComponent);

  constructor() {
    this.form.controls.client.controls.email.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.serverError.set(null));
  }

  /** Se já existe um relatório em memória (ex.: voltou do agendamento), exibe direto; senão mostra o formulário. */
  ngOnInit() {
    const cached = this.store.report();
    if (cached) { this.id.set(cached.id); this.rep.set(cached); }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.identification()?.focusFirstInvalid();
      this.toast.show('Revise o formulário', 'Preencha todos os campos e use um e-mail corporativo.', 'error');
      return;
    }
    const lead = this.form.controls.client.getRawValue();
    this.submitting.set(true);
    this.api.createLead(lead, this.store.input(), this.leadKey).subscribe({
      next: ({ id }) => {
        this.submitting.set(false);
        this.store.lead.set({ ...lead, id });
        this.store.client.set(lead);
        this.id.set(id);
        this.toast.show('Relatório gerado', 'O dossiê também foi enviado para o seu e-mail corporativo.');
        this.fetchReport();
      },
      error: (e: ApiError) => {
        this.submitting.set(false);
        if (e.status === 400) { this.leadKey = uuid(); this.serverError.set('Informe o e-mail corporativo da sua empresa para emitir o laudo.'); this.identification()?.focusField('email'); }
      },
    });
  }

  /** Consulta o relatório recém-gerado; as seções mostram skeleton até a resposta. */
  fetchReport() {
    this.error.set(null);
    this.rep.set(null);
    this.api.getReport(this.id()).subscribe({
      next: (r) => { this.store.setReport(r); this.rep.set(r); },
      error: (e: ApiError) => this.error.set(e),
    });
  }
  print() { window.print(); }
}
