import { DiagnosticInput } from './models';

/**
 * Valores enviados ao backend em `currentInfrastructure`.
 * IMPORTANTE: os códigos precisam bater com o que a DiagnosticCalculationStrategy do backend reconhece.
 */
export const INFRA_OPTIONS = [
  { code: 'CENTRAL_AC_MIXED_LIGHTING', label: 'Ar-condicionado central + iluminação mista (Alta oportunidade)' },
  { code: 'STANDARD_CORPORATE_BUILDING', label: 'Prédio corporativo padrão (Split inverter e iluminação mista)' },
  { code: 'LOGISTICS_WAREHOUSE', label: 'Galpão logístico / Híbrido administrativo (Cargas contínuas)' },
  { code: 'PARTIAL_RETROFIT', label: 'Retrofit parcial já implementado (Apenas automação pendente)' },
];

export const DEFAULT_INPUT: DiagnosticInput = { areaM2: 1200.5, workstations: 80, monthlyEnergyBill: 18000, currentInfrastructure: INFRA_OPTIONS[0].code };

export const MIN_AREA_M2 = 200;

export interface InputErrors { area?: string; workstations?: string; bill?: string; }
export function validateInput(i: DiagnosticInput): InputErrors {
  const e: InputErrors = {};
  if (!(i.areaM2 >= MIN_AREA_M2)) e.area = `Informe ao menos ${MIN_AREA_M2} m².`;
  if (!(i.workstations >= 1)) e.workstations = 'Informe ao menos 1 estação de trabalho.';
  if (!(i.monthlyEnergyBill > 0)) e.bill = 'Informe o valor médio da fatura mensal.';
  return e;
}
export const isValidInput = (i: DiagnosticInput) => Object.keys(validateInput(i)).length === 0;
