import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TERMS_VERSION } from '../core/config';
import { dateTimeOf } from '../core/datetime';
import { FriendlyError, friendly } from '../core/errors';
import { ApiError, LeadRequest } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { ReportSection, parseReportText } from '../core/report-text';
import { shortId, uuid, whatsappUrl } from '../core/utils';
import { IdentificationFormComponent, buildIdentificationGroup } from '../shared/identification-form.component';
import { LoadingButtonComponent } from '../shared/loading-button.component';
import { LegalModalComponent } from '../shared/legal-modal.component';
import { LegalDocKind } from '../core/legal-texts';

@Component({
  selector: 'ecm-relatorio',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe, LoadingButtonComponent, IdentificationFormComponent, LegalModalComponent],
  template: `
    @if (!report()) {
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
                <div><span class="font-label-mono text-[10px] text-primary-fixed-dim uppercase block">Fatura/mês</span><span class="font-label-lg text-label-lg font-bold">{{ store.input().monthlyEnergyBill | currency: 'BRL' : 'symbol' : '1.0-0' }}</span></div>
              </div>
            </div>
          </div>

          <div class="xl:col-span-7 p-space-lg xl:p-space-xl flex flex-col justify-center">
            <div class="mb-space-md">
              <h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Dados para Geração e Envio</h2>
              <p class="font-body-sm text-body-sm text-fg-secondary">Insira suas informações profissionais para liberação do acesso e envio da versão PDF assinada digitalmente.</p>
            </div>
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-space-md" novalidate>
              <ecm-identification-form [group]="form.controls.client" prefix="lead" nameLabel="Nome completo" [serverError]="serverError()" />
              <div class="flex flex-col gap-1">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" formControlName="terms" class="w-5 h-5 rounded accent-fg-primary shrink-0" />
                  <span class="font-body-sm text-body-sm text-fg-secondary">Li e concordo com os <button type="button" (click)="openLegal($event, 'terms')" class="font-bold text-fg-primary underline underline-offset-2 hover:opacity-80">Termos de Uso</button> e <button type="button" (click)="openLegal($event, 'privacy')" class="font-bold text-fg-primary underline underline-offset-2 hover:opacity-80">Política de Privacidade</button>.</span>
                </label>
                @if (form.controls.terms.touched && form.controls.terms.invalid) { <p class="font-body-sm text-body-sm text-fg-error" role="alert">Aceite os termos para continuar.</p> }
              </div>
              <ecm-legal-modal [kind]="legalDoc()" (closed)="legalDoc.set(null)" />
              @if (submitError(); as se) {
                <div class="p-space-sm rounded-lg bg-error-container text-on-error-container flex items-start gap-space-sm" role="alert">
                  <span class="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
                  <div class="flex-1">
                    <p class="font-label-lg text-label-lg font-bold">{{ se.title }}</p>
                    <p class="font-body-sm text-body-sm">{{ se.message }}</p>
                    @if (se.details) { <ul class="list-disc pl-5 font-body-sm text-body-sm">@for (d of se.details; track d) { <li>{{ d }}</li> }</ul> }
                    @if (duplicate()) { <a routerLink="/contato" class="inline-block mt-1 font-label-md text-label-md font-bold underline">Falar com a nossa equipe</a> }
                  </div>
                </div>
              }
              <div class="flex flex-col gap-2 pt-space-sm">
                <ecm-loading-button type="submit" label="Gerar relatório" icon="description" loadingLabel="Gerando relatório..." [loading]="submitting()" />
                <p class="font-label-mono text-label-mono text-fg-secondary px-1 flex items-center gap-1"><span class="material-symbols-outlined text-[13px]" aria-hidden="true">shield</span>Seus dados são usados apenas para gerar o diagnóstico, conforme a LGPD.</p>
              </div>
            </form>
          </div>
        </section>
      </div>
    } @else {
      @let d = report()!.diagnostic;
      <section class="w-full bg-surface-container-lowest shadow-sm">
        <div class="max-w-[1280px] mx-auto px-gutter py-space-md">
          <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="font-label-mono text-label-mono text-fg-primary font-bold uppercase tracking-wider">Relatório Oficial #{{ shortId() }}</span>
              <div class="flex flex-wrap items-center gap-x-space-md gap-y-1">
                <h1 class="font-headline-md text-headline-md text-fg-primary">Relatório de Auditoria Energética</h1>
                <span class="font-label-lg text-label-lg text-fg-secondary">{{ report()!.companyName }}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-space-sm shrink-0 no-print">
              <button type="button" (click)="print()" class="inline-flex items-center gap-space-xs px-space-md h-12 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm">
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">picture_as_pdf</span>Salvar como PDF
              </button>
            </div>
          </div>
          <div class="mt-space-md bg-surface-container-low rounded-xl px-space-md py-space-sm flex flex-wrap items-center gap-x-space-lg gap-y-1 text-on-surface-variant font-body-sm text-body-sm">
            <span>Planta operacional: <strong class="text-on-surface font-semibold">{{ d.areaM2 | number: '1.2-2' }} m²</strong></span>
            <span>Estações de trabalho: <strong class="text-on-surface font-semibold">{{ d.workstations }}</strong></span>
            <span>Fatura mensal informada: <strong class="text-on-surface font-semibold">{{ d.monthlyEnergyBill | currency: 'BRL' }}</strong></span>
            @if (d.calculatedAt) { <span>Calculado em: <strong class="text-on-surface font-semibold">{{ dateTime(d.calculatedAt) }}</strong></span> }
          </div>
        </div>
      </section>

      <div class="max-w-[1280px] mx-auto px-gutter py-space-xl flex flex-col gap-space-xl w-full">
        <section class="flex flex-col gap-space-md" aria-labelledby="kpi-h">
          <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Painel Executivo</span>
            <h2 id="kpi-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Indicadores de Desempenho e Impacto Financeiro</h2></div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
            <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
              <div class="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>
              <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Redução Projetada</span>
              <div><span class="font-metric-numeral text-metric-numeral text-fg-primary">{{ d.consumptionReductionPct | number: '1.2-2' }}%</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Redução estimada no consumo de energia</p></div>
            </div>
            <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
              <div class="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
              <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Economia Anual</span>
              <div><span class="font-metric-numeral text-[30px] leading-[44px] font-extrabold tracking-tight text-fg-primary">{{ d.annualSavings | currency: 'BRL' }}</span>
                <p class="font-body-sm text-body-sm text-fg-secondary mt-1">Equivale a <strong class="text-fg-primary font-semibold">{{ monthly() | currency: 'BRL' }}/mês</strong></p></div>
            </div>
            <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
              <div class="absolute top-0 left-0 w-1.5 h-full bg-secondary-fixed-dim"></div>
              <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Payback Estimado</span>
              <div><span class="font-metric-numeral text-metric-numeral text-fg-primary">{{ d.paybackMonths | number: '1.1-1' }}</span> <span class="font-headline-md text-headline-md text-fg-secondary">meses</span>
                <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Tempo estimado para recuperar o investimento</p></div>
            </div>
            <div class="bg-tertiary-fixed/30 p-space-lg rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between gap-space-md min-h-[168px]">
              <div class="absolute top-0 left-0 w-1.5 h-full bg-tertiary-container"></div>
              <span class="font-label-md text-label-md text-fg-tertiary font-bold uppercase tracking-wider">Descarbonização</span>
              <div><span class="font-metric-numeral text-metric-numeral text-fg-tertiary">{{ d.co2ReductionTons | number: '1.2-2' }}</span> <span class="font-label-lg text-label-lg text-on-tertiary-fixed-variant font-semibold">tCO₂e/ano</span>
                <p class="font-body-sm text-body-sm text-on-tertiary-fixed-variant mt-1">Emissões evitadas por ano</p></div>
            </div>
          </div>
          <div class="bg-surface-container-low rounded-2xl p-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
            <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">Custo anual atual</span>
              <div class="font-metric-numeral-sm text-metric-numeral-sm text-on-surface mt-1">{{ annualCost() | currency: 'BRL' }}</div>
              <span class="font-body-sm text-body-sm text-on-surface-variant">12 × a fatura mensal informada</span></div>
            <div><span class="font-label-mono text-label-mono text-fg-tertiary font-bold uppercase tracking-wider">Custo anual com a solução</span>
              <div class="font-metric-numeral-sm text-metric-numeral-sm text-fg-primary mt-1">{{ optimizedCost() | currency: 'BRL' }}</div>
              <span class="font-body-sm text-body-sm text-fg-secondary">Após a redução estimada</span></div>
            <div class="bg-surface-container-lowest p-space-md rounded-xl flex flex-col justify-center"><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Economia anual estimada</span>
              <div class="flex items-center gap-2 mt-1"><span class="material-symbols-outlined text-fg-tertiary text-[24px]" aria-hidden="true">savings</span><span class="font-headline-sm text-headline-sm text-fg-primary font-bold">+ {{ d.annualSavings | currency: 'BRL' }}</span></div></div>
          </div>
        </section>

        <section class="bg-surface-container-lowest rounded-3xl p-space-lg xl:p-space-xl shadow-sm" aria-labelledby="amort-h">
          <div class="flex flex-col xl:flex-row justify-between xl:items-center gap-space-md pb-space-lg">
            <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Retorno do investimento</span>
              <h2 id="amort-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Curva de Amortização</h2>
              <p class="font-body-md text-body-md text-on-surface-variant mt-1">Fluxo de caixa acumulado, calculado a partir da economia mensal e do payback estimados.</p></div>
            @if (chart(); as c) {
              <div class="flex flex-wrap items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded-xl">
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Investimento implícito</span><div class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ c.invest | currency: 'BRL' }}</div></div>
                <div><span class="font-label-mono text-label-mono text-on-surface-variant uppercase">Saldo em {{ c.horizon }} meses</span><div class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ c.end | currency: 'BRL' }}</div></div>
              </div>
            }
          </div>
          @if (chart(); as c) {
            <figure class="relative w-full rounded-2xl p-space-md">
              <figcaption class="flex items-center justify-between mb-space-md text-on-surface-variant font-label-mono text-label-mono flex-wrap gap-2">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-primary-container inline-block"></span>Fluxo acumulado líquido</span>
                <span class="flex items-center gap-2 text-fg-tertiary font-bold"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">flag</span>Equilíbrio em {{ d.paybackMonths | number: '1.1-1' }} meses</span>
              </figcaption>
              <div class="w-full h-64 relative">
                <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 240" role="img" [attr.aria-label]="'Curva de amortização: equilíbrio em ' + (d.paybackMonths | number: '1.1-1') + ' meses'">
                  <line x1="0" x2="1000" [attr.y1]="c.zeroY" [attr.y2]="c.zeroY" class="stroke-outline-variant" stroke-dasharray="4 4" stroke-width="1.5" />
                  <line [attr.x1]="c.breakX" [attr.x2]="c.breakX" y1="20" y2="220" class="stroke-fg-tertiary" stroke-opacity=".5" stroke-dasharray="2 2" stroke-width="1.5" />
                  <path [attr.d]="c.path" fill="none" class="stroke-fg-primary" stroke-linecap="round" stroke-width="3.5" />
                  <circle cx="0" [attr.cy]="c.startY" r="5" class="fill-fg-primary" />
                  <circle [attr.cx]="c.breakX" [attr.cy]="c.zeroY" r="8" class="fill-fg-tertiary stroke-surface-container-lowest" stroke-width="2" />
                  <circle cx="1000" [attr.cy]="c.endY" r="6" class="fill-fg-primary stroke-surface-container-lowest" stroke-width="2" />
                </svg>
              </div>
              <div class="flex justify-between text-on-surface-variant font-label-mono text-label-mono mt-2"><span>Mês 0: {{ -c.invest | currency: 'BRL' }}</span><span>Mês {{ c.horizon }}: {{ c.end | currency: 'BRL' }}</span></div>
            </figure>
          } @else {
            <p class="p-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface-variant">Para os parâmetros informados não há economia estimada, então não há curva de amortização para exibir.</p>
          }
        </section>

        <section class="bg-surface-container-lowest rounded-3xl p-space-lg xl:p-space-xl shadow-sm flex flex-col gap-space-lg no-print" aria-labelledby="full-h" [attr.aria-busy]="full().status === 'loading'">
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
            <div><span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Dossiê técnico</span>
              <h2 id="full-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Relatório Completo</h2>
              <p class="font-body-md text-body-md text-on-surface-variant mt-1">Versão detalhada emitida pela plataforma, com os dados informados e os resultados estimados do seu diagnóstico.</p></div>
            <div class="flex flex-wrap items-center gap-space-sm shrink-0">
              @if (full().status === 'ready' && full().text) {
                <button type="button" (click)="copyFull()" class="inline-flex items-center justify-center gap-space-xs px-space-md h-12 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high">
                  <span class="material-symbols-outlined text-[18px] text-fg-primary" aria-hidden="true">content_copy</span>Copiar texto
                </button>
              }
              <button type="button" (click)="loadFull()" [disabled]="full().status === 'loading'" class="inline-flex items-center justify-center gap-space-xs px-space-md h-12 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm disabled:opacity-60">
                <span class="material-symbols-outlined text-[18px]" [class.animate-spin]="full().status === 'loading'" aria-hidden="true">{{ full().status === 'loading' ? 'sync' : full().status === 'ready' ? 'refresh' : 'article' }}</span>{{ full().status === 'ready' ? 'Atualizar' : 'Ver relatório completo' }}
              </button>
            </div>
          </div>

          @switch (full().status) {
            @case ('idle') {
              <div class="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-space-lg flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
                <span class="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[24px]" aria-hidden="true">description</span></span>
                <div class="flex flex-col gap-1">
                  <p class="font-label-lg text-label-lg text-fg-primary font-semibold">Seu dossiê está pronto para consulta</p>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Reúne protocolo, dados da empresa, parâmetros informados e todos os indicadores calculados em um só lugar.</p>
                </div>
              </div>
            }
            @case ('loading') {
              <div class="flex flex-col gap-space-md" role="status" aria-label="Carregando relatório completo">
                <div class="sk h-16 w-full rounded-2xl"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md"><div class="sk h-40 rounded-2xl"></div><div class="sk h-40 rounded-2xl"></div></div>
                <div class="grid grid-cols-2 xl:grid-cols-5 gap-space-md">@for (n of [1, 2, 3, 4, 5]; track n) { <div class="sk h-24 rounded-xl"></div> }</div>
              </div>
            }
            @case ('error') {
              <div class="p-space-md rounded-xl bg-error-container text-on-error-container flex items-start gap-space-sm" role="alert">
                <span class="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">cloud_off</span>
                <div class="flex-1"><p class="font-label-lg text-label-lg font-bold">{{ fullError()?.title }}</p><p class="font-body-sm text-body-sm">{{ fullError()?.message }}</p></div>
              </div>
            }
            @case ('ready') {
              @if (fullLink(); as link) {
                <a [href]="link" target="_blank" rel="noopener noreferrer" class="inline-flex w-max items-center gap-2 px-space-md h-12 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>Abrir relatório</a>
              } @else if (parsedFull()) {
                @let r = parsedFull()!;
                <article class="flex flex-col gap-space-md" aria-label="Relatório completo">
                  <header class="relative overflow-hidden rounded-2xl bg-surface-container-low p-space-md md:p-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>
                    <div class="flex items-start gap-space-sm min-w-0">
                      <span class="material-symbols-outlined text-[28px] text-fg-primary shrink-0" aria-hidden="true">verified</span>
                      <h3 class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ r.title }}</h3>
                    </div>
                    @if (r.meta.length) {
                      <dl class="flex flex-wrap gap-x-space-lg gap-y-space-xs shrink-0">
                        @for (m of r.meta; track m.label) {
                          <div class="flex flex-col min-w-0"><dt class="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">{{ m.label }}</dt>
                            <dd class="font-label-lg text-label-lg text-on-surface font-semibold break-all">{{ m.value }}</dd></div>
                        }
                      </dl>
                    }
                  </header>

                  @let info = infoSections(r.sections);
                  @if (info.length) {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      @for (sec of info; track sec.key) {
                        <section class="rounded-2xl bg-surface-container-low p-space-md md:p-space-lg flex flex-col gap-space-sm" [attr.aria-label]="sec.title">
                          <h4 class="flex items-center gap-2 font-label-mono text-label-mono text-fg-secondary font-bold uppercase tracking-widest">
                            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ sectionIcon(sec.key) }}</span>{{ sec.title }}</h4>
                          <dl class="flex flex-col divide-y divide-outline-variant/40">
                            @for (row of sec.rows; track row.label) {
                              <div class="py-space-xs flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-space-md gap-y-0.5">
                                <dt class="font-body-sm text-body-sm text-on-surface-variant shrink-0">{{ row.label }}</dt>
                                <dd class="font-label-lg text-label-lg text-on-surface font-semibold sm:text-right break-words">{{ row.value }}</dd>
                              </div>
                            }
                          </dl>
                        </section>
                      }
                    </div>
                  }

                  @for (sec of resultSections(r.sections); track sec.key) {
                    <section class="flex flex-col gap-space-sm" [attr.aria-label]="sec.title">
                      <h4 class="flex items-center gap-2 font-label-mono text-label-mono text-fg-secondary font-bold uppercase tracking-widest">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ sectionIcon(sec.key) }}</span>{{ sec.title }}</h4>
                      <dl class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-space-md">
                        @for (row of sec.rows; track row.label; let i = $index) {
                          <div class="relative overflow-hidden rounded-xl p-space-md flex flex-col justify-between gap-space-sm min-h-[112px]"
                            [class]="isCarbon(row.label) ? 'bg-tertiary-fixed/30' : 'bg-surface-container-low'">
                            <div class="absolute top-0 left-0 w-1.5 h-full" [class]="isCarbon(row.label) ? 'bg-tertiary-container' : accent(i)"></div>
                            <dt class="font-label-md text-label-md uppercase tracking-wider" [class]="isCarbon(row.label) ? 'text-fg-tertiary font-bold' : 'text-on-surface-variant'">{{ row.label }}</dt>
                            <dd class="font-headline-sm text-headline-sm font-bold break-words" [class]="isCarbon(row.label) ? 'text-fg-tertiary' : 'text-fg-primary'">{{ row.value }}</dd>
                          </div>
                        }
                      </dl>
                    </section>
                  }

                  @for (note of r.notes; track $index) {
                    <p class="flex items-start gap-space-sm p-space-md rounded-xl bg-secondary-container/40 text-on-surface-variant font-body-sm text-body-sm">
                      <span class="material-symbols-outlined text-[20px] text-fg-secondary shrink-0" aria-hidden="true">info</span>{{ note }}</p>
                  }
                </article>
              } @else {
                <pre class="whitespace-pre-wrap break-words font-body-sm text-body-sm text-on-surface bg-surface-container-low rounded-xl p-space-md max-h-[28rem] overflow-auto">{{ full().text }}</pre>
              }
            }
          }
        </section>

        <section class="bg-primary-container text-on-primary rounded-3xl p-space-lg xl:p-space-xl shadow-xl no-print">
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-space-xl">
            <div class="max-w-2xl flex flex-col gap-space-sm">
              <div class="inline-flex items-center gap-2 px-space-sm py-1 rounded bg-secondary/30 text-lit-secondary font-label-mono text-label-mono w-max"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>Próximo passo</div>
              <h2 class="font-display-mobile text-display-mobile xl:font-display xl:text-display tracking-tight">Valide este diagnóstico com a nossa equipe técnica</h2>
              <p class="font-body-lg text-body-lg text-on-primary-container">Agende uma sessão para detalhar o investimento, o cronograma de implantação e o retorno esperado para a sua empresa.</p>
            </div>
            <div class="shrink-0 flex flex-col sm:flex-row xl:flex-col gap-space-sm">
              <a routerLink="/agendamento" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-14 rounded-xl bg-lit-tertiary hover:bg-lit-tertiary-dim text-lit-on-tertiary font-headline-sm text-headline-sm font-bold shadow-md">Agendar reunião<span class="material-symbols-outlined text-[22px]" aria-hidden="true">arrow_forward</span></a>
              <a [href]="whatsapp()" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-12 rounded-xl hover:bg-white/10 text-on-primary font-label-lg text-label-lg border border-on-primary/20"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>Tirar dúvidas pelo WhatsApp</a>
            </div>
          </div>
        </section>
      </div>
    }
  `,
})
export class RelatorioPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly store = inject(JourneyStore);
  readonly report = this.store.report;

  readonly dossierItems = [
    'Indicadores de economia, payback e emissões evitadas.',
    'Curva de amortização do investimento.',
    'Relatório completo gerado pela plataforma.',
  ];

  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    client: buildIdentificationGroup(this.fb, { initial: this.store.client() ?? {} }),
    terms: [false, Validators.requiredTrue],
  });
  private readonly identification = viewChild(IdentificationFormComponent);
  readonly submitting = signal(false);
  readonly submitError = signal<FriendlyError | null>(null);
  readonly serverError = signal<string | null>(null);
  readonly duplicate = signal(false);
  readonly legalDoc = signal<LegalDocKind | null>(null);

  openLegal(ev: Event, kind: LegalDocKind): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.legalDoc.set(kind);
  }
  private leadKey = uuid();

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.leadKey = uuid();
      this.submitError.set(null);
      this.serverError.set(null);
      this.duplicate.set(false);
    });
  }

  submit() {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.identification()?.focusFirstInvalid();
      this.toast.show('Revise o formulário', 'Preencha todos os campos e aceite os termos para continuar.', 'error');
      return;
    }
    const client = this.form.controls.client.getRawValue();
    const body: LeadRequest = {
      fullName: client.name.trim(), corporateEmail: client.email.trim(), phone: client.phone, jobTitle: client.role.trim(), companyName: client.company.trim(),
      diagnostic: { ...this.store.input() },
      consent: { termVersion: TERMS_VERSION, accepted: true },
    };
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.createLead(body, this.leadKey).subscribe({
      next: (lead) => {
        this.submitting.set(false);
        this.store.client.set(client);
        this.store.report.set(lead);
        this.toast.show('Relatório gerado', 'Seu diagnóstico está pronto.');
      },
      error: (e: ApiError) => {
        this.submitting.set(false);
        const f = friendly(e, 'lead');
        this.submitError.set(f);
        if (e.status === 409 && e.code !== 'REQUEST_IN_PROGRESS') { this.duplicate.set(true); this.serverError.set('Este e-mail já possui um diagnóstico.'); this.identification()?.focusField('email'); }
        if (e.status >= 400 && e.status < 500 && e.code !== 'REQUEST_IN_PROGRESS') this.leadKey = uuid();
      },
    });
  }

  readonly shortId = computed(() => shortId(this.report()?.id));
  readonly monthly = computed(() => (this.report()?.diagnostic.annualSavings ?? 0) / 12);
  readonly annualCost = computed(() => (this.report()?.diagnostic.monthlyEnergyBill ?? 0) * 12);
  readonly optimizedCost = computed(() => this.annualCost() - (this.report()?.diagnostic.annualSavings ?? 0));
  readonly whatsapp = computed(() => whatsappUrl(`Olá, gostaria de tirar dúvidas sobre o meu relatório #${this.shortId()}.`));
  dateTime = dateTimeOf;

  readonly chart = computed(() => {
    const d = this.report()?.diagnostic;
    if (!d) return null;
    const monthly = d.annualSavings / 12;
    if (!(monthly > 0) || !(d.paybackMonths > 0)) return null;
    const invest = d.paybackMonths * monthly;
    const horizon = Math.max(24, Math.ceil(d.paybackMonths) + 6);
    const end = monthly * horizon - invest;
    const top = 20, bottom = 220, W = 1000;
    const min = -invest, max = Math.max(end, 0);
    const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
    return { invest, horizon, end, zeroY: y(0), startY: y(-invest), endY: y(end), breakX: (d.paybackMonths / horizon) * W, path: `M 0 ${y(-invest)} L ${W} ${y(end)}` };
  });

  readonly full = signal<{ status: 'idle' | 'loading' | 'ready' | 'error'; text?: string }>({ status: 'idle' });
  readonly fullError = signal<FriendlyError | null>(null);
  readonly fullLink = computed(() => { const t = this.full().text?.trim() ?? ''; return /^https?:\/\/\S+$/i.test(t) ? t : null; });
  readonly parsedFull = computed(() => parseReportText(this.full().text));

  private static readonly SECTION_ICONS: Record<string, string> = { CLIENTE: 'apartment', 'DADOS INFORMADOS': 'tune', 'RESULTADOS ESTIMADOS': 'insights' };
  private static readonly ACCENTS = ['bg-primary-container', 'bg-primary', 'bg-secondary-fixed-dim', 'bg-secondary'];
  private static readonly isResult = (sec: ReportSection) => sec.key.startsWith('RESULTADO');
  sectionIcon = (key: string) => RelatorioPage.SECTION_ICONS[key] ?? 'segment';
  infoSections = (sections: ReportSection[]) => sections.filter((sec) => !RelatorioPage.isResult(sec));
  resultSections = (sections: ReportSection[]) => sections.filter(RelatorioPage.isResult);
  accent = (i: number) => RelatorioPage.ACCENTS[i % RelatorioPage.ACCENTS.length];
  isCarbon = (label: string) => /co₂|co2|carbono/i.test(label);

  copyFull() {
    const text = this.full().text;
    if (text) this.toast.copy(text, 'Relatório copiado', 'O texto completo está na sua área de transferência.');
  }

  loadFull() {
    const id = this.report()?.id;
    if (!id || this.full().status === 'loading') return;
    this.full.set({ status: 'loading' });
    this.fullError.set(null);
    this.api.getReportText(id).subscribe({
      next: (text) => this.full.set({ status: 'ready', text }),
      error: (e: ApiError) => { this.fullError.set(friendly(e, 'lead')); this.full.set({ status: 'error' }); },
    });
  }

  print() { window.print(); }
}
