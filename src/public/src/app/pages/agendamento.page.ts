import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ApiError, DaySlots, Report, SlotItem } from '../core/models';
import { JourneyStore, ToastService } from '../core/state.services';
import { brDate, uuid } from '../core/utils';
import { ErrorCardComponent } from '../shared/error-card.component';
import {
  IdentificationFormComponent,
  buildIdentificationGroup,
} from '../shared/identification-form.component';
import { LoadingButtonComponent } from '../shared/loading-button.component';

@Component({
  selector: 'ecm-agendamento',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DecimalPipe,
    ErrorCardComponent,
    LoadingButtonComponent,
    IdentificationFormComponent,
  ],
  template: `
    @if (repError(); as e) {
      <div class="max-w-[720px] mx-auto px-gutter py-space-xl">
        <ecm-error-card
          [badge]="'HTTP ' + e.status"
          [code]="e.code"
          [icon]="e.status === 404 ? 'find_in_page' : 'cloud_off'"
          [tone]="e.status === 404 ? 'neutral' : 'error'"
          [title]="
            e.status === 404
              ? 'Diagnóstico não localizado ou expirado'
              : 'Não foi possível carregar os dados do diagnóstico'
          "
          [message]="
            e.status === 404
              ? 'Para agendar, é preciso ter um diagnóstico válido. Gere um novo em menos de 1 minuto.'
              : 'Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos.'
          "
        >
          <ng-container actions>
            <button
              type="button"
              (click)="loadReport()"
              class="px-space-md h-10 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg hover:bg-secondary-fixed"
            >
              Tentar novamente
            </button>
            <a
              routerLink="/diagnostico"
              class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"
              ><span
                class="material-symbols-outlined text-[18px]"
                aria-hidden="true"
                >refresh</span
              >Iniciar Novo Diagnóstico</a
            >
          </ng-container>
        </ecm-error-card>
      </div>
    } @else {
      <div
        class="max-w-[1280px] w-full mx-auto px-gutter py-space-lg flex flex-col gap-space-lg"
      >
        <div
          class="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md"
        >
          <div class="max-w-3xl flex flex-col gap-space-xs">
            <span
              class="font-label-mono text-label-mono text-fg-primary uppercase tracking-wider font-bold"
            >
              @if (id()) {
                Relatório #{{ id() }} •
              }
              Engenharia Consultiva &amp; Viabilidade Financeira</span
            >
            <h1
              class="font-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-headline-lg-mobile text-fg-primary tracking-tight font-extrabold"
            >
              Agende sua Sessão Estratégica de Diagnóstico Técnico
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant">
              Selecione a data e o horário mais conveniente para validar a curva
              de amortização, viabilidade de Capex e dimensionamento com um
              engenheiro sênior credenciado CEM®/CREA.
            </p>
          </div>
          <div
            class="flex items-center gap-space-sm bg-surface-container px-space-md py-2.5 rounded-lg shrink-0"
          >
            <span class="relative flex h-2.5 w-2.5"
              ><span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75"
              ></span
              ><span
                class="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"
              ></span
            ></span>
            <div class="flex flex-col">
              <span
                class="font-label-mono text-label-mono text-fg-primary font-bold"
                >Brasília (GMT-3)</span
              ><span class="text-[11px] text-on-surface-variant"
                >Grade sincronizada via GET /api/v1/schedule/slots</span
              >
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          <!-- ESQUERDA -->
          <div class="xl:col-span-7 flex flex-col gap-space-lg">
            <div
              class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
              [attr.aria-busy]="status() === 'loading'"
            >
              <div
                class="flex items-center justify-between pb-space-xs gap-space-sm flex-wrap"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="material-symbols-outlined text-fg-primary text-[22px]"
                    aria-hidden="true"
                    >calendar_month</span
                  ><span
                    class="font-headline-sm text-headline-sm text-fg-primary font-bold"
                    >Outubro de 2026</span
                  >
                </div>
                <button
                  type="button"
                  (click)="reloadSlots()"
                  [disabled]="status() === 'loading'"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-fg-primary font-label-md text-label-md disabled:opacity-60"
                >
                  <span
                    class="material-symbols-outlined text-[16px]"
                    [class.animate-spin]="status() === 'loading'"
                    aria-hidden="true"
                    >sync</span
                  >Atualizar grade
                </button>
              </div>

              @switch (status()) {
                @case ('loading') {
                  <div
                    role="status"
                    aria-label="Carregando horários"
                    class="flex flex-col gap-space-md"
                  >
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                      @for (n of [1, 2, 3, 4]; track n) {
                        <div class="sk h-[104px] rounded-lg"></div>
                      }
                    </div>
                    <div class="flex flex-col gap-space-xs">
                      <div class="sk h-5 w-48"></div>
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-xs">
                        @for (n of [1, 2, 3, 4]; track n) {
                          <div class="sk h-[50px] rounded-lg"></div>
                        }
                      </div>
                    </div>
                    <div class="flex flex-col gap-space-xs">
                      <div class="sk h-5 w-56"></div>
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-xs">
                        @for (n of [1, 2, 3, 4, 5]; track n) {
                          <div class="sk h-[50px] rounded-lg"></div>
                        }
                      </div>
                    </div>
                  </div>
                }
                @case ('error') {
                  <ecm-error-card
                    [badge]="'HTTP ' + (slotsError()?.status ?? 0)"
                    [code]="slotsError()?.code ?? ''"
                    icon="cloud_off"
                    tone="error"
                    title="Não foi possível carregar a agenda"
                    message="Tentamos reconectar automaticamente sem sucesso. Seus dados foram mantidos."
                  >
                    <ng-container actions
                      ><button
                        type="button"
                        (click)="reloadSlots()"
                        class="px-space-md h-10 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary inline-flex items-center gap-space-xs"
                      >
                        <span
                          class="material-symbols-outlined text-[18px]"
                          aria-hidden="true"
                          >replay</span
                        >Tentar agora
                      </button></ng-container
                    >
                  </ecm-error-card>
                }
                @default {
                  <div
                    class="grid grid-cols-2 sm:grid-cols-4 gap-space-xs"
                    role="tablist"
                    aria-label="Datas disponíveis"
                  >
                    @for (d of days(); track d.date) {
                      <button
                        type="button"
                        role="tab"
                        [attr.aria-selected]="d.date === date()"
                        (click)="pickDate(d)"
                        class="flex flex-col items-center justify-center p-3 rounded-lg text-center"
                        [class]="
                          d.date === date()
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                        "
                      >
                        <span
                          class="font-label-mono text-[10px] uppercase tracking-wider"
                          [class]="
                            d.date === date()
                              ? 'text-primary-fixed'
                              : 'text-on-surface-variant'
                          "
                          >{{ d.weekday }}</span
                        >
                        <span
                          class="font-headline-md text-headline-md font-extrabold my-0.5"
                          [class]="
                            d.date === date()
                              ? 'text-on-primary'
                              : 'text-fg-primary'
                          "
                          >{{ d.date.slice(8) }}</span
                        >
                        <span
                          class="text-[11px]"
                          [class]="
                            d.date === date()
                              ? 'text-primary-fixed-dim'
                              : 'text-on-surface-variant'
                          "
                          >Outubro</span
                        >
                        <span
                          class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          [class]="
                            d.date === date()
                              ? 'bg-primary-container text-primary-fixed'
                              : 'bg-surface-container-high text-on-surface-variant'
                          "
                          >{{ freeCount(d) }} slots livres</span
                        >
                      </button>
                    }
                  </div>

                  @if (conflict()) {
                    <div
                      class="p-space-sm rounded-lg bg-secondary-container/40 flex items-center gap-2"
                      role="alert"
                    >
                      <span
                        class="material-symbols-outlined text-fg-primary text-[20px]"
                        aria-hidden="true"
                        >autorenew</span
                      >
                      <span
                        class="font-body-sm text-body-sm text-fg-primary font-bold"
                        >Esse horário acabou de ser reservado por outro
                        executivo. Atualizamos a grade — escolha outro
                        slot.</span
                      >
                    </div>
                  }

                  @for (g of groups(); track g.label) {
                    <div class="flex flex-col gap-space-xs pt-space-xs">
                      <div class="flex items-center gap-2">
                        <span
                          class="material-symbols-outlined text-[18px] text-fg-secondary"
                          aria-hidden="true"
                          >{{ g.icon }}</span
                        ><span
                          class="font-label-lg text-label-lg text-fg-primary font-bold"
                          >{{ g.label }}</span
                        ><span class="text-on-surface-variant text-[12px]"
                          >({{ g.hint }})</span
                        >
                      </div>
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-xs">
                        @for (s of g.slots; track s.time) {
                          <button
                            type="button"
                            [disabled]="!s.free"
                            (click)="pickTime(s)"
                            [attr.aria-pressed]="s.time === time()"
                            class="flex items-center justify-between px-3.5 py-3 rounded-lg font-label-lg text-label-lg"
                            [class]="
                              !s.free
                                ? 'bg-surface-container-high/60 text-on-surface-variant/40 cursor-not-allowed'
                                : s.time === time()
                                  ? 'bg-primary text-on-primary shadow-sm'
                                  : 'bg-surface-container-low hover:bg-surface-container text-fg-primary'
                            "
                          >
                            <span [class.line-through]="!s.free">{{
                              s.time
                            }}</span>
                            <span
                              class="font-label-mono text-[10px]"
                              [class]="
                                s.time === time() && s.free
                                  ? 'px-2 py-0.5 rounded bg-primary-container text-primary-fixed font-bold'
                                  : s.free
                                    ? 'text-fg-secondary'
                                    : 'uppercase'
                              "
                              >{{
                                !s.free
                                  ? 'Ocupado'
                                  : s.time === time()
                                    ? 'Selecionado'
                                    : 'Livre'
                              }}</span
                            >
                          </button>
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <section
              class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
              aria-labelledby="quem-h"
            >
              <div class="flex items-start gap-space-sm">
                <div
                  class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"
                >
                  <span
                    class="material-symbols-outlined text-[22px]"
                    aria-hidden="true"
                    >badge</span
                  >
                </div>
                <div>
                  <h2
                    id="quem-h"
                    class="font-headline-sm text-headline-sm text-fg-primary font-bold"
                  >
                    Quem comparecerá à reunião
                  </h2>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">
                    Informe os dados da pessoa que participará e da empresa que
                    ela representa. Se você já se identificou antes, preenchemos
                    para você: altere se outra pessoa for participar.
                  </p>
                </div>
              </div>
              <ecm-identification-form
                [group]="form"
                prefix="att"
                nameLabel="Nome de quem comparecerá"
              />
            </section>

            <div
              class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
              [attr.aria-busy]="!!id() && !rep()"
            >
              <div class="flex items-center gap-space-xs">
                <span
                  class="material-symbols-outlined text-primary text-[22px]"
                  aria-hidden="true"
                  >format_list_bulleted</span
                >
                <h3
                  class="font-headline-sm text-headline-sm text-fg-primary font-bold"
                >
                  O que será abordado e entregue nesta sessão técnica
                </h3>
              </div>
              <ol class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <li
                  class="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low min-h-[84px]"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold font-label-mono text-label-mono"
                  >
                    1
                  </div>
                  <div class="flex-1">
                    <span
                      class="font-label-lg text-label-lg text-fg-primary font-bold"
                      >Curva de Carga &amp; Tarifa</span
                    >
                    @if (!id()) {
                      <p
                        class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                      >
                        Validação da curva horossazonal da sua planta e
                        adequação da demanda contratada.
                      </p>
                    } @else if (rep()) {
                      @let d = rep()!;
                      <p
                        class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                      >
                        Validação da curva horossazonal da planta de
                        {{ d.input.areaM2 | number: '1.2-2' }} m² e adequação da
                        demanda contratada.
                      </p>
                    } @else {
                      <div class="flex flex-col gap-1.5 pt-1.5">
                        <div class="sk h-3 w-full"></div>
                        <div class="sk h-3 w-2/3"></div>
                      </div>
                    }
                  </div>
                </li>
                <li
                  class="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low min-h-[84px]"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold font-label-mono text-label-mono"
                  >
                    2
                  </div>
                  <div class="flex-1">
                    @if (!id()) {
                      <span
                        class="font-label-lg text-label-lg text-fg-primary font-bold"
                        >Capex &amp; Payback</span
                      >
                      <p
                        class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                      >
                        Detalhamento item a item do aporte necessário e da
                        amortização garantida em contrato.
                      </p>
                    } @else if (rep()) {
                      @let d = rep()!;
                      <span
                        class="font-label-lg text-label-lg text-fg-primary font-bold"
                        >Capex &amp; Payback de
                        {{
                          d.result.paybackMonths | number: '1.1-1'
                        }}
                        Meses</span
                      >
                      <p
                        class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                      >
                        Detalhamento item a item do aporte de
                        {{ d.result.capex | currency: 'BRL' }} e amortização
                        garantida em contrato.
                      </p>
                    } @else {
                      <div class="sk h-5 w-56"></div>
                      <div class="flex flex-col gap-1.5 pt-1.5">
                        <div class="sk h-3 w-full"></div>
                        <div class="sk h-3 w-2/3"></div>
                      </div>
                    }
                  </div>
                </li>
                <li
                  class="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low min-h-[84px]"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold font-label-mono text-label-mono"
                  >
                    3
                  </div>
                  <div>
                    <span
                      class="font-label-lg text-label-lg text-fg-primary font-bold"
                      >BNDES Verde &amp; Performance Bond</span
                    >
                    <p
                      class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                    >
                      Minuta para enquadramento na linha Finame Verde e apólice
                      segurada de performance energética.
                    </p>
                  </div>
                </li>
                <li
                  class="flex gap-space-sm p-space-sm rounded-lg bg-surface-container-low min-h-[84px]"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold font-label-mono text-label-mono"
                  >
                    4
                  </div>
                  <div>
                    <span
                      class="font-label-lg text-label-lg text-fg-primary font-bold"
                      >Planilha de Capex Editável (.xlsx)</span
                    >
                    <p
                      class="font-body-sm text-body-sm text-on-surface-variant pt-0.5"
                    >
                      Disponibilização do modelo financeiro paramétrico aberto
                      para auditoria do comitê de finanças e CFO.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <!-- DIREITA -->
          <div
            class="xl:col-span-5 flex flex-col gap-space-lg xl:sticky xl:top-6"
          >
            <div
              class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md"
            >
              <div class="flex items-center justify-between pb-space-xs">
                <span
                  class="font-label-mono text-label-mono text-fg-secondary font-bold uppercase tracking-wider"
                  >Resumo do Agendamento</span
                >
                @if (date() && time()) {
                  <span
                    class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-mono text-label-mono font-bold flex items-center gap-1"
                    ><span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span
                    >Slot Pré-Reservado</span
                  >
                }
              </div>
              <div
                class="p-space-md rounded-lg bg-primary text-on-primary flex items-center gap-space-sm min-h-[84px]"
                aria-live="polite"
              >
                <div
                  class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-primary-fixed shrink-0"
                >
                  <span
                    class="material-symbols-outlined text-[24px]"
                    aria-hidden="true"
                    >event_available</span
                  >
                </div>
                <div class="flex flex-col">
                  <span class="font-label-md text-label-md text-primary-fixed"
                    >Data e Horário Selecionados</span
                  >
                  @if (status() === 'loading') {
                    <span class="sk sk-sage h-7 w-44 my-0.5"></span>
                  } @else {
                    <span
                      class="font-headline-sm text-headline-sm text-on-primary font-extrabold"
                      >{{
                        date() && time()
                          ? brDate(date()) + ' às ' + time()
                          : 'Escolha um horário livre'
                      }}</span
                    >
                  }
                  <span class="text-[11px] text-primary-fixed-dim"
                    >Horário Oficial de Brasília (GMT-3)</span
                  >
                </div>
              </div>
              <p
                class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2"
              >
                <span
                  class="material-symbols-outlined text-[18px] text-fg-primary shrink-0"
                  aria-hidden="true"
                  >groups</span
                >A equipe técnica da Lumina Tech Labs define o consultor
                responsável pela reunião e informa por e-mail antes do encontro.
              </p>

              @if (id()) {
                <div
                  class="grid grid-cols-2 gap-space-xs pt-space-xs"
                  [attr.aria-busy]="!rep()"
                >
                  @if (rep(); as d) {
                    <div
                      class="p-space-sm rounded-lg bg-surface-container-low flex flex-col"
                    >
                      <span
                        class="font-label-mono text-[10px] text-on-surface-variant uppercase"
                        >Economia Mapeada</span
                      >
                      <span
                        class="font-headline-sm text-headline-sm text-fg-primary font-extrabold mt-0.5"
                        >{{
                          d.result.annualSavings
                            | currency: 'BRL' : 'symbol' : '1.0-0'
                        }}<span class="text-sm font-normal">/ano</span></span
                      >
                      <span
                        class="font-label-mono text-[11px] text-fg-tertiary font-bold mt-1"
                        >-{{ d.result.reductionPct | number: '1.2-2' }}% na
                        Tarifa</span
                      >
                    </div>
                    <div
                      class="p-space-sm rounded-lg bg-surface-container-low flex flex-col"
                    >
                      <span
                        class="font-label-mono text-[10px] text-on-surface-variant uppercase"
                        >Capex &amp; Amortização</span
                      >
                      <span
                        class="font-headline-sm text-headline-sm text-fg-primary font-extrabold mt-0.5"
                        >{{ d.result.paybackMonths | number: '1.1-1' }}
                        <span class="text-sm font-normal">meses</span></span
                      >
                      <span
                        class="font-label-mono text-[11px] text-fg-secondary font-bold mt-1"
                        >Capex:
                        {{
                          d.result.capex | currency: 'BRL' : 'symbol' : '1.0-0'
                        }}</span
                      >
                    </div>
                  } @else {
                    @for (n of [1, 2]; track n) {
                      <div
                        class="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-1.5"
                      >
                        <div class="sk h-2.5 w-24"></div>
                        <div class="sk h-7 w-28"></div>
                        <div class="sk h-3 w-24"></div>
                      </div>
                    }
                  }
                </div>
              }

              <div class="flex flex-col gap-space-xs pt-space-xs">
                <ecm-loading-button
                  label="Confirmar Agendamento Técnico"
                  icon="verified_user"
                  loadingLabel="Confirmando na API..."
                  [loading]="booking()"
                  [disabled]="status() !== 'ready' || !date() || !time()"
                  (click)="confirm()"
                />
                <p
                  class="font-label-mono text-[10px] text-center text-on-surface-variant pt-1"
                >
                  POST /api/v1/schedule/book • Protegido por Idempotency-Key •
                  Sem duplicidade de reserva
                </p>
              </div>
            </div>

            <div
              class="bg-surface-container rounded-xl p-space-md flex items-center gap-space-sm"
            >
              <div
                class="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 text-fg-primary"
              >
                <span
                  class="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                  >shield</span
                >
              </div>
              <div class="flex-1">
                <span
                  class="font-label-lg text-label-lg text-fg-primary font-bold"
                  >Acordo de Não-Divulgação (NDA)</span
                >
                @if (!id()) {
                  <p class="text-[12px] text-on-surface-variant">
                    Os dados de consumo e faturas da sua planta são protegidos
                    por sigilo industrial e conformidade LGPD.
                  </p>
                } @else if (rep()) {
                  @let d = rep()!;
                  <p class="text-[12px] text-on-surface-variant">
                    Os dados de consumo e faturas da planta de
                    {{ d.input.areaM2 | number: '1.2-2' }} m² são protegidos por
                    sigilo industrial e conformidade LGPD.
                  </p>
                } @else {
                  <div class="flex flex-col gap-1.5 pt-1">
                    <div class="sk h-3 w-full"></div>
                    <div class="sk h-3 w-3/4"></div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-md">
          @for (f of faq; track f.title) {
            <div
              class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs"
            >
              <div class="flex items-center gap-2 text-fg-primary">
                <span
                  class="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                  >{{ f.icon }}</span
                ><span class="font-label-lg text-label-lg font-bold">{{
                  f.title
                }}</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant">
                {{ f.text }}
              </p>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class AgendamentoPage implements OnInit, OnChanges {
  readonly id = input<string>();
  private readonly store = inject(JourneyStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Quem comparecerá: pré-preenchido com a última identificação informada (relatório), mas editável. */
  readonly form = buildIdentificationGroup(this.fb, {
    initial: this.store.client() ?? {},
  });
  private readonly identification = viewChild(IdentificationFormComponent);
  readonly brDate = brDate;

  readonly rep = signal<Report | null>(null);
  readonly repError = signal<ApiError | null>(null);
  readonly days = signal<DaySlots[]>([]);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly slotsError = signal<ApiError | null>(null);
  readonly date = signal('');
  readonly time = signal('');
  readonly booking = signal(false);
  readonly conflict = signal(false);
  private intentKey = uuid(); // uma chave por intenção de reserva (muda quando o slot muda)

  readonly current = computed(() =>
    this.days().find((d) => d.date === this.date()),
  );
  readonly groups = computed(() => {
    const slots = this.current()?.slots ?? [];
    return [
      {
        label: 'Turno Matutino',
        icon: 'wb_twilight',
        hint: 'Horário comercial matutino',
        slots: slots.filter((s) => s.time < '12:00'),
      },
      {
        label: 'Turno Vespertino',
        icon: 'wb_sunny',
        hint: 'Recomendado para Diretorias e Facilities',
        slots: slots.filter((s) => s.time >= '12:00'),
      },
    ];
  });
  readonly faq = [
    {
      icon: 'lock_clock',
      title: 'Política de Tolerância & Fuso',
      text: 'O consultor aguarda até 10 minutos na sala virtual. É possível reagendar sem custos com até 2 horas de antecedência.',
    },
    {
      icon: 'share',
      title: 'Convite para Equipe e Diretoria',
      text: 'Após a confirmação, você receberá um link compartilhável para convidar Manutenção, Suprimentos e Controladoria.',
    },
    {
      icon: 'security',
      title: 'Sem Vínculo Comercial Forçado',
      text: 'A validação de engenharia é técnica e independente. Sua empresa pode executar o plano com fornecedores próprios.',
    },
  ];

  ngOnInit() {
    this.loadReport();
    this.reloadSlots();
  }
  /** Só recarrega se o id mudar com a tela já aberta (a carga inicial é feita no ngOnInit). */
  ngOnChanges(c: SimpleChanges) {
    if (c['id'] && !c['id'].firstChange) {
      this.loadReport();
      this.reloadSlots();
    }
  }
  freeCount = (d: DaySlots) => d.slots.filter((s) => s.free).length;

  /** Dados do titular/diagnóstico: consulta a API apenas se ainda não estiverem em memória. */
  loadReport() {
    this.repError.set(null);
    const id = this.id();
    if (!id) {
      this.rep.set(null);
      return;
    } // agendamento direto, sem relatório prévio
    const cached = this.store.report();
    if (cached?.id === id) {
      this.rep.set(cached);
      return;
    }
    this.rep.set(null);
    this.api.getReport(id).subscribe({
      next: (r) => {
        this.store.setReport(r);
        this.rep.set(r);
      },
      error: (e: ApiError) => this.repError.set(e),
    });
  }

  reloadSlots() {
    this.status.set('loading');
    this.api.getSlots().subscribe({
      next: (days) => {
        this.days.set(days);
        const day = days.find((d) => d.date === this.date()) ?? days[0];
        this.date.set(day.date);
        const keep = day.slots.find((s) => s.time === this.time())?.free;
        const pref =
          day.slots.find((s) => s.time === '14:00' && s.free) ??
          day.slots.find((s) => s.free);
        this.time.set(keep ? this.time() : (pref?.time ?? ''));
        this.intentKey = uuid();
        this.status.set('ready');
      },
      error: (e: ApiError) => {
        this.slotsError.set(e);
        this.status.set('error');
      },
    });
  }

  pickDate(d: DaySlots) {
    this.date.set(d.date);
    this.time.set(d.slots.find((s) => s.free)?.time ?? '');
    this.conflict.set(false);
    this.intentKey = uuid();
  }
  pickTime(s: SlotItem) {
    if (s.free) {
      this.time.set(s.time);
      this.conflict.set(false);
      this.intentKey = uuid();
    }
  }

  confirm() {
    if (this.booking() || !this.date() || !this.time()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.identification()?.focusFirstInvalid();
      this.toast.show(
        'Identifique quem comparecerá',
        'Preencha os dados de quem participará da reunião para confirmar.',
        'error',
      );
      return;
    }
    const attendee = this.form.getRawValue();
    this.booking.set(true);
    this.api
      .book(
        { leadId: this.id(), date: this.date(), time: this.time(), attendee },
        this.intentKey,
      )
      .subscribe({
        next: (b) => {
          this.store.client.set(attendee);
          this.store.booking.set(b);
          this.booking.set(false);
          this.router.navigate(['/confirmacao', b.protocol]);
        },
        error: (e: ApiError) => {
          this.booking.set(false);
          if (e.status === 409) {
            this.conflict.set(true);
            this.time.set('');
            this.reloadSlots();
          }
        },
      });
  }
}
