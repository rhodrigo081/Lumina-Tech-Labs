/** Contratos de /api/v1/admin (ver controllers em lumina.tech.labs.app.controller.admin). Datas em ISO-8601 UTC. */

export type Priority = 'LOW_PRIORITY' | 'MEDIUM_PRIORITY' | 'HIGH_PRIORITY';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type SlotStatus = 'AVAILABLE' | 'BOOKED';

export interface AdminProfile { id: string; name: string; email: string; }
export interface AdminSession { accessToken: string; tokenType: string; expiresAt: string; admin: AdminProfile; }

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }

export interface AdminDashboard {
  totalLeads: number; leadsLast7Days: number; highPriorityLeads: number;
  upcomingMeetings: number; openSlots: number; activeTechnicians: number;
}

export interface AdminMeeting {
  id: string; technicianId: string | null; technicianName: string | null; meetingTime: string; endTime: string | null;
  videoLink: string | null; status: MeetingStatus;
}

export interface AdminLeadSummary {
  id: string; fullName: string; corporateEmail: string; phone: string; jobTitle: string; companyName: string;
  priority: Priority; createdAt: string; workstations: number | null; monthlyEnergyBill: number | null; annualSavings: number | null;
  meeting: AdminMeeting | null;
}

export interface AdminLeadDetail {
  id: string; fullName: string; corporateEmail: string; phone: string; jobTitle: string; companyName: string; companyDomain: string;
  priority: Priority; createdAt: string;
  diagnostic: {
    areaM2: number; workstations: number; monthlyEnergyBill: number; currentInfrastructure: string;
    consumptionReductionPct: number; annualSavings: number; paybackMonths: number; co2ReductionTons: number; calculatedAt: string;
  } | null;
  meeting: AdminMeeting | null;
  consents: { termVersion: string; sourceIp: string; acceptedAt: string }[];
  crmSyncs: { provider: string; status: 'SUCCESS' | 'FAILURE' | 'PENDING'; externalId: string | null; syncedAt: string }[];
}

export interface LeadFilters { search?: string; priority?: Priority | ''; scheduled?: 'true' | 'false' | ''; page?: number; size?: number; }

export interface Technician { id: string; name: string; email: string; specialty: string | null; active: boolean; createdAt: string; }
export interface TechnicianRequest { name: string; email: string; specialty: string | null; active: boolean; }

export interface AdminSlot {
  id: string; technicianId: string; technicianName: string; startTime: string; endTime: string; status: SlotStatus;
  booking: { scheduleId: string; leadId: string; leadName: string; companyName: string } | null;
}

/** Horários em Brasília: datas "AAAA-MM-DD", horas "HH:mm". */
export interface SlotBatchRequest {
  technicianId: string; dates: string[]; startTime: string; endTime: string; durationMinutes: number; breakMinutes: number;
}
export interface SlotBatchResponse { created: AdminSlot[]; skipped: number; }

export const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH_PRIORITY: 'Alta', MEDIUM_PRIORITY: 'Média', LOW_PRIORITY: 'Baixa',
};
export const MEETING_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED: 'Agendada', COMPLETED: 'Realizada', CANCELLED: 'Cancelada',
};
