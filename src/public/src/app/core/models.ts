export interface DiagnosticInput { areaM2: number; workstations: number; monthlyBill: number; infraFactor: number; }
export interface DiagnosticResult {
  reductionPct: number; annualCost: number; optimizedCost: number; annualSavings: number; monthlySavings: number;
  capex: number; paybackMonths: number; co2Tons: number; trees: number;
}
export interface LeadForm { name: string; role: string; company: string; phone: string; email: string; }
export interface LeadSummary extends LeadForm { id: string; }
/** Identificação do cliente: usada em todas as ações que precisam saber quem é a pessoa/empresa (relatório, agendamento). */
export type Identification = LeadForm;

export interface Subsystem {
  key: string; title: string; subtitle: string; icon: string; sharePct: number; reductionPct: number;
  kwhMonth: number; savingsMonth: number; savingsYear: number; memo: string;
  iconBox: string; chip: string; bar: string; accent: string;
}
export interface Report {
  id: string; lead: LeadSummary; input: DiagnosticInput; result: DiagnosticResult;
  kwhBase: number; kwhOptimized: number; tirAnnualPct: number; balance24m: number; subsystems: Subsystem[];
}

export interface SlotItem { time: string; free: boolean; }
export interface DaySlots { date: string; weekday: string; slots: SlotItem[]; }
export interface BookingRequest { leadId?: string; date: string; time: string; attendee: Identification; }
export interface Booking {
  protocol: string; leadId?: string; attendee: Identification; date: string; time: string; endTime: string;
  meetUrl: string; issuedAt: string;
}
export interface ContactRequest { name: string; email: string; phone: string; company: string; subject: string; message: string; }
export interface ContactReceipt { protocol: string; }
export interface ApiError { status: number; code: string; message: string; traceId?: string; }
