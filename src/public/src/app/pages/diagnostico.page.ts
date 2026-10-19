import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, debounceTime, of, skip, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { INFRA_OPTIONS, calcDiagnostic } from '../core/calc';
import { DiagnosticInput, DiagnosticResult } from '../core/models';
import { JourneyStore } from '../core/state.services';
import { fmtNum, parseCents } from '../core/utils';

@Component({
  selector: 'ecm-diagnostico',
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <section class="relative w-full max-w-[1280px] mx-auto px-gutter pt-space-xl pb-space-lg">
      <div class="flex flex-col items-center text-center max-w-4xl mx-auto gap-space-md">
        <div class="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-high shadow-sm">
          <span class="flex h-2 w-2 rounded-full bg-tertiary-container animate-ping"></span>
          <span class="font-label-mono text-label-mono text-on-secondary-fixed-variant uppercase tracking-wider">Simulação Instantânea • Resolução Normativa ANEEL</span>
        </div>
        <h1 class="font-display text-display-mobile md:text-display text-fg-primary tracking-tight font-extrabold max-w-3xl">Descubra o potencial oculto de economia energética da sua empresa</h1>
        <p class="font-body-lg text-body-lg text-fg-secondary max-w-2xl">Diagnóstico técnico instantâneo com base na infraestrutura do seu imóvel corporativo e projeção precisa de retorno de investimento (Payback auditável).</p>
        <div class="flex flex-wrap items-center justify-center gap-space-sm pt-space-xs">
          @for (t of trust; track t.label) {
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container text-fg-primary font-label-md text-label-md shadow-sm">
              <span class="material-symbols-outlined text-[16px] text-fg-tertiary" aria-hidden="true">{{ t.icon }}</span><span>{{ t.label }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- CALCULADORA -->
    <section class="w-full max-w-[1280px] mx-auto px-gutter py-space-md">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div class="xl:col-span-7 bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md">
          <div class="flex items-center justify-between pb-space-sm">
            <div class="flex items-center gap-space-sm">
              <div class="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span></div>
              <div>
                <h2 class="font-headline-sm text-headline-sm text-fg-primary font-bold">Parâmetros de Operação</h2>
                <p class="font-body-sm text-body-sm text-fg-secondary">Ajuste os dados operacionais da instalação para recalcular.</p>
              </div>
            </div>
            <div class="hidden sm:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-mono text-label-mono">
              <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span><span>Atualização em tempo real</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="input-area" class="font-label-lg text-label-lg text-fg-primary font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-fg-secondary" aria-hidden="true">straighten</span>Área Útil Climatizada / Operacional</label>
              <span class="font-label-mono text-label-mono text-fg-secondary">Base Cadastral Mín: 200 m²</span>
            </div>
            <input id="input-area" type="text" inputmode="numeric" [value]="areaText()" (input)="onArea($event)"
              class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary font-headline-sm font-semibold focus:bg-surface-container-lowest" />
            <input type="range" min="200" max="15000" step="50" [value]="input().areaM2" (input)="patch({ areaM2: +$any($event.target).value })"
              class="w-full accent-fg-primary cursor-pointer mt-1" aria-label="Ajustar área em metros quadrados" />
            <div class="flex justify-between text-fg-secondary font-label-mono text-label-mono px-1"><span>200 m²</span><span>7.500 m²</span><span>15.000+ m²</span></div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="input-people" class="font-label-lg text-label-lg text-fg-primary font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-fg-secondary" aria-hidden="true">groups</span>Estações de Trabalho Ativas (Carga Térmica Humana)</label>
            <div class="flex items-center gap-space-xs">
              <button type="button" (click)="people(-10)" aria-label="Diminuir 10 posições" class="w-12 h-12 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-fg-primary"><span class="material-symbols-outlined text-[20px]">remove</span></button>
              <input id="input-people" type="number" min="5" max="5000" [value]="input().workstations" (input)="patch({ workstations: Math.max(5, +$any($event.target).value || 5) })"
                class="flex-1 h-12 px-4 text-center rounded-lg bg-surface-container-low text-fg-primary font-headline-sm font-semibold focus:bg-surface-container-lowest" />
              <button type="button" (click)="people(10)" aria-label="Aumentar 10 posições" class="w-12 h-12 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-fg-primary"><span class="material-symbols-outlined text-[20px]">add</span></button>
            </div>
            <p class="font-body-sm text-body-sm text-fg-secondary">Considera densidade média de computação e iluminação por baia operacional.</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="input-bill" class="font-label-lg text-label-lg text-fg-primary font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-fg-secondary" aria-hidden="true">receipt_long</span>Custo Médio Mensal com Energia Elétrica (Fatura Concessionária)</label>
            <div class="relative">
              <span class="absolute left-4 top-3 text-fg-secondary font-bold">R$</span>
              <input id="input-bill" type="text" inputmode="numeric" [value]="billText()" (input)="onBill($event)"
                class="w-full h-12 pl-12 pr-4 rounded-lg bg-surface-container-low text-fg-primary font-headline-sm font-semibold focus:bg-surface-container-lowest" />
            </div>
            <div class="flex items-center justify-between font-label-mono text-label-mono text-fg-secondary pt-0.5">
              <span>Grupo Tarifário A4 / B3 Típico</span>
              <span class="text-fg-tertiary font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">bolt</span>Tarifa Base Média: R$ 0,84 / kWh</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="select-infra" class="font-label-lg text-label-lg text-fg-primary font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px] text-fg-secondary" aria-hidden="true">domain</span>Topologia da Infraestrutura Atual</label>
            <div class="relative">
              <select id="select-infra" (change)="patch({ infraFactor: +$any($event.target).value })"
                class="w-full h-12 px-4 rounded-lg bg-surface-container-low text-fg-primary font-body-md font-semibold appearance-none cursor-pointer">
                @for (o of infra; track o.value) { <option [value]="o.value" [selected]="o.value === input().infraFactor">{{ o.label }}</option> }
              </select>
              <span class="absolute right-4 top-3.5 pointer-events-none text-fg-secondary material-symbols-outlined" aria-hidden="true">expand_more</span>
            </div>
          </div>

          <div class="p-space-md rounded-lg bg-surface-container-low flex items-center gap-space-sm">
            <span class="material-symbols-outlined text-fg-secondary shrink-0" aria-hidden="true">encrypted</span>
            <p class="font-body-sm text-body-sm text-fg-secondary">Cálculo protegido por algoritmo proprietário com indexadores da CCEE e ANEEL. Nenhuma informação financeira é armazenada sem seu consentimento explícito.</p>
          </div>
        </div>

        <!-- RESULTADO EM TEMPO REAL -->
        <div class="xl:col-span-5 flex flex-col gap-space-md">
          <div class="bg-surface-container-lowest rounded-xl shadow-xl p-space-lg" [attr.aria-busy]="previewing()" aria-live="polite">
            <div class="flex items-center justify-between pb-space-md">
              <div>
                <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-wider block">Eficiência Potencial</span>
                <h3 class="font-headline-md text-headline-md text-fg-primary font-bold">Projeção Estimada</h3>
              </div>
              <div class="flex flex-col items-end">
                <div class="px-3 py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-headline-sm font-bold flex items-center gap-1 shadow-sm min-w-[96px] justify-center">
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">trending_down</span>
                  @if (previewing()) { <span class="sk sk-sage h-5 w-12"></span> } @else { <span>{{ r().reductionPct | number: '1.2-2' }}%</span> }
                </div>
                <span class="font-label-mono text-label-mono text-fg-secondary mt-1">Otimização Direta</span>
              </div>
            </div>
            <div class="w-full bg-surface-container rounded-full h-3 mb-space-md overflow-hidden">
              @if (previewing()) { <div class="sk h-full w-full rounded-full"></div> } @else { <div class="bg-primary-container h-full rounded-full transition-all duration-700 ease-out" [style.width.%]="r().reductionPct"></div> }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md py-space-xs">
              <div class="p-space-md rounded-lg bg-surface-container-low relative pl-4">
                <div class="absolute left-0 top-3 bottom-3 w-1.5 bg-primary-container rounded-r-full"></div>
                <span class="font-label-md text-label-md text-fg-secondary block font-semibold">Economia Anual Estimada</span>
                <div class="mt-1 h-11 flex items-center">
                  @if (previewing()) { <div class="sk h-8 w-40"></div> } @else { <span class="font-metric-numeral text-[28px] leading-[44px] font-extrabold tracking-tight text-fg-primary">{{ r().annualSavings | currency: 'BRL' }}</span> }
                </div>
                @if (previewing()) { <span class="sk h-3.5 w-28 mt-1 block"></span> } @else { <span class="font-label-mono text-label-mono text-fg-tertiary font-semibold mt-1 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">savings</span>+{{ r().monthlySavings | currency: 'BRL' }} /mês</span> }
              </div>
              <div class="p-space-md rounded-lg bg-surface-container-low relative pl-4">
                <div class="absolute left-0 top-3 bottom-3 w-1.5 bg-secondary-fixed-dim rounded-r-full"></div>
                <span class="font-label-md text-label-md text-fg-secondary block font-semibold">Payback Previsto</span>
                <div class="mt-1 h-11 flex items-center">
                  @if (previewing()) { <div class="sk h-8 w-28"></div> } @else { <span class="font-metric-numeral text-[28px] font-extrabold tracking-tight text-fg-primary">{{ r().paybackMonths | number: '1.1-1' }} meses</span> }
                </div>
                <span class="font-label-mono text-label-mono text-fg-secondary font-semibold mt-1 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">speed</span>Viabilidade Acelerada</span>
              </div>
            </div>

            <div class="mt-space-md p-space-md rounded-lg bg-tertiary-fixed/30 flex items-center justify-between gap-space-sm">
              <div class="flex items-center gap-space-sm">
                <div class="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">nature</span></div>
                <div>
                  <span class="font-label-md text-label-md text-fg-secondary block font-semibold">Mitigação de Carbono (GHG Escopo 2)</span>
                  @if (previewing()) { <span class="sk h-7 w-36 block"></span> } @else { <span class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ r().co2Tons | number: '1.2-2' }} tCO₂e /ano</span> }
                </div>
              </div>
              @if (previewing()) { <span class="sk h-[22px] w-24 block shrink-0"></span> } @else { <span class="font-label-mono text-label-mono px-2.5 py-1 rounded bg-surface-container-lowest text-fg-primary font-bold shadow-sm shrink-0">≈ {{ r().trees }} árvores</span> }
            </div>

            <div class="mt-space-md pt-space-sm">
              <div class="flex items-center justify-between mb-2"><span class="font-label-md text-label-md text-fg-primary font-bold">Benchmark de Custo Energético Anual</span><span class="font-label-mono text-label-mono text-fg-secondary">Projeção 12 Meses</span></div>
              <div class="flex flex-col gap-3 bg-surface-container-low p-space-md rounded-lg">
                <div>
                  <div class="flex justify-between text-body-sm font-semibold mb-1"><span class="text-fg-secondary flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-outline"></span>Cenário Atual (Sem Gestão Ativa)</span>@if (previewing()) { <span class="sk h-[18px] w-24"></span> } @else { <span class="text-fg-primary font-bold">{{ r().annualCost | currency: 'BRL' }}</span> }</div>
                  <div class="w-full bg-surface-container rounded-full h-3 overflow-hidden"><div class="bg-outline h-full rounded-full w-full"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-body-sm font-semibold mb-1"><span class="text-fg-tertiary flex items-center gap-1 font-bold"><span class="w-2.5 h-2.5 rounded bg-primary-container"></span>Com EcoMetric Intelligence</span>@if (previewing()) { <span class="sk h-[18px] w-24"></span> } @else { <span class="text-fg-primary font-bold">{{ r().optimizedCost | currency: 'BRL' }}</span> }</div>
                  <div class="w-full bg-surface-container rounded-full h-3 overflow-hidden">@if (previewing()) { <div class="sk h-full w-full rounded-full"></div> } @else { <div class="bg-primary-container h-full rounded-full transition-all duration-700 ease-out" [style.width.%]="(r().optimizedCost / r().annualCost) * 100"></div> }</div>
                </div>
              </div>
            </div>

            <div class="mt-space-lg pt-space-xs flex flex-col gap-2">
              <button type="button" (click)="generate()" class="w-full h-14 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-sm shadow-md active:scale-[0.99]">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">description</span><span>Gerar relatório</span>
              </button>
              <div class="flex items-center justify-center gap-space-sm text-fg-secondary font-label-mono text-label-mono flex-wrap"><span>Leva menos de 1 minuto</span><span>•</span><span>Sem custo imediato</span></div>
            </div>
          </div>
          <div class="bg-surface-container-low rounded-xl p-space-md flex items-center gap-space-md">
            <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[24px]" aria-hidden="true">support_agent</span></div>
            <div><h4 class="font-label-lg text-label-lg text-fg-primary font-bold">Dúvidas com Tarifação de Ponta?</h4><p class="font-body-sm text-body-sm text-fg-secondary">Nossa mesa de engenharia analisa suas faturas com granularidade horossazonal.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="w-full max-w-[1280px] mx-auto px-gutter pb-space-xl">
      <div class="p-space-lg rounded-2xl bg-surface-container-low grid grid-cols-1 md:grid-cols-3 gap-space-lg">
        @for (p of pillars; track p.title) {
          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container-lowest text-fg-primary flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[24px]" aria-hidden="true">{{ p.icon }}</span></div>
            <div><h4 class="font-label-lg text-label-lg text-fg-primary font-bold mb-1">{{ p.title }}</h4><p class="font-body-sm text-body-sm text-fg-secondary">{{ p.text }}</p></div>
          </div>
        }
      </div>
    </section>
  `,
})
export class DiagnosticoPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly store = inject(JourneyStore);
  readonly Math = Math;
  readonly infra = INFRA_OPTIONS;

  readonly input = signal<DiagnosticInput>(this.store.input());
  readonly r = signal<DiagnosticResult>(calcDiagnostic(this.input()));
  readonly previewing = signal(false);
  readonly areaText = computed(() => fmtNum(this.input().areaM2) + ' m²');
  readonly billText = computed(() => fmtNum(this.input().monthlyBill));

  readonly trust = [
    { icon: 'policy', label: 'Conformidade ANEEL' }, { icon: 'eco', label: 'Metodologia GHG Protocol' },
    { icon: 'verified', label: 'Diretrizes ISO 50001' }, { icon: 'lock', label: 'Privacidade LGPD Estrita' },
  ];
  readonly pillars = [
    { icon: 'verified', title: 'Metodologia Auditável', text: 'Equações calibradas em conformidade com o Protocolo Internacional de Medição e Verificação de Desempenho (IPMVP).' },
    { icon: 'gavel', title: 'Tarifa Horossazonal 2026', text: 'Indexação atualizada conforme bandeiras e reajustes tarifários anuais homologados pelas agências reguladoras estaduais.' },
    { icon: 'shield_person', title: 'Privacidade Garantida', text: 'Processamento conforme a Lei 13.709/2018 (LGPD). Seus dados técnicos corporativos nunca serão comercializados.' },
  ];

  constructor() {
    // Preview em tempo real: debounce de 300ms; skeleton enquanto aguarda; fallback local se a API falhar.
    toObservable(this.input).pipe(
      skip(1),
      tap(() => this.previewing.set(true)),
      debounceTime(300),
      switchMap((i) => this.api.preview(i).pipe(catchError(() => of(calcDiagnostic(i))))),
      takeUntilDestroyed(),
    ).subscribe((res) => { this.r.set(res); this.previewing.set(false); });
  }

  patch(p: Partial<DiagnosticInput>) { this.input.update((v) => ({ ...v, ...p })); this.store.input.set(this.input()); }
  people(d: number) { this.patch({ workstations: Math.max(5, this.input().workstations + d) }); }
  onArea(e: Event) { const el = e.target as HTMLInputElement; const n = parseCents(el.value); el.value = fmtNum(n) + ' m²'; this.patch({ areaM2: n }); }
  onBill(e: Event) { const el = e.target as HTMLInputElement; const n = parseCents(el.value); el.value = fmtNum(n); this.patch({ monthlyBill: n }); }

  /** Único ponto de entrada da página de relatório: libera o acesso e segue para o formulário de geração. */
  generate() {
    this.store.input.set(this.input());
    this.store.report.set(null);
    this.store.reportRequested.set(true);
    this.router.navigate(['/relatorio']);
  }
}
