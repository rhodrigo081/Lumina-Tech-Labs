import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE } from '../config';
import {
  AdminDashboard, AdminLeadDetail, AdminLeadSummary, AdminProfile, AdminSlot, LeadFilters, MeetingStatus, Page,
  SlotBatchRequest, SlotBatchResponse, Technician, TechnicianRequest,
} from './admin.models';

const BASE = `${API_BASE}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  me() { return this.http.get<AdminProfile>(`${BASE}/auth/me`); }

  dashboard() { return this.http.get<AdminDashboard>(`${BASE}/dashboard`); }

  leads(f: LeadFilters) {
    let params = new HttpParams().set('page', f.page ?? 0).set('size', f.size ?? 20);
    if (f.search?.trim()) params = params.set('search', f.search.trim());
    if (f.priority) params = params.set('priority', f.priority);
    if (f.scheduled) params = params.set('scheduled', f.scheduled);
    return this.http.get<Page<AdminLeadSummary>>(`${BASE}/leads`, { params });
  }

  lead(id: string) { return this.http.get<AdminLeadDetail>(`${BASE}/leads/${encodeURIComponent(id)}`); }

  technicians() { return this.http.get<Technician[]>(`${BASE}/technicians`); }
  createTechnician(body: TechnicianRequest) { return this.http.post<Technician>(`${BASE}/technicians`, body); }
  updateTechnician(id: string, body: TechnicianRequest) { return this.http.put<Technician>(`${BASE}/technicians/${encodeURIComponent(id)}`, body); }

  slots(from: string, to: string, technicianId?: string) {
    let params = new HttpParams().set('from', from).set('to', to);
    if (technicianId) params = params.set('technicianId', technicianId);
    return this.http.get<AdminSlot[]>(`${BASE}/slots`, { params });
  }
  createSlots(body: SlotBatchRequest) { return this.http.post<SlotBatchResponse>(`${BASE}/slots`, body); }
  deleteSlot(id: string) { return this.http.delete<void>(`${BASE}/slots/${encodeURIComponent(id)}`); }

  setMeetingStatus(scheduleId: string, status: Exclude<MeetingStatus, 'SCHEDULED'>) {
    return this.http.patch<unknown>(`${BASE}/schedules/${encodeURIComponent(scheduleId)}/status`, { status });
  }
}
