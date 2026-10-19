import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ecm-sobre',
  imports: [RouterLink],
  template: `
    <div class="max-w-[1280px] w-full mx-auto px-gutter py-space-xl flex flex-col gap-space-xl">
      <!-- 1. Quem somos & missão -->
      <header class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-center">
        <div class="xl:col-span-7 flex flex-col gap-space-md">
          <span class="font-label-mono text-label-mono text-fg-primary uppercase tracking-widest font-bold">Sobre a Lumina Tech Labs</span>
          <h1 class="font-display-mobile md:font-display md:text-display text-display-mobile text-fg-primary tracking-tight font-extrabold">Quem Somos &amp; Nossa Missão</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant">A Lumina Tech Labs nasceu com uma missão clara: transformar escritórios corporativos e edifícios comerciais em ambientes inteligentes, energeticamente eficientes e altamente produtivos através de automação predial de ponta e análise de dados em tempo real.</p>
          <p class="font-body-md text-body-md text-on-surface-variant">Acreditamos que a tecnologia corporativa não deve ser apenas funcional; ela precisa gerar retorno financeiro mensurável (ROI), sustentabilidade ambiental e bem-estar para as equipes que ocupam esses espaços.</p>
        </div>
        <div class="xl:col-span-5 grid grid-cols-3 gap-space-sm">
          @for (m of mission; track m.label) {
            <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col items-center text-center gap-space-xs">
              <div class="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center"><span class="material-symbols-outlined text-[26px]" aria-hidden="true">{{ m.icon }}</span></div>
              <span class="font-label-lg text-label-lg text-fg-primary font-bold">{{ m.label }}</span>
            </div>
          }
        </div>
      </header>

      <!-- 2. Cultura & valores -->
      <section aria-labelledby="cultura-h" class="flex flex-col gap-space-lg">
        <div class="max-w-3xl flex flex-col gap-space-xs">
          <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Nossa Cultura</span>
          <h2 id="cultura-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Nossa Cultura &amp; Valores</h2>
          <p class="font-body-md text-body-md text-on-surface-variant">Nossa cultura é pautada em quatro pilares fundamentais que guiam tanto o desenvolvimento dos nossos produtos tecnológicos quanto a nossa relação com os clientes corporativos.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          @for (v of values; track v.title) {
            <article class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex gap-space-md hover:shadow-md transition-shadow">
              <div class="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" [class]="v.tone"><span class="material-symbols-outlined text-[26px]" aria-hidden="true">{{ v.icon }}</span></div>
              <div class="flex flex-col gap-space-xs">
                <h3 class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ v.title }}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant">{{ v.text }}</p>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- 3. Como trabalhamos -->
      <section aria-labelledby="metodo-h" class="bg-surface-container-low rounded-3xl p-space-lg xl:p-space-xl flex flex-col gap-space-lg">
        <div class="max-w-3xl flex flex-col gap-space-xs">
          <span class="font-label-mono text-label-mono text-fg-secondary uppercase tracking-widest">Metodologia</span>
          <h2 id="metodo-h" class="font-headline-lg text-headline-lg text-fg-primary tracking-tight">Como Trabalhamos</h2>
          <p class="font-body-md text-body-md text-on-surface-variant">O nosso modelo de trabalho com os clientes corporativos é estruturado para eliminar a burocracia e entregar valor desde o primeiro contato.</p>
        </div>
        <ol class="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
          @for (s of steps; track s.title; let i = $index) {
            <li class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex gap-space-md">
              <div class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 font-headline-sm text-headline-sm font-bold" aria-hidden="true">{{ i + 1 }}</div>
              <div class="flex flex-col gap-space-xs">
                <span class="font-label-mono text-label-mono text-fg-secondary uppercase">Passo {{ i + 1 }}</span>
                <h3 class="font-headline-sm text-headline-sm text-fg-primary font-bold">{{ s.title }}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant">{{ s.text }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <!-- CTA -->
      <section class="bg-primary-container text-on-primary rounded-3xl p-space-lg xl:p-space-xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg">
        <div class="max-w-2xl flex flex-col gap-space-xs">
          <h2 class="font-headline-md text-headline-md text-on-primary font-bold">Descubra o potencial de economia do seu espaço</h2>
          <p class="font-body-md text-body-md text-on-primary-container">Faça o diagnóstico em poucos minutos ou fale diretamente com a nossa equipe.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-space-sm shrink-0">
          <a routerLink="/diagnostico" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-12 rounded-xl bg-lit-tertiary hover:bg-lit-tertiary-dim text-lit-on-tertiary font-label-lg text-label-lg font-bold shadow-md"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">calculate</span>Fazer diagnóstico</a>
          <a routerLink="/contato" class="inline-flex items-center justify-center gap-space-xs px-space-lg h-12 rounded-xl hover:bg-white/10 text-on-primary font-label-lg text-label-lg border border-on-primary/20"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">contact_support</span>Falar com a equipe</a>
        </div>
      </section>
    </div>
  `,
})
export class SobrePage {
  readonly mission = [
    { icon: 'apartment', label: 'Ambientes inteligentes' },
    { icon: 'bolt', label: 'Eficiência energética' },
    { icon: 'monitoring', label: 'Dados em tempo real' },
  ];

  readonly values = [
    { icon: 'trending_up', tone: 'bg-primary-container text-on-primary', title: 'Engenharia Orientada a Resultados (ROI First)',
      text: 'Não implementamos tecnologia por modismo. Cada sensor, linha de código ou automação desenvolvida pela Lumina tem um propósito financeiro ou operacional claro: reduzir custos, otimizar espaços ou economizar energia.' },
    { icon: 'visibility', tone: 'bg-secondary-container text-on-secondary-container', title: 'Transparência Radical',
      text: 'Ajudamos gestores de facilities, operações e TI a entenderem exatamente o impacto de suas infraestruturas. Nossos relatórios de diagnóstico e estimativas são claros, auditáveis e baseados em dados reais.' },
    { icon: 'lock', tone: 'bg-tertiary-container text-on-tertiary', title: 'Segurança e Confiabilidade Enterprise',
      text: 'No ecossistema B2B, estabilidade e conformidade (como a LGPD) não são diferenciais, são obrigações. Tratamos os dados e a infraestrutura dos nossos clientes com o mais alto rigor de segurança.' },
    { icon: 'autorenew', tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', title: 'Inovação Contínua com Agilidade',
      text: 'O mercado corporativo evolui rápido. Mantemos nossos sistemas modulares e escaláveis para acompanhar as demandas dinâmicas do futuro do trabalho.' },
  ];

  readonly steps = [
    { title: 'Diagnóstico Instantâneo Baseado em Dados',
      text: 'Em vez de ciclos longos de reuniões comerciais vazias, oferecemos ferramentas interativas de autoavaliação (como a nossa calculadora de eficiência energética e ROI) para que o tomador de decisão entenda o potencial de melhoria do seu espaço em poucos minutos.' },
    { title: 'Abordagem Consultiva e Sob Medida',
      text: 'Nossa equipe técnica e comercial atua como parceira estratégica. Analisamos o perfil de cada empresa (metragem, número de estações de trabalho, custos operacionais atuais) para desenhar arquiteturas de automação sob medida, priorizando o que traz retorno mais rápido (Quick Wins).' },
    { title: 'Implementação Robusta e Transparente',
      text: 'Seguindo os mais altos padrões da engenharia de software e hardware, utilizamos stacks modernas e resilientes (como arquiteturas em nuvem escaláveis, microsserviços e integração contínua). Garantimos que a transição e a integração com os sistemas legados da empresa ocorram sem interrupções nas operações diárias.' },
    { title: 'Suporte e Evolução Contínua',
      text: 'Nossa relação com o cliente não termina na entrega do projeto. Monitoramos o desempenho das soluções implementadas, ajustamos parâmetros via inteligência de dados e garantimos suporte de alta performance para que o escritório do nosso cliente evolua de forma sustentável.' },
  ];
}
