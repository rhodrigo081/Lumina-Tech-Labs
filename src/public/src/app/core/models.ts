export interface Identification { name: string; role: string; company: string; phone: string; email: string; }

export interface DiagnosticInput { areaM2: number; workstations: number; monthlyEnergyBill: number; currentInfrastructure: string; }
export interface DiagnosticResult extends DiagnosticInput {
  id?: string;
  consumptionReductionPct: number; annualSavings: number; paybackMonths: number; co2ReductionTons: number; calculatedAt: string;
}

export interface LeadRequest {
  fullName: string; corporateEmail: string; phone: string; jobTitle: string; companyName: string;
  diagnostic: DiagnosticInput;
  consent: { termVersion: string; accepted: boolean };
}
export interface LeadResponse {
  id: string; fullName: string; corporateEmail: string; companyName: string; priority?: string; createdAt?: string;
  diagnostic: DiagnosticResult; reportUrl?: string;
}

export interface Slot { id: string; technicianId: string; technicianName: string; technicianSpecialty?: string | null; startTime: string; endTime: string; }
export interface BookingRequest { leadId: string; slotId: string; }
export interface BookingResponse {
  id: string; technicianId?: string; technicianName?: string; sdrAssigned?: string; meetingTime: string; endTime?: string; videoLink?: string; status: string;
}
export interface BookingRecord {
  protocol: string; leadId: string; sdrAssigned?: string; technicianName?: string; meetingTime: string; endTime?: string; videoLink?: string; status: string;
}

export interface ContactRequest { name: string; email: string; phone: string; company: string; subject: string; message: string; }
export interface ContactReceipt { protocol?: string; }

export interface ApiError { status: number; code: string; message: string; details?: string[]; traceId?: string; }
