import { DEFAULT_REPORT_ID, TARIFF_KWH } from './config';
import { DiagnosticInput, DiagnosticResult, LeadSummary, Report, Subsystem } from './models';

export const DEFAULT_INPUT: DiagnosticInput = { areaM2: 1200.5, workstations: 80, monthlyBill: 18000, infraFactor: 1.0 };
export const DEFAULT_LEAD: LeadSummary = {
  id: DEFAULT_REPORT_ID, name: 'Carlos Eduardo Silva', role: 'Diretor de Operações / CFO',
  company: 'Indústrias Reunidas S.A.', phone: '(81) 99999-0001', email: 'carloseduardo@reunidas.ind.br',
};

export const INFRA_OPTIONS = [
  { value: 1.0, label: 'Ar-condicionado central + iluminação mista (Alta oportunidade)' },
  { value: 0.85, label: 'Prédio corporativo padrão (Split inverter e iluminação mista)' },
  { value: 1.25, label: 'Galpão logístico / Híbrido administrativo (Cargas contínuas)' },
  { value: 0.7, label: 'Retrofit parcial já implementado (Apenas automação pendente)' },
];

/** Motor de cálculo — mesma regra do protótipo. Usado no preview local e pelo mock do backend. */
export function calcDiagnostic(i: DiagnosticInput): DiagnosticResult {
  let rate = 0.28;
  if (i.infraFactor > 1.1) rate = 0.33;
  if (i.infraFactor < 0.8) rate = 0.18;
  if (i.workstations / Math.max(i.areaM2, 100) > 0.08) rate = Math.min(rate + 0.03, 0.42);

  const annualCost = i.monthlyBill * 12;
  const annualSavings = annualCost * rate;
  const monthlySavings = annualSavings / 12;
  const capex = (monthlySavings * 10) / i.infraFactor;
  const paybackMonths = Math.max(6, Math.min(capex / Math.max(monthlySavings, 1), 24));
  const co2Tons = annualSavings * 0.00042;
  return {
    reductionPct: rate * 100, annualCost, optimizedCost: annualCost - annualSavings, annualSavings, monthlySavings,
    capex, paybackMonths, co2Tons, trees: Math.round(co2Tons * 6),
  };
}

function monthlyIrr(capex: number, monthly: number, n: number): number {
  let lo = 0.0001, hi = 1;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const npv = -capex + (monthly * (1 - Math.pow(1 + mid, -n))) / mid;
    npv > 0 ? (lo = mid) : (hi = mid);
  }
  return (lo + hi) / 2;
}

const SUBSYSTEMS = [
  { key: 'hvac', title: 'HVAC & Climatização', subtitle: 'Arrefecimento Central', icon: 'mode_fan', share: 0.52, red: 31, w: 0.4861,
    memo: 'Retrofit programado de chillers para tecnologia com compressor Inverter magnético acoplado a sensores de ocupação zonal e modulação dinâmica de setpoint térmico.',
    iconBox: 'bg-primary-container text-on-primary', chip: 'bg-secondary-container text-on-secondary-container', bar: 'bg-primary-container', accent: 'text-fg-primary' },
  { key: 'light', title: 'Luminotécnica', subtitle: 'Galpão & Baías', icon: 'lightbulb', share: 0.26, red: 42, w: 0.3214,
    memo: 'Substituição integral de vapor metálico por luminárias LED industriais de alta eficácia (160 lm/W) e dimerização fotoelétrica integrada com aproveitamento de luz natural (Daylighting).',
    iconBox: 'bg-tertiary-container text-on-tertiary', chip: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', bar: 'bg-tertiary', accent: 'text-fg-tertiary' },
  { key: 'motors', title: 'Motores & Cargas', subtitle: 'Parque Fabril', icon: 'precision_manufacturing', share: 0.22, red: 14, w: 0.1925,
    memo: 'Correção automática de fator de potência via banco de capacitores tiristorizados, eliminando multas de energia reativa excedente e gestão de desarme em horário de ponta tarifária.',
    iconBox: 'bg-secondary text-on-secondary', chip: 'bg-secondary-fixed text-on-secondary-fixed-variant', bar: 'bg-secondary', accent: 'text-fg-secondary' },
];

export function buildReport(id: string, lead: LeadSummary, input: DiagnosticInput): Report {
  const result = calcDiagnostic(input);
  const kwhBase = input.monthlyBill / TARIFF_KWH;
  const subsystems: Subsystem[] = SUBSYSTEMS.map((s) => ({
    key: s.key, title: s.title, subtitle: s.subtitle, icon: s.icon, sharePct: s.share * 100, reductionPct: s.red,
    kwhMonth: kwhBase * s.share, savingsMonth: (result.annualSavings * s.w) / 12, savingsYear: result.annualSavings * s.w,
    memo: s.memo, iconBox: s.iconBox, chip: s.chip, bar: s.bar, accent: s.accent,
  }));
  const r = monthlyIrr(result.capex, result.monthlySavings, 24);
  return {
    id, lead, input, result, kwhBase, kwhOptimized: kwhBase * (1 - result.reductionPct / 100),
    tirAnnualPct: (Math.pow(1 + r, 12) - 1) * 100, balance24m: result.monthlySavings * 24 - result.capex, subsystems,
  };
}
