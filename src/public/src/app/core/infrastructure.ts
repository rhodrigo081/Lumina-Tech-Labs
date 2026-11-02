import { DiagnosticInput } from './models';

export const INFRA_OPTIONS = [
  { code: 'CENTRAL_AC_MIXED_LIGHTING', label: 'Ar-condicionado central + iluminação mista (Alta oportunidade)' },
  { code: 'STANDARD_CORPORATE_BUILDING', label: 'Prédio corporativo padrão (Split inverter e iluminação mista)' },
  { code: 'LOGISTICS_WAREHOUSE', label: 'Galpão logístico / Híbrido administrativo (Cargas contínuas)' },
  { code: 'PARTIAL_RETROFIT', label: 'Retrofit parcial já implementado (Apenas automação pendente)' },
];

export const DEFAULT_INPUT: DiagnosticInput = { areaM2: 1200.5, workstations: 80, monthlyEnergyBill: 18000, currentInfrastructure: INFRA_OPTIONS[0].code };

export const LIMITS = {
  area: { min: 200, max: 1_000_000 },
  workstations: { min: 1, max: 10_000 },
  bill: { min: 1, max: 10_000_000 },
} as const;

const fmt = (n: number) => n.toLocaleString('pt-BR');

export interface InputErrors { area?: string; workstations?: string; bill?: string; }
export function validateInput(i: DiagnosticInput): InputErrors {
  const e: InputErrors = {};
  const { area, workstations, bill } = LIMITS;
  if (!(i.areaM2 >= area.min)) e.area = `Informe ao menos ${fmt(area.min)} m².`;
  else if (i.areaM2 > area.max) e.area = `A área máxima é ${fmt(area.max)} m².`;
  if (!(i.workstations >= workstations.min)) e.workstations = `Informe ao menos ${workstations.min} estação de trabalho.`;
  else if (i.workstations > workstations.max) e.workstations = `O máximo é ${fmt(workstations.max)} estações de trabalho.`;
  if (!(i.monthlyEnergyBill >= bill.min)) e.bill = 'Informe o valor médio da fatura mensal.';
  else if (i.monthlyEnergyBill > bill.max) e.bill = `O valor máximo é R$ ${fmt(bill.max)}.`;
  return e;
}
export const isValidInput = (i: DiagnosticInput) => Object.keys(validateInput(i)).length === 0;
